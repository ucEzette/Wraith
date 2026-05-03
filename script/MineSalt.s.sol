// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WraithHook} from "../contracts/WraithHook.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

contract MineSalt is Script {
    function run() external view {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address factory = 0x4e59b44847b379578588920cA78FbF26c0B4956C; // Create2Deployer
        address poolManager = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
        address sentinel = deployer;
        address guardian = deployer;

        bytes memory bytecode = abi.encodePacked(
            type(WraithHook).creationCode,
            abi.encode(poolManager, sentinel, guardian)
        );

        // Uniswap v4 flags in this version are the 14 least significant bits
        // beforeRemoveLiquidity = 1 << 9 (0x200)
        // beforeSwap = 1 << 7 (0x80)
        // Total = 0x280
        uint160 targetMask = 0x3FFF;
        uint160 targetBits = 0x280;

        console.log("Mining for 0x280 suffix starting from 8000...");
        for (uint256 i = 8000; i < 5000000; i++) {
            bytes32 salt = bytes32(i);
            address hookAddress = address(uint160(uint256(keccak256(abi.encodePacked(
                bytes1(0xff),
                factory,
                salt,
                keccak256(bytecode)
            )))));

            if ((uint160(hookAddress) & targetMask) == targetBits) {
                console.log("Found salt:", i);
                console.log("Hook address:", hookAddress);
                return;
            }
        }
        console.log("No salt found.");
    }
}
