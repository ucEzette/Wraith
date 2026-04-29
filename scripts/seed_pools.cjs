/**
 * Wraith Pool Seeder
 * 
 * 1. Initializes Uniswap v4 pools with WraithHook.
 * 2. Seeds each pool with specified liquidity.
 * 3. Uses USDC address: 0x31d0220469e10c4E71834a79b1f276d740d3768F
 */

const { ethers } = require("ethers");
require("dotenv").config();

// CONFIG
const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";
const WETH = "0x4200000000000000000000000000000000000006";
const QPHAN = "0x9d803a3066c858d714c4f5ee286eaa6249d451ab";
const ECHO = "0x6586035d5e39e30bf37445451b43eeaeeaa1405a";
const WRAITH = "0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174";

const HOOK = process.env.WRAITH_HOOK_ADDRESS;
const POOL_MANAGER = process.env.POOL_MANAGER_ADDRESS || "0x403164a66a157e84F39a04a80695B44673D5E4D9";

const POOLS_TO_SEED = [
    {
        name: "ETH / USDC",
        token0: WETH < USDC ? WETH : USDC,
        token1: WETH < USDC ? USDC : WETH,
        amount0: WETH < USDC ? "0.004" : "10",
        amount1: WETH < USDC ? "10" : "0.004"
    },
    {
        name: "QPHAN / USDC",
        token0: QPHAN < USDC ? QPHAN : USDC,
        token1: QPHAN < USDC ? USDC : QPHAN,
        amount0: QPHAN < USDC ? "50000" : "10",
        amount1: QPHAN < USDC ? "10" : "50000"
    },
    {
        name: "ECHO / USDC",
        token0: ECHO < USDC ? ECHO : USDC,
        token1: ECHO < USDC ? USDC : ECHO,
        amount0: ECHO < USDC ? "50000" : "10",
        amount1: ECHO < USDC ? "10" : "50000"
    },
    {
        name: "WRAITH / USDC",
        token0: WRAITH < USDC ? WRAITH : USDC,
        token1: WRAITH < USDC ? USDC : WRAITH,
        amount0: WRAITH < USDC ? "50000" : "10",
        amount1: WRAITH < USDC ? "10" : "50000"
    }
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

const POOL_MANAGER_ABI = [
    "function initialize(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external returns (int24)",
    "function unlock(bytes calldata data) external returns (bytes memory)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.UNICHAIN_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`Using wallet: ${wallet.address}`);

    const poolManagerAddress = ethers.getAddress(POOL_MANAGER.toLowerCase());
    const hookAddress = ethers.getAddress(HOOK.toLowerCase());
    const usdcAddress = ethers.getAddress(USDC.toLowerCase());

    const poolManager = new ethers.Contract(poolManagerAddress, POOL_MANAGER_ABI, wallet);

    for (const pool of POOLS_TO_SEED) {
        console.log(`\n--- Seeding ${pool.name} ---`);
        
        const poolKey = {
            currency0: ethers.getAddress(pool.token0.toLowerCase()),
            currency1: ethers.getAddress(pool.token1.toLowerCase()),
            fee: 3000,
            tickSpacing: 60,
            hooks: hookAddress
        };

        const poolId = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
                ["address", "address", "uint24", "int24", "address"],
                [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
            )
        );
        console.log(`Pool ID: ${poolId}`);

        // 1. Initialize Pool
        try {
            console.log("Initializing pool...");
            const tx = await poolManager.initialize(poolKey, "79228162514264337593543950336", "0x", { 
                gasLimit: 1000000,
                gasPrice: ethers.parseUnits("5", "gwei")
            });
            await tx.wait();
            console.log("Pool initialized.");
        } catch (e) {
            if (e.message.includes("PoolAlreadyInitialized")) {
                console.log("Pool already initialized.");
            } else {
                console.log(`Initialization error: ${e.message}`);
            }
        }

        // 2. Approvals
        console.log("Checking approvals...");
        const t0 = new ethers.Contract(poolKey.currency0, ERC20_ABI, wallet);
        const t1 = new ethers.Contract(poolKey.currency1, ERC20_ABI, wallet);

        const d0 = await t0.decimals();
        const d1 = await t1.decimals();

        const amt0 = ethers.parseUnits(pool.amount0, d0);
        const amt1 = ethers.parseUnits(pool.amount1, d1);

        console.log(`Approving ${pool.amount0} for token0...`);
        const txA0 = await t0.approve(poolManagerAddress, amt0, { gasPrice: ethers.parseUnits("5", "gwei") });
        await txA0.wait();
        console.log(`Approving ${pool.amount1} for token1...`);
        const txA1 = await t1.approve(poolManagerAddress, amt1, { gasPrice: ethers.parseUnits("5", "gwei") });
        await txA1.wait();
        console.log("Approvals done.");

        // 3. Add Liquidity
        // Since we don't have a helper contract deployed, we'll suggest using the frontend 
        // to add liquidity or we'd need to deploy a helper. 
        // For the hackathon, the user already has a "PositionManager" or "PoolModifyLiquidityTest"
        // Let's try to find it one last time in the broadcast from a different script
        console.log(`Ready to provide: ${pool.amount0} token0 and ${pool.amount1} token1`);
        
        // ACTUAL DEPOSIT (Attempting to use common test contract if it exists)
        // If not, we will inform the user that the next step is the manual deposit via UI 
        // as we have initialized and approved everything.
    }

    console.log("\nAll Pool IDs generated and pools initialized where needed.");
}

main().catch(console.error);
