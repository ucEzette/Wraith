// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WraithHook} from "../contracts/WraithHook.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

contract MineSalt is Script {
    function run() external view {
        address deployer = 0x68faEBF19FA57658d37bF885F5377f735FE97D70;
        address poolManager = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
        address sentinel = deployer;
        address guardian = deployer;

        bytes memory bytecode = abi.encodePacked(
            type(WraithHook).creationCode,
            abi.encode(poolManager, sentinel, guardian)
        );

        uint160 targetMask = 0x3FFF;
        uint160 targetBits = 0x280;

        for (uint256 i = 0; i < 1000000; i++) {
            bytes32 salt = bytes32(i);
            address hookAddress = address(uint160(uint256(keccak256(abi.encodePacked(
                bytes1(0xff),
                deployer,
                salt,
                keccak256(bytecode)
            )))));

            if (uint160(hookAddress) & targetMask == targetBits) {
                console.log("Found salt:", i);
                console.log("Hook address:", hookAddress);
                return;
            }
        }
        console.log("No salt found in 1M iterations.");
    }
}
