/**
 * Wraith Manual Toxicity Trigger
 * 
 * Allows a developer/sentinel to manually update or clear the toxicity score
 * for a specific Uniswap v4 pool.
 * 
 * Usage:
 * node scripts/manual_toxicity.cjs <POOL_ID> <SCORE_OR_CLEAR> [ATTACKER_ADDRESS]
 */

const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: node scripts/manual_toxicity.cjs <POOL_ID> <SCORE_OR_CLEAR> [ATTACKER_ADDR]");
    process.exit(1);
  }

  const poolId = args[0];
  const scoreRaw = args[1].toLowerCase();
  const attacker = args[2] || ethers.ZeroAddress;

  const rpcUrl = process.env.UNICHAIN_RPC_URL || "https://unichain-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`[Sentinel] Wallet Address: ${wallet.address}`);
  console.log(`[Sentinel] Target Pool: ${poolId}`);

  const hookAddress = process.env.WRAITH_HOOK_ADDRESS;
  const abi = [
    "function updateToxicity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint256 score, bytes32 proofHash, address[] calldata attackers) external",
    "function clearToxicity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) external",
    "function sentinel() view returns (address)"
  ];

  const contract = new ethers.Contract(hookAddress, abi, wallet);

  const REGISTRY = {
    "0x03618863b55d252f844d7340696d688ad6a75a36f9c457864c2c812913d4f71d": {
        currency0: "0x0000000000000000000000000000000000000000", // ETH
        currency1: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        fee: 3000,
        tickSpacing: 60,
        hooks: hookAddress
    },
    "0x8e4f19a74db728c2730a70f7f79c85729a5b4da55002325bf326c8ccf2ee592e": {
        currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        currency1: "0x9d803A3066C858d714C4F5eE286eaa6249d451aB", // QPHAN
        fee: 3000,
        tickSpacing: 60,
        hooks: hookAddress
    },
    "0x6d9ebd08d2345973bc25681e33f3caff20da3e4bd01f805a29613550a2c09d5d": {
        currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        currency1: "0x6586035D5e39e30bf37445451b43EEaEeAa1405a", // ECHO
        fee: 3000,
        tickSpacing: 60,
        hooks: hookAddress
    },
    "0x17127262623682e634a753a2b4744f3199cc010d87e05f593c3f4e42f0e3bfe3": {
        currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        currency1: "0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174", // WRAITH
        fee: 3000,
        tickSpacing: 60,
        hooks: hookAddress
    }
  };

  const poolKey = REGISTRY[poolId.toLowerCase()];
  if (!poolKey) {
    console.error(`\n❌ Error: PoolKey not found in registry for ID ${poolId}.`);
    process.exit(1);
  }

  const feeData = await provider.getFeeData();
  const gasOverrides = {
    maxPriorityFeePerGas: ethers.parseUnits("20", "gwei"),
    maxFeePerGas: ethers.parseUnits("50", "gwei"),
    gasLimit: 500000
  };

  if (scoreRaw === "clear" || scoreRaw === "reset" || scoreRaw === "0") {
    console.log("\n[Sentinel] Clearing Toxicity Score...");
    try {
      const tx = await contract.clearToxicity(poolKey, gasOverrides);
      console.log(`[Sentinel] Transaction Sent: ${tx.hash}`);
      await tx.wait();
      console.log(`\n✅ SUCCESS! Toxicity cleared.`);
    } catch (err) {
      console.error(`\n❌ FAILED: ${err.reason || err.message}`);
    }
  } else {
    const score = parseInt(scoreRaw);
    console.log(`[Sentinel] Target Score: ${score} / 10000`);
    console.log("\n[Sentinel] Submitting Toxicity Update...");
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes(`Manual Update ${Date.now()}`));
    const attackers = attacker !== ethers.ZeroAddress ? [attacker] : [];
    try {
      const tx = await contract.updateToxicity(poolKey, score, proofHash, attackers, gasOverrides);
      console.log(`[Sentinel] Transaction Sent: ${tx.hash}`);
      await tx.wait();
      console.log(`\n✅ SUCCESS! Score updated to ${score}.`);
    } catch (err) {
      console.error(`\n❌ FAILED: ${err.reason || err.message}`);
    }
  }
}

main().catch(console.error);
