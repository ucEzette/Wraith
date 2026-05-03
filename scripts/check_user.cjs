const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.UNICHAIN_RPC_URL);
    const USDC = "0x31d0220469e10c4E71834a79b1f276d740d3768F";
    const WRAITH = "0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174";
    const user = "0x68faEBF19FA57658d37bF885F5377f735FE97D70";

    const erc20Abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"];
    
    const usdc = new ethers.Contract(USDC, erc20Abi, provider);
    const wraith = new ethers.Contract(WRAITH, erc20Abi, provider);

    const b0 = await usdc.balanceOf(user);
    const b1 = await wraith.balanceOf(user);
    
    console.log(`User ${user} Balances:`);
    console.log(`USDC: ${ethers.formatUnits(b0, 6)}`);
    console.log(`WRAITH: ${ethers.formatUnits(b1, 18)}`);
    
    // Check registration
    const hookAbi = ["function isWraithGuard(address) view returns (bool)"];
    const hook = new ethers.Contract(process.env.WRAITH_HOOK_ADDRESS, hookAbi, provider);
    const isReg = await hook.isWraithGuard(user);
    console.log(`Is Registered: ${isReg}`);
}

main().catch(console.error);
