// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";

interface IPoolModifyLiquidityTest {
    function modifyLiquidity(
        PoolKey memory key,
        IPoolManager.ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external payable returns (BalanceDelta);
}

contract SeedWraith is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    address constant MODIFY_LIQUIDITY_TEST = 0x5fa728C0A5cfd51BEe4B060773f50554c0C8A7AB;
    address constant USDC = 0x31d0220469e10c4E71834a79b1f276d740d3768F;
    address constant WRAITH = 0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174;
    address constant HOOK = 0x62B207729023CD2544a5BE6791f1bb77fb2cc280;

    function run() public {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        address c0 = WRAITH < USDC ? WRAITH : USDC;
        address c1 = WRAITH < USDC ? USDC : WRAITH;

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(c0),
            currency1: Currency.wrap(c1),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(HOOK)
        });

        /*
        // Initialize
        try IPoolManager(POOL_MANAGER).initialize(key, 79228162514264337593543950336) returns (int24) {
            console2.log("WRAITH initialized!");
        } catch {
            console2.log("WRAITH already initialized");
        }
        */

        // Approval
        IERC20(Currency.unwrap(key.currency0)).approve(MODIFY_LIQUIDITY_TEST, type(uint256).max);
        IERC20(Currency.unwrap(key.currency1)).approve(MODIFY_LIQUIDITY_TEST, type(uint256).max);

        // Seed
        // Using a moderate liquidity delta
        try IPoolModifyLiquidityTest(MODIFY_LIQUIDITY_TEST).modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: -600,
                tickUpper: 600,
                liquidityDelta: 5e8,
                salt: bytes32(0)
            }),
            new bytes(0)
        ) {
            console2.log("WRAITH seeded!");
        } catch (bytes memory reason) {
            console2.log("Seeding failed");
            console2.logBytes(reason);
        }

        vm.stopBroadcast();
    }
}
