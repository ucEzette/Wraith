# Wraith Protocol: Full Deployment Guide

This guide details the step-by-step process for deploying the Wraith Protocol in a production environment. The architecture consists of three main tiers:
1. **Intelligence Layer**: The Gensyn Sentinel (Python Agent).
2. **Execution Layer**: The Keeper Relay (Node.js Agent + KeeperHub).
3. **Application Layer**: The Next.js Dashboard (Frontend).

---

## 1. Prerequisites
- **Wallet**: A private key with at least 0.5 ETH on Unichain Sepolia.
- **Node.js**: v18+ (for local/frontend).
- **Docker**: For containerized agent hosting.
- **Vercel Account**: For frontend hosting.
- **Gensyn API Key**: For verifiable toxicity compute.
- **KeeperHub API Key**: For MEV-protected bundle submission.

---

## 2. Smart Contract Verification
Ensure your contracts are deployed on Unichain Sepolia. The current addresses are:
- **WraithHook**: `0xD56388a4ce5Cd9E236201AD3DF27Edfbb28E0280`
- **PoolManager**: `0x00B036B58a818B1BC34d502D3fE730Db729e62AC`

If redeploying, update these addresses in your `.env` file.

---

## 3. Environment Configuration
Create a `.env` file in the root directory (use `.env.example` as a template):

```bash
cp .env.example .env
```

**Required Variables:**
- `PRIVATE_KEY`: Your bot's wallet key.
- `UNICHAIN_RPC_URL`: `https://sepolia.unichain.org`
- `WRAITH_HOOK_ADDRESS`: The hook contract.
- `GENSYN_API_KEY`: Your Gensyn credentials.
- `KEEPER_HUB_API_KEY`: Your KeeperHub credentials.

---

## 4. Deploying the Intelligence & Execution Agents (Docker)
The agents must run 24/7. It is recommended to host them on a VPS (AWS, DigitalOcean, Hetzner) or a container platform (Railway, Render).

### Using Docker Compose (Recommended)
1. Build and start the containers:
   ```bash
   docker-compose up -d --build
   ```
2. Monitor logs:
   ```bash
   docker logs -f wraith-keeper
   docker logs -f wraith-sentinel
   ```

### Individual Containers
If not using compose:
```bash
# Build
docker build -t wraith-sentinel -f Dockerfile.sentinel .
docker build -t wraith-keeper -f Dockerfile.keeper .

# Run
docker run -d --env-file .env --name sentinel wraith-sentinel
docker run -d --env-file .env --name keeper wraith-keeper
```

---

## 5. Deploying the Frontend (Vercel)
The dashboard is a Next.js application.

1. **Connect to GitHub**: Push your code to a GitHub repository.
2. **Create Vercel Project**: Import the `frontend/` directory.
3. **Configure Environment Variables**: Add the following in the Vercel dashboard:
   - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - `WRAITH_HOOK_ADDRESS`
   - `POOL_MANAGER_ADDRESS`
4. **Deploy**: Vercel will automatically build and assign a URL.

---

## 6. Post-Deployment Verification
Once live, verify the "Pulse" of the protocol:

1. **Dashboard**: Connect your wallet and ensure your liquidity positions are visible.
2. **Sentinel**: Check logs to ensure it's successfully submitting toxicity updates to the chain.
3. **Keeper**: Ensure the polling loop is active:
   `[Listener] Polling loop active ✓`
4. **Flash-Rescue Test**: Run a manual toxicity update on a test pool and verify that the Keeper triggers the `triggerQuantumExit` transaction.

---

## 7. Maintenance
- **Logs**: Check the `logs/` directory in the docker volume for detailed execution history.
- **Proofs**: Successful rescues will save proofs to the `proofs/` directory.
- **Funding**: Ensure the Keeper wallet always has enough ETH for gas.
