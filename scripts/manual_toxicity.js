/**
 * Wraith Manual Toxicity Trigger
 * 
 * Allows a developer/sentinel to manually update the toxicity score
 * for a specific Uniswap v4 pool.
 * 
 * Usage:
 * node scripts/manual_toxicity.js <POOL_ID> <SCORE_0_TO_10000> [ATTACKER_ADDRESS]
 */

const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: node scripts/manual_toxicity.js <POOL_ID> <SCORE> [ATTACKER_ADDR]");
    process.exit(1);
  }

  const poolId = args[0];
  const score = parseInt(args[1]);
  const attacker = args[2] || ethers.ZeroAddress;

  const rpcUrl = process.env.UNICHAIN_RPC_URL || "https://sepolia.unichain.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Use the PRIVATE_KEY from .env which should be the sentinel or have permissions
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`[Sentinel] Wallet Address: ${wallet.address}`);
  console.log(`[Sentinel] Target Pool: ${poolId}`);
  console.log(`[Sentinel] Target Score: ${score} / 10000`);

  const hookAddress = process.env.WRAITH_HOOK_ADDRESS;
  const abi = [
    "function updateToxicity(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint256 score, bytes32 proofHash, address[] calldata attackers) external",
    "function sentinel() view returns (address)"
  ];

  const contract = new ethers.Contract(hookAddress, abi, wallet);

  // Check if wallet is sentinel
  const contractSentinel = await contract.sentinel();
  if (contractSentinel.toLowerCase() !== wallet.address.toLowerCase()) {
    console.warn(`\n⚠️  WARNING: Your wallet (${wallet.address}) is NOT the registered Sentinel (${contractSentinel}).`);
    console.warn(`   This transaction will likely fail unless you update the sentinel address in the contract.`);
  }

  // We need the PoolKey to call updateToxicity. 
  // Since we usually only have the PoolId, we'll try to find common ones or ask for details.
  // For the purpose of this manual script, let's define a helper to resolve common ones.
  
  const REGISTRY = {
    "0x004ec958ef1254278e301a8c94957cb747cedd35f3f3ab6d3aa9f2680e9ff26e": {
        currency0: "0x7856b3e404b341f2a33f545308678f2378901234", // QPHAN (example)
        currency1: "0x8901234567890123456789012345678901234567", // ECHO (example)
        fee: 3000,
        tickSpacing: 60,
        hooks: hookAddress
    },
    "0x7515fdadafd1f8154c328b5832264fde3e9d25289920bfaadc0f4661d81adafd": {
        currency0: "0x4200000000000000000000000000000000000006", // WETH
        currency1: "0x256B798b3fD8A133A89f365319889f365319889f", // USDC
        fee: 3000,
        tickSpacing: 60,
        hooks: hookAddress
    }
  };

  let poolKey = REGISTRY[poolId.toLowerCase()];

  if (!poolKey) {
    console.error(`\n❌ Error: PoolKey not found in local registry for ID ${poolId}.`);
    console.log("Please add the pool details to the REGISTRY in scripts/manual_toxicity.js or provide currency0/currency1 details.");
    process.exit(1);
  }

  console.log("\n[Sentinel] Submitting Toxicity Update...");
  
  const proofHash = ethers.keccak256(ethers.toUtf8Bytes(`Manual Update ${Date.now()}`));
  const attackers = attacker !== ethers.ZeroAddress ? [attacker] : [];

  try {
    const tx = await contract.updateToxicity(
        poolKey,
        score,
        proofHash,
        attackers,
        { gasLimit: 500000 }
    );
    
    console.log(`[Sentinel] Transaction Sent: ${tx.hash}`);
    console.log("[Sentinel] Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`\n✅ SUCCESS! Score updated to ${score}.`);
    console.log(`   Block: ${receipt.blockNumber}`);
  } catch (err) {
    console.error(`\n❌ FAILED: ${err.reason || err.message}`);
    if (err.message.includes("OnlySentinel")) {
        console.log("\n💡 TIP: Run 'cast send ...' to update the sentinel to your wallet first if needed.");
    }
  }
}

main().catch(console.error);
