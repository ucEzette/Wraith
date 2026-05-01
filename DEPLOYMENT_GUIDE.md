# Wraith Protocol: Full Deployment Guide

This guide details the step-by-step process for deploying the Wraith Protocol in a production environment. The architecture consists of three main tiers:
1. **Intelligence Layer**: The Gensyn Sentinel (Python Agent).
2. **Execution Layer**: The Keeper Relay (Node.js Agent + KeeperHub).
3. **Application Layer**: The Next.js Dashboard (Frontend).

---

## 1. Prerequisites
- **Wallet**: A private key with at least 0.5 ETH on Unichain Sepolia.
- **Gensyn Credentials**: Register at [gensyn.ai](https://gensyn.ai) for AEL compute keys.
- **KeeperHub API Key**: Register at [keeperhub.io](https://keeperhub.io) for MEV-protected bundle submission.
- **Hosting**: A Vercel account (Frontend) and a VPS or Container Platform (Agents).

---

## 2. Infrastructure Deployment

### A. Frontend Dashboard (Vercel) — [COMPLETE]
The frontend is already deployed on Vercel. Ensure the following **Environment Variables** are configured in the Vercel dashboard:
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Your project ID.
- `WRAITH_HOOK_ADDRESS`: `0xD56388a4ce5Cd9E236201AD3DF27Edfbb28E0280`
- `POOL_MANAGER_ADDRESS`: `0x00B036B58a818B1BC34d502D3fE730Db729e62AC`

### B. Intelligence & Execution Agents (Railway / Render / VPS)
The agents must run 24/7. We recommend **Railway** for ease of use or a **Hetzner VPS** for reliability.

#### 1. Setup Environment
Create a `.env` on your hosting provider with:
```bash
PRIVATE_KEY=your_key_here
UNICHAIN_RPC_URL=https://sepolia.unichain.org
WRAITH_HOOK_ADDRESS=0xD56388a4ce5Cd9E236201AD3DF27Edfbb28E0280
GENSYN_API_KEY=your_gensyn_key
KEEPER_HUB_API_KEY=your_keeper_key
```

#### 2. Deploy using Render (Background Workers)
Render is ideal for long-running agents. We use **Background Workers** to ensure the agents run 24/7 without exposing web ports.

**Option A: Manual Setup**
1. **New -> Background Worker** -> Connect your GitHub repo.
2. **Name**: `wraith-sentinel`
3. **Environment**: `Docker`
4. **Dockerfile Path**: `Dockerfile.sentinel`
5. **Environment Variables**: Add all variables from the "Setup Environment" section above.
6. **Repeat** for `wraith-keeper` using `Dockerfile.keeper`.

**Option B: Blueprint (Recommended)**
1. In your Render Dashboard, go to **Blueprints**.
2. Connect your repo; Render will detect the `render.yaml` file automatically.
3. It will provision both services and prompt you for the secret keys (`PRIVATE_KEY`, etc.).

#### 3. Deploy using Docker Compose (VPS)
If you are using a standard VPS (Hetzner, DigitalOcean):
```bash
docker-compose up -d --build
```

---

## 3. Integration Details

### Gensyn AEL (Intelligence)
The Sentinel Agent uses Gensyn's **Bitwise Reproducible Execution Environment (REE)**. Every toxicity score submitted to the `WraithHook` is backed by a `proof_hash` stored in the agent logs for auditability.

### KeeperHub (Execution)
The Keeper Relay uses the **KeeperHub SDK** to submit bundles. This ensures that the LP's liquidity removal and swap occur atomically in a single block, protecting them from front-running or sandwich attacks during the rescue.

---

## 4. Production Checklist ✅
- [ ] **Contract Verification**: All contracts are verified on [Unichain Sepolia Blockscout](https://unichain-sepolia.blockscout.com/).
- [ ] **Sentinel Uptime**: Verify logs show `[Sentinel] Monitoring mempool...`.
- [ ] **Keeper Polling**: Verify logs show `[Listener] Polling loop active`.
- [ ] **Gas Funding**: Ensure the Keeper wallet has enough ETH (Priority gas is required for Flash-Rescues).
- [ ] **Approval**: Registered LPs must call `setOperator(wraith_hook, true)` on the PoolManager (handled in the dashboard).

---

## 5. Maintenance & Monitoring
- **Logs**: Monitor agent logs via `docker logs -f wraith-sentinel`.
- **Health Checks**: We recommend setting up a heartbeat monitor (like UptimeRobot) for your RPC endpoint and Agent host.
- **Toxicity Proofs**: Proofs for every critical event are saved to `/app/proofs` inside the Keeper container.

---

## 6. Free Hosting Alternatives 💸
If you want to run the protocol with $0 infrastructure costs:

### A. Oracle Cloud (Best Choice)
Oracle offers "Always Free" ARM instances with 24GB RAM.
1. Create an **Ubuntu 22.04 (ARM)** instance.
2. Install Docker: `sudo apt update && sudo apt install docker.io docker-compose -y`.
3. Clone your repo and run `docker-compose up -d`.

### B. GCP e2-micro
1. Create a VM in `us-central1`.
2. Choose `e2-micro` (Free Tier).
3. Run both agents on this single VM to stay within the 1-instance limit.

### D. Hugging Face Spaces (Docker)
Surprisingly, Hugging Face allows you to host Docker containers for free.
1. Create a **Space** -> Choose **Docker**.
2. Upload your files and set your `.env` variables in the **Settings > Secrets** section.
3. It provides 16GB of RAM, which is massive for a free tier.

### E. AWS Free Tier (1 Year)
1. Sign up for AWS and launch a `t2.micro` or `t3.micro` instance.
2. You get 750 hours/month for free for the first 12 months.
3. This is a standard VPS that can run both agents via Docker.

### F. Northflank
Northflank offers a "Hobby" plan that includes 2 free services.
1. Connect your GitHub.
2. Create two "Services" (one for Sentinel, one for Keeper).
3. Select "Docker" as the build source.

---
*Built for the Gensyn & KeeperHub Hackathon 2026.*
