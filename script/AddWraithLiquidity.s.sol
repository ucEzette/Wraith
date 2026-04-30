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

contract AddWraithLiquidity is Script {
    using CurrencyLibrary for Currency;

    address constant MODIFY_LIQUIDITY_TEST = 0x5fa728C0A5cfd51BEe4B060773f50554c0C8A7AB;
    address constant USDC   = 0x31d0220469e10c4E71834a79b1f276d740d3768F;
    address constant WRAITH = 0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174;
    address constant HOOK   = 0xD56388a4ce5Cd9E236201AD3DF27Edfbb28E0280;

    function run() public {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);

        // USDC (0x31...) < WRAITH (0x9d...) => currency0 = USDC, currency1 = WRAITH
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(USDC),
            currency1: Currency.wrap(WRAITH),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(HOOK)
        });

        // Pool already initialized on-chain. Just add liquidity.

        // Approve tokens to the liquidity test router
        IERC20(USDC).approve(MODIFY_LIQUIDITY_TEST, type(uint256).max);
        IERC20(WRAITH).approve(MODIFY_LIQUIDITY_TEST, type(uint256).max);

        console2.log("USDC balance:", IERC20(USDC).balanceOf(deployer));
        console2.log("WRAITH balance:", IERC20(WRAITH).balanceOf(deployer));

        // liquidityDelta ~7e6 ≈ 20 USDC worth
        // Using a wide tick range around current tick (-368460)
        IPoolModifyLiquidityTest(MODIFY_LIQUIDITY_TEST).modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: -23040,
                tickUpper: 23040,
                liquidityDelta: 7000000,
                salt: bytes32(0)
            }),
            new bytes(0)
        );
        console2.log("Liquidity added successfully!");

        console2.log("USDC balance after:", IERC20(USDC).balanceOf(deployer));
        console2.log("WRAITH balance after:", IERC20(WRAITH).balanceOf(deployer));

        vm.stopBroadcast();
    }
}
