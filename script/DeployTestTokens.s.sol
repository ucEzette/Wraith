// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {MockToken} from "../contracts/test/MockToken.sol";
import {console2} from "forge-std/console2.sol";

contract DeployTestTokens is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Max supply: 21 million each
        uint256 maxSupply = 21_000_000;

        MockToken neon = new MockToken("Neon Protocol", "NEON", maxSupply);
        MockToken void = new MockToken("Void Essence", "VOID", maxSupply);

        console2.log("NEON deployed at:", address(neon));
        console2.log("VOID deployed at:", address(void));

        vm.stopBroadcast();
    }
}
