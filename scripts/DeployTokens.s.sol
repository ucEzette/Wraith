// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {QuantumPhantom} from "../contracts/QuantumPhantom.sol";
import {EternalEcho} from "../contracts/EternalEcho.sol";

contract DeployTokens is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        QuantumPhantom qphan = new QuantumPhantom();
        console2.log("QuantumPhantom deployed at:", address(qphan));

        EternalEcho echo = new EternalEcho();
        console2.log("EternalEcho deployed at:", address(echo));

        vm.stopBroadcast();
    }
}
