// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";

contract GetPoolIds is Script {
    using PoolIdLibrary for PoolKey;

    address constant USDC = 0x31d0220469e10c4E71834a79b1f276d740d3768F;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant QPHAN = 0x9d803A3066C858d714c4F5eE286eaa6249d451aB;
    address constant ECHO = 0x6586035D5e39e30bf37445451b43EEaEeAa1405a;
    address constant WRAITH = 0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174;
    address constant HOOK = 0x83cabbF63Cbe0b7EaF14824F4C7529480fAC8280;

    function run() public view {
        address[4] memory tokens = [WETH, QPHAN, ECHO, WRAITH];
        string[4] memory names = ["ETH / USDC", "QPHAN / USDC", "ECHO / USDC", "WRAITH / USDC"];

        for (uint i = 0; i < 4; i++) {
            address t = tokens[i];
            address c0 = t < USDC ? t : USDC;
            address c1 = t < USDC ? USDC : t;

            PoolKey memory key = PoolKey({
                currency0: Currency.wrap(c0),
                currency1: Currency.wrap(c1),
                fee: 3000,
                tickSpacing: 60,
                hooks: IHooks(HOOK)
            });

            console2.log(names[i]);
            console2.logBytes32(PoolId.unwrap(key.toId()));
        }
    }
}
