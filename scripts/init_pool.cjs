const { ethers } = require('ethers');
require('dotenv').config();

const POOL_MANAGER_ADDRESS = '0x00b036b58a818b1bc34d502d3fe730db729e62ac';
const USDC_ADDRESS = '0x31d0220469e10c4E71834a79b1f276d740d3768F';
const WRAITH_ADDRESS = '0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174';
const WRAITH_HOOK_ADDRESS = '0xD56388a4ce5Cd9E236201AD3DF27Edfbb28E0280';

async function main() {
    const provider = new ethers.JsonRpcProvider('https://unichain-sepolia-rpc.publicnode.com');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const abi = ['function initialize((address,address,uint24,int24,address),uint160) external returns (int24)'];
    const pm = new ethers.Contract(POOL_MANAGER_ADDRESS, abi, wallet);

    const currency0 = USDC_ADDRESS < WRAITH_ADDRESS ? USDC_ADDRESS : WRAITH_ADDRESS;
    const currency1 = USDC_ADDRESS < WRAITH_ADDRESS ? WRAITH_ADDRESS : USDC_ADDRESS;

    const poolKey = [currency0, currency1, 3000, 60, WRAITH_HOOK_ADDRESS];
    const sqrtPriceX96 = '79228162514264337593543950336'; // 1:1

    console.log('Initializing pool...');
    try {
        const tx = await pm.initialize(poolKey, sqrtPriceX96, {
            gasPrice: ethers.parseUnits('100', 'gwei'),
            gasLimit: 1000000
        });
        console.log('Init Tx sent:', tx.hash);
        await tx.wait();
        console.log('Pool initialized!');
    } catch (e) {
        console.log('Init failed or already init:', e.message);
    }
}

main().catch(console.error);
