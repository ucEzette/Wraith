// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WraithHook} from "../contracts/WraithHook.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

contract DeployWraith is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address poolManager = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
        address sentinel = deployer;
        address guardian = deployer;

        // Salt found via MineSalt for 0x280 suffix
        bytes32 salt = bytes32(uint256(47353));
        
        vm.startBroadcast(deployerPrivateKey);

        WraithHook hook = new WraithHook{salt: salt}(
            IPoolManager(poolManager),
            sentinel,
            guardian
        );
        
        console.log("Deployed WraithHook at:", address(hook));

        vm.stopBroadcast();
    }
}
