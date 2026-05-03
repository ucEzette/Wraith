// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/src/types/BeforeSwapDelta.sol";
import {Currency} from "v4-core/src/types/Currency.sol";

/// @title WraithHook — Active Defense Protocol for Uniswap v4
/// @author Wraith Protocol
/// @notice A Uniswap v4 Hook that protects LPs from rug-pulls and malicious exploits
///         by intercepting swaps and liquidity removals when a Gensyn Toxicity Score
///         exceeds the critical threshold. Uses EIP-1153 transient storage to manage
///         toxicity state within a block, dynamic fee overrides to "poison" attacker
///         swaps, and a permissioned "Quantum Exit" that atomically rescues LP funds.
///
/// @dev HOOK PERMISSIONS (encoded in address):
///      - beforeSwap:            intercepts swaps to apply Poison Fee (99% for flagged devs)
///      - beforeRemoveLiquidity: blocks unauthorized liquidity removal when in TOXIC state
///
/// ARCHITECTURE:
/// ┌──────────────────────────────────────────────────────────────┐
/// │                         WraithHook                          │
/// │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
/// │  │ Toxicity     │  │ Poison Hook  │  │ Quantum Exit       │  │
/// │  │ Oracle       │  │ (beforeSwap) │  │ (rescue liquidity) │  │
/// │  │ (Gensyn AEL) │  │ 99% fee      │  │ to safe vault      │  │
/// │  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘  │
/// │         │                 │                   │              │
/// │         └────── EIP-1153 Transient Storage ───┘              │
/// └──────────────────────────────────────────────────────────────┘
contract WraithHook is IHooks, IUnlockCallback {
    using PoolIdLibrary for PoolKey;
    using LPFeeLibrary for uint24;

    // ══════════════════════════════════════════════════════════════
    //                           ERRORS
    // ══════════════════════════════════════════════════════════════
    error OnlyPoolManager();
    error OnlySentinel();
    error OnlyGuardian();
    error PoolToxic();
    error InvalidToxicityScore();
    error QuantumExitFailed();
    error NotWraithGuardUser();
    error CooldownActive();
    error AlreadyRegistered();
    error NotRegistered();
    error OperatorNotApproved();

    // ══════════════════════════════════════════════════════════════
    //                           EVENTS
    // ══════════════════════════════════════════════════════════════
    event ToxicityUpdated(PoolId indexed poolId, uint256 score, bytes32 proofHash);
    event PoisonHookActivated(PoolId indexed poolId, address indexed attacker, uint24 poisonFee);
    event QuantumExitTriggered(PoolId indexed poolId, address indexed user, address rescueToken, uint256 amount0, uint256 amount1);
    event SovereignOverride(PoolId indexed poolId, address indexed user);
    event WraithGuardRegistered(address indexed user);
    event WraithGuardRevoked(address indexed user);
    event SentinelUpdated(address indexed oldSentinel, address indexed newSentinel);
    event GuardianUpdated(address indexed oldGuardian, address indexed newGuardian);
    event AttackerFlagged(PoolId indexed poolId, address indexed attacker);
    event VaultUpdated(address indexed user, address indexed vault);
    event PoolArmed(PoolId indexed poolId);
    event PoolDisarmed(PoolId indexed poolId);
    event WraithPoolRegistered(PoolId indexed poolId, string pairName);

    // ══════════════════════════════════════════════════════════════
    //                          CONSTANTS
    // ══════════════════════════════════════════════════════════════

    /// @notice The PoolManager singleton
    IPoolManager public immutable poolManager;

    /// @notice Toxicity threshold (0.85 scaled to 8500 / 10000)
    uint256 public constant TOXICITY_THRESHOLD = 8500;

    /// @notice Maximum toxicity score
    uint256 public constant TOXICITY_PRECISION = 10000;

    /// @notice Poison fee: 99% in hundredths-of-a-bip = 990000
    uint24 public constant POISON_FEE = 990000;

    /// @notice Normal fee (0%) for Wraith-Guard users during toxic state
    uint24 public constant GUARD_FEE = 0;

    /// @notice Sovereign override cooldown period (blocks)
    uint256 public constant SOVEREIGN_COOLDOWN = 5;

    // ══════════════════════════════════════════════════════════════
    //                   EIP-1153 TRANSIENT STORAGE SLOTS
    // ══════════════════════════════════════════════════════════════
    // Transient storage is used to manage per-block toxicity state
    // without persisting it across blocks (gas-efficient).

    /// @dev Slot: keccak256(abi.encode(poolId, "wraith.toxicity.score"))
    ///      Stores the current block's toxicity score for a pool.
    bytes32 private constant _TOXICITY_SCORE_SLOT_PREFIX = keccak256("wraith.toxicity.score");

    /// @dev Slot: keccak256(abi.encode(poolId, "wraith.toxicity.armed"))
    ///      Boolean flag: 1 = pool is in active defense mode this block.
    bytes32 private constant _TOXICITY_ARMED_SLOT_PREFIX = keccak256("wraith.toxicity.armed");

    // ══════════════════════════════════════════════════════════════
    //                        STATE VARIABLES
    // ══════════════════════════════════════════════════════════════

    /// @notice The Gensyn Sentinel address (off-chain AI oracle relay)
    address public sentinel;

    /// @notice The Guardian (admin) address for emergency governance
    address public guardian;

    /// @notice Persistent toxicity scores (cross-block, updated by Sentinel)
    mapping(PoolId => uint256) public toxicityScores;

    /// @notice Proof hashes from Gensyn's Verifiable Proof of Malice
    mapping(PoolId => bytes32) public maliceProofs;

    /// @notice Wraith-Guard registered users (protected addresses)
    mapping(address => bool) public isWraithGuard;

    /// @notice Per-pool flagged attacker addresses
    mapping(PoolId => mapping(address => bool)) public isFlaggedAttacker;

    /// @notice User's secure vault address for Quantum Exit settlement
    mapping(address => address) public userVaults;

    /// @notice User-specific toxicity thresholds for alerts/exits
    mapping(address => uint256) public userThresholds;

    /// @notice User-preferred rescue tokens (e.g. USDC, ETH)
    mapping(address => address) public userRescueTokens;

    /// @notice User preference for auto-exit vs manual alert
    mapping(address => bool) public userAutoExit;

    /// @notice Last sovereign override block per user per pool
    mapping(PoolId => mapping(address => uint256)) public lastSovereignOverride;

    /// @notice Pools actively monitored by Wraith
    mapping(PoolId => bool) public isArmedPool;

    // ══════════════════════════════════════════════════════════════
    //                         MODIFIERS
    // ══════════════════════════════════════════════════════════════
    
    // ... (rest of the file)

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert OnlyPoolManager();
        _;
    }

    modifier onlySentinel() {
        if (msg.sender != sentinel) revert OnlySentinel();
        _;
    }

    modifier onlyGuardian() {
        if (msg.sender != guardian) revert OnlyGuardian();
        _;
    }

    // ══════════════════════════════════════════════════════════════
    //                        CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════

    /// @param _poolManager The Uniswap v4 PoolManager singleton
    /// @param _sentinel    The Gensyn Sentinel relay address
    /// @param _guardian    The protocol Guardian (multisig/DAO)
    constructor(IPoolManager _poolManager, address _sentinel, address _guardian) {
        poolManager = _poolManager;
        sentinel = _sentinel;
        guardian = _guardian;

        // Validate hook permissions are encoded in the address
        Hooks.validateHookPermissions(
            IHooks(address(this)),
            Hooks.Permissions({
                beforeInitialize: false,
                afterInitialize: false,
                beforeAddLiquidity: false,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: true,
                afterRemoveLiquidity: false,
                beforeSwap: true,
                afterSwap: false,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: false,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            })
        );
    }

    // ══════════════════════════════════════════════════════════════
    //                     HOOK CALLBACKS
    // ══════════════════════════════════════════════════════════════

    /// @notice Intercepts swaps to apply the "Poison Hook" when toxicity is critical.
    /// @dev When the pool is toxic:
    ///      - Flagged attacker addresses pay a 99% fee (POISON_FEE)
    ///      - Wraith-Guard users pay 0% fee
    ///      - Unregistered users pay normal pool fee
    ///
    /// The fee override uses the OVERRIDE_FEE_FLAG (0x400000) OR'd with the fee value
    /// so the PoolManager recognizes it as a dynamic fee override.
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata,
        bytes calldata
    ) external override onlyPoolManager returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();

        // Check transient toxicity state first (same-block fast path)
        uint256 tScore = _getTransientToxicity(poolId);

        // Fall back to persistent storage if no transient data this block
        if (tScore == 0) {
            tScore = toxicityScores[poolId];
        }

        // If toxicity exceeds threshold AND pool is armed, activate Poison Hook
        if (tScore >= TOXICITY_THRESHOLD && isArmedPool[poolId]) {
            // Flagged attacker: 99% fee — their swap value is captured
            if (isFlaggedAttacker[poolId][sender]) {
                emit PoisonHookActivated(poolId, sender, POISON_FEE);
                return (
                    IHooks.beforeSwap.selector,
                    BeforeSwapDeltaLibrary.ZERO_DELTA,
                    POISON_FEE | LPFeeLibrary.OVERRIDE_FEE_FLAG
                );
            }

            // Wraith-Guard user: 0% fee — they're protected
            if (isWraithGuard[sender]) {
                return (
                    IHooks.beforeSwap.selector,
                    BeforeSwapDeltaLibrary.ZERO_DELTA,
                    GUARD_FEE | LPFeeLibrary.OVERRIDE_FEE_FLAG
                );
            }
        }

        // Non-toxic state or unregistered user: no fee override
        return (IHooks.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /// @notice Intercepts liquidity removal to block attackers during toxic state.
    /// @dev Allows Wraith-Guard users and the hook itself (for Quantum Exit) to
    ///      remove liquidity even when toxic. Blocks all other addresses.
    function beforeRemoveLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external override onlyPoolManager returns (bytes4) {
        PoolId poolId = key.toId();

        // Check if pool is in toxic state
        uint256 tScore = _getTransientToxicity(poolId);
        if (tScore == 0) {
            tScore = toxicityScores[poolId];
        }

        if (tScore >= TOXICITY_THRESHOLD && isArmedPool[poolId]) {
            // Only Wraith-Guard users, the hook itself, or sovereign overrides can exit
            if (!isWraithGuard[sender] && sender != address(this)) {
                // Check if sovereign override is active (user must have called it recently)
                uint256 overrideBlock = lastSovereignOverride[poolId][sender];
                if (overrideBlock == 0 || block.number > overrideBlock + SOVEREIGN_COOLDOWN) {
                    revert PoolToxic();
                }
            }
        }

        return IHooks.beforeRemoveLiquidity.selector;
    }

    // ══════════════════════════════════════════════════════════════
    //                  UNIMPLEMENTED HOOK CALLBACKS
    // ══════════════════════════════════════════════════════════════

    function beforeInitialize(address, PoolKey calldata, uint160) external pure override returns (bytes4) {
        revert("NOT_IMPLEMENTED");
    }

    function afterInitialize(address, PoolKey calldata, uint160, int24) external pure override returns (bytes4) {
        revert("NOT_IMPLEMENTED");
    }

    function beforeAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        revert("NOT_IMPLEMENTED");
    }

    function afterAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        revert("NOT_IMPLEMENTED");
    }

    function afterRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        BalanceDelta,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, BalanceDelta) {
        revert("NOT_IMPLEMENTED");
    }

    function afterSwap(
        address,
        PoolKey calldata,
        IPoolManager.SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external pure override returns (bytes4, int128) {
        revert("NOT_IMPLEMENTED");
    }

    function beforeDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        revert("NOT_IMPLEMENTED");
    }

    function afterDonate(address, PoolKey calldata, uint256, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        revert("NOT_IMPLEMENTED");
    }

    // ══════════════════════════════════════════════════════════════
    //                   SENTINEL FUNCTIONS (Gensyn)
    // ══════════════════════════════════════════════════════════════

    /// @notice Update toxicity score for a pool with a Gensyn Verifiable Proof of Malice
    /// @param key       The pool key
    /// @param score     Toxicity score [0, 10000] where 10000 = 100% toxic
    /// @param proofHash The keccak256 hash of the Gensyn proof payload
    /// @param attackers Array of flagged attacker addresses
    function updateToxicity(
        PoolKey calldata key,
        uint256 score,
        bytes32 proofHash,
        address[] calldata attackers
    ) external onlySentinel {
        if (score > TOXICITY_PRECISION) revert InvalidToxicityScore();

        PoolId poolId = key.toId();

        // Update persistent storage
        toxicityScores[poolId] = score;
        maliceProofs[poolId] = proofHash;
        isArmedPool[poolId] = score >= TOXICITY_THRESHOLD;

        // Store in transient storage for same-block access
        _setTransientToxicity(poolId, score);
        _setTransientArmed(poolId, score >= TOXICITY_THRESHOLD);

        // Flag attacker addresses
        for (uint256 i = 0; i < attackers.length; i++) {
            isFlaggedAttacker[poolId][attackers[i]] = true;
            emit AttackerFlagged(poolId, attackers[i]);
        }

        emit ToxicityUpdated(poolId, score, proofHash);
    }

    /// @notice Clear toxicity for a pool (Sentinel deems it safe)
    /// @param key The pool key
    function clearToxicity(PoolKey calldata key) external onlySentinel {
        PoolId poolId = key.toId();
        toxicityScores[poolId] = 0;
        maliceProofs[poolId] = bytes32(0);
        _setTransientToxicity(poolId, 0);
        _setTransientArmed(poolId, false);
    }

    // ══════════════════════════════════════════════════════════════
    //                    QUANTUM EXIT FUNCTIONS
    // ══════════════════════════════════════════════════════════════

    /// @notice Execute a "Quantum Exit" — atomically rescue LP funds
    /// @dev Called by the Sentinel. Validates:
    ///      1. Pool toxicity exceeds the user's threshold
    ///      2. User is Wraith-Guard registered with autoExit enabled
    ///      3. User has granted operator permission on PoolManager
    ///      4. User has a vault configured
    ///
    /// @param key  The pool key
    /// @param user The LP user to rescue
    function triggerQuantumExit(
        PoolKey calldata key,
        address user
    ) external onlySentinel {
        PoolId poolId = key.toId();

        // Validate custom or protocol threshold
        uint256 threshold = userThresholds[user];
        if (threshold == 0) threshold = TOXICITY_THRESHOLD;

        uint256 tScore = toxicityScores[poolId];
        if (tScore < threshold) revert PoolToxic();

        // Validate user
        if (!isWraithGuard[user]) revert NotWraithGuardUser();
        if (userVaults[user] == address(0)) revert QuantumExitFailed();

        // Check if user has auto-exit enabled
        if (!userAutoExit[user]) revert PoolToxic(); // Cannot trigger if manual only

        // CRITICAL: Validate that user has granted operator permission
        // Without this, the Keeper cannot remove liquidity on the user's behalf.
        // Users must call PoolManager.setOperator(wraith_hook, true) before enabling auto-exit.
        if (!poolManager.isOperator(user, address(this))) revert OperatorNotApproved();

        // Emit event with rescue token preference for Keeper execution
        emit QuantumExitTriggered(poolId, user, userRescueTokens[user], 0, 0);
    }

    // ══════════════════════════════════════════════════════════════
    //                   SOVEREIGN OVERRIDE
    // ══════════════════════════════════════════════════════════════

    /// @notice Manual emergency exit for users if the AI fails
    /// @dev Users can trigger their own exit with a cooldown to prevent abuse.
    ///      After calling this, the user's next `removeLiquidity` call within
    ///      SOVEREIGN_COOLDOWN blocks will be permitted even in toxic state.
    /// @param key The pool key
    function sovereignOverride(PoolKey calldata key) external {
        PoolId poolId = key.toId();

        // Check cooldown
        uint256 lastOverride = lastSovereignOverride[poolId][msg.sender];
        if (lastOverride != 0 && block.number < lastOverride + SOVEREIGN_COOLDOWN) {
            revert CooldownActive();
        }

        lastSovereignOverride[poolId][msg.sender] = block.number;
        emit SovereignOverride(poolId, msg.sender);
    }

    // ══════════════════════════════════════════════════════════════
    //                    USER REGISTRATION
    // ══════════════════════════════════════════════════════════════

    // Track all registered users for Sentinel lookup
    address[] public allWraithGuardUsers;
    mapping(address => uint256) private userListIndex;

    /// @notice Register as a Wraith-Guard protected user
    /// @param vault       The secure vault address for Quantum Exit settlement
    /// @param threshold   Custom toxicity threshold (e.g. 8500 = 85%)
    /// @param rescueToken The token address to receive after swap (e.g. USDC)
    /// @param autoExit    True for auto-exit via Keeper, false for manual alert
    function registerWraithGuard(
        address vault, 
        uint256 threshold, 
        address rescueToken, 
        bool autoExit
    ) external {
        if (isWraithGuard[msg.sender]) revert AlreadyRegistered();
        if (threshold > TOXICITY_PRECISION) revert InvalidToxicityScore();

        isWraithGuard[msg.sender] = true;
        userVaults[msg.sender] = vault;
        userThresholds[msg.sender] = threshold;
        userRescueTokens[msg.sender] = rescueToken;
        userAutoExit[msg.sender] = autoExit;

        // Add to global list
        userListIndex[msg.sender] = allWraithGuardUsers.length;
        allWraithGuardUsers.push(msg.sender);

        emit WraithGuardRegistered(msg.sender);
        emit VaultUpdated(msg.sender, vault);
    }

    /// @notice Get all registered Wraith-Guard users
    function getWraithGuardUsers() external view returns (address[] memory) {
        return allWraithGuardUsers;
    }

    /// @notice Revoke Wraith-Guard registration
    function revokeWraithGuard() external {
        if (!isWraithGuard[msg.sender]) revert NotRegistered();
        
        // Remove from list (swap and pop)
        uint256 index = userListIndex[msg.sender];
        address lastUser = allWraithGuardUsers[allWraithGuardUsers.length - 1];
        allWraithGuardUsers[index] = lastUser;
        userListIndex[lastUser] = index;
        allWraithGuardUsers.pop();

        isWraithGuard[msg.sender] = false;
        userVaults[msg.sender] = address(0);
        emit WraithGuardRevoked(msg.sender);
    }

    // ══════════════════════════════════════════════════════════════
    //                    GUARDIAN FUNCTIONS
    // ══════════════════════════════════════════════════════════════

    /// @notice Arm a pool for Wraith monitoring
    /// @param key The pool key
    /// @param pairName Human readable name (e.g. ETH / USDC)
    function armPool(PoolKey calldata key, string calldata pairName) external onlyGuardian {
        PoolId poolId = key.toId();
        isArmedPool[poolId] = true;
        emit PoolArmed(poolId);
        emit WraithPoolRegistered(poolId, pairName);
    }

    /// @notice Disarm a pool (remove from Wraith monitoring)
    /// @param key The pool key
    function disarmPool(PoolKey calldata key) external onlyGuardian {
        PoolId poolId = key.toId();
        isArmedPool[poolId] = false;
        emit PoolDisarmed(poolId);
    }

    /// @notice Update the Sentinel address
    /// @param _sentinel New sentinel address
    function setSentinel(address _sentinel) external onlyGuardian {
        emit SentinelUpdated(sentinel, _sentinel);
        sentinel = _sentinel;
    }

    /// @notice Transfer Guardian role
    /// @param _guardian New guardian address
    function setGuardian(address _guardian) external onlyGuardian {
        emit GuardianUpdated(guardian, _guardian);
        guardian = _guardian;
    }

    /// @notice Unflag an address (clear false positive)
    /// @param key     The pool key
    /// @param account The address to unflag
    function unflagAddress(PoolKey calldata key, address account) external onlyGuardian {
        PoolId poolId = key.toId();
        isFlaggedAttacker[poolId][account] = false;
    }

    // ══════════════════════════════════════════════════════════════
    //                   VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════

    /// @notice Check if a pool is currently toxic
    /// @param key The pool key
    /// @return True if pool toxicity >= threshold and pool is armed
    function isPoolToxic(PoolKey calldata key) external view returns (bool) {
        PoolId poolId = key.toId();
        return toxicityScores[poolId] >= TOXICITY_THRESHOLD && isArmedPool[poolId];
    }

    /// @notice Get full defense status for a pool
    /// @param key The pool key
    /// @return score     Current toxicity score
    /// @return armed     Whether the pool is armed
    /// @return toxic     Whether the pool is in toxic state
    /// @return proofHash The latest Gensyn proof hash
    function getDefenseStatus(PoolKey calldata key)
        external
        view
        returns (uint256 score, bool armed, bool toxic, bytes32 proofHash)
    {
        PoolId poolId = key.toId();
        score = toxicityScores[poolId];
        armed = isArmedPool[poolId];
        toxic = score >= TOXICITY_THRESHOLD && armed;
        proofHash = maliceProofs[poolId];
    }

    // ══════════════════════════════════════════════════════════════
    //              EIP-1153 TRANSIENT STORAGE INTERNALS
    // ══════════════════════════════════════════════════════════════

    /// @dev Compute the transient storage slot for a pool's toxicity score
    function _toxicitySlot(PoolId poolId) internal pure returns (bytes32) {
        return keccak256(abi.encode(poolId, _TOXICITY_SCORE_SLOT_PREFIX));
    }

    /// @dev Compute the transient storage slot for a pool's armed status
    function _armedSlot(PoolId poolId) internal pure returns (bytes32) {
        return keccak256(abi.encode(poolId, _TOXICITY_ARMED_SLOT_PREFIX));
    }

    /// @dev Store toxicity score in transient storage (TSTORE)
    function _setTransientToxicity(PoolId poolId, uint256 score) internal {
        bytes32 slot = _toxicitySlot(poolId);
        assembly {
            tstore(slot, score)
        }
    }

    /// @dev Load toxicity score from transient storage (TLOAD)
    function _getTransientToxicity(PoolId poolId) internal view returns (uint256 score) {
        bytes32 slot = _toxicitySlot(poolId);
        assembly {
            score := tload(slot)
        }
    }

    /// @dev Store armed status in transient storage (TSTORE)
    function _setTransientArmed(PoolId poolId, bool armed) internal {
        bytes32 slot = _armedSlot(poolId);
        assembly {
            tstore(slot, armed)
        }
    }

    /// @dev Load armed status from transient storage (TLOAD)
    function _getTransientArmed(PoolId poolId) internal view returns (bool armed) {
        bytes32 slot = _armedSlot(poolId);
        assembly {
            armed := tload(slot)
        }
    }

    /// @notice Atomic rescue execution for Keeper Hub
    /// @param key The pool key
    /// @param tickLower The lower tick of the position
    /// @param tickUpper The upper tick of the position
    /// @param liquidityDelta The amount of liquidity to remove (negative)
    /// @param user The user to rescue
    function executeQuantumRescue(
        PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper,
        int256 liquidityDelta,
        address user
    ) external onlySentinel {
        PoolId poolId = key.toId();
        
        // 1. Safety Checks
        uint256 threshold = userThresholds[user];
        if (threshold == 0) threshold = TOXICITY_THRESHOLD;
        if (toxicityScores[poolId] < threshold) revert PoolToxic();
        if (!isWraithGuard[user]) revert NotWraithGuardUser();
        if (userVaults[user] == address(0)) revert QuantumExitFailed();
        if (!poolManager.isOperator(user, address(this))) revert OperatorNotApproved();

        // 2. Perform the rescue!
        bytes memory data = abi.encode(key, tickLower, tickUpper, liquidityDelta, user);
        poolManager.unlock(data);
    }

    /// @notice Callback from PoolManager during unlock
    function unlockCallback(bytes calldata data) external override onlyPoolManager returns (bytes memory) {
        (PoolKey memory key, int24 tickLower, int24 tickUpper, int256 liquidityDelta, address user) = 
            abi.decode(data, (PoolKey, int24, int24, int256, address));

        // 1. Remove liquidity (on behalf of user)
        // Note: the hook is an operator for the user
        (BalanceDelta delta, ) = poolManager.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: liquidityDelta,
                salt: bytes32(0)
            }),
            abi.encode(user, "WRAITH_QUANTUM_EXIT")
        );

        // 2. Take the tokens from PoolManager
        // If liquidityDelta was negative, delta amounts are positive (we receive tokens)
        if (delta.amount0() > 0) {
            poolManager.take(key.currency0, address(this), uint128(delta.amount0()));
        }
        if (delta.amount1() > 0) {
            poolManager.take(key.currency1, address(this), uint128(delta.amount1()));
        }

        // 3. Send tokens to user's vault
        address vault = userVaults[user];
        if (delta.amount0() > 0) {
            key.currency0.transfer(vault, uint128(delta.amount0()));
        }
        if (delta.amount1() > 0) {
            key.currency1.transfer(vault, uint128(delta.amount1()));
        }

        return "";
    }
}
