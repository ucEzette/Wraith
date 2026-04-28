// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WraithHook} from "../contracts/WraithHook.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

contract WraithServices is Script {
    using PoolIdLibrary for PoolKey;

    address hookAddress = 0x7Da6934Dc1231398C63DE28051588775B1b70280;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address sentinel = vm.addr(deployerPrivateKey);
        
        WraithHook hook = WraithHook(hookAddress);

        // Pool data for QPHAN / ECHO
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(0x6586035D5e39e30bf37445451b43EEaEeAa1405a),
            currency1: Currency.wrap(0x9d803A3066C858d714c4F5eE286eaa6249d451aB),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });

        PoolId poolId = key.toId();
        address[] memory attackers = new address[](0);

        vm.startBroadcast(deployerPrivateKey);

        console.log("-----------------------------------------");
        console.log("WRAITH PROTOCOL SERVICES ACTIVE");
        console.log("-----------------------------------------");

        // 1. GENSYN SIMULATION: Arming the pool
        console.log("GenSyn: Arming QPHAN / ECHO pool for monitoring...");
        hook.armPool(key);

        // 2. GENSYN SIMULATION: Updating Toxicity
        console.log("GenSyn: Detecting high volatility... Pushing toxicity update.");
        hook.updateToxicity(key, 4500, bytes32(0), attackers); // 45% toxicity
        
        console.log("Sentinel: Toxicity score for", uint256(PoolId.unwrap(poolId)), "is now 4500");
        
        vm.stopBroadcast();
        
        console.log("-----------------------------------------");
        console.log("KEEPER HUB: Listening for Quantum Exit events...");
        console.log("-----------------------------------------");
    }
}
