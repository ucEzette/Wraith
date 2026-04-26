// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WraithHook} from "../contracts/WraithHook.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

contract DeployWraith is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address poolManager = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
        address sentinel = deployer;
        address guardian = deployer;

        bytes memory bytecode = abi.encodePacked(
            type(WraithHook).creationCode,
            abi.encode(poolManager, sentinel, guardian)
        );

        uint160 targetMask = 0x3FFF;
        uint160 targetBits = 0x280;
        bytes32 salt;
        bool found = false;

        console.log("Mining salt for WraithHook...");
        for (uint256 i = 0; i < 1000000; i++) {
            salt = bytes32(i);
            address hookAddress = address(uint160(uint256(keccak256(abi.encodePacked(
                bytes1(0xff),
                0x4e59b44847b379578588920cA78FbF26c0B4956C, // Standard Create2Deployer
                salt,
                keccak256(bytecode)
            )))));

            if (uint160(hookAddress) & targetMask == targetBits) {
                console.log("Found salt:", i);
                console.log("Predicted address:", hookAddress);
                found = true;
                break;
            }
        }

        require(found, "Could not find salt");

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
