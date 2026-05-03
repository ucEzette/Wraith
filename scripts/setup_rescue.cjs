const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.UNICHAIN_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`Using wallet: ${wallet.address}`);

    const HOOK = process.env.WRAITH_HOOK_ADDRESS;
    const PM = "0x00B036B58a818B1BC34d502D3fE730Db729e62AC";

    const hookAbi = [
        "function registerWraithGuard(address vault, uint256 threshold, address rescueToken, bool autoExit) external",
        "function setPoolArmed(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, bool armed) external",
        "function isWraithGuard(address) view returns (bool)",
        "function guardian() view returns (address)"
    ];

    const pmAbi = [
        "function setOperator(address operator, bool approved) external returns (bool)",
        "function isOperator(address owner, address operator) view returns (bool)"
    ];

    const hook = new ethers.Contract(HOOK, hookAbi, wallet);
    const pm = new ethers.Contract(PM, pmAbi, wallet);

    const poolKey = {
        currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        currency1: "0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174", // WRAITH
        fee: 3000,
        tickSpacing: 60,
        hooks: HOOK
    };

    // 1. Register User
    console.log("Checking registration...");
    const isReg = await hook.isWraithGuard(wallet.address);
    if (!isReg) {
        console.log("Registering for WraithGuard...");
        const regTx = await hook.registerWraithGuard(
            wallet.address, // Use own address as vault for demo
            8500,           // 85% threshold
            "0x31d0220469e10c4E71834a79b1f276d740d3768F", // Rescue to USDC
            true            // Auto-exit enabled
        );
        await regTx.wait();
        console.log("Registration complete.");
    } else {
        console.log("Already registered.");
    }

    // 2. Set Operator
    console.log("Checking Operator approval...");
    const isOp = await pm.isOperator(wallet.address, HOOK);
    if (!isOp) {
        console.log("Approving Hook as Operator on PoolManager...");
        const opTx = await pm.setOperator(HOOK, true);
        await opTx.wait();
        console.log("Operator approved.");
    } else {
        console.log("Operator already approved.");
    }

    // 3. Arm Pool (requires Guardian)
    const guardian = await hook.guardian();
    if (guardian.toLowerCase() === wallet.address.toLowerCase()) {
        console.log("Arming pool...");
        const armTx = await hook.setPoolArmed([poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks], true);
        await armTx.wait();
        console.log("Pool ARMED.");
    } else {
        console.log(`Pool arming skipped (Not Guardian). Guardian is ${guardian}`);
    }

    console.log("\nSetup complete. The Keeper Relay will now see your user and trigger the rescue when toxicity hits 9500.");
}

main().catch(console.error);
