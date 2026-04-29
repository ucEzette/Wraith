# 🛡️ Wraith Protocol: Comprehensive System Documentation

Wraith Protocol is a decentralized, AI-augmented active defense layer for Uniswap v4 Liquidity Providers. It leverages verifiable AI inference, real-time mempool monitoring, and high-priority execution bundles to protect LP capital from rug-pulls, malicious swaps, and protocol-level exploits.

---

## 🏛️ Technical Architecture

The Wraith system is composed of four primary layers:
1.  **DeFi Integration Layer**: Uniswap v4 Hooks on Unichain Sepolia.
2.  **Intelligence Layer**: Gensyn Sentinel Agents running on the Agent Exchange Layer (AEL).
3.  **Messaging Layer**: AXL P2P mesh for cross-node alerts.
4.  **Execution Layer**: KeeperHub for atomic, MEV-protected rescue operations.

---

## 🏗️ 1. Uniswap v4 Hook Integration (`WraithHook.sol`)

The heart of the protocol is the `WraithHook`, a custom Uniswap v4 hook that intercepts core pool actions.

### Core Hook Functions:
-   **`beforeSwap`**: 
    -   Intercepts every swap attempt in an armed pool.
    -   If the pool's **Toxicity Score** (determined by AI) exceeds the threshold, the hook identifies the swap sender.
    -   **Poison Fee**: If the sender is a flagged malicious actor, the hook dynamically overrides the pool fee to **99.9%**, effectively "poisoning" the attacker's capital.
    -   **Wraith Guard**: Legitimate users registered with the protocol are exempt from these fees even during high toxicity states.
-   **`beforeRemoveLiquidity`**:
    -   Prevents unauthorized liquidity removals when a pool is in a "Toxic" state, ensuring the developer cannot "rug" before the users are rescued.

### Technical Innovations:
-   **EIP-1153 Transient Storage**: Uses `tstore` and `tload` to manage toxicity states and guard status within a single transaction block. This significantly reduces gas costs and prevents state bloat.
-   **Atomic Quantum Exit**: A permissioned function that allows authorized Keepers to atomically remove an LP's liquidity and move it to a safe vault during an attack.

---

## 🧠 2. Gensyn Sentinel Agent

The Sentinel is an autonomous agent that provides the protocol's intelligence. It runs the **Verifiable Toxicity Model**.

### Analysis Pipeline:
1.  **Bytecode Analysis**: Scans token contracts for malicious opcodes (`SELFDESTRUCT`), hidden mint functions, and "honeypot" patterns (restrictions on `transferFrom`).
2.  **Mempool Monitoring**: Uses low-latency WebSocket connections to Unichain Sepolia to detect pending transactions that indicate an imminent rug-pull (e.g., massive liquidity removal by the deployer).
3.  **Verifiable Inference (AEL)**: 
    -   The analysis is submitted to the **Gensyn Agent Exchange Layer (AEL)**.
    -   The AEL runs the toxicity model in a Bitwise Reproducible Execution Environment (REE).
    -   Produces a **Verifiable Proof of Malice** (`proof_hash`).

### On-Chain Relay:
Once a critical toxicity score (>= 85%) is verified, the Sentinel relays the score and the proof to the `WraithHook` via the `updateToxicity` function.

---

## 📡 3. AXL P2P Mesh Implementation

The **AXL (Agent Exchange Layer) Messaging Mesh** provides a censorship-resistant communication channel between Sentinels and Keepers.

-   **P2P Alerts**: When a Sentinel detects an attack, it broadcasts an encrypted `A2A_MESSAGE` (Agent-to-Agent) across the AXL mesh.
-   **Cross-Language Support**: The AXL proxy allows the Python-based Sentinel to communicate seamlessly with the Node.js-based Keeper Relay.
-   **Resilience**: By using AXL, the protocol avoids relying on a single centralized relay, ensuring alerts reach Keepers even if specific nodes are under DDoS attack.

---

## ⚡ 4. KeeperHub & Flash-Rescue Execution

The **KeeperHub** layer ensures that rescue operations are executed with maximum priority and MEV protection.

### Flash-Rescue Bundles:
When a Keeper node receives an AXL alert or detects high on-chain toxicity, it triggers a **Flash-Rescue Workflow**:
1.  **Bundle Construction**: The Keeper builds an atomic transaction that:
    -   Triggers the `quantumExit` on the `WraithHook`.
    -   Removes the LP's liquidity.
    -   Swaps volatile tokens for a pre-configured "Safe Asset" (USDC/WETH).
    -   Deposits the safe assets into the user's secure vault.
2.  **KeeperHub Submission**: The bundle is submitted via the **KeeperHub API** with a high priority gas fee.
3.  **Pre-emption**: Because the Sentinel detects the attack in the mempool, the KeeperHub bundle is designed to land *before* the attacker's transaction, effectively rescuing the funds just in time.

---

## 🖥️ 5. Technical Stack Summary

| Component | Technology |
| :--- | :--- |
| **Blockchain** | Unichain Sepolia (Optimism Stack) |
| **Smart Contracts** | Solidity (Uniswap v4, Foundry) |
| **Frontend** | Next.js, RainbowKit, Viem/Wagmi |
| **Intelligence** | Python, Gensyn AEL, REE Model |
| **Automation** | Node.js, KeeperHub, AXL Mesh |
| **Storage** | EIP-1153 (Transient) |

---

## 🚀 Future Roadmap

-   **Decentralized Governance**: Move Guardian roles to a DAO.
-   **Enhanced ML Models**: Train on larger datasets of rug-pulls for 99.9% detection accuracy.
-   **L2 Expansion**: Support for Arbitrum, Base, and Ethereum Mainnet.

*Protecting the future of DeFi with Verifiable AI.*
