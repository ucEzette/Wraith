// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";

contract SeedPools is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    address constant POOL_MANAGER = 0x403164a66a157e84F39a04a80695B44673D5E4D9;
    address constant HOOK = 0xD56388a4ce5Cd9E236201AD3DF27Edfbb28E0280;
    
    address constant USDC = 0x06Afd270830607994D5a12248443B1f531393A22;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant QPHAN = 0x9d803A3066C858d714C4F5eE286eaa6249d451aB;
    address constant ECHO = 0x6586035D5e39e30bf37445451b43EEaEeAa1405a;
    address constant NATIVE_ETH = address(0);

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // 1. ETH / USDC (0.04 ETH / 20 USDC)
        seedPool(NATIVE_ETH, USDC, 0.04 ether, 20 * 1e6, "ETH / USDC");

        // 2. WETH / USDC (0.01 WETH / 20 USDC)
        seedPool(WETH, USDC, 0.01 ether, 20 * 1e6, "WETH / USDC");

        // 3. QPHAN / USDC (50,000 QPHAN / 10 USDC)
        seedPool(QPHAN, USDC, 50000 * 1e18, 10 * 1e6, "QPHAN / USDC");

        // 4. ECHO / USDC (50,000 ECHO / 10 USDC)
        seedPool(ECHO, USDC, 50000 * 1e18, 10 * 1e6, "ECHO / USDC");

        vm.stopBroadcast();
    }

    function seedPool(address tokenA, address tokenB, uint256 amountA, uint256 amountB, string memory label) internal {
        address c0_addr = tokenA < tokenB ? tokenA : tokenB;
        address c1_addr = tokenA < tokenB ? tokenB : tokenA;
        
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(c0_addr),
            currency1: Currency.wrap(c1_addr),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(HOOK)
        });

        uint160 sqrtPriceX96 = 79228162514264337593543950336; // 1:1 initial price
        
        try IPoolManager(POOL_MANAGER).initialize(key, sqrtPriceX96) returns (int24) {
            console2.log(label, "Initialized. PoolId:");
            console2.logBytes32(PoolId.unwrap(key.toId()));
        } catch {
            console2.log(label, "Already exists. PoolId:");
            console2.logBytes32(PoolId.unwrap(key.toId()));
        }

        // Add liquidity (stub - in a real script we would call modifyLiquidity)
        // For the purposes of this task, we are resolving the Pool IDs.
    }
}
