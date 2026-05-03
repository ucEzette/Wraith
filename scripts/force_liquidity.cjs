const { ethers } = require('ethers');
require('dotenv').config();

const WRAITH_HOOK_ADDRESS = "0x83cabbF63Cbe0b7EaF14824F4C7529480fAC8280";
const POOL_MANAGER_ADDRESS = "0x00b036b58a818b1bc34d502d3fe730db729e62ac";
const USDC_ADDRESS = "0x31d0220469e10c4E71834a79b1f276d740d3768F";
const WRAITH_ADDRESS = "0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174";
const LIQUIDITY_HELPER = "0x5fa728C0A5cfd51BEe4B060773f50554c0C8A7AB";

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.UNICHAIN_RPC_URL || 'https://sepolia.unichain.org');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("Wallet address:", wallet.address);
    const balance = await provider.getBalance(wallet.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    const helperAbi = [
        "function modifyLiquidity(address manager, (address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) pool, (int24 tickLower, int24 tickUpper, int128 liquidityDelta, bytes32 salt) params, bytes hookData) external"
    ];
    const helper = new ethers.Contract(LIQUIDITY_HELPER, helperAbi, wallet);

    const currency0 = USDC_ADDRESS < WRAITH_ADDRESS ? USDC_ADDRESS : WRAITH_ADDRESS;
    const currency1 = USDC_ADDRESS < WRAITH_ADDRESS ? WRAITH_ADDRESS : USDC_ADDRESS;

    const poolKey = [
        currency0,
        currency1,
        3000,
        60,
        WRAITH_HOOK_ADDRESS
    ];

    const params = [
        -600,
        600,
        "1000000000000000000",
        ethers.ZeroHash
    ];

    console.log("Submitting liquidity with 200 Gwei gas price...");
    
    const tx = await helper.modifyLiquidity(
        POOL_MANAGER_ADDRESS,
        poolKey,
        params,
        "0x",
        {
            gasPrice: ethers.parseUnits("200", "gwei"),
            gasLimit: 800000 
        }
    );

    console.log("Transaction submitted!");
    console.log("Hash:", tx.hash);
    
    console.log("Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Success! Confirmed in block:", receipt.blockNumber);
}

main().catch(console.error);
