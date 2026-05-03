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

contract AddOneSidedWraith is Script {
    using CurrencyLibrary for Currency;

    address constant POOL_MANAGER = 0x00B036B58a818B1BC34d502D3fE730Db729e62AC;
    address constant MODIFY_LIQUIDITY_TEST = 0x5fa728C0A5cfd51BEe4B060773f50554c0C8A7AB;
    address constant USDC = 0x31d0220469e10c4E71834a79b1f276d740d3768F;
    address constant WRAITH = 0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174;
    address constant HOOK = 0x83cabbF63Cbe0b7EaF14824F4C7529480fAC8280;

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

        // Amount: 20,000 WRAITH tokens (18 decimals)
        // Since we want to add ONLY WRAITH, we pick a range below the current price (tick 0).
        // Range: -1200 to -600
        
        // Approvals
        IERC20(WRAITH).approve(MODIFY_LIQUIDITY_TEST, type(uint256).max);
        IERC20(USDC).approve(MODIFY_LIQUIDITY_TEST, type(uint256).max);

        console2.log("Adding 20,000 WRAITH to the pool (one-sided)...");

        // We use a large liquidity delta to reach ~20,000 tokens.
        // Math: L = delta_y / (sqrt(P_H) - sqrt(P_L))
        // For -1200 to -600: L = 20000e18 / (0.9704 - 0.9417) = 2e22 / 0.0287 = 6.96e23
        
        try IPoolModifyLiquidityTest(MODIFY_LIQUIDITY_TEST).modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({
                tickLower: -1200,
                tickUpper: -600,
                liquidityDelta: 696e21, // Approx L for 20,000 WRAITH
                salt: bytes32(uint256(1)) // Use a different salt for this position
            }),
            new bytes(0)
        ) returns (BalanceDelta delta) {
            console2.log("Successfully added one-sided liquidity!");
            console2.log("Amount0 delta:", delta.amount0());
            console2.log("Amount1 delta:", delta.amount1());
        } catch (bytes memory reason) {
            console2.log("Failed to add liquidity");
            console2.logBytes(reason);
        }

        vm.stopBroadcast();
    }
}
