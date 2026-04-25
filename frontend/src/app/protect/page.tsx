"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

import { useReadContract, useAccount, useWatchContractEvent } from 'wagmi';
import { useState } from 'react';
import { WRAITH_HOOK_ADDRESS, wraithHookConfig } from '../../lib/contracts';

export default function ProtectPage() {

  const { address } = useAccount();
  const [exitHistory, setExitHistory] = useState([
    { id: 1, pair: 'LINK / ETH', amount: '4,500 LINK', date: 'OCT 24, 14:32Z', hash: '0x9f...2b1a' },
    { id: 2, pair: 'PEPE / WETH', amount: '12.5 WETH', date: 'OCT 18, 09:15Z', hash: '0x4c...8d9e' },
  ]);

  const { data: vaultAddress } = useReadContract({
    ...wraithHookConfig,
    functionName: 'userVaults',
    args: [address || '0x0000000000000000000000000000000000000000'],
  });

  const isProtected = vaultAddress && vaultAddress !== '0x0000000000000000000000000000000000000000';

  useWatchContractEvent({
    ...wraithHookConfig,
    eventName: 'QuantumExitTriggered',
    onLogs(logs) {
      // Filter for current user and update history
      console.log('Quantum Exit detected:', logs);
    },
  });

  return (
    <>
<div className="scanlines"></div>
{/* TopNavBar JSON Implementation */}
<header className="bg-slate-950/60 backdrop-blur-md docked full-width top-0 border-b-[0.5px] border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] fixed top-0 left-0 w-full z-[100] flex justify-between items-center px-12 h-20 max-w-[1440px] mx-auto">
<div className="flex items-center gap-lg">
<div className="text-2xl font-black tracking-tighter text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
                WRAITH
            </div>
<nav className="hidden md:flex gap-md font-sans tracking-widest uppercase text-xs font-bold">
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/">Dashboard</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/pool/pepe-eth">Pools</Link>
<Link className="text-cyan-400 border-b border-cyan-400 pb-1 transition-all" href="/protect">Protection</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/sentinel">Sentinel</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/admin">Admin</Link>
</nav>
</div>
<div className="flex items-center gap-md">
<div className="hidden lg:flex items-center gap-sm">
<span className="material-symbols-outlined text-cyan-400 cursor-pointer hover:text-cyan-200 transition-colors">notifications</span>
<span className="material-symbols-outlined text-cyan-400 cursor-pointer hover:text-cyan-200 transition-colors">terminal</span>
</div>
<div className="flex items-center gap-sm">

<ConnectButton />
</div>
</div>
</header>
<main className="flex-grow pt-32 px-md lg:px-lg max-w-container-max mx-auto w-full">
<div className="mb-lg">
<h1 className="font-headline-lg text-headline-lg text-on-surface mb-xs">My Protection</h1>
<p className="font-body-md text-body-md text-on-surface-variant">Manage your active defenses and monitor vault integrity.</p>
</div>
{/* Bento Grid Layout */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mb-xl">
{/* Registration Card (Col 1-4) */}
<div className="glass-card col-span-1 lg:col-span-4 p-md flex flex-col justify-between min-h-[300px]">
<div>
<div className="flex justify-between items-start mb-md">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-primary-container">shield_locked</span>
<h2 className="font-label-caps text-label-caps text-on-surface">DEFENSE STATUS</h2>
</div>
<div className="flex items-center gap-xs px-2 py-1 rounded-full bg-primary-container/10 border border-primary-container/20">
<div className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_8px_rgba(0,240,255,0.8)] pulse-indicator"></div>
<span className="font-label-caps text-[10px] text-primary-container">{isProtected ? "PROTECTED" : "UNPROTECTED"}</span>
</div>
</div>
<div className="mb-lg">
<label className="font-label-caps text-[10px] text-on-surface-variant mb-xs block">SECURE VAULT ADDRESS</label>
<div className="flex items-center gap-sm bg-surface-container-low p-sm rounded-lg border border-outline-variant focus-within:border-primary-container transition-colors">
<span className="material-symbols-outlined text-on-surface-variant text-sm">account_balance_wallet</span>
<input className="bg-transparent border-none outline-none font-mono-data text-mono-data text-on-surface w-full p-0 focus:ring-0" type="text" value={vaultAddress || "No Vault Created"} readOnly/>
<span className="material-symbols-outlined text-on-surface-variant text-sm cursor-pointer hover:text-primary-container">edit</span>
</div>
</div>
</div>
<div>
<button className="w-full btn-danger font-label-caps text-label-caps py-sm flex justify-center items-center gap-xs">
<span className="material-symbols-outlined text-sm">cancel</span>
                        REVOKE PROTECTION
                    </button>
</div>
</div>
{/* Vault Status Widget (Col 5-12) */}
<div className="glass-card col-span-1 lg:col-span-8 p-md">
<div className="flex items-center gap-sm mb-lg">
<span className="material-symbols-outlined text-secondary">account_balance</span>
<h2 className="font-label-caps text-label-caps text-on-surface">VAULT INTEGRITY</h2>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-md">
{/* USDC Balance */}
<div className="bg-surface-container-low rounded-lg p-md border border-white/5 relative overflow-hidden">
<div className="absolute right-[-20px] top-[-20px] opacity-5">
<span className="material-symbols-outlined text-[100px]">payments</span>
</div>
<span className="font-label-caps text-[10px] text-on-surface-variant block mb-sm">USDC RESERVES</span>
<div className="font-display-xl text-display-xl text-on-surface mb-xs">$142,500.00</div>
<div className="font-mono-data text-mono-data text-primary-fixed-dim">+2.4% (24h)</div>
</div>
{/* ETH Balance */}
<div className="bg-surface-container-low rounded-lg p-md border border-white/5 relative overflow-hidden">
<div className="absolute right-[-20px] top-[-20px] opacity-5">
<span className="material-symbols-outlined text-[100px]">currency_exchange</span>
</div>
<span className="font-label-caps text-[10px] text-on-surface-variant block mb-sm">ETH RESERVES</span>
<div className="font-display-xl text-display-xl text-on-surface mb-xs">45.210 ETH</div>
<div className="font-mono-data text-mono-data text-outline">Stable (24h)</div>
</div>
</div>
</div>
{/* My Protected Pools List (Col 1-7) */}
<div className="glass-card col-span-1 lg:col-span-7 p-0 flex flex-col">
<div className="p-md border-b border-white/10 flex justify-between items-center">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-primary-fixed">water_drop</span>
<h2 className="font-label-caps text-label-caps text-on-surface">ACTIVE POOL MONITORS</h2>
</div>
</div>
<div className="flex-grow overflow-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="border-b border-white/5 bg-surface-container-highest/20">
<th className="p-sm font-label-caps text-[10px] text-on-surface-variant pl-md">POOL PAIR</th>
<th className="p-sm font-label-caps text-[10px] text-on-surface-variant">LIQUIDITY</th>
<th className="p-sm font-label-caps text-[10px] text-on-surface-variant">TOXICITY</th>
<th className="p-sm font-label-caps text-[10px] text-on-surface-variant pr-md text-right">ACTION</th>
</tr>
</thead>
<tbody className="font-mono-data text-mono-data text-on-surface">
<tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
<td className="p-sm pl-md">
<div className="flex items-center gap-sm">
<div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center">
<span className="material-symbols-outlined text-sm">currency_bitcoin</span>
</div>
<span>WBTC / USDC</span>
</div>
</td>
<td className="p-sm">$84,000</td>
<td className="p-sm">
<div className="flex items-center gap-xs">
<div className="w-1.5 h-1.5 rounded-full bg-primary-container"></div>
<span>0.01%</span>
</div>
</td>
<td className="p-sm pr-md text-right">
<button className="font-label-caps text-[10px] border border-outline-variant text-on-surface-variant px-3 py-1 rounded hover:border-primary-container hover:text-primary-container transition-colors opacity-0 group-hover:opacity-100">OVERRIDE</button>
</td>
</tr>
<tr className="border-b border-white/5 hover:bg-white/5 transition-colors group">
<td className="p-sm pl-md">
<div className="flex items-center gap-sm">
<div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center">
<span className="material-symbols-outlined text-sm">diamond</span>
</div>
<span>ETH / USDT</span>
</div>
</td>
<td className="p-sm">$120,500</td>
<td className="p-sm">
<div className="flex items-center gap-xs">
<div className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></div>
<span className="text-tertiary-fixed-dim">2.40%</span>
</div>
</td>
<td className="p-sm pr-md text-right">
<button className="font-label-caps text-[10px] border border-outline-variant text-on-surface-variant px-3 py-1 rounded hover:border-primary-container hover:text-primary-container transition-colors opacity-0 group-hover:opacity-100">OVERRIDE</button>
</td>
</tr>
<tr className="hover:bg-white/5 transition-colors group">
<td className="p-sm pl-md">
<div className="flex items-center gap-sm">
<div className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center">
<span className="material-symbols-outlined text-sm">token</span>
</div>
<span>WRAITH / ETH</span>
</div>
</td>
<td className="p-sm">$45,200</td>
<td className="p-sm">
<div className="flex items-center gap-xs">
<div className="w-1.5 h-1.5 rounded-full bg-primary-container"></div>
<span>0.00%</span>
</div>
</td>
<td className="p-sm pr-md text-right">
<button className="font-label-caps text-[10px] border border-outline-variant text-on-surface-variant px-3 py-1 rounded hover:border-primary-container hover:text-primary-container transition-colors opacity-0 group-hover:opacity-100">OVERRIDE</button>
</td>
</tr>
</tbody>
</table>
</div>
</div>
{/* Rescue History (Col 8-12) */}
<div className="glass-card col-span-1 lg:col-span-5 p-0 flex flex-col min-h-[300px]">
<div className="p-md border-b border-white/10 flex justify-between items-center bg-error-container/10">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-error">emergency</span>
<h2 className="font-label-caps text-label-caps text-error">QUANTUM EXITS (PAST 30D)</h2>
</div>
</div>
<div className="p-md flex-grow overflow-auto">
<div className="space-y-sm">
{/* History Item */}
<div className="bg-surface-container-low rounded p-sm border border-white/5 flex justify-between items-start">
<div>
<div className="font-mono-data text-mono-data text-on-surface mb-xs">LINK / ETH</div>
<div className="font-label-caps text-[10px] text-on-surface-variant">RESCUED: 4,500 LINK</div>
</div>
<div className="text-right">
<div className="font-label-caps text-[10px] text-outline mb-xs">OCT 24, 14:32Z</div>
<a className="font-mono-data text-[10px] text-primary-container hover:underline flex items-center justify-end gap-xs" href="#">
                                    0x9f...2b1a
                                    <span className="material-symbols-outlined text-[10px]">open_in_new</span>
</a>
</div>
</div>
{/* History Item */}
<div className="bg-surface-container-low rounded p-sm border border-white/5 flex justify-between items-start">
<div>
<div className="font-mono-data text-mono-data text-on-surface mb-xs">PEPE / WETH</div>
<div className="font-label-caps text-[10px] text-on-surface-variant">RESCUED: 12.5 WETH</div>
</div>
<div className="text-right">
<div className="font-label-caps text-[10px] text-outline mb-xs">OCT 18, 09:15Z</div>
<a className="font-mono-data text-[10px] text-primary-container hover:underline flex items-center justify-end gap-xs" href="#">
                                    0x4c...8d9e
                                    <span className="material-symbols-outlined text-[10px]">open_in_new</span>
</a>
</div>
</div>
</div>
</div>
</div>
</div>
</main>
{/* Footer JSON Implementation */}
<footer className="bg-slate-950/80 backdrop-blur-lg docked full-width bottom-0 border-t-[0.5px] border-white/5 w-full py-6 px-12 flex justify-between items-center border-t mt-auto">
<div className="text-cyan-400 font-bold font-mono text-[10px] tracking-tighter uppercase">
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
