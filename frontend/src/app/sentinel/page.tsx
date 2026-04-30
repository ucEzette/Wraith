"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

import { useReadContract, useWatchContractEvent } from 'wagmi';
import { useState, useEffect } from 'react';
import { WRAITH_HOOK_ADDRESS, wraithHookConfig } from '../../lib/contracts';

export default function SentinelPage() {

  const [events, setEvents] = useState([
    { id: 1, pool: '0x8a9...b4f2', deployer: '0x12c...99a0', status: 'Analysis Complete', result: 'CLEAN', resultColor: 'primary-fixed' },
    { id: 2, pool: '0xf42...e1d9', deployer: '0x99b...3c12', status: 'Analysis Complete', result: 'CRITICAL', resultColor: 'error' },
  ]);

  // Watch for real ToxicityUpdated events (Gensyn AEL submissions)
  useWatchContractEvent({
    ...wraithHookConfig,
    eventName: 'ToxicityUpdated',
    onLogs(logs) {
      console.log('New Toxicity Data from Gensyn:', logs);
      // Add real event to the top of the feed
      // setEvents(prev => [{ ...new_event }, ...prev]);
    },
  });

  const { data: isAuthorized } = useReadContract({
    ...wraithHookConfig,
    functionName: 'sentinel',
  });

  return (
    <>
{/* Global Scanline Overlay */}
<div className="fixed inset-0 scanline"></div>
{/* Top Navigation */}
<nav className="fixed top-0 left-0 w-full z-[100] flex justify-between items-center px-12 h-20 max-w-container-max mx-auto bg-slate-950/60 backdrop-blur-md font-sans tracking-widest uppercase text-xs font-bold border-b-[0.5px] border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
<div className="flex items-center gap-lg">
<div className="text-2xl font-black tracking-tighter text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
                WRAITH
            </div>
<div className="hidden md:flex items-center gap-md h-full">
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/">Dashboard</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/protect">Protection</Link>
<Link className="text-cyan-400 border-b border-cyan-400 pb-1 transition-all" href="/sentinel">Sentinel</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300 flex items-center gap-1" href="/info">
  <span className="material-symbols-outlined text-[16px]">help</span>
  How it Works
</Link>
</div>
</div>
<div className="flex items-center gap-md">
<div className="hidden md:flex gap-sm">
<button className="text-slate-400 hover:text-cyan-200 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300 p-2 rounded">
<span className="material-symbols-outlined" style={{'fontVariationSettings': "'FILL' 0"}}>notifications</span>
</button>
<button className="text-slate-400 hover:text-cyan-200 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300 p-2 rounded">
<span className="material-symbols-outlined" style={{'fontVariationSettings': "'FILL' 0"}}>terminal</span>
</button>
</div>
<div className="text-slate-400">Unichain Sepolia</div>
<ConnectButton />
</div>
</nav>
{/* Main Content Canvas */}
<main className="pt-32 pb-24 px-md md:px-lg max-w-container-max mx-auto grid grid-cols-1 md:grid-cols-12 gap-gutter relative z-10">
{/* Header */}
<header className="md:col-span-12 mb-md flex justify-between items-end">
<div>
<h1 className="font-display-xl text-display-xl text-on-surface mb-xs drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">Sentinel Monitor</h1>
<p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
<span className="material-symbols-outlined text-[16px]">psychology</span> AI Agent Status &amp; Analysis Feed
                </p>
</div>
<div className="hidden md:flex items-center gap-2 text-surface-tint font-mono-data text-mono-data">
<span className="pulse-dot w-2 h-2 rounded-full bg-primary-container mr-1 block"></span>
                {isAuthorized ? "SYSTEM AUTHORIZED" : "SYSTEM INITIALIZING"}
            </div>
</header>
{/* Agent Status Card */}
<section className="md:col-span-4 bg-surface-container/60 backdrop-blur-[12px] border-[0.5px] border-white/20 rounded-xl p-md flex flex-col gap-md relative overflow-hidden">
<div className="absolute inset-0 bg-grid opacity-20 pointer-events-none"></div>
<div className="flex justify-between items-center relative z-10">
<h2 className="font-headline-md text-headline-md text-on-surface">Agent Status</h2>
<div className="bg-primary-container/20 text-primary-fixed border border-primary-container/50 px-2 py-1 rounded font-label-caps text-[10px] flex items-center gap-1">
<span className="w-1.5 h-1.5 rounded-full bg-primary-fixed pulse-dot block"></span> ONLINE
                </div>
</div>
<div className="grid grid-cols-2 gap-sm relative z-10">
<div className="bg-surface-container-highest/50 p-sm rounded border border-white/5">
<div className="font-label-caps text-[10px] text-on-surface-variant mb-1">Uptime</div>
<div className="font-mono-data text-[18px] text-on-surface text-primary-fixed">99.98%</div>
</div>
<div className="bg-surface-container-highest/50 p-sm rounded border border-white/5">
<div className="font-label-caps text-[10px] text-on-surface-variant mb-1">Model Version</div>
<div className="font-mono-data text-[18px] text-on-surface">wraith-v1.4</div>
</div>
<div className="bg-surface-container-highest/50 p-sm rounded border border-white/5 col-span-2">
<div className="font-label-caps text-[10px] text-on-surface-variant mb-1">Last Global Scan</div>
<div className="font-mono-data text-[16px] text-on-surface flex justify-between">
<span>Block 18459201</span>
<span className="text-on-surface-variant">2s ago</span>
</div>
</div>
</div>
<div className="mt-auto relative z-10 border-t border-white/10 pt-sm">
<div className="flex justify-between font-label-caps text-[10px] text-on-surface-variant mb-2">
<span>Processing Load</span>
<span>42%</span>
</div>
<div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-primary-container w-[42%] shadow-[0_0_8px_rgba(0,240,255,0.8)]"></div>
</div>
</div>
</section>
{/* Live Scan Feed */}
<section className="md:col-span-8 bg-surface-container/60 backdrop-blur-[12px] border-[0.5px] border-white/20 rounded-xl p-md flex flex-col relative">
<div className="flex justify-between items-center mb-md border-b border-white/10 pb-sm relative z-10">
<h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
<span className="material-symbols-outlined">radar</span> Live Scan Feed
                </h2>
<span className="font-label-caps text-label-caps text-on-surface-variant">Uniswap v4 Pools</span>
</div>
<div className="flex-1 overflow-y-auto space-y-sm pr-2 relative z-10" style={{'maxHeight': '400px'}}>
{/* Feed Item */}
<div className="flex items-center justify-between p-sm bg-surface-container-highest/40 hover:bg-surface-container-highest border border-white/5 rounded transition-colors group">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-surface-tint">memory</span>
<div>
<div className="font-mono-data text-mono-data text-on-surface">Pool: 0x8a9...b4f2</div>
<div className="font-label-caps text-[10px] text-on-surface-variant mt-1">Deployer: 0x12c...99a0</div>
</div>
</div>
<div className="flex items-center gap-sm">
<span className="px-2 py-1 bg-surface-container-highest border border-outline-variant rounded font-mono-data text-[12px] text-on-surface-variant">Analysis Complete</span>
<span className="px-2 py-1 bg-primary-container/10 border border-primary-container/30 text-primary-fixed rounded font-label-caps text-[10px] shadow-[0_0_8px_rgba(0,240,255,0.2)]">CLEAN</span>
</div>
</div>
{/* Feed Item */}
<div className="flex items-center justify-between p-sm bg-error-container/10 hover:bg-error-container/20 border border-error/20 rounded transition-colors group">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-error">warning</span>
<div>
<div className="font-mono-data text-mono-data text-error">Pool: 0xf42...e1d9</div>
<div className="font-label-caps text-[10px] text-on-surface-variant mt-1">Deployer: 0x99b...3c12</div>
</div>
</div>
<div className="flex items-center gap-sm">
<span className="px-2 py-1 bg-surface-container-highest border border-outline-variant rounded font-mono-data text-[12px] text-on-surface-variant">Analysis Complete</span>
<span className="px-2 py-1 bg-error/20 border border-error/50 text-error rounded font-label-caps text-[10px] shadow-[0_0_8px_rgba(255,180,171,0.3)]">CRITICAL</span>
</div>
</div>
{/* Feed Item */}
<div className="flex items-center justify-between p-sm bg-surface-container-highest/40 hover:bg-surface-container-highest border border-white/5 rounded transition-colors group">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-tertiary-fixed-dim">search</span>
<div>
<div className="font-mono-data text-mono-data text-on-surface">Pool: 0x7c1...aa89</div>
<div className="font-label-caps text-[10px] text-on-surface-variant mt-1">Deployer: 0x4d2...f11b</div>
</div>
</div>
<div className="flex items-center gap-sm">
<span className="px-2 py-1 bg-surface-container-highest border border-outline-variant rounded font-mono-data text-[12px] text-on-surface-variant animate-pulse">Scanning...</span>
<span className="px-2 py-1 bg-tertiary-fixed-dim/10 border border-tertiary-fixed-dim/30 text-tertiary-fixed-dim rounded font-label-caps text-[10px]">PENDING</span>
</div>
</div>
</div>
</section>
</main>
{/* Footer */}
<footer className="fixed bottom-0 w-full py-6 px-12 flex justify-between items-center border-t border-white/10 bg-slate-950/80 backdrop-blur-lg z-[100]">
<div className="font-mono text-[10px] tracking-tighter uppercase text-slate-500">
            WRAITH PROTOCOL // ACTIVE_DEFENSE_V4
        </div>
<div className="flex gap-md font-mono text-[10px] tracking-tighter uppercase">
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Documentation</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Security Audit</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Github</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Status</a>
</div>
</footer>
    </>
  );
}
