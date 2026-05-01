/**
 * Wraith Add Liquidity Script
 * Adds 20 USDC and equivalent WRAITH to the pool.
 */
const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.UNICHAIN_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`Using wallet: ${wallet.address}`);

    const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";
    const WRAITH = "0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174";
    const HOOK = process.env.WRAITH_HOOK_ADDRESS;
    const HELPER = "0x5fa728C0A5cfd51BEe4B060773f50554c0C8A7AB";

    const poolKey = {
        currency0: USDC < WRAITH ? USDC : WRAITH,
        token0Name: USDC < WRAITH ? "USDC" : "WRAITH",
        currency1: USDC < WRAITH ? WRAITH : USDC,
        token1Name: USDC < WRAITH ? "WRAITH" : "USDC",
        fee: 3000,
        tickSpacing: 60,
        hooks: HOOK
    };

    const finalPoolKey = {
        currency0: poolKey.currency0,
        currency1: poolKey.currency1,
        fee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
        hooks: poolKey.hooks
    };

    const erc20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ];

    const helperAbi = [
        "function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external returns (int256, int256)"
    ];

    const t0 = new ethers.Contract(poolKey.currency0, erc20Abi, wallet);
    const t1 = new ethers.Contract(poolKey.currency1, erc20Abi, wallet);
    const helper = new ethers.Contract(HELPER, helperAbi, wallet);

    console.log("Tokens already approved. Proceeding to liquidity...");

    // We want ~20 USDC. 
    // USDC is token0 (6 decimals)
    // L = amount0 / (1/sqrt(P_low) - 1/sqrt(P))
    // For tick -600 to 600, 1/sqrt(P_low) - 1/sqrt(P) is approx 0.03
    // For 20 USDC (20e6 units), L = 20e6 / 0.03 ~= 6.6e8
    
    const liquidityDelta = 660000000n; 
    const gasPrice = ethers.parseUnits("150", "gwei");

    console.log(`Adding liquidity with delta: ${liquidityDelta}...`);
    try {
        const tx = await helper.modifyLiquidity(
            finalPoolKey,
            {
                tickLower: -600,
                tickUpper: 600,
                liquidityDelta: liquidityDelta,
                salt: ethers.ZeroHash
            },
            "0x",
            { 
                gasLimit: 1000000,
                gasPrice: gasPrice
            }
        );
        console.log(`Liquidity Transaction Sent: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Liquidity Added Successfully in block ${receipt.blockNumber}`);
    } catch (e) {
        console.error(`Error adding liquidity: ${e.message}`);
    }
}

main().catch(console.error);
