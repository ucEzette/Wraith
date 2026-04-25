"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

import { useReadContract, useWatchContractEvent } from 'wagmi';
import { useState } from 'react';
import { WRAITH_HOOK_ADDRESS, wraithHookConfig } from '../lib/contracts';

export default function DashboardPage() {

  // Mock PoolKey Hash for ETH/USDC
  const poolKeyHash = '0x1234567890123456789012345678901234567890123456789012345678901234';

  const { data: toxicityScore } = useReadContract({
    ...wraithHookConfig,
    functionName: 'getToxicityScore',
    args: [poolKeyHash],
  });

  const displayScore = toxicityScore !== undefined ? Number(toxicityScore) : 68;

  const [liveEvents, setLiveEvents] = useState([
    { type: 'ToxicityUpdated', time: '12s ago', msg: 'ETH/USDC pool toxicity surged to ' + displayScore + '%. Signature mismatch detected.', icon: 'warning', color: 'text-error' }
  ]);

  return (
    <>
{/* Global Scanlines */}
<div className="scanlines"></div>
{/* TopNavBar (Shared Component) */}
<nav className="bg-slate-950/60 backdrop-blur-md text-cyan-400 font-sans tracking-widest uppercase text-xs font-bold docked full-width top-0 border-b-[0.5px] border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] fixed top-0 left-0 w-full z-[100] flex justify-between items-center px-12 h-20 max-w-[1440px] mx-auto">
<div className="flex items-center gap-xl">
{/* Brand */}
<div className="text-2xl font-black tracking-tighter text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
                WRAITH
            </div>
{/* Navigation Links */}
<div className="hidden md:flex items-center gap-lg">
<Link className="text-cyan-400 border-b border-cyan-400 pb-1 transition-all" href="/">Dashboard</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/pool/pepe-eth">Pools</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/protect">Protection</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/sentinel">Sentinel</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/admin">Admin</Link>
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
{/* Subtle diagonal grid background injection */}
<div className="absolute inset-0 opacity-10 pointer-events-none" style={{'backgroundImage': 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)', 'backgroundSize': '16px 16px'}}></div>
<div className="flex items-center gap-md relative z-10">
<div className="flex items-center gap-base">
<div className="w-3 h-3 rounded-full bg-primary-container shadow-[0_0_8px_rgba(0,240,255,0.6)]"></div>
<span className="font-label-caps text-label-caps text-primary-container uppercase tracking-widest">System Online</span>
</div>
<div className="h-4 w-[1px] bg-white/20"></div>
<div className="flex items-center gap-xs font-mono-data text-mono-data text-on-surface-variant">
<span className="material-symbols-outlined text-[16px]">view_in_ar</span>
<span>BLK: 18,492,014</span>
</div>
<div className="h-4 w-[1px] bg-white/20 hidden md:block"></div>
<div className="flex items-center gap-xs font-mono-data text-mono-data text-on-surface-variant hidden md:flex">
<span className="material-symbols-outlined text-[16px]">local_gas_station</span>
<span>24 Gwei</span>
</div>
</div>
<div className="flex items-center gap-lg relative z-10">
<div className="flex flex-col items-end">
<span className="font-label-caps text-label-caps text-on-surface-variant">Pools Monitored</span>
<span className="font-mono-data text-mono-data text-on-surface text-[18px]">1,248</span>
</div>
<div className="flex flex-col items-end">
<span className="font-label-caps text-label-caps text-on-surface-variant">TVL Protected</span>
<span className="font-mono-data text-mono-data text-primary-container text-[18px]">$4.28B</span>
</div>
</div>
</div>
{/* Left Column: Stats & Data */}
<div className="col-span-1 md:col-span-8 flex flex-col gap-gutter">
{/* 4 Stat Cards Grid */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
{/* Card 1 */}
<div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
<div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
<span className="font-label-caps text-label-caps text-on-surface-variant">Attacks Blocked</span>
<div className="flex items-end justify-between">
<span className="font-display-xl text-display-xl text-on-surface">342</span>
<span className="font-mono-data text-[12px] text-primary-container">+12 24h</span>
</div>
</div>
{/* Card 2 */}
<div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
<div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
<span className="font-label-caps text-label-caps text-on-surface-variant">Value Rescued</span>
<div className="flex items-end justify-between">
<span className="font-display-xl text-display-xl text-on-surface text-[32px] md:text-display-xl">$12.4M</span>
</div>
</div>
{/* Card 3 */}
<div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
<div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
<span className="font-label-caps text-label-caps text-on-surface-variant">MEV Captured</span>
<div className="flex items-end justify-between">
<span className="font-display-xl text-display-xl text-on-surface text-[32px] md:text-display-xl">14.2 Ξ</span>
</div>
</div>
{/* Card 4 */}
<div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
<div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
<span className="font-label-caps text-label-caps text-on-surface-variant">Active Guards</span>
<div className="flex items-center gap-sm">
<div className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_5px_rgba(0,240,255,0.8)]"></div>
<span className="font-display-xl text-display-xl text-on-surface">89</span>
</div>
</div>
</div>
{/* Toxicity Timeline Chart (Placeholder styling to look like a chart area) */}
<div className="glass-panel rounded-lg p-lg flex flex-col gap-md h-[300px] relative">
<div className="flex justify-between items-center z-10">
<h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
<span className="material-symbols-outlined text-primary-container">timeline</span>
                        Toxicity Timeline (24h)
                    </h3>
<div className="flex gap-sm">
<span className="font-label-caps text-label-caps text-primary-container border-b border-primary-container pb-xs cursor-pointer">24H</span>
<span className="font-label-caps text-label-caps text-on-surface-variant cursor-pointer hover:text-on-surface transition-colors">7D</span>
<span className="font-label-caps text-label-caps text-on-surface-variant cursor-pointer hover:text-on-surface transition-colors">30D</span>
</div>
</div>
{/* Mock Chart Area */}
<div className="flex-1 w-full border-b border-l border-white/10 relative mt-sm z-10 flex items-end">
{/* Grid Lines */}
<div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
<div className="w-full border-t border-white/5 h-0"></div>
<div className="w-full border-t border-white/5 h-0"></div>
<div className="w-full border-t border-white/5 h-0"></div>
<div className="w-full border-t border-white/5 h-0"></div>
</div>
{/* Mock Line Path */}
<svg className="w-full h-full preserve-3d" preserveAspectRatio="none" viewBox="0 0 100 100">
<path d="M0,80 Q10,70 20,85 T40,60 T60,75 T80,30 T100,50" fill="none" stroke="rgba(0, 240, 255, 0.8)" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
<path d="M0,80 Q10,70 20,85 T40,60 T60,75 T80,30 T100,50 L100,100 L0,100 Z" fill="url(#chart-grad)" opacity="0.2"></path>
<defs>
<lineargradient id="chart-grad" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stopColor="rgba(0, 240, 255, 1)"></stop>
<stop offset="100%" stopColor="rgba(0, 240, 255, 0)"></stop>
</lineargradient>
</defs>
</svg>
</div>
</div>
{/* Active Monitored Pools Table */}
<div className="glass-panel rounded-lg p-lg flex flex-col gap-md">
<h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
<span className="material-symbols-outlined text-primary-container">shield</span>
                    Active Monitored Pools
                </h3>
<div className="overflow-x-auto">
<table className="w-full text-left font-mono-data text-mono-data border-collapse">
<thead>
<tr className="border-b border-white/10 text-on-surface-variant font-label-caps text-label-caps tracking-widest">
<th className="py-sm font-normal">Pool Asset</th>
<th className="py-sm font-normal">Address</th>
<th className="py-sm font-normal">Toxicity</th>
<th className="py-sm font-normal">Status</th>
<th className="py-sm font-normal text-right">TVL</th>
</tr>
</thead>
<tbody>
<tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
<td className="py-md text-on-surface font-bold">ETH/USDC</td>
<td className="py-md text-on-surface-variant">0x397...f24a</td>
<td className="py-md">
<div className="flex items-center gap-xs">
<div className="h-1.5 w-16 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-error w-[68%]"></div>
</div>
<span className="text-error text-[12px]">68%</span>
</div>
</td>
<td className="py-md">
<span className="bg-primary-container/20 text-primary-container px-2 py-1 rounded-[2px] text-[10px] uppercase font-bold tracking-widest border border-primary-container/30">Armed</span>
</td>
<td className="py-md text-right text-on-surface">$1.2B</td>
</tr>
<tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
<td className="py-md text-on-surface font-bold">PEPE/WETH</td>
<td className="py-md text-on-surface-variant">0xa43...9b1c</td>
<td className="py-md">
<div className="flex items-center gap-xs">
<div className="h-1.5 w-16 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-tertiary-fixed-dim w-[45%]"></div>
</div>
<span className="text-tertiary-fixed-dim text-[12px]">45%</span>
</div>
</td>
<td className="py-md">
<span className="bg-primary-container/20 text-primary-container px-2 py-1 rounded-[2px] text-[10px] uppercase font-bold tracking-widest border border-primary-container/30">Armed</span>
</td>
<td className="py-md text-right text-on-surface">$340M</td>
</tr>
<tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
<td className="py-md text-on-surface font-bold">WBTC/ETH</td>
<td className="py-md text-on-surface-variant">0xcb2...4d8e</td>
<td className="py-md">
<div className="flex items-center gap-xs">
<div className="h-1.5 w-16 bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-primary-container w-[12%]"></div>
</div>
<span className="text-primary-container text-[12px]">12%</span>
</div>
</td>
<td className="py-md">
<span className="bg-primary-container/20 text-primary-container px-2 py-1 rounded-[2px] text-[10px] uppercase font-bold tracking-widest border border-primary-container/30">Armed</span>
</td>
<td className="py-md text-right text-on-surface">$890M</td>
</tr>
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
{/* Value Circle (68% = 282.7 * 0.68 ≈ 192.2 offset: 282.7 - 192.2 = 90.5) */}
<circle className="drop-shadow-[0_0_8px_rgba(255,180,171,0.6)]" cx="50" cy="50" fill="none" r="45" stroke="#ffb4ab" strokeDasharray="282.7" strokeDashoffset="90.5" strokeLinecap="round" strokeWidth="8"></circle>
</svg>
<div className="flex flex-col items-center z-10 threat-pulse w-32 h-32 rounded-full justify-center bg-surface-container-lowest/50 backdrop-blur-sm">
<span className="font-display-xl text-display-xl text-error leading-none tracking-tighter">{displayScore}<span className="text-[24px]">%</span></span>
<span className="font-label-caps text-[10px] text-error mt-xs uppercase tracking-widest font-bold">Elevated</span>
</div>
</div>
<div className="mt-lg text-center w-full">
<p className="font-mono-data text-[12px] text-on-surface-variant border-t border-white/10 pt-sm">Target: <span className="text-on-surface font-bold">ETH/USDC (0x397...)</span></p>
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
{/* Event Item */}
<div className="flex gap-sm items-start">
<div className="mt-1 text-error">
<span className="material-symbols-outlined text-[16px]">warning</span>
</div>
<div className="flex flex-col">
<div className="flex justify-between items-center w-full">
<span className="font-mono-data text-[13px] text-on-surface font-bold">ToxicityUpdated</span>
<span className="font-mono-data text-[10px] text-on-surface-variant">12s ago</span>
</div>
<span className="font-mono-data text-[12px] text-on-surface-variant mt-xs">ETH/USDC pool toxicity surged to 68%. Signature mismatch detected.</span>
</div>
</div>
{/* Event Item */}
<div className="flex gap-sm items-start">
<div className="mt-1 text-tertiary-fixed-dim">
<span className="material-symbols-outlined text-[16px]">bolt</span>
</div>
<div className="flex flex-col">
<div className="flex justify-between items-center w-full">
<span className="font-mono-data text-[13px] text-on-surface font-bold">QuantumExitTriggered</span>
<span className="font-mono-data text-[10px] text-on-surface-variant">4m ago</span>
</div>
<span className="font-mono-data text-[12px] text-on-surface-variant mt-xs">Auto-routing 450 ETH away from vulnerable path 0x8f...2a1.</span>
</div>
</div>
{/* Event Item */}
<div className="flex gap-sm items-start">
<div className="mt-1 text-primary-container">
<span className="material-symbols-outlined text-[16px]">verified_user</span>
</div>
<div className="flex flex-col">
<div className="flex justify-between items-center w-full">
<span className="font-mono-data text-[13px] text-on-surface font-bold">WraithGuardRegistered</span>
<span className="font-mono-data text-[10px] text-on-surface-variant">14m ago</span>
</div>
<span className="font-mono-data text-[12px] text-on-surface-variant mt-xs">New sentinel node connected. Authority level: Standard.</span>
</div>
</div>
{/* Event Item */}
<div className="flex gap-sm items-start opacity-70">
<div className="mt-1 text-on-surface-variant">
<span className="material-symbols-outlined text-[16px]">sync</span>
</div>
<div className="flex flex-col">
<div className="flex justify-between items-center w-full">
<span className="font-mono-data text-[13px] text-on-surface font-bold">StateRootVerified</span>
<span className="font-mono-data text-[10px] text-on-surface-variant">22m ago</span>
</div>
<span className="font-mono-data text-[12px] text-on-surface-variant mt-xs">Block 18,492,010 consensus verified.</span>
</div>
</div>
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
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Documentation</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Security Audit</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Github</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Status</a>
</div>
{/* Scanline Overlay hint from JSON applied as class/style previously, maintaining clean footer structural output */}
</footer>
    </>
  );
}
