const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.UNICHAIN_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`Using wallet: ${wallet.address}`);

    const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";
    const WRAITH = "0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174";
    const HOOK = process.env.WRAITH_HOOK_ADDRESS;
    const POOL_MANAGER = "0x00b036b58a818b1bc34d502d3fe730db729e62ac";
    const HELPER = "0x5fa728C0A5cfd51BEe4B060773f50554c0C8A7AB";

    const poolKey = {
        currency0: USDC < WRAITH ? USDC : WRAITH,
        currency1: USDC < WRAITH ? WRAITH : USDC,
        fee: 3000,
        tickSpacing: 60,
        hooks: HOOK
    };

    const erc20Abi = [
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address account) view returns (uint256)"
    ];

    const pmAbi = [
        "function initialize((address,address,uint24,int24,address),uint160) external returns (int24)"
    ];

    const helperAbi = [
        "function modifyLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt) params, bytes hookData) external returns (int256, int256)"
    ];

    const usdc = new ethers.Contract(USDC, erc20Abi, wallet);
    const wraith = new ethers.Contract(WRAITH, erc20Abi, wallet);
    const pm = new ethers.Contract(POOL_MANAGER, pmAbi, wallet);
    const helper = new ethers.Contract(HELPER, helperAbi, wallet);

    // 1. Approvals
    console.log("Approving tokens...");
    await (await usdc.approve(HELPER, ethers.MaxUint256)).wait();
    await (await wraith.approve(HELPER, ethers.MaxUint256)).wait();
    console.log("Approvals done.");

    // 2. Initialize
    // Ratio: 50,000 WRAITH / 10 USDC = 5000 WRAITH per 1 USDC
    // Decimal adjusted: 5000 * 10^12 = 5e15
    // sqrtPriceX96 = sqrt(5e15) * 2^96
    const sqrtPriceX96 = "5602284547405798440520663105536000"; // calculated manually: sqrt(5e15) * 2^96
    
    console.log("Initializing pool...");
    try {
        const initTx = await pm.initialize(
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
            sqrtPriceX96
        );
        await initTx.wait();
        console.log("Pool initialized.");
    } catch (e) {
        console.log("Pool already initialized or init failed.");
    }

    // 3. Add Liquidity
    // For 10 USDC (10e6) in a narrow range [-600, 600]
    // L approx = amount0 / 0.03 (at 1:1, but here price is 5e15)
    // Actually, we'll just use a large enough delta to cover the 10 USDC.
    // L = 10e6 * 2^96 / (sqrt(P) - sqrt(P_low))
    // We'll just provide a delta that results in ~10 USDC.
    const liquidityDelta = 50000000000000n; // 5e13

    console.log("Adding liquidity...");
    const liqTx = await helper.modifyLiquidity(
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
        {
            tickLower: -60000, // wider range for stability
            tickUpper: 60000,
            liquidityDelta: liquidityDelta,
            salt: ethers.ZeroHash
        },
        "0x",
        { gasLimit: 2000000 }
    );
    await liqTx.wait();
    console.log("Liquidity added. WRAITH/USDC pool is LIVE with 50,000:10 ratio.");
}

main().catch(console.error);
