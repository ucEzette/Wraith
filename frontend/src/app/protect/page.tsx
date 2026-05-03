"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { parseAbiItem } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  usePublicClient,
} from "wagmi";
import { toast } from "react-hot-toast";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  wraithHookConfig,
  WRAITH_HOOK_ADDRESS,
  POOL_MANAGER_ADDRESS,
  poolManagerConfig,
} from "@/lib/contracts";
import { erc20Abi } from "viem";

export default function ProtectPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [realHistory, setRealHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isOperatorApproved, setIsOperatorApproved] = useState(false);

  const { data: vaultAddress } = useReadContract({
    ...wraithHookConfig,
    functionName: "userVaults",
    args: [address || "0x0000000000000000000000000000000000000000"],
  } as any);

  const isProtected = !!(
    vaultAddress &&
    vaultAddress !== "0x0000000000000000000000000000000000000000"
  );

  const { writeContractAsync } = useWriteContract();
  const [isTxPending, setIsTxPending] = useState(false);
  const [newVault, setNewVault] = useState("");
  const [targetPoolId, setTargetPoolId] = useState("");
  const [resolvedPool, setResolvedPool] = useState<{
    id: string;
    pair: string;
    icon: string;
  } | null>(null);

  const [toxicityThreshold, setToxicityThreshold] = useState(85);
  const [autoExitEnabled, setAutoExitEnabled] = useState(true);
  const [rescueAsset, setRescueAsset] = useState("USDC");
  const [monitoredPools, setMonitoredPools] = useState<any[]>([]);

  const STABLE_TOKENS = {
    USDC: "0x06afd270830607994d5a12248443b1f531393a22",
    ETH: "0x4200000000000000000000000000000000000006",
    DAI: "0x50c572594a96f0c72e6c4a641f24049a917db0cb",
  };

  const getTokenSymbol = async (tokenAddress: string) => {
    if (!tokenAddress || tokenAddress === "0x0000000000000000000000000000000000000000") return "ETH";
    try {
      const symbol = await (publicClient as any)?.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "symbol",
      });
      return symbol as string;
    } catch (e) {
      return tokenAddress.slice(0, 6);
    }
  };

  const getPairName = (id: string) => {
    const registry: Record<string, string> = {
      "0x7233e7e2e9c7f1eff9ae03a8850324db64d71ae40b39d51a20c005e200ab1915": "ETH / USDC",
      "0x129a7e735ef695ae9ef143e2a2e4efab57630ab31ae7c11a404c6ebe0cd04051": "WETH / USDC",
      "0xdafa310b1b0cda3038d2669884e1718fc32c1a6aa272003a6bc8a0f3ecf7617e": "QPHAN / USDC",
      "0xf2e655c55c811222ea6232741a8715879e1255b484d276ab6e1e50c293392123": "ECHO / USDC",
      "0x931ed6780e94aa42fc3a93681f797c52988fe76e58712666ee960d3913199cff": "WRAITH / USDC",
      "0x7515fdadafd1f8154c328b5832264fde3e9d25289920bfaadc0f4661d81adafd": "ETH / eiETH",
    };
    return registry[id.toLowerCase()] || "UNKNOWN POOL";
  };

  const getStorageKey = () => address ? `wraith_monitored_pools_${address.toLowerCase()}` : "wraith_monitored_pools_global";

  const resolvePool = async (id: string) => {
    setTargetPoolId(id);
    if (!id || id.length !== 66) { setResolvedPool(null); return; }
    localStorage.setItem("wraith_focused_pool", id);
    let pair = getPairName(id);
    if (pair === "UNKNOWN POOL") {
      setResolvedPool({ id, pair: "SYNCING...", icon: "sync" });
      try {
        const currentBlock = await publicClient?.getBlockNumber();
        const logs = await publicClient?.getLogs({
          address: POOL_MANAGER_ADDRESS as `0x${string}`,
          event: parseAbiItem("event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)") as any,
          args: { id: id as `0x${string}` } as any,
          fromBlock: currentBlock && currentBlock > 10000n ? currentBlock - 10000n : 50680000n,
        });
        if (logs && logs.length > 0) {
          const l = logs[0] as unknown as { args: { currency0: string; currency1: string } };
          pair = `${await getTokenSymbol(l.args.currency0)} / ${await getTokenSymbol(l.args.currency1)}`;
        }
      } catch (err) {}
    }
    setResolvedPool({ id, pair, icon: "water_drop" });
    const key = getStorageKey();
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    const idx = saved.findIndex((p: any) => (typeof p === "string" ? p === id : p.id === id));
    if (idx === -1) saved.push({ id, pair }); else saved[idx] = { id, pair };
    localStorage.setItem(key, JSON.stringify(saved));
    setMonitoredPools(saved.map((p: any) => (typeof p === "string" ? { id: p, pair: getPairName(p) } : p)));
  };

  const syncState = async () => {
    if (!address || !publicClient) return;
    try {
      const approved = await publicClient.readContract({ ...poolManagerConfig, functionName: "isOperator", args: [address as `0x${string}`, WRAITH_HOOK_ADDRESS as `0x${string}`] } as any);
      setIsOperatorApproved(approved as boolean);
      const currentBlock = await publicClient.getBlockNumber();
      const logs = await (async () => {
        const results = [];
        let start = 50680000n;
        while (start < currentBlock) {
          const end = start + 9999n > currentBlock ? currentBlock : start + 9999n;
          const chunk = await publicClient.getLogs({
            address: WRAITH_HOOK_ADDRESS as `0x${string}`,
            event: parseAbiItem("event QuantumExitTriggered(bytes32 indexed poolId, address indexed user, address rescueToken, uint256 amount0, uint256 amount1)") as any,
            args: { user: address } as any,
            fromBlock: start,
            toBlock: end,
          });
          results.push(...chunk);
          start = end + 1n;
        }
        return results;
      })();
      setRealHistory(await Promise.all(logs.map(async (l: any) => ({
        id: l.args.poolId,
        pair: getPairName(l.args.poolId),
        amount: (Number(l.args.amount0 || 0n) + Number(l.args.amount1 || 0n)) / 1e18,
        txHash: l.transactionHash,
      }))));
      const key = getStorageKey();
      const pools = JSON.parse(localStorage.getItem(key) || "[]");
      const mappedPools = await Promise.all(pools.map(async (p: any) => {
        const id = typeof p === "string" ? p : p.id;
        let pair = typeof p === "object" && p.pair ? p.pair : getPairName(id);
        if (!pair || pair === "UNKNOWN POOL") {
          try {
            const l = await publicClient.getLogs({
              address: POOL_MANAGER_ADDRESS as `0x${string}`,
              event: parseAbiItem("event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)") as any,
              args: { id: id as `0x${string}` } as any,
              fromBlock: currentBlock > 10000n ? currentBlock - 10000n : 50680000n,
            });
            if (l && l.length > 0) {
              const log = l[0] as unknown as { args: { currency0: string; currency1: string } };
              pair = `${await getTokenSymbol(log.args.currency0)} / ${await getTokenSymbol(log.args.currency1)}`;
            }
          } catch (e) {}
        }
        return { id, pair };
      }));
      localStorage.setItem(key, JSON.stringify(mappedPools));
      setMonitoredPools(mappedPools);
    } catch (e) {}
  };

  useEffect(() => {
    const key = getStorageKey();
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    setMonitoredPools(saved.map((p: any) => typeof p === "string" ? { id: p, pair: getPairName(p) } : p));
    if (!address || !publicClient) return;
    syncState();
    const i = setInterval(syncState, 15000);
    return () => clearInterval(i);
  }, [address, publicClient]);

  const handleRegister = async () => {
    if (!newVault || !address) return;
    setIsTxPending(true);
    try {
      if (autoExitEnabled && !isOperatorApproved) {
        const atx = await writeContractAsync({ ...poolManagerConfig, functionName: "setOperator", args: [WRAITH_HOOK_ADDRESS as `0x${string}`, true] } as any);
        if (publicClient) await publicClient.waitForTransactionReceipt({ hash: atx });
        setIsOperatorApproved(true);
      }
      const rtx = await writeContractAsync({
        ...wraithHookConfig,
        functionName: "registerWraithGuard",
        args: [newVault as `0x${string}`, BigInt(toxicityThreshold * 100), STABLE_TOKENS[rescueAsset as keyof typeof STABLE_TOKENS] as `0x${string}`, autoExitEnabled],
      } as any);
      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: rtx });
      toast.success("Active!");
      setNewVault("");
      setTimeout(syncState, 2000);
    } catch (e: any) { toast.error(e.shortMessage || "Failed."); }
    finally { setIsTxPending(false); }
  };

  const handleRevoke = async () => {
    const p = writeContractAsync({ ...wraithHookConfig, functionName: "revokeWraithGuard" } as any);
    toast.promise(p, { loading: "Revoking...", success: "Revoked.", error: "Failed." });
    try { await p; } catch (e) {}
  };

  const handleRemoveMonitor = (id: string) => {
    const key = getStorageKey();
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    const updated = saved.filter((p: any) => (typeof p === "string" ? p !== id : p.id !== id));
    localStorage.setItem(key, JSON.stringify(updated));
    
    // Track hidden pools
    const hiddenKey = "wraith_hidden_pools";
    const hidden = JSON.parse(localStorage.getItem(hiddenKey) || "[]");
    if (!hidden.includes(id)) {
      hidden.push(id);
      localStorage.setItem(hiddenKey, JSON.stringify(hidden));
    }
    
    setMonitoredPools(updated.map((p: any) => (typeof p === "string" ? { id: p, pair: getPairName(p) } : p)));
    toast.success("Monitor Removed");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      <div className="scanlines"></div>
      <header className="bg-slate-950/60 backdrop-blur-md border-b border-white/10 sticky top-0 z-[100] h-20 px-12 flex justify-between items-center max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-8">
          <Link href="/">
            <img src="/logo.png" alt="Logo" className="h-12 w-auto cursor-pointer" />
          </Link>
          <nav className="flex gap-6 font-bold uppercase text-xs tracking-widest">
            <Link className="text-slate-400 hover:text-cyan-400" href="/">Home</Link>
            <Link className="text-slate-400 hover:text-cyan-400" href="/dashboard">Dashboard</Link>
            <Link className="text-cyan-400 border-b border-cyan-400 pb-1" href="/protect">Protection</Link>
            <Link className="text-slate-400 hover:text-cyan-400 flex items-center gap-1" href="/info">
              <span className="material-symbols-outlined text-[16px]">help</span>
              How it Works
            </Link>
            <Link className="text-slate-400 hover:text-cyan-400" href="/liquidity">Liquidity</Link>
          </nav>
        </div>
        <ConnectButton chainStatus="icon" showBalance={false} />
      </header>

      <main className="max-w-[1440px] mx-auto pt-12 pb-24 px-12 grid grid-cols-12 gap-8">
        <div className="col-span-12 mb-8">
          <h1 className="text-4xl font-bold">Protocol Protection</h1>
          <p className="text-slate-400 mt-2">Manage your active defenses and monitor vault integrity.</p>
        </div>

        <div className="col-span-5 bg-slate-900/40 border border-white/5 rounded-2xl p-8 backdrop-blur-xl space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold tracking-widest uppercase">SETUP GUARD</h2>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${isProtected ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-slate-800 border-white/5 text-slate-500"}`}>
              {isProtected ? "PROTECTED" : "UNPROTECTED"}
            </span>
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">THRESHOLD: {toxicityThreshold}%</label>
            <input type="range" min="1" max="99" value={toxicityThreshold} onChange={(e) => setToxicityThreshold(parseInt(e.target.value))} className="w-full accent-cyan-400" />
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">RESCUE VAULT</label>
              {address && (
                <button 
                  onClick={() => setNewVault(address)}
                  className="text-[9px] text-cyan-400 hover:text-cyan-200 uppercase font-bold tracking-tighter"
                >
                  USE CONNECTED WALLET
                </button>
              )}
            </div>
            <input className="bg-transparent border-none outline-none font-mono text-xs w-full" type="text" placeholder="0x..." value={newVault} onChange={(e) => setNewVault(e.target.value)} />
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">PAYOUT CURRENCY</label>
            <div className="grid grid-cols-3 gap-3">
              {Object.keys(STABLE_TOKENS).map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setRescueAsset(symbol)}
                  className={`py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                    rescueAsset === symbol
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                      : "bg-slate-900 border-white/5 text-slate-500 hover:border-white/20"
                  }`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">TARGET POOL ID</label>
            <input className="bg-transparent border-none outline-none font-mono text-xs w-full" type="text" placeholder="Pool ID..." value={targetPoolId} onChange={(e) => resolvePool(e.target.value)} />
            {resolvedPool && <div className="mt-2 text-cyan-400 text-[10px] font-bold uppercase">DETECTED: {resolvedPool.pair}</div>}
          </div>

          <div className="bg-slate-900/60 p-5 rounded-xl border border-cyan-500/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isOperatorApproved ? "bg-cyan-500/20 text-cyan-400" : "bg-slate-800 text-slate-500"}`}>
                <span className="material-symbols-outlined text-[18px]">{isOperatorApproved ? "verified" : "lock"}</span>
              </div>
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest">Protocol Authorization</h3>
                <p className="text-[9px] text-slate-500">Enable Wraith Protocol to act on your behalf during a rescue event.</p>
              </div>
            </div>
            {!isOperatorApproved && (
              <button 
                onClick={async () => {
                  try {
                    const atx = await writeContractAsync({ ...poolManagerConfig, functionName: "setOperator", args: [WRAITH_HOOK_ADDRESS as `0x${string}`, true] } as any);
                    if (publicClient) await publicClient.waitForTransactionReceipt({ hash: atx });
                    setIsOperatorApproved(true);
                    toast.success("Protocol Authorized");
                  } catch (e: any) { toast.error("Authorization failed."); }
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-white/5 transition-colors"
              >
                Sign Permit & Authorize
              </button>
            )}
            {isOperatorApproved && (
              <div className="text-[9px] text-cyan-400 font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                PERMISSION GRANTED // PROTOCOL ACTIVE
              </div>
            )}
          </div>

          <button onClick={handleRegister} disabled={isTxPending || !newVault} className="w-full bg-cyan-500 text-slate-950 font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50 uppercase text-xs tracking-widest">
            {isProtected ? "UPDATE PROTECTION" : "ACTIVATE PROTECTION"}
          </button>
          {isProtected && <button onClick={handleRevoke} className="w-full bg-red-500/10 text-red-500 font-bold py-3 rounded-xl border border-red-500/20 text-[10px] uppercase tracking-widest">REVOKE GUARD</button>}
        </div>

        <div className="col-span-7 space-y-8">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-6 border-b border-white/10 text-[10px] font-bold tracking-widest uppercase">ACTIVE MONITORS</div>
            <table className="w-full text-left">
              <thead><tr className="bg-white/5 text-[9px] text-slate-500 uppercase tracking-widest"><th className="p-4">PAIR</th><th className="p-4">ID</th><th className="p-4">STATUS</th><th className="p-4 text-right">ACTION</th></tr></thead>
              <tbody className="text-xs font-mono">
                {monitoredPools.map(p => (
                  <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-sans font-bold">{p.pair}</td>
                    <td className="p-4 text-slate-500">{p.id.slice(0, 10)}...</td>
                    <td className="p-4 text-cyan-400 font-bold">ARMED</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleRemoveMonitor(p.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-6 border-b border-white/10 bg-red-500/5 text-[10px] font-bold tracking-widest uppercase text-red-500">RESCUE HISTORY</div>
            <div className="p-6 space-y-4">
              {realHistory.map(h => (
                <div key={h.txHash} className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <div><div className="font-bold">{h.pair}</div><div className="text-[10px] text-slate-500 uppercase">RESCUED: {h.amount}</div></div>
                  <a href={`https://unichain-sepolia.blockscout.com/tx/${h.txHash}`} target="_blank" className="text-[10px] text-cyan-400 hover:underline">TX</a>
                </div>
              ))}
              {realHistory.length === 0 && <div className="text-center py-8 text-slate-600 text-[10px] uppercase font-bold tracking-widest">No recent rescues.</div>}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-950 border-t border-white/5 py-8 text-center text-[9px] text-slate-600 uppercase tracking-widest">
        WRAITH PROTOCOL // SECURE_LAYER_V4
      </footer>
    </div>
  );
}
