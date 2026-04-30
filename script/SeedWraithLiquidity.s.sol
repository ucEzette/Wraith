// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";

contract WraithSeeder {
    using CurrencyLibrary for Currency;

    IPoolManager public immutable manager;

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    function seed(PoolKey calldata key, int24 tickLower, int24 tickUpper, int128 liquidityDelta) external {
        // Estimate amounts and pull tokens from sender first (simplified)
        // For seeding, we just pull enough to be safe
        IERC20(Currency.unwrap(key.currency0)).transferFrom(msg.sender, address(this), 100e18);
        IERC20(Currency.unwrap(key.currency1)).transferFrom(msg.sender, address(this), 100e18);
        
        manager.unlock(abi.encode(key, tickLower, tickUpper, liquidityDelta));
    }

    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(manager));
        (PoolKey memory key, int24 tickLower, int24 tickUpper, int128 liquidityDelta) = 
            abi.decode(data, (PoolKey, int24, int24, int128));

        (BalanceDelta delta, ) = manager.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: liquidityDelta,
                salt: bytes32(0)
            }),
            new bytes(0)
        );

        console2.log("Delta Amount0:", delta.amount0());
        console2.log("Delta Amount1:", delta.amount1());

        if (delta.amount0() > 0) {
            uint128 amount = uint128(int128(delta.amount0()));
            IERC20(Currency.unwrap(key.currency0)).transfer(address(manager), amount);
            manager.settle();
        } else if (delta.amount0() < 0) {
            manager.take(key.currency0, tx.origin, uint128(int128(-delta.amount0())));
        }

        if (delta.amount1() > 0) {
            uint128 amount = uint128(int128(delta.amount1()));
            IERC20(Currency.unwrap(key.currency1)).transfer(address(manager), amount);
            manager.settle();
        } else if (delta.amount1() < 0) {
            manager.take(key.currency1, tx.origin, uint128(int128(-delta.amount1())));
        }

        return "";
    }
}

contract SeedWraithLiquidity is Script {
    using CurrencyLibrary for Currency;

    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    address constant QPHAN = 0x9d803A3066C858d714c4F5eE286eaa6249d451aB;
    address constant ECHO = 0x6586035D5e39e30bf37445451b43EEaEeAa1405a;
    address constant HOOK = 0xD56388a4ce5Cd9E236201AD3DF27Edfbb28E0280;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Seeder
        WraithSeeder seeder = new WraithSeeder(IPoolManager(POOL_MANAGER));
        console2.log("Seeder deployed at:", address(seeder));

        // Sort currencies
        Currency c0 = Currency.wrap(QPHAN < ECHO ? QPHAN : ECHO);
        Currency c1 = Currency.wrap(QPHAN < ECHO ? ECHO : QPHAN);

        PoolKey memory key = PoolKey({
            currency0: c0,
            currency1: c1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(HOOK)
        });

        // Approve tokens to Seeder (to allow transferFrom)
        IERC20(QPHAN).approve(address(seeder), type(uint256).max);
        IERC20(ECHO).approve(address(seeder), type(uint256).max);

        // Seed 1 token worth of liquidity
        seeder.seed(key, -600, 600, 1e18);
        console2.log("Liquidity seeded!");

        vm.stopBroadcast();
    }
}
