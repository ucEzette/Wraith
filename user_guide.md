# 🛡️ Wraith Protocol: User & Operator Guide

Wraith Protocol provides an autonomous, AI-driven defense layer for Uniswap v4 Liquidity Providers (LPs). This guide explains how LPs can leverage the "Verifiable AI Bodyguard" to protect their assets from rug-pulls and malicious pool manipulation.

---

## 🏗️ The User Journey

### Phase 1: Secure Registration
To benefit from Wraith's protection, an LP must register their Uniswap v4 pool with the **WraithHook**.

1.  **Deploy Pool with Hook**: When creating a new pool on Unichain Sepolia, the LP attaches the `WraithHook` address.
2.  **Initialize Sentinel Guard**: Through the **Wraith Dashboard**, the LP "activates" the guard for their specific `PoolId`.
3.  **Define Sovereign Override**: The LP specifies a "Sovereign Exit" condition—a priority state that the protocol must enforce regardless of pool locks or manipulation.

### Phase 2: Configuration & Thresholds
The LP (or a delegated Operator) configures the **Gensyn Sentinel** settings:

- **Toxicity Threshold**: Set the sensitivity of the AI model. 
    - *Example*: A score of `85.00%` triggers an immediate pre-emptive alert.
- **Rescue Asset**: Define which safe asset (e.g., USDC or WETH) funds should be converted into during a "Quantum Exit."
- **Execution Strategy**: Choose between "Flash-Rescue" (Speed optimized) or "MEV-Capture" (Cost optimized).

### Phase 3: Autonomous Monitoring
Once active, the protocol runs in the background. No further user action is required.

- **Mempool Scanning**: The Sentinel monitors the Unichain mempool for transactions targeting the LP's pool.
- **Verifiable AI Analysis**: Every suspicious transaction is analyzed by the **Gensyn REE** model.
- **P2P Alerting**: If toxicity is detected, an encrypted alert is broadcast over the **AXL Mesh** to all active Keeper nodes.

### Phase 4: The "Quantum Exit" (Rescue)
When the AI detects an imminent "rug-pull" or malicious swap:

1.  **Pre-emptive Strike**: The **Keeper Relay** detects the AXL alert.
2.  **Flash-Rescue Submission**: A high-priority bundle is submitted to **KeeperHub**.
3.  **Atomic Execution**: The bundle executes the `quantumExit` function on the WraithHook *before* the attacker's transaction can finalize.
4.  **Sovereign Recovery**: The LP's liquidity is removed and secured in their wallet or a safe vault, effectively "ghosting" the attacker.

---

## 🖥️ Operator Quick-Start Guide

If you are running the protocol as an operator, follow these steps to ensure maximum reliability:

### 1. Environment Check
Ensure your `.env` is configured with the correct RPC and API keys:
```bash
# Sentinel Node
python3 agents/sentinel.py

# Execution Layer
node scripts/keeper_relay.js
```

### 2. Monitoring the Dashboard
Access the frontend at `http://localhost:3000` to:
- View real-time "Toxicity Scores" for monitored pools.
- Verify the **Gensyn Proofs** generated for each mempool scan.
- Monitor the AXL Mesh health status.

### 3. Verification of "Proof of Malice"
Every rescue event generates a verifiable proof on the Gensyn network. LPs can verify these proofs on-chain to ensure the "Quantum Exit" was triggered legitimately by the AI model.

---

## 🚨 Emergency FAQ

**Q: Can I exit manually if the AI is down?**  
A: Yes. The `WraithHook` supports a direct `sovereignExit` call for the pool owner that bypasses the AI layer.

**Q: Who pays for the rescue gas?**  
A: The **KeeperHub Relay** sponsors the initial gas. A small percentage of the rescued funds (typically 1-2%) is used to reimburse the gas and protocol fees.

**Q: Is my pool safe if the Sentinel is offline?**  
A: Wraith is a decentralized mesh. As long as at least one Sentinel/Keeper pair is monitoring the network via AXL, your pool is protected.

---

*Protecting the future of DeFi with Verifiable AI.* 
