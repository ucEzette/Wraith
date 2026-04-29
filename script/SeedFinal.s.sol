// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";

interface IPoolModifyLiquidityTest {
    function modifyLiquidity(
        PoolKey memory key,
        IPoolManager.ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external payable returns (BalanceDelta);
}

contract SeedFinal is Script {
    using CurrencyLibrary for Currency;

    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    address constant MODIFY_LIQUIDITY_TEST = 0x5fa728C0A5cfd51BEe4B060773f50554c0C8A7AB;
    address constant USDC = 0x31d0220469e10c4E71834a79b1f276d740d3768F;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant QPHAN = 0x9d803A3066C858d714c4F5eE286eaa6249d451aB;
    address constant ECHO = 0x6586035D5e39e30bf37445451b43EEaEeAa1405a;
    address constant WRAITH = 0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174;
    address constant HOOK = 0x7Da6934Dc1231398C63DE28051588775B1b70280;

    function run() public {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);

        address[4] memory tokens = [WETH, QPHAN, ECHO, WRAITH];
        string[4] memory names = ["ETH", "QPHAN", "ECHO", "WRAITH"];

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

            // Initialize is done, so we skip.
            
            // Approvals - MUST approve the TEST contract, not the manager
            if (Currency.unwrap(key.currency0) != address(0)) IERC20(Currency.unwrap(key.currency0)).approve(MODIFY_LIQUIDITY_TEST, type(uint256).max);
            if (Currency.unwrap(key.currency1) != address(0)) IERC20(Currency.unwrap(key.currency1)).approve(MODIFY_LIQUIDITY_TEST, type(uint256).max);

            // Seed 10 USDC (1e7) and 0.004 ETH (4e15) or equivalent tokens
            // liquidityDelta is harder to estimate exactly, so we use a safe amount
            try IPoolModifyLiquidityTest(MODIFY_LIQUIDITY_TEST).modifyLiquidity{value: Currency.unwrap(key.currency0) == address(0) || Currency.unwrap(key.currency1) == address(0) ? 0.01 ether : 0}(
                key,
                IPoolManager.ModifyLiquidityParams({
                    tickLower: -600,
                    tickUpper: 600,
                    liquidityDelta: 1e4,
                    salt: bytes32(0)
                }),
                new bytes(0)
            ) {
                console2.log(names[i], "seeded!");
            } catch {
                console2.log(names[i], "seeding failed - trying smaller amount");
                try IPoolModifyLiquidityTest(MODIFY_LIQUIDITY_TEST).modifyLiquidity{value: Currency.unwrap(key.currency0) == address(0) || Currency.unwrap(key.currency1) == address(0) ? 0.01 ether : 0}(
                    key,
                    IPoolManager.ModifyLiquidityParams({
                        tickLower: -600,
                        tickUpper: 600,
                        liquidityDelta: 1e12,
                        salt: bytes32(0)
                    }),
                    new bytes(0)
                ) {
                    console2.log(names[i], "seeded (small)!");
                } catch {
                    console2.log(names[i], "completely failed to seed");
                }
            }
        }

        vm.stopBroadcast();
    }
}
