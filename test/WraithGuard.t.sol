// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test, console2} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/src/types/BeforeSwapDelta.sol";
import {LPFeeLibrary} from "v4-core/src/libraries/LPFeeLibrary.sol";
import {WraithHook} from "../contracts/WraithHook.sol";

/// @title WraithGuard Test Suite
/// @notice Comprehensive tests simulating rug-pull scenarios and Wraith-Guard rescue operations
/// @dev Tests use a mock PoolManager since full PoolManager integration requires a complex setup.
///      The focus here is on the hook logic: toxicity updates, fee overrides, and access control.
contract WraithGuardTest is Test {
    using PoolIdLibrary for PoolKey;

    // ──────────────────────────────────────────────────────────
    //  Test Actors
    // ──────────────────────────────────────────────────────────
    address sentinel = makeAddr("sentinel");
    address guardian = makeAddr("guardian");
    address alice = makeAddr("alice");          // Wraith-Guard LP
    address bob = makeAddr("bob");              // Unprotected LP
    address rugDev = makeAddr("rugDev");        // Malicious developer
    address aliceVault = makeAddr("aliceVault");

    // ──────────────────────────────────────────────────────────
    //  Contracts
    // ──────────────────────────────────────────────────────────
    WraithHook hook;
    address mockPoolManager;

    // ──────────────────────────────────────────────────────────
    //  Pool Setup
    // ──────────────────────────────────────────────────────────
    Currency currency0;
    Currency currency1;
    PoolKey poolKey;
    PoolId poolId;

    // ══════════════════════════════════════════════════════════
    //                        SETUP
    // ══════════════════════════════════════════════════════════

    function setUp() public {
        // Create mock PoolManager
        mockPoolManager = makeAddr("poolManager");

        // We need to deploy WraithHook at an address with the correct permission bits.
        // beforeRemoveLiquidity = bit 9 (0x200)
        // beforeSwap            = bit 7 (0x080)
        // Combined flags:       = 0x280
        uint160 flags = uint160(Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG | Hooks.BEFORE_SWAP_FLAG);

        // Target address that has the correct LSBs for our permissions
        address hookAddress = address(flags);

        // Use Foundry's deployCodeTo to deploy at a specific address.
        // This runs the constructor (initializing storage) and then
        // moves the runtime bytecode to the target address.
        deployCodeTo(
            "WraithHook.sol:WraithHook",
            abi.encode(IPoolManager(mockPoolManager), sentinel, guardian),
            hookAddress
        );
        hook = WraithHook(hookAddress);

        // Setup currencies (sorted)
        currency0 = Currency.wrap(address(0x1111));
        currency1 = Currency.wrap(address(0x2222));

        // Create pool key
        poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG, // Dynamic fee pool (required for fee overrides)
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });

        poolId = poolKey.toId();

        // Register Alice as Wraith-Guard
        vm.prank(alice);
        hook.registerWraithGuard(aliceVault);

        // Arm the pool
        vm.prank(guardian);
        hook.armPool(poolKey);
    }

    // ══════════════════════════════════════════════════════════
    //             TEST: WRAITH-GUARD REGISTRATION
    // ══════════════════════════════════════════════════════════

    function test_RegisterWraithGuard() public {
        assertTrue(hook.isWraithGuard(alice), "Alice should be registered");
        assertEq(hook.userVaults(alice), aliceVault, "Alice vault should be set");
    }

    function test_RegisterWraithGuard_DoubleRegistration_Reverts() public {
        vm.prank(alice);
        vm.expectRevert(WraithHook.AlreadyRegistered.selector);
        hook.registerWraithGuard(aliceVault);
    }

    function test_RevokeWraithGuard() public {
        vm.prank(alice);
        hook.revokeWraithGuard();

        assertFalse(hook.isWraithGuard(alice), "Alice should not be registered");
        assertEq(hook.userVaults(alice), address(0), "Alice vault should be cleared");
    }

    function test_UpdateVault() public {
        address newVault = makeAddr("newVault");
        vm.prank(alice);
        hook.updateVault(newVault);
        assertEq(hook.userVaults(alice), newVault, "Vault should be updated");
    }

    function test_UpdateVault_NotRegistered_Reverts() public {
        vm.prank(bob);
        vm.expectRevert(WraithHook.NotRegistered.selector);
        hook.updateVault(aliceVault);
    }

    // ══════════════════════════════════════════════════════════
    //           TEST: TOXICITY UPDATES (Sentinel)
    // ══════════════════════════════════════════════════════════

    function test_UpdateToxicity() public {
        address[] memory attackers = new address[](1);
        attackers[0] = rugDev;

        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 9000, keccak256("proof1"), attackers);

        assertEq(hook.toxicityScores(poolId), 9000, "Toxicity score should be 9000");
        assertTrue(hook.isFlaggedAttacker(poolId, rugDev), "rugDev should be flagged");
    }

    function test_UpdateToxicity_OnlySentinel() public {
        address[] memory attackers = new address[](0);

        vm.prank(bob);
        vm.expectRevert(WraithHook.OnlySentinel.selector);
        hook.updateToxicity(poolKey, 5000, keccak256("fake"), attackers);
    }

    function test_UpdateToxicity_InvalidScore_Reverts() public {
        address[] memory attackers = new address[](0);

        vm.prank(sentinel);
        vm.expectRevert(WraithHook.InvalidToxicityScore.selector);
        hook.updateToxicity(poolKey, 10001, keccak256("bad"), attackers);
    }

    function test_ClearToxicity() public {
        // Set toxicity first
        address[] memory attackers = new address[](0);
        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 9500, keccak256("proof"), attackers);

        // Clear it
        vm.prank(sentinel);
        hook.clearToxicity(poolKey);

        assertEq(hook.toxicityScores(poolId), 0, "Toxicity should be cleared");
    }

    // ══════════════════════════════════════════════════════════
    //     TEST: SLOW RUG SCENARIO — THE POISON HOOK
    // ══════════════════════════════════════════════════════════

    /// @notice Simulates a "Slow Rug" scenario:
    ///   1. Rug developer deploys a token with hidden mint/pause functions
    ///   2. Gensyn Sentinel detects anomalous bytecode patterns
    ///   3. Toxicity score pushed above 0.85 (8500)
    ///   4. rugDev tries to swap → gets 99% fee (Poison Hook)
    ///   5. Alice (Wraith-Guard) can swap at 0% fee
    ///   6. Bob (unprotected) gets normal fee
    function test_SlowRug_PoisonHook() public {
        console2.log("=== SLOW RUG SCENARIO ===");

        // Step 1: Sentinel detects malice and updates toxicity
        address[] memory attackers = new address[](1);
        attackers[0] = rugDev;

        vm.prank(sentinel);
        hook.updateToxicity(
            poolKey,
            9200, // 92% toxicity — well above 85% threshold
            keccak256("gensyn_proof_of_malice_001"),
            attackers
        );

        console2.log("Toxicity updated to 9200 (92%)");
        assertTrue(hook.isPoolToxic(poolKey), "Pool should be toxic");

        // Step 2: rugDev tries to swap → POISON FEE (99%)
        IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: -1 ether,
            sqrtPriceLimitX96: 0
        });

        vm.prank(mockPoolManager);
        (bytes4 selector1, BeforeSwapDelta delta1, uint24 fee1) =
            hook.beforeSwap(rugDev, poolKey, swapParams, "");

        assertEq(selector1, IHooks.beforeSwap.selector, "Selector mismatch");
        assertEq(
            fee1,
            hook.POISON_FEE() | LPFeeLibrary.OVERRIDE_FEE_FLAG,
            "rugDev should get 99% poison fee"
        );
        console2.log("rugDev fee override:", fee1);
        console2.log("POISON! rugDev gets 99% fee");

        // Step 3: Alice (Wraith-Guard) swaps → 0% fee
        vm.prank(mockPoolManager);
        (bytes4 selector2, BeforeSwapDelta delta2, uint24 fee2) =
            hook.beforeSwap(alice, poolKey, swapParams, "");

        assertEq(
            fee2,
            hook.GUARD_FEE() | LPFeeLibrary.OVERRIDE_FEE_FLAG,
            "Alice should get 0% guard fee"
        );
        console2.log("Alice fee override:", fee2);
        console2.log("SAFE! Alice gets 0% fee");

        // Step 4: Bob (unprotected) swaps → no fee override
        vm.prank(mockPoolManager);
        (bytes4 selector3, BeforeSwapDelta delta3, uint24 fee3) =
            hook.beforeSwap(bob, poolKey, swapParams, "");

        assertEq(fee3, 0, "Bob should get no fee override (pool default)");
        console2.log("Bob fee: no override (pool default)");
    }

    // ══════════════════════════════════════════════════════════
    //    TEST: LIQUIDITY REMOVAL BLOCKING
    // ══════════════════════════════════════════════════════════

    /// @notice Tests that attackers cannot remove liquidity during toxic state
    function test_BlockAttackerLiquidityRemoval() public {
        // Set pool to toxic
        address[] memory attackers = new address[](1);
        attackers[0] = rugDev;
        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 9500, keccak256("proof"), attackers);

        // rugDev (not Wraith-Guard) tries to remove liquidity → BLOCKED
        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: -60,
            tickUpper: 60,
            liquidityDelta: -1000,
            salt: bytes32(0)
        });

        vm.prank(mockPoolManager);
        vm.expectRevert(WraithHook.PoolToxic.selector);
        hook.beforeRemoveLiquidity(rugDev, poolKey, params, "");
    }

    /// @notice Tests that Wraith-Guard users CAN remove liquidity during toxic state
    function test_AllowWraithGuardLiquidityRemoval() public {
        // Set pool to toxic
        address[] memory attackers = new address[](0);
        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 9500, keccak256("proof"), attackers);

        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: -60,
            tickUpper: 60,
            liquidityDelta: -1000,
            salt: bytes32(0)
        });

        // Alice (Wraith-Guard) removes liquidity → ALLOWED
        vm.prank(mockPoolManager);
        bytes4 result = hook.beforeRemoveLiquidity(alice, poolKey, params, "");
        assertEq(result, IHooks.beforeRemoveLiquidity.selector, "Alice should be allowed to exit");
    }

    // ══════════════════════════════════════════════════════════
    //          TEST: SOVEREIGN OVERRIDE
    // ══════════════════════════════════════════════════════════

    /// @notice Tests the manual emergency exit (Sovereign Override)
    function test_SovereignOverride() public {
        // Set toxic
        address[] memory attackers = new address[](0);
        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 9500, keccak256("proof"), attackers);

        // Bob (unprotected) triggers sovereign override
        vm.prank(bob);
        hook.sovereignOverride(poolKey);

        // Bob can now remove liquidity within the cooldown window
        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: -60,
            tickUpper: 60,
            liquidityDelta: -1000,
            salt: bytes32(0)
        });

        vm.prank(mockPoolManager);
        bytes4 result = hook.beforeRemoveLiquidity(bob, poolKey, params, "");
        assertEq(result, IHooks.beforeRemoveLiquidity.selector, "Bob should be allowed after override");
    }

    /// @notice Tests cooldown enforcement on sovereign override
    function test_SovereignOverride_Cooldown() public {
        vm.prank(bob);
        hook.sovereignOverride(poolKey);

        // Immediately try again → should revert
        vm.prank(bob);
        vm.expectRevert(WraithHook.CooldownActive.selector);
        hook.sovereignOverride(poolKey);
    }

    // ══════════════════════════════════════════════════════════
    //          TEST: QUANTUM EXIT TRIGGER
    // ══════════════════════════════════════════════════════════

    function test_QuantumExit() public {
        // Set toxic
        address[] memory attackers = new address[](0);
        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 9500, keccak256("proof"), attackers);

        // Trigger quantum exit for Alice
        vm.prank(sentinel);
        hook.triggerQuantumExit(poolKey, alice);
        // Event emission validates success (tested via expectEmit in extended tests)
    }

    function test_QuantumExit_NotWraithGuard_Reverts() public {
        address[] memory attackers = new address[](0);
        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 9500, keccak256("proof"), attackers);

        vm.prank(sentinel);
        vm.expectRevert(WraithHook.NotWraithGuardUser.selector);
        hook.triggerQuantumExit(poolKey, bob);
    }

    function test_QuantumExit_NotToxic_Reverts() public {
        vm.prank(sentinel);
        vm.expectRevert(WraithHook.PoolToxic.selector);
        hook.triggerQuantumExit(poolKey, alice);
    }

    // ══════════════════════════════════════════════════════════
    //          TEST: GUARDIAN FUNCTIONS
    // ══════════════════════════════════════════════════════════

    function test_ArmDisarmPool() public {
        // Pool is already armed in setUp
        assertTrue(hook.isArmedPool(poolId), "Pool should be armed");

        vm.prank(guardian);
        hook.disarmPool(poolKey);
        assertFalse(hook.isArmedPool(poolId), "Pool should be disarmed");

        vm.prank(guardian);
        hook.armPool(poolKey);
        assertTrue(hook.isArmedPool(poolId), "Pool should be re-armed");
    }

    function test_ArmPool_OnlyGuardian() public {
        vm.prank(bob);
        vm.expectRevert(WraithHook.OnlyGuardian.selector);
        hook.armPool(poolKey);
    }

    function test_SetSentinel() public {
        address newSentinel = makeAddr("newSentinel");
        vm.prank(guardian);
        hook.setSentinel(newSentinel);
        assertEq(hook.sentinel(), newSentinel, "Sentinel should be updated");
    }

    function test_SetGuardian() public {
        address newGuardian = makeAddr("newGuardian");
        vm.prank(guardian);
        hook.setGuardian(newGuardian);
        assertEq(hook.guardian(), newGuardian, "Guardian should be updated");
    }

    function test_UnflagAddress() public {
        // Flag rugDev
        address[] memory attackers = new address[](1);
        attackers[0] = rugDev;
        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 9000, keccak256("proof"), attackers);
        assertTrue(hook.isFlaggedAttacker(poolId, rugDev), "Should be flagged");

        // Unflag
        vm.prank(guardian);
        hook.unflagAddress(poolKey, rugDev);
        assertFalse(hook.isFlaggedAttacker(poolId, rugDev), "Should be unflagged");
    }

    // ══════════════════════════════════════════════════════════
    //          TEST: ACCESS CONTROL
    // ══════════════════════════════════════════════════════════

    function test_OnlyPoolManager_BeforeSwap() public {
        IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: -1 ether,
            sqrtPriceLimitX96: 0
        });

        vm.prank(bob);
        vm.expectRevert(WraithHook.OnlyPoolManager.selector);
        hook.beforeSwap(bob, poolKey, swapParams, "");
    }

    function test_OnlyPoolManager_BeforeRemoveLiquidity() public {
        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: -60,
            tickUpper: 60,
            liquidityDelta: -1000,
            salt: bytes32(0)
        });

        vm.prank(bob);
        vm.expectRevert(WraithHook.OnlyPoolManager.selector);
        hook.beforeRemoveLiquidity(bob, poolKey, params, "");
    }

    // ══════════════════════════════════════════════════════════
    //          TEST: VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════

    function test_GetDefenseStatus() public {
        address[] memory attackers = new address[](0);
        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 9200, keccak256("proof"), attackers);

        (uint256 score, bool armed, bool toxic, bytes32 proof) = hook.getDefenseStatus(poolKey);

        assertEq(score, 9200);
        assertTrue(armed);
        assertTrue(toxic);
        assertEq(proof, keccak256("proof"));
    }

    function test_GetDefenseStatus_SafePool() public {
        (uint256 score, bool armed, bool toxic, bytes32 proof) = hook.getDefenseStatus(poolKey);

        assertEq(score, 0);
        assertTrue(armed);
        assertFalse(toxic);
        assertEq(proof, bytes32(0));
    }

    // ══════════════════════════════════════════════════════════
    //     TEST: NON-TOXIC POOL — NORMAL BEHAVIOR
    // ══════════════════════════════════════════════════════════

    function test_NormalSwap_NoToxicity() public {
        IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: -1 ether,
            sqrtPriceLimitX96: 0
        });

        // Anyone can swap normally when not toxic
        vm.prank(mockPoolManager);
        (, , uint24 fee) = hook.beforeSwap(rugDev, poolKey, swapParams, "");

        assertEq(fee, 0, "No fee override in non-toxic state");
    }

    function test_NormalRemoveLiquidity_NoToxicity() public {
        IPoolManager.ModifyLiquidityParams memory params = IPoolManager.ModifyLiquidityParams({
            tickLower: -60,
            tickUpper: 60,
            liquidityDelta: -1000,
            salt: bytes32(0)
        });

        // Anyone can remove liquidity when not toxic
        vm.prank(mockPoolManager);
        bytes4 result = hook.beforeRemoveLiquidity(rugDev, poolKey, params, "");
        assertEq(result, IHooks.beforeRemoveLiquidity.selector);
    }

    // ══════════════════════════════════════════════════════════
    //     TEST: DISARMED POOL — NO PROTECTION
    // ══════════════════════════════════════════════════════════

    function test_DisarmedPool_NoPoisonFee() public {
        // Set toxicity but disarm the pool
        address[] memory attackers = new address[](1);
        attackers[0] = rugDev;
        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 9500, keccak256("proof"), attackers);

        vm.prank(guardian);
        hook.disarmPool(poolKey);

        IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: -1 ether,
            sqrtPriceLimitX96: 0
        });

        // rugDev can swap normally when pool is disarmed
        vm.prank(mockPoolManager);
        (, , uint24 fee) = hook.beforeSwap(rugDev, poolKey, swapParams, "");
        assertEq(fee, 0, "No fee override when pool disarmed");
    }

    // ══════════════════════════════════════════════════════════
    //    TEST: FULL RUG SCENARIO — END TO END
    // ══════════════════════════════════════════════════════════

    /// @notice Full integration scenario:
    ///   Phase 1: Normal operation
    ///   Phase 2: Gensyn detects malice → toxicity rises
    ///   Phase 3: Wraith activates → Poison Hook + Quantum Exit
    ///   Phase 4: Attacker neutralized → toxicity cleared
    function test_FullRug_EndToEnd() public {
        console2.log("\n+======================================+");
        console2.log("|  WRAITH-GUARD: FULL RUG SIMULATION  |");
        console2.log("+======================================+\n");

        IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: -1 ether,
            sqrtPriceLimitX96: 0
        });

        // ── Phase 1: Normal Operation ──
        console2.log("[Phase 1] Normal Operation");
        vm.prank(mockPoolManager);
        (, , uint24 feePhase1) = hook.beforeSwap(rugDev, poolKey, swapParams, "");
        assertEq(feePhase1, 0, "Phase 1: No fee override");
        console2.log("  rugDev swaps normally. Fee override: 0");

        // ── Phase 2: Gensyn Detects Anomaly ──
        console2.log("\n[Phase 2] Gensyn Sentinel Detects Anomaly");
        address[] memory attackers = new address[](1);
        attackers[0] = rugDev;

        // First detection: moderate toxicity
        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 5000, keccak256("scan_1"), attackers);
        console2.log("  Toxicity: 5000 (50%%) - Monitoring...");

        // Second detection: critical toxicity
        vm.prank(sentinel);
        hook.updateToxicity(poolKey, 9200, keccak256("proof_of_malice"), attackers);
        console2.log("  Toxicity: 9200 (92%%) - CRITICAL!");

        assertTrue(hook.isPoolToxic(poolKey), "Pool should be toxic");

        // ── Phase 3: Wraith Activates ──
        console2.log("\n[Phase 3] Wraith Active Defense Engaged!");

        // rugDev tries swap → POISON (99%)
        vm.prank(mockPoolManager);
        (, , uint24 feePhase3) = hook.beforeSwap(rugDev, poolKey, swapParams, "");
        uint24 expectedPoisonFee = hook.POISON_FEE() | LPFeeLibrary.OVERRIDE_FEE_FLAG;
        assertEq(feePhase3, expectedPoisonFee, "Phase 3: rugDev gets poison fee");
        console2.log("  rugDev swap POISONED! Fee: 99%%");

        // Alice swaps safely
        vm.prank(mockPoolManager);
        (, , uint24 aliceFee) = hook.beforeSwap(alice, poolKey, swapParams, "");
        uint24 expectedGuardFee = hook.GUARD_FEE() | LPFeeLibrary.OVERRIDE_FEE_FLAG;
        assertEq(aliceFee, expectedGuardFee, "Phase 3: Alice gets guard fee");
        console2.log("  Alice swap PROTECTED! Fee: 0%%");

        // Quantum Exit triggered
        vm.prank(sentinel);
        hook.triggerQuantumExit(poolKey, alice);
        console2.log("  Quantum Exit triggered for Alice!");

        // ── Phase 4: Threat Neutralized ──
        console2.log("\n[Phase 4] Threat Neutralized");
        vm.prank(sentinel);
        hook.clearToxicity(poolKey);
        assertFalse(hook.isPoolToxic(poolKey), "Pool should be safe");
        console2.log("  Toxicity cleared. Pool safe.");

        // rugDev can swap again (no longer flagged at pool level, but still marked)
        vm.prank(mockPoolManager);
        (, , uint24 feePhase4) = hook.beforeSwap(rugDev, poolKey, swapParams, "");
        assertEq(feePhase4, 0, "Phase 4: No fee override when safe");
        console2.log("  Normal operations resumed.\n");

        console2.log("+======================================+");
        console2.log("|      WRAITH-GUARD: ALL CLEAR         |");
        console2.log("+======================================+");
    }

    // ══════════════════════════════════════════════════════════
    //         FUZZ TEST: TOXICITY BOUNDARIES
    // ══════════════════════════════════════════════════════════

    function testFuzz_ToxicityThreshold(uint256 score) public {
        score = bound(score, 0, 10000);

        address[] memory attackers = new address[](1);
        attackers[0] = rugDev;

        vm.prank(sentinel);
        hook.updateToxicity(poolKey, score, keccak256(abi.encode(score)), attackers);

        IPoolManager.SwapParams memory swapParams = IPoolManager.SwapParams({
            zeroForOne: true,
            amountSpecified: -1 ether,
            sqrtPriceLimitX96: 0
        });

        vm.prank(mockPoolManager);
        (, , uint24 fee) = hook.beforeSwap(rugDev, poolKey, swapParams, "");

        if (score >= hook.TOXICITY_THRESHOLD()) {
            // Should be poison fee
            uint24 expectedFee = hook.POISON_FEE() | LPFeeLibrary.OVERRIDE_FEE_FLAG;
            assertEq(fee, expectedFee, "Poison fee should apply above threshold");
        } else {
            // No override
            assertEq(fee, 0, "No fee override below threshold");
        }
    }
}
