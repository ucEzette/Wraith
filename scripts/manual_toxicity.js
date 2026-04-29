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
    "0xec7214589df0342938b8d963c67104b2c286d9a0d84318c4600d81084b647898": {
        currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        currency1: "0x4200000000000000000000000000000000000006", // WETH
        fee: 3000,
        tickSpacing: 60,
        hooks: hookAddress
    },
    "0x60f065a3d76e33d026ef647610f607a5f6e80b621e2f072eb0f1715694204d16": {
        currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        currency1: "0x9d803A3066C858d714c4F5eE286eaa6249d451aB", // QPHAN
        fee: 3000,
        tickSpacing: 60,
        hooks: hookAddress
    },
    "0x1927392e626e2a22285df6a9456209e90098df24f6f8748d504543503b0c268f": {
        currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        currency1: "0x6586035D5e39e30bf37445451b43EEaEeAa1405a", // ECHO
        fee: 3000,
        tickSpacing: 60,
        hooks: hookAddress
    },
    "0x614828551405c102c77d9c6614f17730d1d680621e2f072eb0f1715694204d16": {
        currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        currency1: "0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174", // WRAITH
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
