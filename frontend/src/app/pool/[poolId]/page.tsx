"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useParams } from 'next/navigation';
import { WRAITH_HOOK_ADDRESS, wraithHookConfig } from '../../../lib/contracts';

export default function PoolDetailPage() {

  const { poolId } = useParams();
  
  // Mock PoolKey Hash based on the poolId
  const poolKeyHash = '0x1234567890123456789012345678901234567890123456789012345678901234';

  const { data: toxicityScore } = useReadContract({
    ...wraithHookConfig,
    functionName: 'getToxicityScore',
    args: [poolKeyHash],
  });

  const { writeContract, data: hash, isPending } = useWriteContract();

  const handleQuantumExit = () => {
    alert("Triggering Quantum Exit for " + poolId + " on Unichain...");
  };

  const displayScore = toxicityScore !== undefined ? Number(toxicityScore) : 88;

  return (
    <>
{/* Global Scanline Overlay */}
<div className="fixed inset-0 pointer-events-none z-50 scanline-overlay opacity-20"></div>
{/* TopNavBar */}
<nav className="fixed top-0 left-0 w-full z-[100] flex justify-between items-center px-12 h-20 max-w-[1440px] mx-auto bg-slate-950/60 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.1)] border-b border-white/10 font-sans tracking-widest uppercase text-xs font-bold text-cyan-400">
<div className="text-2xl font-black tracking-tighter text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
            WRAITH
        </div>
<div className="hidden md:flex gap-8">
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/">Dashboard</Link>
<Link className="text-cyan-400 border-b border-cyan-400 pb-1 transition-all hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] duration-300" href="/pool/pepe-eth">Pools</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/protect">Protection</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/sentinel">Sentinel</Link>
<Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300" href="/admin">Admin</Link>
</div>
<div className="flex items-center gap-6">
<div className="flex gap-4">
<span className="material-symbols-outlined hover:text-cyan-200 cursor-pointer transition-colors">notifications</span>
<span className="material-symbols-outlined hover:text-cyan-200 cursor-pointer transition-colors">terminal</span>
</div>
<div className="hidden lg:flex items-center gap-4">

<ConnectButton />
</div>
</div>
</nav>
{/* Main Content Canvas */}
<main className="max-w-[1440px] mx-auto px-12 pt-32 pb-32">
{/* Header Section */}
<header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
<div className="flex items-center gap-6">
<div className="relative flex">
<div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center overflow-hidden z-10">
<img alt="Frog Token Logo" className="w-full h-full object-cover" data-alt="Stylized green frog face logo on dark background, high contrast crypto aesthetic" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD7oUgWCLcAGKxzm4chf4wjslbN7f_xFo2889p2I8KvcZPN1N-CivzprXOwf58GhBfamwSxWKVbDRTCmyumlRvSLapS9Mk1U9KtlqGpM2w0aD_CRel013tiBQnhYZ6u2UPnQ6vcfELDNcJ_CnqkjObe_HVMTzFXX5ZBxBZgyOuljKj220RvLbRrshtxYPK43IFYVSwOzfZR_xkrT7ZVTic8FGFugWCDZsj1ransmydHAVPzJ-XMacmrDyopQc2VJxAsPJx0UCQ"/>
</div>
<div className="w-16 h-16 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center overflow-hidden -ml-4">
<img alt="Ethereum Logo" className="w-full h-full object-cover" data-alt="Silver ethereum diamond logo on dark background, glowing edges" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6Sd1lQEk3DmpxYp8sGfelr6wPn_AOboTcLmXbC7MgkzYtTNydaAKtjRJ7W70y7LbMe4KPfJpj6uC6jBUk1tvkaWF_tFrCu9F_EwOEfedUjO5CSfqu5fGBrJ2FWbinKyNQj_u8wna_GvVuLeGXwknZ85b7GoYtKEeu9mIzbvN7KMy1n4-_1iMNWusHxycxAN3rXCu3-MTG-Xqhzk_pgT8VhpnkiQqRqzZfJaQDAxn9AT4Nc3TR79d72A0gTcvsR-NzLL-CBT8"/>
</div>
</div>
<div>
<h1 className="font-headline-lg text-headline-lg text-primary mb-2 flex items-center gap-3">
                        PEPE / ETH
                        <span className="bg-surface-container-high px-2 py-1 rounded text-label-caps font-label-caps text-on-surface-variant border border-outline-variant">UNISWAP V3</span>
</h1>
<div className="flex items-center gap-4 text-on-surface-variant">
<span className="font-mono-data text-mono-data bg-surface-container px-3 py-1 rounded ghost-border flex items-center gap-2">
                            0x8D9...A4B2
                            <span className="material-symbols-outlined text-[14px] cursor-pointer hover:text-primary-container">content_copy</span>
</span>
<a className="flex items-center gap-1 hover:text-primary-container transition-colors font-label-caps text-label-caps" href="#">
                            Etherscan <span className="material-symbols-outlined text-[14px]">open_in_new</span>
</a>
</div>
</div>
</div>
<div className="flex gap-4">
<button className="bg-surface-container-highest ghost-border text-on-surface px-6 py-3 rounded-lg font-label-caps text-label-caps hover:bg-surface-bright transition-colors flex items-center gap-2">
<span className="material-symbols-outlined">refresh</span> Update Toxicity
                </button>
</div>
</header>
{/* Bento Grid Layout */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
{/* Left Column: Toxicity & Controls */}
<div className="lg:col-span-4 flex flex-col gap-8">
{/* Toxicity Gauge Card */}
<div className="bg-surface-container-low/60 backdrop-blur-[12px] ghost-border rounded-[12px] p-8 relative overflow-hidden bg-grid-pattern">
<div className="absolute top-0 right-0 p-4">
<span className="material-symbols-outlined text-error opacity-50">warning</span>
</div>
<h2 className="font-label-caps text-label-caps text-on-surface-variant mb-8 uppercase tracking-widest">System Toxicity</h2>
<div className="flex justify-center items-center mb-8 relative">
{/* Abstract representations of a radial gauge */}
<div className="w-48 h-48 rounded-full border-[12px] border-surface-container-highest relative flex items-center justify-center pulse-critical">
<svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
<circle cx="50" cy="50" fill="transparent" r="40" stroke="#171b28" strokeWidth="10"></circle>
{/* 88% of 251 circumference = ~220 */}
<circle className="text-error" cx="50" cy="50" fill="transparent" r="40" stroke="#ffb4ab" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - displayScore/100)} strokeWidth="10"></circle>
</svg>
<div className="text-center">
<div className="font-display-xl text-display-xl text-error drop-shadow-[0_0_10px_rgba(255,180,171,0.5)]">{displayScore}<span className="text-[24px]">%</span></div>
<div className="font-label-caps text-label-caps text-error tracking-[0.2em] mt-1">CRITICAL</div>
</div>
</div>
</div>
<div className="flex justify-between items-center bg-surface-container p-4 rounded ghost-border">
<span className="font-mono-data text-mono-data text-on-surface-variant">Status</span>
<div className="flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-error drop-shadow-[0_0_5px_rgba(255,180,171,1)]"></span>
<span className="font-label-caps text-label-caps text-error">BREACH DETECTED</span>
</div>
</div>
</div>
{/* Action Controls Card */}
<div className="bg-surface-container-low/60 backdrop-blur-[12px] ghost-border rounded-[12px] p-8 bg-grid-pattern">
<h2 className="font-label-caps text-label-caps text-on-surface-variant mb-6 uppercase tracking-widest">Active Countermeasures</h2>
<div className="flex flex-col gap-4">
<button onClick={handleQuantumExit} className="w-full bg-error-container text-on-error-container hover:bg-error hover:text-on-error font-label-caps text-label-caps py-4 rounded-lg ghost-border flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(147,0,10,0.3)]">
<span className="material-symbols-outlined">eject</span> TRIGGER QUANTUM EXIT
                        </button>
<button className="w-full bg-surface-container-highest text-on-surface hover:bg-surface-bright font-label-caps text-label-caps py-4 rounded-lg ghost-border flex items-center justify-center gap-2 transition-all">
<span className="material-symbols-outlined">cleaning_services</span> CLEAR TOXICITY
                        </button>
</div>
</div>
</div>
{/* Right Column: Details & Tables */}
<div className="lg:col-span-8 flex flex-col gap-8">
{/* Defense Status Panel */}
<div className="bg-surface-container-low/60 backdrop-blur-[12px] ghost-border rounded-[12px] p-8 bg-grid-pattern">
<div className="flex justify-between items-center mb-6">
<h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Defense Status Matrix</h2>
{/* Toggle */}
<div className="flex items-center gap-3 bg-surface-container-highest px-4 py-2 rounded-full border border-outline-variant">
<span className="font-label-caps text-label-caps text-primary-container">ARMED</span>
<div className="w-10 h-5 bg-primary-container/20 rounded-full relative shadow-[0_0_5px_rgba(0,240,255,0.3)]">
<div className="absolute right-1 top-1 w-3 h-3 bg-primary-container rounded-full drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]"></div>
</div>
</div>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
<div className="bg-surface-container p-4 rounded ghost-border">
<div className="font-label-caps text-label-caps text-outline mb-2">LAST PROOF HASH</div>
<div className="font-mono-data text-mono-data text-primary truncate">
                                0x9a3c7f2b1d...4e5f6a7b8c9d
                            </div>
</div>
<div className="bg-surface-container p-4 rounded ghost-border">
<div className="font-label-caps text-label-caps text-outline mb-2">FLAGGED ACTORS</div>
<div className="font-mono-data text-mono-data text-error">
                                3 Entities Detected
                            </div>
</div>
</div>
{/* Flagged Attackers Table */}
<h3 className="font-label-caps text-label-caps text-error mb-4 border-b border-white/10 pb-2">Identified Threats</h3>
<div className="w-full overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="border-b border-white/5 font-label-caps text-label-caps text-outline">
<th className="py-3 px-4">Address</th>
<th className="py-3 px-4">Threat Type</th>
<th className="py-3 px-4">Toxicity Contribution</th>
</tr>
</thead>
<tbody className="font-mono-data text-mono-data text-on-surface">
<tr className="border-b border-white/5 hover:bg-surface-container-highest/50 transition-colors">
<td className="py-3 px-4 flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-error">dangerous</span>
                                        0x1F2...E89D
                                    </td>
<td className="py-3 px-4 text-on-surface-variant">Flashloan Arbitrage</td>
<td className="py-3 px-4 text-error">+42%</td>
</tr>
<tr className="border-b border-white/5 hover:bg-surface-container-highest/50 transition-colors">
<td className="py-3 px-4 flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-error">dangerous</span>
                                        0x7A4...B12C
                                    </td>
<td className="py-3 px-4 text-on-surface-variant">Sandwich Attack</td>
<td className="py-3 px-4 text-error">+28%</td>
</tr>
<tr className="hover:bg-surface-container-highest/50 transition-colors">
<td className="py-3 px-4 flex items-center gap-2">
<span className="material-symbols-outlined text-[16px] text-error">warning</span>
                                        0x3C9...F45A
                                    </td>
<td className="py-3 px-4 text-on-surface-variant">Suspicious Routing</td>
<td className="py-3 px-4 text-error">+18%</td>
</tr>
</tbody>
</table>
</div>
</div>
{/* LP Positions Table */}
<div className="bg-surface-container-low/60 backdrop-blur-[12px] ghost-border rounded-[12px] p-8 bg-grid-pattern">
<h2 className="font-label-caps text-label-caps text-on-surface-variant mb-6 uppercase tracking-widest border-b border-white/10 pb-4">Registered LP Positions (Shielded)</h2>
<div className="w-full overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="border-b border-white/5 font-label-caps text-label-caps text-outline">
<th className="py-3 px-4">Vault Address</th>
<th className="py-3 px-4">PEPE Amount</th>
<th className="py-3 px-4">ETH Amount</th>
<th className="py-3 px-4 text-right">Status</th>
</tr>
</thead>
<tbody className="font-mono-data text-mono-data text-on-surface">
<tr className="border-b border-white/5 hover:bg-surface-container-highest/50 transition-colors">
<td className="py-3 px-4">0xVaultA...1234</td>
<td className="py-3 px-4">4,500,000.00</td>
<td className="py-3 px-4">12.50</td>
<td className="py-3 px-4 text-right text-primary-container">PROTECTED</td>
</tr>
<tr className="border-b border-white/5 hover:bg-surface-container-highest/50 transition-colors">
<td className="py-3 px-4">0xVaultB...5678</td>
<td className="py-3 px-4">1,200,000.00</td>
<td className="py-3 px-4">3.20</td>
<td className="py-3 px-4 text-right text-primary-container">PROTECTED</td>
</tr>
<tr className="border-b border-white/5 hover:bg-surface-container-highest/50 transition-colors">
<td className="py-3 px-4">0xVaultC...9012</td>
<td className="py-3 px-4">8,900,000.00</td>
<td className="py-3 px-4">24.10</td>
<td className="py-3 px-4 text-right text-primary-container">PROTECTED</td>
</tr>
<tr className="hover:bg-surface-container-highest/50 transition-colors">
<td className="py-3 px-4 text-outline">0xVaultD...3456</td>
<td className="py-3 px-4 text-outline">500,000.00</td>
<td className="py-3 px-4 text-outline">1.50</td>
<td className="py-3 px-4 text-right text-outline">UNSHIELDED</td>
</tr>
</tbody>
</table>
</div>
</div>
</div>
</div>
</main>
{/* Footer */}
<footer className="w-full py-6 px-12 flex justify-between items-center border-t border-white/10 docked full-width bottom-0 bg-slate-950/80 backdrop-blur-lg">
<div className="text-cyan-400 font-bold font-mono text-[10px] tracking-tighter uppercase">
            WRAITH PROTOCOL // ACTIVE_DEFENSE_V4
        </div>
<div className="flex gap-6 font-mono text-[10px] tracking-tighter uppercase">
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Documentation</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Security Audit</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Github</a>
<a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Status</a>
</div>
</footer>
    </>
  );
}
