// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title InitializeWraithPool
 * @dev Initializes a Uniswap v4 pool with the WraithHook and test tokens.
 */
contract InitializeWraithPool is Script {
    using CurrencyLibrary for Currency;

    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    address constant QPHAN = 0x9d803A3066C858d714c4F5eE286eaa6249d451aB;
    address constant ECHO = 0x6586035D5e39e30bf37445451b43EEaEeAa1405a;
    address constant HOOK = 0xD56388a4ce5Cd9E236201AD3DF27Edfbb28E0280;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

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

        // Initialize pool at 1:1 price
        uint160 sqrtPriceX96 = 79228162514264337593543950336; 
        
        try IPoolManager(POOL_MANAGER).initialize(key, sqrtPriceX96) returns (int24 tick) {
            console2.log("Pool initialized successfully at tick:", tick);
        } catch {
            console2.log("Pool already initialized or failed.");
        }

        vm.stopBroadcast();
    }
}
