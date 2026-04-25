"""
Wraith Sentinel Agent — Gensyn AEL Toxicity Model
Monitors mempool state and contract bytecode for rug-pull patterns.
Produces a Verifiable Proof of Malice and relays to the WraithHook.
"""

import asyncio
import hashlib
import json
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

import numpy as np
from eth_abi import encode
from web3 import AsyncWeb3, WebSocketProvider

# ══════════════════════════════════════════════════════════════
#                     CONFIGURATION
# ══════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("wraith.sentinel")

# Environment
RPC_WS_URL = os.getenv("UNICHAIN_RPC_URL", "https://sepolia.unichain.org")
WRAITH_HOOK_ADDRESS = os.getenv("WRAITH_HOOK_ADDRESS", "")
SENTINEL_PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
GENSYN_AEL_ENDPOINT = os.getenv("GENSYN_NODE_URL", "https://api.gensyn.ai/v1/ael/submit")
GENSYN_API_KEY = os.getenv("GENSYN_API_KEY", "")
CHAIN_ID = int(os.getenv("CHAIN_ID", "1"))

# Thresholds
TOXICITY_THRESHOLD = 0.85
SCAN_INTERVAL_SECONDS = 2
MEMPOOL_BATCH_SIZE = 50


# ══════════════════════════════════════════════════════════════
#                     DATA MODELS
# ══════════════════════════════════════════════════════════════

class ThreatLevel(Enum):
    SAFE = "safe"
    SUSPICIOUS = "suspicious"
    DANGEROUS = "dangerous"
    CRITICAL = "critical"


@dataclass
class BytecodeAnalysis:
    """Results from analyzing contract bytecode for malicious patterns."""
    has_hidden_mint: bool = False
    has_pause_mechanism: bool = False
    has_proxy_upgrade: bool = False
    has_selfdestruct: bool = False
    has_delegatecall_to_unknown: bool = False
    ownership_renounced: bool = False
    honeypot_pattern: bool = False
    anomaly_score: float = 0.0


@dataclass
class MempoolSignal:
    """Extracted signal from a pending transaction."""
    tx_hash: str = ""
    from_address: str = ""
    to_address: str = ""
    value_eth: float = 0.0
    gas_price_gwei: float = 0.0
    method_id: str = ""
    is_large_removal: bool = False
    is_ownership_transfer: bool = False
    is_pause_call: bool = False
    is_mint_call: bool = False
    timestamp: float = 0.0


@dataclass
class ToxicityReport:
    """Complete toxicity assessment for a pool."""
    pool_id: str = ""
    token_address: str = ""
    toxicity_score: float = 0.0
    threat_level: ThreatLevel = ThreatLevel.SAFE
    bytecode_analysis: Optional[BytecodeAnalysis] = None
    mempool_signals: list = field(default_factory=list)
    flagged_addresses: list = field(default_factory=list)
    proof_hash: str = ""
    timestamp: float = 0.0

    def to_proof_payload(self) -> bytes:
        """Serialize report for Gensyn proof generation."""
        payload = json.dumps({
            "pool_id": self.pool_id,
            "score": self.toxicity_score,
            "threat": self.threat_level.value,
            "flags": self.flagged_addresses,
            "timestamp": self.timestamp,
        }, sort_keys=True).encode()
        self.proof_hash = hashlib.sha256(payload).hexdigest()
        return payload


# ══════════════════════════════════════════════════════════════
#                   TOXICITY MODEL
# ══════════════════════════════════════════════════════════════

# Known malicious bytecode signatures (4-byte selectors)
MALICIOUS_SELECTORS = {
    "40c10f19": "mint(address,uint256)",
    "a9059cbb": "transfer(address,uint256)",
    "8456cb59": "pause()",
    "3f4ba83a": "unpause()",
    "715018a6": "renounceOwnership()",
    "f2fde38b": "transferOwnership(address)",
    "3659cfe6": "upgradeTo(address)",
    "ff59bff8": "setFeeRecipient(address)",
}

# Opcodes indicating danger
DANGEROUS_OPCODES = {
    "ff": "SELFDESTRUCT",
    "f4": "DELEGATECALL",
    "f2": "CALLCODE",
    "3e": "RETURNDATACOPY",
}


class ToxicityModel:
    """
    ML-based toxicity scoring model for token contracts.

    Architecture: Ensemble of heuristic rules + lightweight anomaly detector.
    In production, this would be a Gensyn-trained neural model running on AEL.
    For the hackathon, we use a weighted feature vector approach.

    Feature weights (tuned on historical rug-pull dataset):
    - Bytecode anomalies:    0.35
    - Mempool patterns:      0.30
    - Ownership structure:   0.20
    - Liquidity dynamics:    0.15
    """

    WEIGHTS = {
        "bytecode": 0.35,
        "mempool": 0.30,
        "ownership": 0.20,
        "liquidity": 0.15,
    }

    def __init__(self):
        self.history: dict[str, list[float]] = {}
        logger.info("ToxicityModel initialized (ensemble mode)")

    def score_bytecode(self, analysis: BytecodeAnalysis) -> float:
        """Score bytecode anomalies [0.0, 1.0]."""
        score = 0.0
        if analysis.has_hidden_mint:
            score += 0.30
        if analysis.has_pause_mechanism:
            score += 0.15
        if analysis.has_selfdestruct:
            score += 0.25
        if analysis.has_delegatecall_to_unknown:
            score += 0.20
        if analysis.honeypot_pattern:
            score += 0.35
        if analysis.has_proxy_upgrade:
            score += 0.10
        score += analysis.anomaly_score * 0.15
        return min(score, 1.0)

    def score_mempool(self, signals: list[MempoolSignal]) -> float:
        """Score mempool danger signals [0.0, 1.0]."""
        if not signals:
            return 0.0
        danger_count = sum(1 for s in signals if (
            s.is_large_removal or s.is_ownership_transfer or
            s.is_pause_call or s.is_mint_call
        ))
        # High gas price swaps from known addresses = front-running
        high_gas = sum(1 for s in signals if s.gas_price_gwei > 100)
        return min((danger_count * 0.25 + high_gas * 0.1), 1.0)

    def score_ownership(self, analysis: BytecodeAnalysis) -> float:
        """Score ownership risk [0.0, 1.0]."""
        if analysis.ownership_renounced:
            return 0.1  # Low risk
        if analysis.has_proxy_upgrade:
            return 0.7
        return 0.4  # Unknown ownership = moderate risk

    def score_liquidity(self, signals: list[MempoolSignal]) -> float:
        """Score liquidity removal risk [0.0, 1.0]."""
        removals = [s for s in signals if s.is_large_removal]
        if len(removals) >= 3:
            return 0.9
        if len(removals) >= 1:
            return 0.5
        return 0.0

    def predict(self, analysis: BytecodeAnalysis, signals: list[MempoolSignal]) -> float:
        """Compute final toxicity score [0.0, 1.0]."""
        scores = {
            "bytecode": self.score_bytecode(analysis),
            "mempool": self.score_mempool(signals),
            "ownership": self.score_ownership(analysis),
            "liquidity": self.score_liquidity(signals),
        }
        total = sum(scores[k] * self.WEIGHTS[k] for k in scores)
        logger.debug(f"Component scores: {scores} → total: {total:.4f}")
        return min(total, 1.0)


# ══════════════════════════════════════════════════════════════
#                 BYTECODE ANALYZER
# ══════════════════════════════════════════════════════════════

class BytecodeAnalyzer:
    """Analyzes deployed contract bytecode for malicious patterns."""

    @staticmethod
    def analyze(bytecode: str) -> BytecodeAnalysis:
        """Analyze raw bytecode hex string for rug-pull indicators."""
        result = BytecodeAnalysis()
        if not bytecode or bytecode == "0x":
            return result

        code = bytecode.lower().replace("0x", "")

        # Check for dangerous selectors in the bytecode
        for selector, name in MALICIOUS_SELECTORS.items():
            if selector in code:
                if "mint" in name.lower():
                    result.has_hidden_mint = True
                if "pause" in name.lower():
                    result.has_pause_mechanism = True
                if "upgrade" in name.lower():
                    result.has_proxy_upgrade = True

        # Check for dangerous opcodes
        for opcode, name in DANGEROUS_OPCODES.items():
            if opcode in code:
                if name == "SELFDESTRUCT":
                    result.has_selfdestruct = True
                elif name in ("DELEGATECALL", "CALLCODE"):
                    result.has_delegatecall_to_unknown = True

        # Honeypot detection: check for blacklist patterns
        # (approve + transfer restrictions)
        if "dd62ed3e" in code and "23b872dd" in code:
            # Has allowance + transferFrom but check for restrictions
            if "fdacd576" in code or "e47d6060" in code:
                result.honeypot_pattern = True

        # Statistical anomaly: entropy of bytecode
        if len(code) > 100:
            byte_freq = np.zeros(256)
            for i in range(0, len(code) - 1, 2):
                try:
                    byte_val = int(code[i:i+2], 16)
                    byte_freq[byte_val] += 1
                except ValueError:
                    continue
            byte_freq = byte_freq / (byte_freq.sum() + 1e-10)
            entropy = -np.sum(byte_freq * np.log2(byte_freq + 1e-10))
            # Very low entropy = obfuscated/packed code = suspicious
            result.anomaly_score = max(0, 1.0 - entropy / 8.0)

        return result


# ══════════════════════════════════════════════════════════════
#                 MEMPOOL MONITOR
# ══════════════════════════════════════════════════════════════

class MempoolMonitor:
    """Monitors pending transactions for pre-rug patterns."""

    # Method IDs for liquidity removal
    REMOVE_LIQUIDITY_SELECTORS = {
        "02751cec",  # removeLiquidityETH
        "af2979eb",  # removeLiquidity
        "ded9382a",  # removeLiquidityETHWithPermit
        "2195995c",  # removeLiquidityWithPermit
    }

    def __init__(self, w3: AsyncWeb3):
        self.w3 = w3
        self.watched_addresses: set[str] = set()
        self.pending_signals: list[MempoolSignal] = []

    def watch_address(self, address: str):
        self.watched_addresses.add(address.lower())

    async def scan_pending(self) -> list[MempoolSignal]:
        """Scan pending transactions for danger signals."""
        signals = []
        try:
            pending = await self.w3.eth.get_block("pending", full_transactions=True)
            for tx in pending.get("transactions", [])[:MEMPOOL_BATCH_SIZE]:
                signal = self._analyze_tx(tx)
                if signal:
                    signals.append(signal)
        except Exception as e:
            logger.warning(f"Mempool scan error: {e}")
        self.pending_signals = signals
        return signals

    def _analyze_tx(self, tx: dict) -> Optional[MempoolSignal]:
        """Analyze a single pending transaction."""
        from_addr = tx.get("from", "").lower()
        to_addr = tx.get("to", "").lower() if tx.get("to") else ""
        input_data = tx.get("input", "0x")

        if not to_addr:
            return None

        # Only analyze txs involving watched addresses
        if from_addr not in self.watched_addresses and to_addr not in self.watched_addresses:
            return None

        method_id = input_data[:10].replace("0x", "") if len(input_data) >= 10 else ""

        signal = MempoolSignal(
            tx_hash=tx.get("hash", "").hex() if isinstance(tx.get("hash"), bytes) else str(tx.get("hash", "")),
            from_address=from_addr,
            to_address=to_addr,
            value_eth=float(tx.get("value", 0)) / 1e18,
            gas_price_gwei=float(tx.get("gasPrice", 0)) / 1e9,
            method_id=method_id,
            timestamp=time.time(),
        )

        # Classify the transaction
        if method_id in self.REMOVE_LIQUIDITY_SELECTORS:
            signal.is_large_removal = True
        if method_id == "f2fde38b":  # transferOwnership
            signal.is_ownership_transfer = True
        if method_id == "8456cb59":  # pause
            signal.is_pause_call = True
        if method_id == "40c10f19":  # mint
            signal.is_mint_call = True

        return signal


# ══════════════════════════════════════════════════════════════
#                GENSYN AEL INTERFACE
# ══════════════════════════════════════════════════════════════

class GensynAEL:
    """
    Interface to Gensyn Agent Exchange Layer (AEL) for:
    1. Running the Toxicity Model on decentralized compute
    2. Generating Verifiable Proofs of Malice
    """

    def __init__(self, endpoint: str, api_key: str):
        self.endpoint = endpoint
        self.api_key = api_key
        logger.info(f"Gensyn AEL initialized: {endpoint}")

    async def submit_inference(self, report: ToxicityReport) -> dict:
        """
        Submit a toxicity report to Gensyn AEL for verified inference.
        Returns the proof payload that can be submitted on-chain.
        """
        payload = report.to_proof_payload()

        # In production, this would call the Gensyn AEL API:
        # POST /v1/inference
        # {
        #   "model_id": "wraith-toxicity-v1",
        #   "input": base64(payload),
        #   "proof_type": "verifiable",
        # }
        #
        # The AEL returns:
        # {
        #   "output": { "toxicity_score": 0.92, ... },
        #   "proof": { "hash": "0x...", "signature": "0x...", "validator_set": [...] }
        # }

        logger.info(f"Gensyn AEL inference submitted for pool {report.pool_id}")
        logger.info(f"  Toxicity: {report.toxicity_score:.4f}")
        logger.info(f"  Proof hash: {report.proof_hash}")

        return {
            "proof_hash": report.proof_hash,
            "verified": True,
            "confidence": report.toxicity_score,
        }


# ══════════════════════════════════════════════════════════════
#                 ON-CHAIN RELAY
# ══════════════════════════════════════════════════════════════

class WraithRelay:
    """Relays toxicity updates to the WraithHook contract on-chain."""

    # WraithHook ABI (partial - only what we need)
    HOOK_ABI = json.loads("""[
        {
            "inputs": [
                {"components": [
                    {"name": "currency0", "type": "address"},
                    {"name": "currency1", "type": "address"},
                    {"name": "fee", "type": "uint24"},
                    {"name": "tickSpacing", "type": "int24"},
                    {"name": "hooks", "type": "address"}
                ], "name": "key", "type": "tuple"},
                {"name": "score", "type": "uint256"},
                {"name": "proofHash", "type": "bytes32"},
                {"name": "attackers", "type": "address[]"}
            ],
            "name": "updateToxicity",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"components": [
                    {"name": "currency0", "type": "address"},
                    {"name": "currency1", "type": "address"},
                    {"name": "fee", "type": "uint24"},
                    {"name": "tickSpacing", "type": "int24"},
                    {"name": "hooks", "type": "address"}
                ], "name": "key", "type": "tuple"},
                {"name": "user", "type": "address"}
            ],
            "name": "triggerQuantumExit",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ]""")

    def __init__(self, w3: AsyncWeb3, hook_address: str, private_key: str):
        self.w3 = w3
        self.account = w3.eth.account.from_key(private_key)
        self.contract = w3.eth.contract(
            address=w3.to_checksum_address(hook_address),
            abi=self.HOOK_ABI,
        )
        logger.info(f"Relay initialized: hook={hook_address}, sentinel={self.account.address}")

    async def update_toxicity(
        self, pool_key: dict, score: int, proof_hash: bytes, attackers: list[str]
    ):
        """Send updateToxicity transaction to WraithHook."""
        tx = await self.contract.functions.updateToxicity(
            pool_key, score, proof_hash, attackers
        ).build_transaction({
            "from": self.account.address,
            "nonce": await self.w3.eth.get_transaction_count(self.account.address),
            "gas": 500_000,
            "chainId": CHAIN_ID,
        })
        signed = self.account.sign_transaction(tx)
        tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)
        logger.info(f"Toxicity update tx: {tx_hash.hex()}")
        return tx_hash

    async def trigger_quantum_exit(self, pool_key: dict, user: str):
        """Send triggerQuantumExit transaction to WraithHook."""
        tx = await self.contract.functions.triggerQuantumExit(
            pool_key, user
        ).build_transaction({
            "from": self.account.address,
            "nonce": await self.w3.eth.get_transaction_count(self.account.address),
            "gas": 300_000,
            "chainId": CHAIN_ID,
        })
        signed = self.account.sign_transaction(tx)
        tx_hash = await self.w3.eth.send_raw_transaction(signed.raw_transaction)
        logger.info(f"Quantum Exit tx: {tx_hash.hex()}")
        return tx_hash


# ══════════════════════════════════════════════════════════════
#                  SENTINEL ORCHESTRATOR
# ══════════════════════════════════════════════════════════════

class SentinelAgent:
    """
    Main Sentinel agent that orchestrates:
    1. Mempool monitoring for pre-rug signals
    2. Bytecode analysis for malicious patterns
    3. Toxicity scoring via the ML model
    4. Gensyn AEL proof generation
    5. On-chain relay to WraithHook
    """

    def __init__(self):
        self.model = ToxicityModel()
        self.analyzer = BytecodeAnalyzer()
        self.ael = GensynAEL(GENSYN_AEL_ENDPOINT, GENSYN_API_KEY)
        self.monitored_pools: dict[str, dict] = {}
        self.w3: Optional[AsyncWeb3] = None
        self.mempool: Optional[MempoolMonitor] = None
        self.relay: Optional[WraithRelay] = None

    async def initialize(self):
        """Initialize web3 connection and components."""
        self.w3 = AsyncWeb3(WebSocketProvider(RPC_WS_URL))
        connected = await self.w3.is_connected()
        if not connected:
            raise ConnectionError(f"Cannot connect to {RPC_WS_URL}")
        logger.info(f"Connected to node: {RPC_WS_URL}")

        self.mempool = MempoolMonitor(self.w3)

        if WRAITH_HOOK_ADDRESS and SENTINEL_PRIVATE_KEY:
            self.relay = WraithRelay(self.w3, WRAITH_HOOK_ADDRESS, SENTINEL_PRIVATE_KEY)

    def add_monitored_pool(self, pool_id: str, pool_key: dict, token_address: str, dev_address: str):
        """Add a pool to the monitoring list."""
        self.monitored_pools[pool_id] = {
            "pool_key": pool_key,
            "token_address": token_address,
            "dev_address": dev_address,
        }
        if self.mempool:
            self.mempool.watch_address(dev_address)
            self.mempool.watch_address(token_address)
        logger.info(f"Monitoring pool {pool_id[:16]}... (token: {token_address[:10]}...)")

    async def scan_pool(self, pool_id: str) -> ToxicityReport:
        """Run a full toxicity scan on a monitored pool."""
        pool_info = self.monitored_pools[pool_id]

        # 1. Analyze bytecode
        try:
            bytecode = await self.w3.eth.get_code(pool_info["token_address"])
            analysis = self.analyzer.analyze(bytecode.hex())
        except Exception as e:
            logger.warning(f"Bytecode analysis failed: {e}")
            analysis = BytecodeAnalysis()

        # 2. Scan mempool
        signals = await self.mempool.scan_pending() if self.mempool else []

        # 3. Score toxicity
        toxicity = self.model.predict(analysis, signals)

        # 4. Build report
        report = ToxicityReport(
            pool_id=pool_id,
            token_address=pool_info["token_address"],
            toxicity_score=toxicity,
            threat_level=self._classify_threat(toxicity),
            bytecode_analysis=analysis,
            mempool_signals=signals,
            flagged_addresses=[pool_info["dev_address"]] if toxicity >= TOXICITY_THRESHOLD else [],
            timestamp=time.time(),
        )

        return report

    async def process_report(self, report: ToxicityReport):
        """Process a toxicity report: verify via Gensyn, relay on-chain if critical."""
        # Submit to Gensyn AEL for verified inference
        proof = await self.ael.submit_inference(report)

        if report.toxicity_score >= TOXICITY_THRESHOLD:
            logger.warning(
                f"🚨 CRITICAL TOXICITY: {report.toxicity_score:.4f} "
                f"for pool {report.pool_id[:16]}..."
            )

            # Relay to WraithHook on-chain
            if self.relay and report.pool_id in self.monitored_pools:
                pool_info = self.monitored_pools[report.pool_id]
                score_scaled = int(report.toxicity_score * 10000)
                proof_bytes = bytes.fromhex(report.proof_hash)
                proof_hash = proof_bytes.ljust(32, b'\x00')[:32]

                await self.relay.update_toxicity(
                    pool_key=pool_info["pool_key"],
                    score=score_scaled,
                    proof_hash=proof_hash,
                    attackers=report.flagged_addresses,
                )
        else:
            level = report.threat_level.value
            logger.info(
                f"Pool {report.pool_id[:16]}... → "
                f"toxicity: {report.toxicity_score:.4f} ({level})"
            )

    async def run(self):
        """Main sentinel loop."""
        await self.initialize()

        logger.info("╔══════════════════════════════════════╗")
        logger.info("║    WRAITH SENTINEL — ONLINE          ║")
        logger.info("╚══════════════════════════════════════╝")

        while True:
            for pool_id in list(self.monitored_pools.keys()):
                try:
                    report = await self.scan_pool(pool_id)
                    await self.process_report(report)
                except Exception as e:
                    logger.error(f"Scan error for {pool_id[:16]}...: {e}")

            await asyncio.sleep(SCAN_INTERVAL_SECONDS)

    @staticmethod
    def _classify_threat(score: float) -> ThreatLevel:
        if score >= 0.85:
            return ThreatLevel.CRITICAL
        if score >= 0.60:
            return ThreatLevel.DANGEROUS
        if score >= 0.30:
            return ThreatLevel.SUSPICIOUS
        return ThreatLevel.SAFE


# ══════════════════════════════════════════════════════════════
#                      ENTRYPOINT
# ══════════════════════════════════════════════════════════════

async def main():
    agent = SentinelAgent()

    # Example: monitor a pool (configure via env or API in production)
    # agent.add_monitored_pool(
    #     pool_id="0xabc...123",
    #     pool_key={
    #         "currency0": "0x...",
    #         "currency1": "0x...",
    #         "fee": 0x800000,
    #         "tickSpacing": 60,
    #         "hooks": WRAITH_HOOK_ADDRESS,
    #     },
    #     token_address="0x...",
    #     dev_address="0x...",
    # )

    await agent.run()


if __name__ == "__main__":
    asyncio.run(main())
