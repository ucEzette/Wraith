# 🛡️ Wraith Protocol — Autonomous Liquidity Defense

**Wraith Protocol** is a decentralized "Agent Guard" architecture designed to protect Liquidity Providers (LPs) . It leverages **Gensyn's Verifiable Compute (AEL)** and **AXL Mesh Networking** to detect malicious patterns in real-time and trigger atomic **KeeperHub Flash-Rescues** before rug-pulls are finalized.

---

## 🏛️ System Architecture

The Wraith system is a decentralized "Agent Guard" architecture composed of four primary layers:

1.  **DeFi Integration Layer (Uniswap v4 Hooks)**:
    -   **`WraithHook.sol`**: A custom Uniswap v4 hook that intercepts pool actions.
    -   **Poison Fee (`beforeSwap`)**: Dynamically overrides pool fees to **99.9%** for flagged malicious actors, effectively "poisoning" attacker capital.
    -   **Quantum Exit**: A permissioned function that allows authorized Keepers to atomically remove an LP's liquidity and move it to a safe vault during an attack.
    -   **EIP-1153 Transient Storage**: Manages per-block toxicity states and guard status efficiently, reducing gas costs.

2.  **Intelligence Layer (Gensyn Sentinel)**:
    -   **Autonomous Monitoring**: Monitors the Unichain mempool for rug-pull patterns and analyzes contract bytecode for malicious opcodes (`SELFDESTRUCT`).
    -   **Verifiable Inference (AEL)**: Runs toxicity models in Gensyn's **Bitwise Reproducible Execution Environment (REE)** to produce a **Verifiable Proof of Malice** (`proof_hash`).

3.  **Messaging Layer (AXL P2P Mesh)**:
    -   **Agent-to-Agent Messaging**: Broadcasts encrypted threat alerts across a decentralized mesh network, avoiding centralized relayers.
    -   **Cross-Language Support**: Facilitates seamless communication between the Python Sentinel and Node.js Keeper Relay via the AXL proxy.

4.  **Execution Layer (KeeperHub)**:
    -   **Flash-Rescue Bundles**: Executes atomic operations (Remove Liquidity -> Swap -> Vault Deposit) in a single block.
    -   **MEV Protection**: Submits bundles with high priority to ensure they execute before the attacker's transaction.

---

## 📂 Project Structure

```text
.
├── agents/                   # Gensyn Sentinel Agents (Python)
├── contracts/                # Uniswap v4 WraithHook (Solidity)
├── node/                     # Production Node Identity & Keys
├── scripts/                  # Keeper Relay & Deployment Scripts
├── frontend/                 # Next.js 14 Dashboard for LP management
└── test/                     # Advanced Foundry test suite
```

---

## 🛠️ Technical Stack

-   **Blockchain**: Unichain Sepolia (Optimism Stack)
-   **DEX**: Uniswap v4 (Hooks & Singleton)
-   **AI Infrastructure**: Gensyn (AEL, REE & AXL)
-   **Automation**: KeeperHub
-   **Storage**: EIP-1153 (Transient Storage)
-   **Languages**: Solidity, Python (3.13), TypeScript, Node.js

---

## 🚀 Production Deployment (Gensyn + AXL Mesh)

Wraith Protocol is now fully optimized for decentralized **Agent Guard** execution.

#### 1. Node Initialization
Identity files and production API keys are securely stored in the `./node` directory:
- `userApiKey.json`: Production Gensyn AEL credentials.
- `swarm.pem`: Node identity for mesh authentication.

#### 2. Start Infrastructure
```bash
# 1. Start the Sentinel (Gensyn Toxicity Monitor)
python3 agents/sentinel.py

# 2. Start the Keeper Relay (Flash-Rescue Execution)
node scripts/keeper_relay.js
```

### ⚖️ Judging & Simulation Guide

To evaluate the **Wraith Protocol** active defense mechanisms, judges can follow these steps to simulate a "Toxicity Event" and observe the autonomous response.

#### 1. Setup Environment
Ensure your `.env` has the following variables:
```bash
UNICHAIN_RPC_URL=https://sepolia.unichain.org
WRAITH_HOOK_ADDRESS=0x98ECfF0fFd41075d9508887d2D60bfec9cf68280
PRIVATE_KEY=<YOUR_PRIVATE_KEY>
```

#### 2. Simulate High Toxicity (The Trigger)
Judges can manually flag a pool as "Toxic" to trigger the protocol's defense state. Use the `manual_toxicity.js` script to set a score above the threshold (8500).

*Example: Flag the WRAITH/USDC pool as critical (95.00%):*
```bash
# Usage: node scripts/manual_toxicity.js <POOL_ID> <SCORE>
node scripts/manual_toxicity.js 0x614828551405c102c77d9c6614f17730d1d680621e2f072eb0f1715694204d16 9500
```

#### 3. Observe the "Poison Fee"
1. Open the **Wraith Dashboard** at `http://localhost:3000`.
2. Input the Pool ID: `0x614828551405c102c77d9c6614f17730d1d680621e2f072eb0f1715694204d16`.
3. You will see the **Toxicity Meter** spike to 95% and the **DEFENSE ARMED** status turn green.
4. Any swap attempt from a non-registered address will now be subject to the **99.9% Poison Fee** override.

#### 4. Trigger the "Quantum Exit" (The Rescue)
Once toxicity is high, the "Quantum Exit" becomes available for registered LPs.
1. In the Dashboard, go to the **Wraith Guard** section.
2. Click **"TRIGGER QUANTUM EXIT"**.
3. Observe as the protocol atomically removes your liquidity and transfers it to your secure vault *before* the pool can be drained.

---

### 🛡️ Core Reliability Stack
- **Gensyn AEL**: Verifiable toxicity scoring using bitwise-reproducible REE.
- **AXL Agent Mesh**: Encrypted P2P (Agent-to-Agent) communication layer.
- **KeeperHub**: Decentralized reliability layer for atomic flash-rescue bundles.

---

*Built for the Gensyn & KeeperHub Hackathon 2026.*
