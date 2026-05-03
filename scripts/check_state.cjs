const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.UNICHAIN_RPC_URL);
    const HOOK = process.env.WRAITH_HOOK_ADDRESS;
    const PM = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";

    const pmAbi = [
        "function getPoolId((address,address,uint24,int24,address)) pure returns (bytes32)",
        "function pools(bytes32) view returns (uint160, int24, uint24, uint24)"
    ];

    const pm = new ethers.Contract(PM, pmAbi, provider);
    
    const currencies = ["0x31d0220469e10c4E71834a79b1f276d740d3768F", "0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174"].sort();
    const poolKey = {
        currency0: currencies[0],
        currency1: currencies[1],
        fee: 3000,
        tickSpacing: 60,
        hooks: HOOK
    };

    const pid = await pm.getPoolId([poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]);
    console.log(`Pool ID: ${pid}`);

    const pool = await pm.pools(pid);
    console.log(`Pool state: sqrtPrice=${pool[0]}, tick=${pool[1]}`);
    
    // Check user registration
    const hookAbi = ["function isWraithGuard(address) view returns (bool)", "function userVaults(address) view returns (address)"];
    const hook = new ethers.Contract(HOOK, hookAbi, provider);
    const user = "0x68faEBF19FA57658d37bF885F5377f735FE97D70";
    const isReg = await hook.isWraithGuard(user);
    const vault = await hook.userVaults(user);
    console.log(`User ${user} Registered: ${isReg}, Vault: ${vault}`);
}

main().catch(console.error);
