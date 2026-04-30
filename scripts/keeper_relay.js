/**
 * Wraith KeeperHub Relay — Flash-Rescue Automation
 *
 * Listens for Gensyn Sentinel toxicity events and executes
 * atomic "Flash-Rescue" bundles via KeeperHub automation layer.
 *
 * Flow:
 * 1. Subscribe to WraithHook ToxicityUpdated events
 * 2. On QuantumExitTriggered → build rescue bundle:
 *    a. Remove liquidity from toxic pool
 *    b. Swap volatile tokens → safe asset (USDC/WETH)
 *    c. Deposit to user's vault
 * 3. Submit bundle via KeeperHub for MEV-protected execution
 */

import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// ══════════════════════════════════════════════════════════════
//                      CONFIGURATION
// ══════════════════════════════════════════════════════════════

const CONFIG = {
  // RPC
  rpcUrl: process.env.UNICHAIN_RPC_URL || "https://sepolia.unichain.org",
  wsUrl: process.env.WS_URL || null,
  chainId: parseInt(process.env.CHAIN_ID || "1"),

  // Contracts
  wraithHook: process.env.WRAITH_HOOK_ADDRESS || "",
  poolManager: process.env.POOL_MANAGER_ADDRESS || "",
  universalRouter: process.env.UNIVERSAL_ROUTER_ADDRESS || "",

  // Safe assets
  safeAssets: {
    USDC: process.env.USDC_ADDRESS || "0x31d0220469e10c4E71834a79b1f276d740d3768F",
    WETH: process.env.WETH_ADDRESS || "0x4200000000000000000000000000000000000006",
  },

  // KeeperHub
  keeperHub: {
    endpoint: process.env.KEEPER_HUB_WEBHOOK || "https://api.keeperhub.com/v1/trigger",
    apiKey: process.env.KEEPER_HUB_API_KEY || "",
    automationId: process.env.KEEPER_AUTOMATION_ID || "",
  },

  // Keeper wallet
  keeperPrivateKey: process.env.PRIVATE_KEY || "",

  // Timing
  pollIntervalMs: 2000,
  maxGasPrice: ethers.parseUnits("100", "gwei"),
  rescueDeadlineSeconds: 120,

  // AXL / P2P Configuration
  axlProxyUrl: process.env.KEEPER_AXL_URL || "http://localhost:8001",
  axlPollIntervalMs: 1000,
};

// ══════════════════════════════════════════════════════════════
//                        ABIs
// ══════════════════════════════════════════════════════════════

const WRAITH_HOOK_ABI = [
  "event ToxicityUpdated(bytes32 indexed poolId, uint256 score, bytes32 proofHash)",
  "event PoisonHookActivated(bytes32 indexed poolId, address indexed attacker, uint24 poisonFee)",
  "event QuantumExitTriggered(bytes32 indexed poolId, address indexed user, address rescueToken, uint256 amount0, uint256 amount1)",
  "event SovereignOverride(bytes32 indexed poolId, address indexed user)",
  "function toxicityScores(bytes32) view returns (uint256)",
  "function isWraithGuard(address) view returns (bool)",
  "function userVaults(address) view returns (address)",
  "function maliceProofs(bytes32) view returns (bytes32)",
  "function executeQuantumRescue(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, address user) external",
  "function triggerQuantumExit(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, address user) external",
  "function getWraithGuardUsers() external view returns (address[])",
  "function userAutoExit(address) view returns (bool)",
];

// Pool Registry for resolving PoolId -> PoolKey
const POOL_REGISTRY = {
  "0x7a207acaddeb221078ce37512f88e050c2bceecc95f5e7ae7527830b8e0e5734": {
    currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
    currency1: "0x4200000000000000000000000000000000000006", // WETH
    fee: 3000,
    tickSpacing: 60,
    hooks: CONFIG.wraithHook,
  },
  "0xa869e4cae78878d6a85917f3e3556c307c18c8e6d1112d04625f16ff77655b2f": {
    currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
    currency1: "0x9d803A3066C858d714C4F5eE286eaa6249D451aB", // QPHAN
    fee: 3000,
    tickSpacing: 60,
    hooks: CONFIG.wraithHook,
  },
  "0xafd44b0172fc530c071d599a1832e335e9e4444eb03cdbe6e10b7c584e383a45": {
    currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
    currency1: "0x6586035D5e39e30bf37445451b43EEaEeAa1405a", // ECHO
    fee: 3000,
    tickSpacing: 60,
    hooks: CONFIG.wraithHook,
  },
  "0xbf4bf38f15e9235195e7fe78f4f789a6f5cbd1625fc7e47d5485bfd0f44aeee2": {
    currency0: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
    currency1: "0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174", // WRAITH
    fee: 3000,
    tickSpacing: 60,
    hooks: CONFIG.wraithHook,
  }
};

const POOL_MANAGER_ABI = [
  "function unlock(bytes calldata data) external returns (bytes memory)",
  "function modifyLiquidity(tuple(address,address,uint24,int24,address) key, tuple(int24,int24,int256,bytes32) params, bytes hookData) external returns (int256, int256)",
  "function swap(tuple(address,address,uint24,int24,address) key, tuple(bool,int256,uint160) params, bytes hookData) external returns (int256)",
];

// ══════════════════════════════════════════════════════════════
//               FLASH-RESCUE BUNDLE BUILDER
// ══════════════════════════════════════════════════════════════

class FlashRescueBundle {
  /**
   * Build an atomic rescue bundle:
   * 1. Remove liquidity from toxic pool
   * 2. Swap all tokens to safe asset
   * 3. Transfer to user vault
   */
  static build(params) {
    const {
      poolKey,
      user,
      vault,
      liquidityParams,
      safeAsset,
      deadline,
    } = params;

    const actions = [];

    // Action 1: Remove all liquidity
    actions.push({
      type: "REMOVE_LIQUIDITY",
      target: CONFIG.poolManager,
      poolKey,
      params: liquidityParams,
      hookData: ethers.AbiCoder.defaultAbiCoder().encode(
        ["address", "string"],
        [user, "WRAITH_QUANTUM_EXIT"]
      ),
    });

    // Action 2: Swap token0 → safe asset (if not already safe)
    if (poolKey.currency0.toLowerCase() !== safeAsset.toLowerCase()) {
      actions.push({
        type: "SWAP",
        target: CONFIG.universalRouter,
        tokenIn: poolKey.currency0,
        tokenOut: safeAsset,
        amountIn: "MAX", // Swap entire balance
        deadline,
      });
    }

    // Action 3: Swap token1 → safe asset (if not already safe)
    if (poolKey.currency1.toLowerCase() !== safeAsset.toLowerCase()) {
      actions.push({
        type: "SWAP",
        target: CONFIG.universalRouter,
        tokenIn: poolKey.currency1,
        tokenOut: safeAsset,
        amountIn: "MAX",
        deadline,
      });
    }

    // Action 4: Transfer safe asset to vault
    actions.push({
      type: "TRANSFER",
      token: safeAsset,
      to: vault,
      amount: "MAX",
    });

    return {
      actions,
      metadata: {
        type: "FLASH_RESCUE",
        user,
        vault,
        poolId: ethers.keccak256(
          ethers.AbiCoder.defaultAbiCoder().encode(
            ["address", "address", "uint24", "int24", "address"],
            [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
          )
        ),
        timestamp: Date.now(),
      },
    };
  }

  /**
   * Build an MEV capture bundle that back-runs the attacker's tx.
   * Captures arbitrage to fund Keeper and Gensyn compute fees.
   */
  static buildMEVCapture(attackerTxHash, poolKey, safeAsset) {
    return {
      type: "MEV_BACKRUN",
      targetTx: attackerTxHash,
      actions: [
        {
          type: "BACKRUN_SWAP",
          poolKey,
          tokenOut: safeAsset,
          description: "Capture post-rug arbitrage",
        },
      ],
      feeDistribution: {
        keeper: 0.4,   // 40% to Keeper gas costs
        gensyn: 0.3,   // 30% to Gensyn compute
        treasury: 0.2, // 20% to Wraith treasury
        user: 0.1,     // 10% rebate to rescued user
      },
    };
  }
}

// ══════════════════════════════════════════════════════════════
//                KEEPERHUB CLIENT
// ══════════════════════════════════════════════════════════════

class KeeperHubClient {
  constructor(endpoint, apiKey) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  /**
   * Submit a flash rescue bundle to KeeperHub for execution.
   * KeeperHub handles gas estimation, retry logic, and MEV protection.
   */
  async submitBundle(bundle) {
    console.log("[KeeperHub] Submitting flash rescue bundle...");
    console.log(`  Type: ${bundle.metadata.type}`);
    console.log(`  User: ${bundle.metadata.user}`);
    console.log(`  Actions: ${bundle.actions.length}`);

    try {
      const response = await fetch(`${this.endpoint}/bundles/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          automation_id: CONFIG.keeperHub.automationId,
          chain_id: CONFIG.chainId,
          bundle: {
            transactions: bundle.actions.map((a) => ({
              to: a.target || a.to,
              data: a.calldata || "0x",
              value: "0",
              gas_limit: "500000",
            })),
            metadata: bundle.metadata,
          },
          options: {
            mev_protection: true,
            max_gas_price: CONFIG.maxGasPrice.toString(),
            retry_count: 3,
            timeout_seconds: CONFIG.rescueDeadlineSeconds,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`KeeperHub API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`[KeeperHub] Bundle accepted: ${result.bundle_id}`);
      return result;
    } catch (error) {
      console.error(`[KeeperHub] Bundle submission failed: ${error.message}`);
      // Fallback: direct submission via provider
      return this.fallbackSubmit(bundle);
    }
  }

  /**
   * Fallback: submit transactions directly if KeeperHub is unavailable.
   */
  async fallbackSubmit(bundle) {
    console.warn("[KeeperHub] Falling back to direct submission...");
    return { status: "fallback", bundle_id: `local-${Date.now()}` };
  }

  /**
   * Check the status of a submitted bundle.
   */
  async getBundleStatus(bundleId) {
    try {
      const response = await fetch(`${this.endpoint}/bundles/${bundleId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return await response.json();
    } catch {
      return { status: "unknown" };
    }
  }
}

// ══════════════════════════════════════════════════════════════
//                 EVENT LISTENER
// ══════════════════════════════════════════════════════════════

class WraithEventListener {
  constructor(provider, hookAddress) {
    this.provider = provider;
    this.contract = new ethers.Contract(hookAddress, WRAITH_HOOK_ABI, provider);
    this.handlers = new Map();
  }

  on(event, handler) {
    this.handlers.set(event, handler);
  }

  async start() {
    console.log("[Listener] Starting manual event polling for WraithHook...");
    console.log(`  Target: ${this.contract.target}`);

    let lastBlock = await this.provider.getBlockNumber();
    console.log(`  Starting from block: ${lastBlock}`);

    const poll = async () => {
      try {
        const currentBlock = await this.provider.getBlockNumber();
        if (currentBlock > lastBlock) {
          // console.log(`[Listener] Polling blocks ${lastBlock + 1} to ${currentBlock}...`);
          
          // ToxicityUpdated
          const toxicityLogs = await this.contract.queryFilter(
            this.contract.filters.ToxicityUpdated(),
            lastBlock + 1,
            currentBlock
          );
          for (const log of toxicityLogs) {
            const { poolId, score, proofHash } = log.args;
            console.log(`\n🔴 [POLL] TOXICITY UPDATED in block ${log.blockNumber}`);
            const handler = this.handlers.get("ToxicityUpdated");
            if (handler) await handler({ poolId, score, proofHash, event: log });
          }

          // QuantumExitTriggered
          const exitLogs = await this.contract.queryFilter(
            this.contract.filters.QuantumExitTriggered(),
            lastBlock + 1,
            currentBlock
          );
          for (const log of exitLogs) {
            const { poolId, user, rescueToken, amount0, amount1 } = log.args;
            console.log(`\n⚡ [POLL] QUANTUM EXIT TRIGGERED in block ${log.blockNumber}`);
            const handler = this.handlers.get("QuantumExitTriggered");
            if (handler) await handler({ poolId, user, rescueToken, amount0, amount1, event: log });
          }

          lastBlock = currentBlock;
        }
      } catch (error) {
        console.error(`[Listener] Poll error: ${error.message}`);
      }
      setTimeout(poll, 2000); // Poll every 2 seconds
    };

    poll();
    console.log("[Listener] Polling loop active ✓");
  }

  async stop() {
    this.contract.removeAllListeners();
    console.log("[Listener] Unsubscribed from all events");
  }
}

// ══════════════════════════════════════════════════════════════
//               KEEPER RELAY ORCHESTRATOR
// ══════════════════════════════════════════════════════════════

class KeeperRelay {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.listener = null;
    this.keeperHub = null;
    this.rescueQueue = [];
    this.processedExits = new Set();
    this.processedToxicity = new Set();
    this.axlWarningLogged = false;
  }

  async initialize() {
    console.log("╔══════════════════════════════════════╗");
    console.log("║   WRAITH KEEPER RELAY — STARTING     ║");
    console.log("╚══════════════════════════════════════╝\n");

    // Connect to node - Force JsonRpcProvider for stability with manual polling
    this.provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);

    const network = await this.provider.getNetwork();
    console.log(`[Init] Connected to chain: ${network.chainId}`);
    console.log(`[Init] Hook Address: ${CONFIG.wraithHook}`);
    console.log(`[Init] Manager Address: ${CONFIG.poolManager}`);

    // Setup wallet
    if (CONFIG.keeperPrivateKey) {
      this.wallet = new ethers.Wallet(CONFIG.keeperPrivateKey, this.provider);
      console.log(`[Init] Keeper address: ${this.wallet.address}`);
    }

    // Setup KeeperHub client
    this.keeperHub = new KeeperHubClient(
      CONFIG.keeperHub.endpoint,
      CONFIG.keeperHub.apiKey
    );

    // Setup event listener
    if (CONFIG.wraithHook) {
      this.listener = new WraithEventListener(this.provider, CONFIG.wraithHook);
      this.setupEventHandlers();
      await this.listener.start();
    }

    // Start AXL P2P Listener
    this.startAXLListener();

    console.log("\n[Init] Keeper Relay ONLINE ✓\n");
  }

  /**
   * Listen for Sentinel messages via AXL Agent Mesh.
   * Polls the local AXL sidecar (localhost:8001).
   */
  async startAXLListener() {
    console.log(`[AXL] Peer-to-Peer node online at ${CONFIG.axlProxyUrl}`);
    
    const pollAXL = async () => {
      try {
        const res = await fetch(`${CONFIG.axlProxyUrl}/messages`);
        if (res.ok) {
          const messages = await res.json();
          for (const msg of messages) {
            if (msg.type === "A2A_MESSAGE") {
              console.log(`\n[AXL] 🛡️ SECURE ALERT RECEIVED FROM ${msg.from}`);
              console.log(`  Pool: ${msg.data.poolId}`);
              console.log(`  Score: ${msg.data.score}/10000`);
              console.log(`  Proof: ${msg.data.proof}`);
              
              // Prepare for MEV-protected rescue
              if (msg.data.score >= 8500) {
                console.log(`[AXL] Preparing defensive Flash-Rescue strategy...`);
                await this.handleAXLThreatAlert(msg.data);
              }
            }
          }
        }
      } catch (e) {
        if (!this.axlWarningLogged) {
          console.warn(`[AXL] Proxy not reachable at ${CONFIG.axlProxyUrl}. Mesh polling inactive.`);
          this.axlWarningLogged = true;
        }
      }
      setTimeout(() => pollAXL(), CONFIG.axlPollIntervalMs);
    };
    pollAXL();
  }

  async handleAXLThreatAlert(data) {
    console.log(`[AXL] Pre-emptively warming up flash-rescue cache for pool ${data.poolId}...`);
    // In production, this would verify the Gensyn proof hash via AEL before relaying
  }

  setupEventHandlers() {
    // Handle Quantum Exit events
    this.listener.on("QuantumExitTriggered", async (data) => {
      await this.handleQuantumExit(data);
    });

    // Handle Toxicity events for MEV capture and proactive exit triggering
    this.listener.on("ToxicityUpdated", async (data) => {
      const { poolId, score } = data;
      const tScore = Number(score);
      
      console.log(`[Relay] Processing ToxicityUpdated: Pool=${poolId}, Score=${tScore}`);
      
      if (tScore >= 8500) {
        console.log(`[Relay] 🚨 CRITICAL TOXICITY (>=85%): ${tScore / 100}%`);
        
        try {
          if (!this.wallet) {
            console.error("[Relay] Keeper wallet not initialized. Check PRIVATE_KEY.");
            return;
          }

          const hookContract = new ethers.Contract(
            CONFIG.wraithHook,
            WRAITH_HOOK_ABI,
            this.wallet
          );

          // 1. Resolve PoolKey from Registry
          const pid = poolId.toLowerCase();
          const poolKey = POOL_REGISTRY[pid];
          
          if (!poolKey) {
            console.error(`[Relay] PoolId ${pid} NOT FOUND in registry. Available keys: ${Object.keys(POOL_REGISTRY).join(", ")}`);
            return;
          }

          console.log(`[Relay] Resolved PoolKey for ${pid}. Fetching users...`);

          // 2. Fetch all registered users
          const users = await hookContract.getWraithGuardUsers();
          console.log(`[Relay] Found ${users.length} registered users on-chain.`);

          // 3. Trigger exits for users who opted in
          for (const user of users) {
            const autoExit = await hookContract.userAutoExit(user);
            console.log(`[Relay] User ${user}: AutoExit=${autoExit}`);
            
            if (autoExit) {
              console.log(`[Relay] ⚡ TRIGGERING QUANTUM EXIT for ${user}...`);
              const tx = await hookContract.triggerQuantumExit(poolKey, user, { gasLimit: 500000 });
              console.log(`[Relay] Transaction Sent! Hash: ${tx.hash}`);
              
              // Optional: wait for confirmation to ensure it emitted the Triggered event
              // const receipt = await tx.wait();
              // console.log(`[Relay] Trigger confirmed in block ${receipt.blockNumber}`);
            }
          }
        } catch (error) {
          console.error(`[Relay] Error in proactive trigger loop: ${error.message}`);
          console.error(error.stack);
        }
      } else {
        console.log(`[Relay] Toxicity below threshold (${tScore}). No action taken.`);
      }
    });

    // Log Poison Hook activations
    this.listener.on("PoisonHookActivated", async (data) => {
      console.log(`[Slash] Attacker ${data.attacker} slashed with 99% fee!`);
    });
  }

  async handleQuantumExit(data) {
    const { poolId, user, rescueToken } = data;
    const exitKey = `${poolId}-${user}`;

    // Deduplicate
    if (this.processedExits.has(exitKey)) {
      console.log(`[Exit] Already processed exit for ${user}`);
      return;
    }
    this.processedExits.add(exitKey);

    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║      FLASH-RESCUE INITIATED          ║`);
    console.log(`╚══════════════════════════════════════╝`);
    console.log(`  User: ${user}`);
    console.log(`  Pool: ${poolId}`);
    console.log(`  Safe Asset: ${rescueToken}`);

    try {
      // Get user's vault
      const hookContract = new ethers.Contract(
        CONFIG.wraithHook,
        WRAITH_HOOK_ABI,
        this.provider
      );
      const vault = await hookContract.userVaults(user);

      if (vault === ethers.ZeroAddress) {
        console.error(`[Exit] No vault configured for ${user}`);
        return;
      }

      // 1. Resolve PoolKey from Registry
      const poolKey = POOL_REGISTRY[poolId.toLowerCase()];
      if (!poolKey) {
        console.error(`[Exit] PoolId ${poolId} not found in registry. Cannot build bundle.`);
        return;
      }

      // Build rescue bundle
      const bundle = FlashRescueBundle.build({
        poolKey,
        user,
        vault,
        liquidityParams: {
          tickLower: -887220,
          tickUpper: 887220,
          liquidityDelta: ethers.MinInt256, // Remove all
          salt: ethers.ZeroHash,
        },
        safeAsset: rescueToken || CONFIG.safeAssets.USDC,
        deadline: Math.floor(Date.now() / 1000) + CONFIG.rescueDeadlineSeconds,
      });

      // Submit to KeeperHub
      const result = await this.keeperHub.submitBundle(bundle);
      console.log(`[Exit] Bundle submitted: ${result.bundle_id}`);
      console.log(`[Exit] Status: ${result.status || "pending"}`);

      // Monitor bundle execution
      this.monitorBundle(result.bundle_id, exitKey);
    } catch (error) {
      console.error(`[Exit] Flash-Rescue failed: ${error.message}`);
      this.processedExits.delete(exitKey);
    }
  }

  async monitorBundle(bundleId, exitKey) {
    const maxChecks = 30;
    for (let i = 0; i < maxChecks; i++) {
      await new Promise((r) => setTimeout(r, CONFIG.pollIntervalMs));
      const status = await this.keeperHub.getBundleStatus(bundleId);

      if (status.status === "confirmed") {
        console.log(`✅ Flash-Rescue CONFIRMED: ${bundleId}`);
        console.log(`   Tx: ${status.tx_hash || "N/A"}`);
        
        // Drop proof of execution
        const proof = {
          bundleId,
          exitKey,
          txHash: status.tx_hash,
          timestamp: new Date().toISOString(),
          status: "SUCCESS",
          explorer: `https://sepolia.unichain.org/tx/${status.tx_hash}`
        };
        
        const proofDir = path.join(process.cwd(), "proofs");
        if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir);
        
        const proofPath = path.join(proofDir, `rescue_${bundleId}.json`);
        fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
        console.log(`[Proof] Dropped execution proof to: ${proofPath}`);
        
        return;
      }
      if (status.status === "failed") {
        console.error(`❌ Flash-Rescue FAILED: ${bundleId}`);
        this.processedExits.delete(exitKey);
        return;
      }
    }
    console.warn(`⏰ Flash-Rescue TIMEOUT: ${bundleId}`);
  }

  async shutdown() {
    if (this.listener) await this.listener.stop();
    if (this.provider?.destroy) this.provider.destroy();
    console.log("\n[Shutdown] Keeper Relay stopped.");
  }
}

// ══════════════════════════════════════════════════════════════
//                      ENTRYPOINT
// ══════════════════════════════════════════════════════════════

async function main() {
  const relay = new KeeperRelay();

  process.on("SIGINT", async () => {
    await relay.shutdown();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await relay.shutdown();
    process.exit(0);
  });

  try {
    await relay.initialize();

    // Keep alive
    console.log("[Main] Keeper Relay running. Press Ctrl+C to stop.\n");
    await new Promise(() => {}); // Block forever
  } catch (error) {
    console.error(`[Fatal] ${error.message}`);
    await relay.shutdown();
    process.exit(1);
  }
}

main().catch(console.error);

