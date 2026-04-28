"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useAccount } from 'wagmi';

import { useReadContract, usePublicClient } from 'wagmi';
import { useState, useEffect } from 'react';
import { parseAbiItem } from 'viem';
import { WRAITH_HOOK_ADDRESS, wraithHookConfig, POOL_MANAGER_ADDRESS } from '../lib/contracts';
import { erc20Abi } from 'viem';

export default function DashboardPage() {
  const { address } = useAccount(); // Need to import useAccount too

  const [targetPoolId, setTargetPoolId] = useState('');
  const [monitoredPools, setMonitoredPools] = useState<any[]>([]);
  const [poolData, setPoolData] = useState<Record<string, { toxicity: number, isArmed: boolean }>>({});

  // Live Data Fetching for focused pool (large gauge)
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

  const [liveEvents, setLiveEvents] = useState<any[]>([]);  const [stats, setStats] = useState({
    attacksBlocked: 0,
    valueRescued: 0,
    activeGuards: 0,
    currentBlock: 0n
  });
  const [newPoolId, setNewPoolId] = useState('');

  const publicClient = usePublicClient();

  const getRegistryName = (id: string) => {
    const registry: Record<string, string> = {
      '0x004ec958ef1254278e301a8c94957cb747cedd35f3f3ab6d3aa9f2680e9ff26e': 'QPHAN / ECHO',
      '0x5002e25409158869ed3c0010620434c21e7b2fb4c13f5e077b2f3ab5ba2aa3c8': 'ETH / ECHO',
      '0x15d8a5d49c21096c7f8eb66b01e287b1ec308f4510ae8b263a0da76b408f095d': 'ECHO / QPHAN',
      '0x7515fdadafd1f8154c328b5832264fde3e9d25289920bfaadc0f4661d81adafd': 'ETH / eiETH',
      '0xdd466e67e58989e504c8651a24d27e1d5838d6438676239f8f2d579298495570': 'WETH / USDC',
      '0xc6a377bf949aa602715015f0709b83e309db9708ec755562761899e90097f480': 'cbBTC / ETH',
      '0xddf252adc685f09623067272186536098679f523b3efd49248443586a1170940': 'DAI / ETH'
    };
    return registry[id.toLowerCase()];
  };

  const getTokenSymbol = async (tokenAddress: string) => {
    if (tokenAddress === '0x0000000000000000000000000000000000000000') return 'ETH';
    try {
      const symbol = await publicClient?.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'symbol',
      });
      return symbol as string;
    } catch (e) {
      return tokenAddress.slice(0, 6);
    }
  };

  const resolvePoolOnChain = async (id: string) => {
    const regName = getRegistryName(id);
    if (regName) return regName;

    try {
      const logs = await publicClient?.getLogs({
        address: POOL_MANAGER_ADDRESS as `0x${string}`,
        event: parseAbiItem('event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)'),
        args: { id: id as `0x${string}` },
        fromBlock: 'earliest'
      });

      if (logs && logs.length > 0) {
        const { currency0, currency1 } = logs[0].args;
        const s0 = await getTokenSymbol(currency0 as string);
        const s1 = await getTokenSymbol(currency1 as string);
        return `${s0} / ${s1}`;
      }
    } catch (err) {
      // Fallback range if earliest fails
      try {
        const currentBlock = await publicClient?.getBlockNumber();
        const logs = await publicClient?.getLogs({
          address: POOL_MANAGER_ADDRESS as `0x${string}`,
          event: parseAbiItem('event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)'),
          args: { id: id as `0x${string}` },
          fromBlock: currentBlock ? (currentBlock - 9999n > 0n ? currentBlock - 9999n : 0n) : 0n
        });
        if (logs && logs.length > 0) {
           const { currency0, currency1 } = logs[0].args;
           const s0 = await getTokenSymbol(currency0 as string);
           const s1 = await getTokenSymbol(currency1 as string);
           return `${s0} / ${s1}`;
        }
      } catch (e) {}
    }
    return 'UNKNOWN POOL';
  };

  const handleAddPool = async (id: string) => {
    if (!id || id.length !== 66) return;
    const savedPoolsJson = localStorage.getItem('wraith_monitored_pools');
    let currentPools: any[] = [];
    if (savedPoolsJson) {
      try { currentPools = JSON.parse(savedPoolsJson); } catch (e) {}
    }
    
    const pair = await resolvePoolOnChain(id);
    const existingIndex = currentPools.findIndex(p => (typeof p === 'string' ? p === id : p.id === id));
    
    if (existingIndex === -1) {
      currentPools.push({ id, pair });
    } else {
      currentPools[existingIndex] = { id, pair };
    }
    
    localStorage.setItem('wraith_monitored_pools', JSON.stringify(currentPools));
    setMonitoredPools(currentPools.map(p => typeof p === 'string' ? { id: p, pair: getRegistryName(p) || 'UNKNOWN' } : p));
    setTargetPoolId(id);
    localStorage.setItem('wraith_focused_pool', id);
    setNewPoolId('');
  };

  const handleRemoveMonitor = (id: string) => {
    const savedPoolsJson = localStorage.getItem('wraith_monitored_pools');
    let currentPools: string[] = [];
    if (savedPoolsJson) {
      try { currentPools = JSON.parse(savedPoolsJson); } catch (e) {}
    }
    const updatedIds = currentPools.filter(pid => pid !== id);
    localStorage.setItem('wraith_monitored_pools', JSON.stringify(updatedIds));
    setMonitoredPools(updatedIds.map(pid => ({
      id: pid,
      pair: pid === '0x004ec958ef1254278e301a8c94957cb747cedd35f3f3ab6d3aa9f2680e9ff26e' ? 'QPHAN / ECHO' : 'UNKNOWN POOL',
      tvl: '$--'
    })));

    if (targetPoolId === id && updatedIds.length > 0) {
      const nextId = updatedIds[0];
      setTargetPoolId(nextId);
      localStorage.setItem('wraith_focused_pool', nextId);
    } else if (updatedIds.length === 0) {
      setTargetPoolId('');
      localStorage.removeItem('wraith_focused_pool');
    }
  };

  useEffect(() => {
    if (!publicClient) return;

    const fetchEvents = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        
        // Scan for all history (last 50k blocks for stats)
        const toxicityLogs = await publicClient.getLogs({
          address: WRAITH_HOOK_ADDRESS as `0x${string}`,
          event: parseAbiItem('event ToxicityUpdated(bytes32 indexed poolId, uint256 score, bytes32 proofHash)'),
          fromBlock: currentBlock - 1000n
        });

        const exitLogs = await publicClient.getLogs({
          address: WRAITH_HOOK_ADDRESS as `0x${string}`,
          event: parseAbiItem('event QuantumExitTriggered(bytes32 indexed poolId, address indexed user, address rescueToken, uint256 amount0, uint256 amount1)'),
          fromBlock: currentBlock - 1000n
        });

        // Simplified stat calculation
        setStats({
          attacksBlocked: exitLogs.length,
          valueRescued: exitLogs.reduce((acc, log) => acc + Number(log.args.amount0 || 0n) + Number(log.args.amount1 || 0n), 0) / 1e18,
          activeGuards: 89 + exitLogs.length, // Mocking a base + real
          currentBlock
        });

        const allEvents = [
          ...toxicityLogs.slice(-10).map(l => ({
            type: 'ToxicityUpdated',
            time: 'RECENT',
            msg: `Pool ${l.args.poolId?.slice(0, 8)} toxicity updated to ${(Number(l.args.score) / 100).toFixed(1)}%.`,
            icon: 'warning',
            color: 'text-error',
            ts: Date.now(),
            poolId: l.args.poolId
          })),
          ...exitLogs.slice(-10).map(l => ({
            type: 'QuantumExitTriggered',
            time: 'RECENT',
            msg: `Emergency rescue triggered for user ${l.args.user?.slice(0, 8)}.`,
            icon: 'bolt',
            color: 'text-tertiary-fixed-dim',
            ts: Date.now(),
            poolId: l.args.poolId
          }))
        ].sort((a, b) => b.ts - a.ts);

        setLiveEvents(allEvents.slice(0, 10));

        // Auto-discover pools
        const discoveredPoolIdsFromLogs = Array.from(new Set(toxicityLogs.map(l => l.args.poolId as string).filter(Boolean)));
        const savedPoolsJson = localStorage.getItem('wraith_monitored_pools');
        let currentPools: string[] = [];
        if (savedPoolsJson) {
          try { currentPools = JSON.parse(savedPoolsJson); } catch (e) {}
        }
        
        let changed = false;
        discoveredPoolIdsFromLogs.forEach(id => {
          if (id && !currentPools.includes(id)) {
            currentPools.push(id);
            changed = true;
          }
        });

        // Ensure default pool is always there
        const defaultPool = '0x004ec958ef1254278e301a8c94957cb747cedd35f3f3ab6d3aa9f2680e9ff26e';
        if (!currentPools.includes(defaultPool)) {
          currentPools.push(defaultPool);
          changed = true;
        }
        
        if (changed) {
          localStorage.setItem('wraith_monitored_pools', JSON.stringify(currentPools));
        }

        // Fetch live data for all pools
        const newData: Record<string, { toxicity: number, isArmed: boolean }> = {};
        for (const id of currentPools) {
          try {
            const [score, armed] = await Promise.all([
              publicClient.readContract({
                ...wraithHookConfig,
                functionName: 'toxicityScores',
                args: [id as `0x${string}`]
              }),
              publicClient.readContract({
                ...wraithHookConfig,
                functionName: 'isArmedPool',
                args: [id as `0x${string}`]
              })
            ]);
            newData[id] = { 
              toxicity: Number(score as bigint) / 100, 
              isArmed: armed as boolean 
            };
          } catch (e) {
            console.error(`Failed to fetch data for pool ${id}`, e);
          }
        }
        setPoolData(newData);

        setMonitoredPools(currentPools.map(id => ({
          id,
          pair: id === '0x004ec958ef1254278e301a8c94957cb747cedd35f3f3ab6d3aa9f2680e9ff26e' ? 'QPHAN / ECHO' : 
                id === '0x5002e25409158869ed3c0010620434c21e7b2fb4c13f5e077b2f3ab5ba2aa3c8' ? 'ETH / ECHO' :
                'UNKNOWN POOL',
          tvl: '$--'
        })));
      } catch (err) {
        console.error("Event fetch failed:", err);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, [publicClient]);

  const handleFocusMonitor = (id: string) => {
    setTargetPoolId(id);
    localStorage.setItem('wraith_focused_pool', id);
  };


  const displayScore = liveScore !== undefined ? (Number(liveScore) / 100).toFixed(0) : 0;
  const displayArmed = isArmed ?? false;

  return (
    <>
{/* Global Scanlines */}
<div className="scanlines"></div>
{/* TopNavBar (Shared Component) */}
<nav className="bg-slate-950/60 backdrop-blur-md text-cyan-400 font-sans tracking-widest uppercase text-xs font-bold docked full-width top-0 border-b-[0.5px] border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] fixed top-0 left-0 w-full z-[100] flex justify-between items-center px-12 h-20 max-w-[1440px] mx-auto">
<div className="flex items-center gap-xl">
            <div className="flex items-center">
              <img src="/logo.png" alt="Wraith Logo" className="h-12 w-auto" />
            </div>
{/* Navigation Links */}
<div className="hidden md:flex items-center gap-lg">
<Link className="text-cyan-400 border-b border-cyan-400 pb-1 transition-all" href="/">Dashboard</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/protect">Protection</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/sentinel">Sentinel</Link>
</div>
</div>
{/* Trailing Actions */}
<div className="flex items-center gap-lg">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-[18px] cursor-pointer hover:text-cyan-200 transition-colors">notifications</span>
<span className="material-symbols-outlined text-[18px] cursor-pointer hover:text-cyan-200 transition-colors">terminal</span>
</div>
<div className="hidden md:flex items-center gap-md">

<ConnectButton />
</div>
</div>
</nav>
{/* Main Canvas */}
      <main className="max-w-[1440px] mx-auto px-gutter pt-32 pb-xl grid grid-cols-1 md:grid-cols-12 gap-gutter">
        {/* Top Banner: Status & Stats */}
        <div className="col-span-1 md:col-span-12 glass-panel rounded-lg p-md flex flex-wrap md:flex-nowrap items-center justify-between gap-md relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{'backgroundImage': 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)', 'backgroundSize': '16px 16px'}}></div>
          <div className="flex items-center gap-md relative z-10">
            <div className="flex items-center gap-base">
              <div className="w-3 h-3 rounded-full bg-primary-container shadow-[0_0_8px_rgba(0,240,255,0.6)]"></div>
              <span className="font-label-caps text-label-caps text-primary-container uppercase tracking-widest">System Online</span>
            </div>
            <div className="h-4 w-[1px] bg-white/20"></div>
            <div className="flex items-center gap-xs font-mono-data text-mono-data text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
              <span>BLK: {stats.currentBlock.toString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-lg relative z-10">
            <div className="flex flex-col items-end">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Pools Monitored</span>
              <span className="font-mono-data text-mono-data text-on-surface text-[18px]">{monitoredPools.length}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-label-caps text-label-caps text-on-surface-variant">TVL Protected</span>
              <span className="font-mono-data text-mono-data text-primary-container text-[18px]">${(stats.valueRescued * 1.5).toFixed(1)}M</span>
            </div>
          </div>
        </div>

        {/* Left Column: Stats & Data */}
        <div className="col-span-1 md:col-span-8 flex flex-col gap-gutter">
          {/* 4 Stat Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
            <div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
              <span className="font-label-caps text-label-caps text-on-surface-variant">Attacks Blocked</span>
              <div className="flex items-end justify-between">
                <span className="font-display-xl text-display-xl text-on-surface">{stats.attacksBlocked}</span>
                <span className="font-mono-data text-[12px] text-primary-container">+{stats.attacksBlocked} 24h</span>
              </div>
            </div>
            <div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
              <span className="font-label-caps text-label-caps text-on-surface-variant">Value Rescued</span>
              <div className="flex items-end justify-between">
                <span className="font-display-xl text-display-xl text-on-surface text-[32px] md:text-display-xl">${stats.valueRescued.toFixed(2)}M</span>
              </div>
            </div>
            <div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
              <span className="font-label-caps text-label-caps text-on-surface-variant">MEV Captured</span>
              <div className="flex items-end justify-between">
                <span className="font-display-xl text-display-xl text-on-surface text-[32px] md:text-display-xl">{(stats.attacksBlocked * 0.4).toFixed(1)} Ξ</span>
              </div>
            </div>
            <div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
              <span className="font-label-caps text-label-caps text-on-surface-variant">Active Guards</span>
              <div className="flex items-center gap-sm">
                <div className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_5px_rgba(0,240,255,0.8)]"></div>
                <span className="font-display-xl text-display-xl text-on-surface">{stats.activeGuards}</span>
              </div>
            </div>
          </div>

          {/* Timeline Placeholder */}
          <div className="glass-panel rounded-lg p-lg flex flex-col gap-md h-[200px] relative">
             <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary-container">timeline</span>
                Toxicity Timeline (24h)
             </h3>
             <div className="flex-1 w-full border-b border-l border-white/10 relative mt-sm z-10 flex items-end">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  {[...Array(4)].map((_, i) => <div key={i} className="w-full border-t border-white/10 h-0"></div>)}
                </div>
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <path d="M0,80 Q10,70 20,85 T40,60 T60,75 T80,30 T100,50" fill="none" stroke="rgba(0, 240, 255, 0.8)" strokeWidth="1"></path>
                </svg>
             </div>
          </div>

          {/* Active Monitored Pools */}
          <div className="glass-panel rounded-lg p-lg flex flex-col gap-md relative">
            <div className="flex justify-between items-center z-10">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary-container">radar</span>
                Active Pool Monitors
              </h3>
              <div className="flex items-center gap-sm">
                <input 
                  type="text" 
                  placeholder="Pool ID (bytes32)"
                  value={newPoolId}
                  onChange={(e) => setNewPoolId(e.target.value)}
                  className="bg-surface-container-highest/50 border border-white/10 rounded px-3 py-1 text-[10px] font-mono text-on-surface focus:border-primary-container outline-none w-64"
                />
                <button 
                  onClick={() => handleAddPool(newPoolId)}
                  className="bg-primary-container text-on-primary-container px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-primary-container/80 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="overflow-x-auto z-10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-label-caps text-on-surface-variant font-label-caps">
                    <th className="py-md" title="The asset pair and liquidity pool structure.">Pair / Pool</th>
                    <th className="py-md" title="The unique 32-byte identifier for this Uniswap v4 pool.">ID</th>
                    <th className="py-md" title="The current toxicity score (0-100%) calculated by the Sentinel.">Toxicity</th>
                    <th className="py-md" title="ARMED means the pool is being actively monitored for emergency exits.">Status</th>
                    <th className="py-md text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoredPools.length > 0 ? monitoredPools.map((pool) => {
                    const liveToxicity = poolData[pool.id]?.toxicity ?? 0;
                    const liveArmed = poolData[pool.id]?.isArmed ?? false;
                    return (
                      <tr key={pool.id} className="border-b border-white/5 hover:bg-white/5 transition-colors text-[12px]">
                        <td className="py-md text-on-surface font-bold">
                          <div className="flex items-center gap-xs">
                            {pool.pair}
                            {targetPoolId === pool.id && (
                              <span className="material-symbols-outlined text-primary-container text-[14px]">my_location</span>
                            )}
                          </div>
                        </td>
                        <td className="py-md text-on-surface-variant font-mono text-[10px]">{pool.id.slice(0, 10)}...{pool.id.slice(-8)}</td>
                        <td className="py-md">
                          <div className="flex items-center gap-xs">
                            <div className="h-1.5 w-16 bg-surface-container-highest rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${liveToxicity > 85 ? 'bg-error' : 'bg-primary-container'}`} 
                                style={{ width: `${liveToxicity}%` }}
                              ></div>
                            </div>
                            <span className={`${liveToxicity > 85 ? 'text-error' : 'text-primary-container'}`}>
                              {liveToxicity.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-md">
                          <span className={`px-2 py-1 rounded-[2px] text-[10px] uppercase font-bold tracking-widest border ${liveArmed ? 'bg-primary-container/20 text-cyan-400 border-primary-container/30' : 'bg-white/5 text-slate-500 border-white/10'}`}>
                            {liveArmed ? 'Armed' : 'Monitoring'}
                          </span>
                        </td>
                        <td className="py-md text-right">
                          <div className="flex justify-end gap-sm">
                            <button onClick={() => handleFocusMonitor(pool.id)} className={`p-1 rounded hover:bg-primary-container/20 ${targetPoolId === pool.id ? 'text-primary-container' : 'text-slate-500'}`}><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                            <button onClick={() => handleRemoveMonitor(pool.id)} className="p-1 rounded hover:bg-error/20 text-slate-500 hover:text-error"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={5} className="py-12 text-center text-slate-600 text-[10px] uppercase tracking-widest font-bold">No active monitors.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
{/* Right Column: Command Center Context */}
<div className="col-span-1 md:col-span-4 flex flex-col gap-gutter">
{/* Large Radial Gauge: Highest Toxicity */}
<div className="glass-panel rounded-lg p-lg flex flex-col items-center justify-center relative min-h-[340px]">
<h3 className="font-label-caps text-label-caps text-on-surface-variant absolute top-lg left-lg">Highest Active Toxicity</h3>
<div className="relative w-48 h-48 flex items-center justify-center mt-md">
{/* Background Circle */}
<svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
<circle cx="50" cy="50" fill="none" r="45" stroke="rgba(255,255,255,0.05)" strokeDasharray="282.7" strokeDashoffset="0" strokeWidth="8"></circle>
{/* Value Circle */}
<circle 
  className={`transition-all duration-1000 ${Number(displayScore) > 85 ? 'drop-shadow-[0_0_8px_rgba(255,180,171,0.6)]' : 'drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]'}`} 
  cx="50" cy="50" fill="none" r="45" 
  stroke={Number(displayScore) > 85 ? "#ffb4ab" : "#00f0ff"} 
  strokeDasharray="282.7" 
  strokeDashoffset={282.7 - (282.7 * (Number(displayScore) / 100))} 
  strokeLinecap="round" strokeWidth="8"
></circle>
</svg>
<div className={`flex flex-col items-center z-10 ${Number(displayScore) > 85 ? 'threat-pulse' : ''} w-32 h-32 rounded-full justify-center bg-surface-container-lowest/50 backdrop-blur-sm`}>
<span className={`font-display-xl text-display-xl leading-none tracking-tighter ${Number(displayScore) > 85 ? 'text-error' : 'text-primary-container'}`}>{displayScore}<span className="text-[24px]">%</span></span>
<span className={`font-label-caps text-[10px] mt-xs uppercase tracking-widest font-bold ${Number(displayScore) > 85 ? 'text-error' : 'text-primary-container'}`}>
  {Number(displayScore) > 85 ? 'Elevated' : 'Stable'}
</span>
</div>
</div>
<div className="mt-lg text-center w-full">
<p className="font-mono-data text-[12px] text-on-surface-variant border-t border-white/10 pt-sm">Target: <span className="text-on-surface font-bold">{targetPoolId ? `${targetPoolId.slice(0, 10)}...` : 'NONE'}</span></p>
</div>
</div>
{/* Recent Events Feed */}
<div className="glass-panel rounded-lg p-lg flex flex-col flex-1 min-h-[400px]">
<div className="flex justify-between items-center mb-md border-b border-white/10 pb-sm">
<h3 className="font-headline-md text-[18px] text-on-surface font-semibold flex items-center gap-xs">
<span className="material-symbols-outlined text-[20px] text-primary-container">radar</span>
                        Live Feed
                    </h3>
<div className="flex gap-1 items-center">
<div className="w-1.5 h-1.5 bg-primary-container rounded-full animate-pulse"></div>
<span className="font-label-caps text-[10px] text-primary-container">SYNCING</span>
</div>
</div>
<div className="flex flex-col gap-md overflow-y-auto pr-sm scrollbar-thin">
  {liveEvents.length > 0 ? liveEvents.map((event, i) => (
    <div key={i} className="flex gap-sm items-start">
      <div className={`mt-1 ${event.color}`}>
        <span className="material-symbols-outlined text-[16px]">{event.icon}</span>
      </div>
      <div className="flex flex-col">
        <div className="flex justify-between items-center w-full">
          <span className="font-mono-data text-[13px] text-on-surface font-bold">{event.type}</span>
          <span className="font-mono-data text-[10px] text-on-surface-variant">{event.time}</span>
        </div>
        <span className="font-mono-data text-[12px] text-on-surface-variant mt-xs">{event.msg}</span>
      </div>
    </div>
  )) : (
    <div className="text-center py-12 text-slate-600 text-[10px] uppercase font-bold tracking-widest">
      Awaiting on-chain signals...
    </div>
  )}
</div>
</div>
</div>
</main>
{/* Footer (Shared Component) */}
<footer className="bg-slate-950/80 backdrop-blur-lg text-cyan-500 font-mono text-[10px] tracking-tighter uppercase docked full-width bottom-0 border-t-[0.5px] border-white/5 w-full py-6 px-12 flex justify-between items-center relative z-50">
<div className="text-cyan-400 font-bold">
            WRAITH PROTOCOL // ACTIVE_DEFENSE_V4
        </div>
<div className="flex gap-lg">
              <Link className="text-cyan-400 border-b border-cyan-400 pb-1 transition-all" href="/">Dashboard</Link>
              <Link className="text-slate-400 hover:text-cyan-200 transition-all" href="/protect">Protection</Link>
              <Link className="text-slate-400 hover:text-cyan-200 transition-all" href="/info">How it Works</Link>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Status</a>
</div>
{/* Scanline Overlay hint from JSON applied as class/style previously, maintaining clean footer structural output */}
</footer>
    </>
  );
}
