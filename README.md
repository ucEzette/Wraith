# 🛡️ Wraith Protocol — Autonomous Liquidity Defense

**Wraith Protocol** is a decentralized "Agent Guard" architecture designed to protect Liquidity Providers (LPs) on **Unichain Sepolia**. It leverages **Gensyn's Verifiable Compute (AEL)** and **AXL Mesh Networking** to detect malicious patterns in real-time and trigger atomic **KeeperHub Flash-Rescues** before rug-pulls are finalized.

---

## 🏗️ Architecture

1.  **Gensyn Sentinel**: An autonomous agent running a bitwise-reproducible toxicity model (REE) that monitors the mempool for malicious pool state changes.
2.  **AXL Mesh**: A decentralized Agent-to-Agent (A2A) network that allows the Sentinel to broadcast encrypted threat alerts to Keeper nodes without centralized relayers.
3.  **KeeperHub Relay**: A high-reliability execution node that receives AXL alerts and submits MEV-protected "Quantum Exit" bundles to rescue LP funds.
4.  **WraithHook**: A Uniswap v4 hook that integrates with the Agent network to enforce sovereign user overrides and proof-of-malice defenses.

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

## 🚀 Technical Stack

- **Network**: Unichain Sepolia
- **DEX**: Uniswap v4 (Hooks & Singleton)
- **AI Infrastructure**: Gensyn (REE & AXL)
- **Automation**: KeeperHub
- **Languages**: Solidity, Python (3.13), TypeScript, Node.js

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
# Uses AXL Port 8000
python3 agents/sentinel.py

# 2. Start the Keeper Relay (Flash-Rescue Execution)
# Uses AXL Port 8001
node scripts/keeper_relay.js
```

### 🛡️ Core Reliability Stack
- **Gensyn AEL**: Verifiable toxicity scoring using bitwise-reproducible REE.
- **AXL Agent Mesh**: Encrypted P2P (Agent-to-Agent) communication layer.
- **KeeperHub**: Decentralized reliability layer for atomic flash-rescue bundles.

---

*Built for the Gensyn & KeeperHub Hackathon 2026.*
