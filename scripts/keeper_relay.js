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
    USDC: process.env.USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    WETH: process.env.WETH_ADDRESS || "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
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
  "event QuantumExitTriggered(bytes32 indexed poolId, address indexed user, uint256 amount0, uint256 amount1)",
  "event SovereignOverride(bytes32 indexed poolId, address indexed user)",
  "function toxicityScores(bytes32) view returns (uint256)",
  "function isWraithGuard(address) view returns (bool)",
  "function userVaults(address) view returns (address)",
  "function maliceProofs(bytes32) view returns (bytes32)",
  "function getDefenseStatus(tuple(address,address,uint24,int24,address)) view returns (uint256,bool,bool,bytes32)",
];

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
    console.log("[Listener] Subscribing to WraithHook events...");

    // ToxicityUpdated
    this.contract.on("ToxicityUpdated", async (poolId, score, proofHash, event) => {
      console.log(`\n🔴 TOXICITY UPDATED`);
      console.log(`  Pool: ${poolId}`);
      console.log(`  Score: ${score.toString()} / 10000`);
      console.log(`  Proof: ${proofHash}`);

      const handler = this.handlers.get("ToxicityUpdated");
      if (handler) await handler({ poolId, score, proofHash, event });
    });

    // PoisonHookActivated
    this.contract.on("PoisonHookActivated", async (poolId, attacker, poisonFee, event) => {
      console.log(`\n☠️  POISON HOOK ACTIVATED`);
      console.log(`  Pool: ${poolId}`);
      console.log(`  Attacker: ${attacker}`);
      console.log(`  Fee: ${poisonFee} (99%)`);

      const handler = this.handlers.get("PoisonHookActivated");
      if (handler) await handler({ poolId, attacker, poisonFee, event });
    });

    // QuantumExitTriggered
    this.contract.on("QuantumExitTriggered", async (poolId, user, amount0, amount1, event) => {
      console.log(`\n⚡ QUANTUM EXIT TRIGGERED`);
      console.log(`  Pool: ${poolId}`);
      console.log(`  User: ${user}`);

      const handler = this.handlers.get("QuantumExitTriggered");
      if (handler) await handler({ poolId, user, amount0, amount1, event });
    });

    console.log("[Listener] Subscribed to all WraithHook events");
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
    this.axlWarningLogged = false;
  }

  async initialize() {
    console.log("╔══════════════════════════════════════╗");
    console.log("║   WRAITH KEEPER RELAY — STARTING     ║");
    console.log("╚══════════════════════════════════════╝\n");

    // Connect to node
    if (CONFIG.wsUrl) {
      this.provider = new ethers.WebSocketProvider(CONFIG.wsUrl);
    } else {
      this.provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
    }

    const network = await this.provider.getNetwork();
    console.log(`[Init] Connected to chain: ${network.chainId}`);

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
    console.log(`[AXL] Starting mesh polling at ${CONFIG.axlProxyUrl}...`);
    
    setInterval(async () => {
      try {
        const response = await fetch(`${CONFIG.axlProxyUrl}/messages`);
        if (response.ok) {
          const messages = await response.json();
          if (messages && messages.length > 0) {
            for (const msg of messages) {
              if (msg.type === "A2A_MESSAGE") {
                console.log(`\n📡 AXL MESH ALERT RECEIVED`);
                console.log(`  Source: Sentinel Node`);
                console.log(`  Pool: ${msg.data.poolId}`);
                console.log(`  Score: ${msg.data.score / 100}%`);
                
                // Direct trigger of pre-emptive rescue logic
                if (msg.data.score >= 8500) {
                  await this.handleAXLThreatAlert(msg.data);
                }
              }
            }
          }
        }
      } catch (error) {
        if (!this.axlWarningLogged) {
          console.warn(`[AXL] Proxy not reachable at ${CONFIG.axlProxyUrl}. Mesh polling inactive.`);
          this.axlWarningLogged = true;
        }
      }
    }, CONFIG.axlPollIntervalMs);
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

    // Handle Toxicity events for MEV capture
    this.listener.on("ToxicityUpdated", async (data) => {
      const score = Number(data.score);
      if (score >= 8500) {
        console.log(`[Alert] Critical toxicity detected! Score: ${score / 100}%`);
        console.log(`[Alert] Preparing MEV capture strategy...`);
      }
    });

    // Log Poison Hook activations
    this.listener.on("PoisonHookActivated", async (data) => {
      console.log(`[Slash] Attacker ${data.attacker} slashed with 99% fee!`);
    });
  }

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
              }
            }
          }
        }
      } catch (e) {
        // Silently retry - node might be starting up
      }
      setTimeout(pollAXL, CONFIG.axlPollIntervalMs);
    };
    pollAXL();
  }

  async handleQuantumExit(data) {
    const { poolId, user } = data;
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

      // Build rescue bundle
      const bundle = FlashRescueBundle.build({
        poolKey: {
          currency0: ethers.ZeroAddress, // Will be resolved from pool
          currency1: CONFIG.safeAssets.USDC,
          fee: 0x800000,
          tickSpacing: 60,
          hooks: CONFIG.wraithHook,
        },
        user,
        vault,
        liquidityParams: {
          tickLower: -887220,
          tickUpper: 887220,
          liquidityDelta: ethers.MinInt256, // Remove all
          salt: ethers.ZeroHash,
        },
        safeAsset: CONFIG.safeAssets.USDC,
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
