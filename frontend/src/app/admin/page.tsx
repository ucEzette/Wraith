"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { useState } from 'react';
import { WRAITH_HOOK_ADDRESS, wraithHookConfig } from '../../lib/contracts';

export default function AdminPage() {

  const { address } = useAccount();
  const [newSentinel, setNewSentinel] = useState('');
  
  const { data: currentSentinel } = useReadContract({
    ...wraithHookConfig,
    functionName: 'sentinel',
  });

  const { writeContract, isPending } = useWriteContract();

  const handleUpdateSentinel = () => {
    // writeContract({ ...wraithHookConfig, functionName: 'setSentinel', args: [newSentinel] });
    alert("Proposing Sentinel Update to: " + newSentinel);
  };

  return (
    <>
{/* Global Scanline Overlay */}
<div className="fixed inset-0 pointer-events-none z-[9999] scanline-overlay opacity-20"></div>
{/* TopNavBar */}
<nav className="fixed top-0 left-0 w-full z-[100] flex justify-between items-center px-12 h-20 max-w-container-max mx-auto bg-slate-950/60 backdrop-blur-md border-b-[0.5px] border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
<div className="flex items-center gap-xl">
<div className="text-2xl font-black tracking-tighter text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
                WRAITH
            </div>
<div className="hidden md:flex gap-lg font-sans tracking-widest uppercase text-xs font-bold">
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/">Dashboard</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/pool/pepe-eth">Pools</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/protect">Protection</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/sentinel">Sentinel</Link>
<Link className="text-cyan-400 border-b border-cyan-400 pb-1 transition-all opacity-80 scale-[0.99] hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]" href="/admin">Admin</Link>
</div>
</div>
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-cyan-400 cursor-pointer hover:text-primary-container transition-colors" data-icon="notifications">notifications</span>
<span className="material-symbols-outlined text-cyan-400 cursor-pointer hover:text-primary-container transition-colors" data-icon="terminal">terminal</span>
<div className="text-slate-400 font-label-caps text-label-caps ml-md border-l border-white/10 pl-md">Mainnet</div>
<ConnectButton />
</div>
</nav>
{/* Main Content Canvas */}
<main className="pt-[100px] pb-xl px-md md:px-lg max-w-container-max mx-auto">
{/* Header */}
<header className="mb-lg flex justify-between items-end border-b-[0.5px] border-white/10 pb-md">
<div>
<h1 className="font-display-xl text-display-xl text-on-surface mb-xs drop-shadow-[0_0_12px_rgba(223,226,243,0.2)]">Guardian Admin</h1>
<p className="font-mono-data text-mono-data text-on-surface-variant flex items-center gap-xs">
<span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                    SYSTEM CONFIGURATION &amp; OVERSIGHT // <span className="text-primary-fixed-dim">AUTHORIZED ACCESS ONLY</span>
</p>
</div>
<div className="flex items-center gap-sm">
<div className="h-2 w-2 rounded-full bg-primary-container pulse-dot"></div>
<span className="font-label-caps text-label-caps text-primary-fixed">SYSTEM ARMED</span>
</div>
</header>
{/* Bento Grid Layout */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-md">
{/* Column 1: Roles & Addresses (Left, 4 cols) */}
<div className="md:col-span-4 flex flex-col gap-md">
{/* Role Management */}
<div className="glass-card rounded-lg p-md flex flex-col gap-md h-full">
<div className="flex justify-between items-center border-b-[0.5px] border-outline-variant pb-sm">
<h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
<span className="material-symbols-outlined text-secondary-fixed">shield_person</span>
                            Role Management
                        </h2>
</div>
<div className="flex flex-col gap-sm">
{/* Sentinel */}
<div className="bg-surface-container-high rounded p-sm border border-outline-variant/50">
<div className="flex justify-between items-center mb-xs">
<span className="font-label-caps text-label-caps text-secondary-fixed">ACTIVE SENTINEL</span>
<span className="material-symbols-outlined text-[14px] text-outline cursor-pointer hover:text-on-surface">edit</span>
</div>
<div className="font-mono-data text-mono-data text-on-surface truncate">
                                {currentSentinel || "0x9f8F...79A2"}
                            </div>
</div>
{/* Guardian */}
<div className="bg-surface-container-high rounded p-sm border border-outline-variant/50">
<div className="flex justify-between items-center mb-xs">
<span className="font-label-caps text-label-caps text-primary-fixed">GUARDIAN MULTISIG</span>
<span className="material-symbols-outlined text-[14px] text-outline cursor-pointer hover:text-on-surface">edit</span>
</div>
<div className="font-mono-data text-mono-data text-on-surface truncate">
                                0x3bA2eB9bB10e54d3d1912f27B6F304fA982847B0
                            </div>
</div>
<div className="mt-auto pt-sm">
<button className="w-full bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-caps text-label-caps py-sm rounded border border-outline-variant transition-colors flex items-center justify-center gap-xs">
<span className="material-symbols-outlined text-[16px]">sync</span>
                                isPending ? "PROCESSING..." : "PROPOSE ROLE UPDATE"
                            </button>
</div>
</div>
</div>
{/* Flagged Attackers */}
<div className="glass-card rounded-lg p-md flex flex-col gap-md h-[400px]">
<div className="flex justify-between items-center border-b-[0.5px] border-outline-variant pb-sm">
<h2 className="font-headline-md text-headline-md text-error flex items-center gap-sm">
<span className="material-symbols-outlined">warning</span>
                            Flagged Addresses
                        </h2>
<span className="bg-error-container text-on-error-container px-2 py-1 rounded text-xs font-mono-data">3 ACTIVE</span>
</div>
<div className="overflow-y-auto pr-2 flex flex-col gap-xs">
{/* Attacker Item */}
<div className="flex items-center justify-between bg-surface-container-low p-sm rounded border-l-2 border-error">
<div className="flex flex-col">
<span className="font-mono-data text-mono-data text-on-surface text-[12px]">0x1a2...b3c4</span>
<span className="font-label-caps text-label-caps text-outline text-[10px]">Tox: 9500</span>
</div>
<button className="text-xs font-label-caps text-outline hover:text-primary-fixed transition-colors border border-outline-variant rounded px-2 py-1">UNFLAG</button>
</div>
{/* Attacker Item */}
<div className="flex items-center justify-between bg-surface-container-low p-sm rounded border-l-2 border-error">
<div className="flex flex-col">
<span className="font-mono-data text-mono-data text-on-surface text-[12px]">0x7d9...e1f2</span>
<span className="font-label-caps text-label-caps text-outline text-[10px]">Tox: 8200</span>
</div>
<button className="text-xs font-label-caps text-outline hover:text-primary-fixed transition-colors border border-outline-variant rounded px-2 py-1">UNFLAG</button>
</div>
{/* Attacker Item */}
<div className="flex items-center justify-between bg-surface-container-low p-sm rounded border-l-2 border-error">
<div className="flex flex-col">
<span className="font-mono-data text-mono-data text-on-surface text-[12px]">0x4c5...a9d0</span>
<span className="font-label-caps text-label-caps text-outline text-[10px]">Tox: 7100</span>
</div>
<button className="text-xs font-label-caps text-outline hover:text-primary-fixed transition-colors border border-outline-variant rounded px-2 py-1">UNFLAG</button>
</div>
</div>
</div>
</div>
{/* Column 2 & 3: Pools & Toxicity (Right, 8 cols) */}
<div className="md:col-span-8 flex flex-col gap-md">
{/* Toxicity Override (Spans full width of right section) */}
<div className="glass-card rounded-lg p-md relative overflow-hidden border-t-2 border-t-primary-container">
{/* Decorative background element */}
<div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-container/5 rounded-full blur-3xl pointer-events-none"></div>
<div className="flex justify-between items-center border-b-[0.5px] border-outline-variant pb-sm mb-md relative z-10">
<h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
<span className="material-symbols-outlined text-primary-fixed">tune</span>
                            Manual Toxicity Override
                        </h2>
</div>
<form className="grid grid-cols-1 md:grid-cols-2 gap-md relative z-10">
{/* Left col of form */}
<div className="flex flex-col gap-sm">
<div>
<label className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">TARGET POOL</label>
<select className="w-full bg-surface-container-low border border-outline-variant rounded px-sm py-sm text-on-surface font-mono-data focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all">
<option>WETH/USDC - 0xabc...123</option>
<option>WRAITH/WETH - 0xdef...456</option>
<option>GLOBAL OVERRIDE</option>
</select>
</div>
<div>
<label className="block font-label-caps text-label-caps text-on-surface-variant mb-xs flex justify-between">
<span>TOXICITY SCORE</span>
<span className="text-primary-fixed">10000 (MAX)</span>
</label>
<input className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary-container" max="10000" min="0" type="range" value="10000"/>
<div className="flex justify-between text-[10px] text-outline mt-1 font-mono-data">
<span>0 (Safe)</span>
<span>5000 (Warn)</span>
<span>10000 (Block)</span>
</div>
</div>
<div>
<label className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">PROOF HASH (IPFS/ARWEAVE)</label>
<input className="w-full bg-surface-container-low border border-outline-variant rounded px-sm py-sm text-on-surface font-mono-data focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all placeholder:text-outline/50 placeholder:font-mono-data" placeholder="Qm..." type="text"/>
</div>
</div>
{/* Right col of form */}
<div className="flex flex-col gap-sm h-full">
<div className="flex-grow flex flex-col">
<label className="block font-label-caps text-label-caps text-on-surface-variant mb-xs">ATTACKER ADDRESSES (Comma separated)</label>
<textarea className="w-full flex-grow bg-surface-container-low border border-outline-variant rounded px-sm py-sm text-on-surface font-mono-data focus:border-primary-container focus:ring-1 focus:ring-primary-container outline-none transition-all placeholder:text-outline/50 resize-none" placeholder="0x...
0x..."></textarea>
</div>
<button className="w-full bg-primary-container text-on-primary-container font-label-caps text-label-caps py-sm rounded hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] transition-all flex items-center justify-center gap-xs mt-auto" type="button">
<span className="material-symbols-outlined text-[16px]">gavel</span>
                                EXECUTE OVERRIDE
                            </button>
</div>
</form>
</div>
{/* Pool Management */}
<div className="glass-card rounded-lg p-md flex flex-col flex-grow">
<div className="flex justify-between items-center border-b-[0.5px] border-outline-variant pb-sm mb-sm">
<h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
<span className="material-symbols-outlined text-tertiary-fixed">water_drop</span>
                            Monitored Pools
                        </h2>
<div className="flex gap-sm">
<button className="text-xs font-label-caps text-on-surface bg-surface-container-highest hover:bg-surface-bright px-3 py-1.5 rounded border border-outline-variant transition-colors flex items-center gap-xs">
<span className="material-symbols-outlined text-[14px]">add</span> ADD POOL
                            </button>
<button className="text-xs font-label-caps text-on-surface bg-surface-container-highest hover:bg-surface-bright px-3 py-1.5 rounded border border-outline-variant transition-colors flex items-center gap-xs">
<span className="material-symbols-outlined text-[14px] text-error">gpp_bad</span> DISARM ALL
                            </button>
</div>
</div>
{/* Data Table */}
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="border-b-[0.5px] border-outline-variant">
<th className="py-2 px-2 font-label-caps text-label-caps text-on-surface-variant font-normal">POOL NAME</th>
<th className="py-2 px-2 font-label-caps text-label-caps text-on-surface-variant font-normal">ADDRESS</th>
<th className="py-2 px-2 font-label-caps text-label-caps text-on-surface-variant font-normal">TVL</th>
<th className="py-2 px-2 font-label-caps text-label-caps text-on-surface-variant font-normal">STATUS</th>
<th className="py-2 px-2 font-label-caps text-label-caps text-on-surface-variant font-normal text-right">ACTION</th>
</tr>
</thead>
<tbody className="font-mono-data text-mono-data text-on-surface">
<tr className="border-b-[0.5px] border-outline-variant/30 hover:bg-white/5 transition-colors">
<td className="py-3 px-2 flex items-center gap-xs">
<div className="w-2 h-2 rounded-full bg-primary-fixed-dim"></div>
                                        WETH/USDC
                                    </td>
<td className="py-3 px-2 text-[12px] text-outline">0x8ad5...29a3</td>
<td className="py-3 px-2">$42.5M</td>
<td className="py-3 px-2">
<span className="text-primary-fixed text-xs border border-primary-fixed/30 bg-primary-fixed/10 px-2 py-0.5 rounded">ARMED</span>
</td>
<td className="py-3 px-2 text-right">
<button className="text-outline hover:text-error transition-colors"><span className="material-symbols-outlined text-[18px]">lock_open</span></button>
</td>
</tr>
<tr className="border-b-[0.5px] border-outline-variant/30 hover:bg-white/5 transition-colors">
<td className="py-3 px-2 flex items-center gap-xs">
<div className="w-2 h-2 rounded-full bg-primary-fixed-dim"></div>
                                        WRAITH/WETH
                                    </td>
<td className="py-3 px-2 text-[12px] text-outline">0x1f98...4380</td>
<td className="py-3 px-2">$12.1M</td>
<td className="py-3 px-2">
<span className="text-primary-fixed text-xs border border-primary-fixed/30 bg-primary-fixed/10 px-2 py-0.5 rounded">ARMED</span>
</td>
<td className="py-3 px-2 text-right">
<button className="text-outline hover:text-error transition-colors"><span className="material-symbols-outlined text-[18px]">lock_open</span></button>
</td>
</tr>
<tr className="border-b-[0.5px] border-outline-variant/30 hover:bg-white/5 transition-colors opacity-60">
<td className="py-3 px-2 flex items-center gap-xs">
<div className="w-2 h-2 rounded-full bg-outline"></div>
                                        DAI/USDC
                                    </td>
<td className="py-3 px-2 text-[12px] text-outline">0xae46...0f73</td>
<td className="py-3 px-2">$8.2M</td>
<td className="py-3 px-2">
<span className="text-outline text-xs border border-outline/30 bg-surface-container px-2 py-0.5 rounded">DISARMED</span>
</td>
<td className="py-3 px-2 text-right">
<button className="text-outline hover:text-primary-fixed transition-colors"><span className="material-symbols-outlined text-[18px]">lock</span></button>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</div>
</div>
</main>
{/* Footer */}
<footer className="w-full py-6 px-12 flex justify-between items-center border-t border-white/10 bg-slate-950/80 backdrop-blur-lg mt-xl">
<div className="text-cyan-400 font-bold font-mono text-[10px] tracking-tighter uppercase">
            WRAITH PROTOCOL // ACTIVE_DEFENSE_V4
        </div>
<div className="flex gap-lg font-mono text-[10px] tracking-tighter uppercase">
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Documentation</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Security Audit</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Github</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Status</a>
</div>
</footer>
    </>
  );
}
