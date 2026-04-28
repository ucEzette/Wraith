"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { parseAbiItem } from 'viem';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { toast } from 'react-hot-toast';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { wraithHookConfig, WRAITH_HOOK_ADDRESS, POOL_MANAGER_ADDRESS } from '@/lib/contracts';
import { erc20Abi } from 'viem';

export default function ProtectPage() {

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [realHistory, setRealHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const { data: vaultAddress } = useReadContract({
    ...wraithHookConfig,
    functionName: 'userVaults',
    args: [address || '0x0000000000000000000000000000000000000000'],
  });

  const isProtected = vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000';

  const { writeContractAsync, isPending: isTxPending } = useWriteContract();
  const [newVault, setNewVault] = useState('');
  const [targetPoolId, setTargetPoolId] = useState('');
  const [resolvedPool, setResolvedPool] = useState<{ id: string, pair: string, icon: string } | null>(null);
  
  const [toxicityThreshold, setToxicityThreshold] = useState(85);
  const [autoExitEnabled, setAutoExitEnabled] = useState(true);
  const [rescueAsset, setRescueAsset] = useState('USDC');
  const [monitoredPools, setMonitoredPools] = useState<any[]>([]);

  const STABLE_TOKENS = {
    'USDC': '0x06afd270830607994d5a12248443b1f531393a22',
    'ETH': '0x4200000000000000000000000000000000000006',
    'DAI': '0x50c572594a96f0c72e6c4a641f24049a917db0cb'
  };

  // Live Data Fetching
  const { data: liveScore } = useReadContract({
    ...wraithHookConfig,
    functionName: 'toxicityScores',
    args: [targetPoolId as `0x${string}`],
    query: {
      enabled: targetPoolId?.length === 66,
      refetchInterval: 5000
    }
  });

  const { data: isArmed } = useReadContract({
    ...wraithHookConfig,
    functionName: 'isArmedPool',
    args: [targetPoolId as `0x${string}`],
    query: {
      enabled: targetPoolId?.length === 66,
      refetchInterval: 5000
    }
  });
  const getPairName = (id: string) => {
    const registry: Record<string, string> = {
      '0x004ec958ef1254278e301a8c94957cb747cedd35f3f3ab6d3aa9f2680e9ff26e': 'QPHAN / ECHO',
      '0x5002e25409158869ed3c0010620434c21e7b2fb4c13f5e077b2f3ab5ba2aa3c8': 'ETH / ECHO',
      '0x15d8a5d49c21096c7f8eb66b01e287b1ec308f4510ae8b263a0da76b408f095d': 'ECHO / QPHAN',
      '0x7515fdadafd1f8154c328b5832264fde3e9d25289920bfaadc0f4661d81adafd': 'ETH / eiETH',
      '0xdd466e67e58989e504c8651a24d27e1d5838d6438676239f8f2d579298495570': 'WETH / USDC',
      '0xc6a377bf949aa602715015f0709b83e309db9708ec755562761899e90097f480': 'cbBTC / ETH',
      '0xddf252adc685f09623067272186536098679f523b3efd49248443586a1170940': 'DAI / ETH'
    };
    return registry[id.toLowerCase()] || 'UNKNOWN POOL';
  };

  const getPoolIcon = (pair: string) => {
    if (pair.includes('QPHAN')) return 'water_drop';
    if (pair.includes('ETH')) return 'eco';
    if (pair.includes('USDC')) return 'monetization_on';
    return 'help_outline';
  };

  const resolvePool = async (id: string) => {
    setTargetPoolId(id);
    if (!id || id.length !== 66) {
      setResolvedPool(null);
      return;
    }
    localStorage.setItem('wraith_focused_pool', id);
    
    // Check registry first
    let pair = getPairName(id);
    
    if (pair === 'UNKNOWN POOL') {
      setResolvedPool({ id, pair: 'SYNCING...', icon: 'sync' });
      try {
        let logs;
        try {
          logs = await publicClient?.getLogs({
            address: POOL_MANAGER_ADDRESS as `0x${string}`,
            event: parseAbiItem('event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)'),
            args: { id: id as `0x${string}` },
            fromBlock: 'earliest'
          });
        } catch (e) {
          const currentBlock = await publicClient?.getBlockNumber();
          logs = await publicClient?.getLogs({
            address: POOL_MANAGER_ADDRESS as `0x${string}`,
            event: parseAbiItem('event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)'),
            args: { id: id as `0x${string}` },
            fromBlock: currentBlock ? (currentBlock - 9999n > 0n ? currentBlock - 9999n : 0n) : 0n
          });
        }

        if (logs && logs.length > 0) {
          const { currency0, currency1 } = logs[0].args;
          const s0 = await getTokenSymbol(currency0 as string);
          const s1 = await getTokenSymbol(currency1 as string);
          pair = `${s0} / ${s1}`;
        }
      } catch (err) {
        console.error("On-chain resolution failed:", err);
      }
    }

    setResolvedPool({
      id: id,
      pair: pair,
      icon: getPoolIcon(pair)
    });

    // Update persistent list
    const savedPoolsJson = localStorage.getItem('wraith_monitored_pools');
    let pools: any[] = [];
    if (savedPoolsJson) {
      try {
        pools = JSON.parse(savedPoolsJson);
      } catch (e) {}
    }
    
    // Store as objects to keep the resolved names
    const existingIndex = pools.findIndex(p => (typeof p === 'string' ? p === id : p.id === id));
    if (existingIndex === -1) {
      pools.push({ id, pair });
    } else {
      pools[existingIndex] = { id, pair };
    }
    localStorage.setItem('wraith_monitored_pools', JSON.stringify(pools));
    
    // Refresh monitored pools list in state
    setMonitoredPools(pools.map(p => typeof p === 'string' ? { id: p, pair: getPairName(p) } : p));
  };

  useEffect(() => {
    const savedPoolsJson = localStorage.getItem('wraith_monitored_pools');
    if (savedPoolsJson) {
      try {
        const pools = JSON.parse(savedPoolsJson);
        setMonitoredPools(pools.map((p: any) => {
          if (typeof p === 'string') {
            return { id: p, pair: getPairName(p) };
          }
          return p;
        }));
        
        const focused = localStorage.getItem('wraith_focused_pool');
        if (focused && pools.includes(focused)) {
          setTargetPoolId(focused);
          const pair = getPairName(focused);
          setResolvedPool({ id: focused, pair: pair, icon: getPoolIcon(pair) });
        }
      } catch (e) {}
    }

    if (!address || !publicClient) return;

    const fetchHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const logs = await publicClient.getLogs({
          address: WRAITH_HOOK_ADDRESS as `0x${string}`,
          event: parseAbiItem('event QuantumExitTriggered(bytes32 indexed poolId, address indexed user, address rescueToken, uint256 amount0, uint256 amount1)'),
          args: { user: address as `0x${string}` },
          fromBlock: currentBlock - 5000n 
        });

        const formatted = logs.map((log, index) => ({
          id: index,
          pair: 'NATIVE / ASSET', // In a real app, we'd resolve poolId to pairs
          amount: 'RESCUED', 
          date: 'RECENT',
          hash: log.transactionHash
        })).reverse();

        setRealHistory(formatted);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
    // Poll for new events every 15s
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, [address, publicClient]);

  const handleRegister = async () => {
    if (!newVault || !address) return;
    
    const registrationPromise = writeContractAsync({
      ...wraithHookConfig,
      functionName: 'registerWraithGuard',
      args: [
        newVault as `0x${string}`,
        BigInt(toxicityThreshold * 100),
        STABLE_TOKENS[rescueAsset as keyof typeof STABLE_TOKENS] as `0x${string}`,
        autoExitEnabled
      ],
    });

    toast.promise(registrationPromise, {
      loading: 'Activating Wraith-Guard...',
      success: () => {
        setNewVault('');
        setTargetPoolId('');
        setResolvedPool(null);
        localStorage.removeItem('wraith_focused_pool');
        return 'Wraith-Guard Active!';
      },
      error: 'Activation failed. Please check your wallet.',
    });

    try {
      await registrationPromise;
    } catch (err) {
      console.error("Registration failed:", err);
    }
  };

  const handleRevoke = async () => {
    const revokePromise = writeContractAsync({
      ...wraithHookConfig,
      functionName: 'revokeWraithGuard',
    });

    toast.promise(revokePromise, {
      loading: 'Deactivating Protection...',
      success: 'Wraith-Guard Revoked.',
      error: 'Revoke failed.',
    });

    try {
      await revokePromise;
    } catch (err) {
      console.error("Revoke failed:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-cyan-500/30">
      <div className="scanlines"></div>
      
      <header className="bg-slate-950/60 backdrop-blur-md border-b border-white/10 sticky top-0 z-[100] w-full">
        <div className="max-w-[1440px] mx-auto px-12 h-20 flex justify-between items-center">
          <div className="flex items-center gap-lg">
            <div className="flex items-center">
              <img src="/logo.png" alt="Wraith Logo" className="h-12 w-auto" />
            </div>
            <nav className="hidden md:flex gap-md font-sans tracking-widest uppercase text-xs font-bold">
              <Link className="text-slate-400 hover:text-cyan-200 transition-all" href="/">Dashboard</Link>
              <Link className="text-cyan-400 border-b border-cyan-400 pb-1" href="/protect">Protection</Link>
              <Link className="text-slate-400 hover:text-cyan-200 transition-all" href="/info">How it Works</Link>
            </nav>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto pt-12 pb-24 px-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">My Protection</h1>
          <p className="text-slate-400">Manage your active defenses and monitor vault integrity.</p>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* SETUP CARD */}
          <div className="col-span-5 bg-slate-900/40 border border-white/5 rounded-2xl p-8 backdrop-blur-xl flex flex-col justify-between min-h-[600px]">
            <div>
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-cyan-400 text-3xl">shield_locked</span>
                  <h2 className="text-sm font-bold tracking-widest uppercase text-slate-200">WRAITH-GUARD SETUP</h2>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isProtected ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
                  <div className={`w-2 h-2 rounded-full ${isProtected ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,240,255,1)]' : 'bg-slate-600'}`}></div>
                  <span className="text-[10px] font-bold tracking-widest uppercase">{isProtected ? "PROTECTED" : "UNPROTECTED"}</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-950/40 p-5 rounded-xl border border-white/5">
                  <label 
                    title="The level of malicious activity detected (0-100%) that will trigger an automatic liquidity rescue."
                    className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4 block cursor-help flex items-center gap-1"
                  >
                    TOXICITY ALERT THRESHOLD: {toxicityThreshold}%
                    <span className="material-symbols-outlined text-[12px] opacity-40">info</span>
                  </label>
                  <input 
                    type="range" min="1" max="99" value={toxicityThreshold}
                    onChange={(e) => setToxicityThreshold(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Aggressive</span>
                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Conservative</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
                    <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2 block">STRATEGY</label>
                    <select 
                      value={autoExitEnabled ? 'auto' : 'manual'}
                      onChange={(e) => setAutoExitEnabled(e.target.value === 'auto')}
                      className="bg-transparent text-white font-bold text-xs outline-none w-full cursor-pointer"
                    >
                      <option value="auto">Quantum Auto-Exit</option>
                      <option value="manual">Sentinel Alert</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">RESCUE VAULT</label>
                    <button onClick={() => setNewVault(address || '')} className="text-[9px] text-cyan-400 hover:text-cyan-200 transition-colors font-bold uppercase">Use My Wallet</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-600 text-lg">account_balance_wallet</span>
                    <input 
                      className="bg-transparent border-none outline-none font-mono text-xs text-white w-full p-0" 
                      type="text" placeholder="0x... (e.g. cold wallet)"
                      value={newVault}
                      onChange={(e) => setNewVault(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
                  <label 
                    title="The safe asset (stablecoin or ETH) your funds will be swapped into during an emergency exit."
                    className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2 block cursor-help flex items-center gap-1"
                  >
                    RESCUE ASSET
                    <span className="material-symbols-outlined text-[12px] opacity-40">info</span>
                  </label>
                  <div className="flex gap-2">
                    {['USDC', 'ETH', 'DAI'].map(asset => (
                      <button key={asset} onClick={() => setRescueAsset(asset)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${rescueAsset === asset ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'bg-slate-950/50 border-white/10 text-slate-400 hover:border-white/20'}`}>{asset}</button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
                  <label 
                    title="The unique identifier of the Uniswap v4 pool you wish to monitor for toxicity."
                    className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-2 block cursor-help flex items-center gap-1"
                  >
                    TARGET POOL ID (MONITOR)
                    <span className="material-symbols-outlined text-[12px] opacity-40">info</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-600 text-lg">search</span>
                    <input 
                      className="bg-transparent border-none outline-none font-mono text-xs text-white w-full p-0" 
                      type="text" placeholder="Enter Pool ID..."
                      value={targetPoolId}
                      onChange={(e) => resolvePool(e.target.value)}
                    />
                  </div>
                  {resolvedPool && (
                    <div className="mt-3 flex items-center gap-2 text-cyan-400">
                      <span className="material-symbols-outlined text-sm">{resolvedPool.icon}</span>
                      <span className="text-[10px] font-bold tracking-widest uppercase">DETECTED: {resolvedPool.pair}</span>
                    </div>
                  )}
                  
                  {/* Quick Select Monitors */}
                  {monitoredPools.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <label className="text-[9px] font-bold text-slate-600 tracking-widest uppercase mb-2 block">Quick Select Active Monitors</label>
                      <div className="flex flex-wrap gap-2">
                        {monitoredPools.slice(0, 4).map(p => (
                          <button 
                            key={p.id}
                            onClick={() => resolvePool(p.id)}
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${targetPoolId === p.id ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-slate-900 border-white/10 text-slate-500 hover:border-white/20'}`}
                          >
                            {p.pair}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <button 
                onClick={handleRegister} 
                disabled={isTxPending || !newVault} 
                className="w-full bg-cyan-500 text-slate-950 font-bold py-4 rounded-xl hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all flex flex-col items-center justify-center disabled:opacity-50 tracking-widest group"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg group-hover:rotate-12 transition-transform">bolt</span>
                  <span className="text-sm">{isProtected ? "UPDATE WRAITH-GUARD" : "ACTIVATE WRAITH-GUARD"}</span>
                </div>
                <span className="text-[9px] opacity-60 font-mono mt-1">{isTxPending ? "SYNCHRONIZING..." : isProtected ? "OVERWRITE CURRENT DEFENSES" : "SECURE YOUR LIQUIDITY"}</span>
              </button>

              {isProtected && (
                <button 
                  onClick={handleRevoke} 
                  disabled={isTxPending} 
                  className="w-full bg-red-500/5 border border-red-500/10 text-red-500/50 font-bold py-3 rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all flex justify-center items-center gap-2 text-[10px] tracking-widest"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                  {isTxPending ? "REVOKING..." : "REVOKE ALL PROTECTION"}
                </button>
              )}
            </div>
          </div>

          {/* ACTIVE MONITORS & HISTORY */}
          <div className="col-span-7 space-y-8">
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl">
              <div className="p-6 border-b border-white/10 flex items-center gap-3">
                <span className="material-symbols-outlined text-cyan-400">water_drop</span>
                <h2 className="text-xs font-bold tracking-widest uppercase text-slate-200">ACTIVE POOL MONITORS</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                      <th className="p-4 text-[10px] font-bold tracking-widest text-slate-500 uppercase">POOL PAIR</th>
                      <th className="p-4 text-[10px] font-bold tracking-widest text-slate-500 uppercase">POOL ID</th>
                      <th className="p-4 text-[10px] font-bold tracking-widest text-slate-500 uppercase">STATUS</th>
                      <th className="p-4 text-[10px] font-bold tracking-widest text-slate-500 uppercase text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-mono">
                    {monitoredPools.length > 0 ? (
                      monitoredPools.map(pool => (
                        <tr key={pool.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                          <td className="p-4 text-white font-sans font-bold">{pool.pair}</td>
                          <td className="p-4 text-slate-500">{pool.id.slice(0, 10)}...{pool.id.slice(-8)}</td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${isProtected ? 'bg-cyan-400 animate-pulse shadow-[0_0_10px_rgba(6,182,212,1)]' : 'bg-slate-600'}`}></div>
                                <span className={`font-sans font-bold tracking-tighter ${isProtected ? 'text-cyan-400' : 'text-slate-500'}`}>
                                  {isProtected ? "ARMED" : "MONITORING"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <button 
                              onClick={() => {
                                const newPools = monitoredPools.filter(p => p.id !== pool.id);
                                setMonitoredPools(newPools);
                                localStorage.setItem('wraith_monitored_pools', JSON.stringify(newPools.map(p => p.id)));
                              }}
                              className="text-slate-600 hover:text-red-400 transition-colors"
                              title="Stop Monitoring"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                            <button 
                              disabled={isTxPending}
                              onClick={async () => {
                                // Dynamic PoolKey resolution logic
                                const poolKey = {
                                  currency0: pool.id === '0x5002e25409158869ed3c0010620434c21e7b2fb4c13f5e077b2f3ab5ba2aa3c8' ? '0x0000000000000000000000000000000000000000' as `0x${string}` : '0x6586035D5e39e30bf37445451b43EEaEeAa1405a' as `0x${string}`,
                                  currency1: pool.id === '0x5002e25409158869ed3c0010620434c21e7b2fb4c13f5e077b2f3ab5ba2aa3c8' ? '0x6586035D5e39e30bf37445451b43EEaEeAa1405a' as `0x${string}` : '0x9d803a3066c858d714c4f5ee286eaa6249d451ab' as `0x${string}`,
                                  fee: 3000,
                                  tickSpacing: 60,
                                  hooks: WRAITH_HOOK_ADDRESS as `0x${string}`
                                };

                                const exitPromise = writeContractAsync({
                                  ...wraithHookConfig,
                                  functionName: 'sovereignOverride',
                                  args: [poolKey],
                                });

                                toast.promise(exitPromise, {
                                  loading: `Rescuing ${pool.pair}...`,
                                  success: 'Assets Rescued!',
                                  error: 'Sovereign Exit failed.',
                                });
                              }}
                              className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold px-3 py-1.5 rounded uppercase tracking-widest transition-all"
                            >
                              SOVEREIGN EXIT
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-600 text-[10px] uppercase tracking-widest font-bold">
                          No active monitors. Enter a Pool ID above to track.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-xl min-h-[300px]">
              <div className="p-6 border-b border-white/10 flex items-center gap-3 bg-red-500/5">
                <span className="material-symbols-outlined text-red-500">emergency</span>
                <h2 className="text-xs font-bold tracking-widest uppercase text-red-500">QUANTUM EXITS (PAST 30D)</h2>
              </div>
              <div className="p-6 space-y-4">
                {isHistoryLoading && realHistory.length === 0 ? (
                  <div className="text-center py-12 text-slate-600 text-[10px] uppercase font-bold tracking-widest animate-pulse">
                    Synchronizing History...
                  </div>
                ) : realHistory.length > 0 ? (
                  realHistory.map(exit => (
                    <div key={exit.id} className="bg-slate-950/40 p-4 rounded-xl border border-white/5 flex justify-between items-center group hover:border-cyan-500/30 transition-all">
                      <div>
                        <div className="text-white font-bold mb-1">{exit.pair}</div>
                        <div className="text-[10px] text-slate-500 tracking-widest uppercase">RESCUED: {exit.amount}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-600 font-bold mb-2 uppercase">{exit.date}</div>
                        <a 
                          href={`https://unichain-sepolia.blockscout.com/tx/${exit.hash}`} 
                          target="_blank" 
                          className="text-[10px] text-cyan-400 font-mono hover:underline group-hover:text-cyan-200"
                        >
                          {exit.hash.slice(0, 14)}...
                        </a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-600 text-[10px] uppercase font-bold tracking-widest">
                    No recent rescue events detected.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-slate-950 border-t border-white/5 py-12 px-12">
        <div className="max-w-[1440px] mx-auto flex justify-between items-center">
          <div className="text-cyan-400 font-bold font-mono text-[10px] tracking-tighter uppercase">
            WRAITH PROTOCOL // ACTIVE_DEFENSE_V4
          </div>
          <div className="flex gap-8 font-sans text-[10px] font-bold tracking-widest uppercase text-slate-600">
            <a className="hover:text-cyan-400 transition-colors" href="#">Docs</a>
            <a className="hover:text-cyan-400 transition-colors" href="#">Security</a>
            <a className="hover:text-cyan-400 transition-colors" href="#">Github</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
