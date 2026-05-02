"use client";

import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
      </div>
      
      <header className="bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-[100] w-full">
        <div className="max-w-[1440px] mx-auto px-12 h-20 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center group">
              <span className="text-2xl font-black tracking-tighter text-white group-hover:text-cyan-400 transition-colors">WRAITH</span>
              <span className="ml-2 px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded border border-cyan-500/20">V1.0</span>
            </Link>
            <nav className="hidden md:flex gap-8 font-mono tracking-wider uppercase text-[11px] font-medium">
              <Link className="text-slate-400 hover:text-white transition-all" href="/">Dashboard</Link>
              <Link className="text-slate-400 hover:text-white transition-all" href="/protect">Protection</Link>
              <Link className="text-slate-400 hover:text-white transition-all" href="/sentinel">Sentinel</Link>
              <Link className="text-cyan-400 flex items-center gap-2" href="/info">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></span>
                How it Works
              </Link>
            </nav>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="max-w-[1200px] mx-auto pt-24 pb-20 px-12 text-center">
          <h1 className="text-7xl font-black tracking-tighter text-white mb-8 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
            Autonomous Liquidity <br />Defense Protocol
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-[800px] mx-auto font-light">
            Wraith is the first decentralized "Agent Guard" architecture designed to protect Liquidity Providers 
            through verifiable AI inference and atomic flash-rescue execution.
          </p>
        </section>

        {/* Primary Memo Image */}
        <section className="max-w-[800px] mx-auto px-12 mb-32 flex justify-center">
          <div className="bg-slate-900/40 border border-white/5 p-2 rounded-[2rem] backdrop-blur-sm group hover:border-cyan-500/20 transition-all overflow-hidden">
            <img 
              src="/assets/protocol_memo_slide.png" 
              alt="Wraith Protocol Memo" 
              className="w-full h-auto rounded-[1.5rem] shadow-2xl transition-transform duration-700 group-hover:scale-[1.01]" 
            />
          </div>
        </section>

        {/* 4-Layer Deep Dive */}
        <section className="max-w-[1200px] mx-auto px-12 mb-40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-white mb-12 flex items-center gap-4">
                <span className="w-12 h-[1px] bg-cyan-500"></span>
                The 4-Layer Pipeline
              </h2>
              
              <div className="space-y-12">
                {[
                  {
                    step: "01",
                    title: "Intelligence Layer (Gensyn AEL)",
                    desc: "Sentinel agents monitor mempool and bytecode patterns. Powered by Gensyn's Verifiable Compute, it produces a cryptographic 'Proof of Malice' to trigger defenses without false alarms.",
                    icon: "psychology"
                  },
                  {
                    step: "02",
                    title: "Messaging Layer (AXL Mesh)",
                    desc: "Encrypted P2P alerts are broadcasted across the AXL Mesh network. This bypasses centralized relayers, ensuring alerts reach Keepers instantly under any condition.",
                    icon: "hub"
                  },
                  {
                    step: "03",
                    title: "Enforcement Layer (Uniswap v4)",
                    desc: "The WraithHook intercepts malicious swaps. It arms the 'Poison Fee' (99.9%) for attackers and opens the 'Quantum Gateway' path for secure asset recovery.",
                    icon: "shield"
                  },
                  {
                    step: "04",
                    title: "Execution Layer (Keeper Hub)",
                    desc: "Decentralized Keepers execute high-priority Flash-Rescue Bundles. Capital is removed, swapped to safe assets, and vaulted in the same block as the attack.",
                    icon: "bolt"
                  }
                ].map((item) => (
                  <div key={item.step} className="flex gap-8 group">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-cyan-400 font-mono text-sm group-hover:border-cyan-500/40 transition-all">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{item.title}</h3>
                      <p className="text-slate-400 leading-relaxed text-sm font-light">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative max-w-[500px] mx-auto md:mx-0">
              <div className="absolute inset-0 bg-cyan-500/20 blur-[80px] rounded-full"></div>
              <div className="relative bg-slate-900/50 border border-white/10 p-2 rounded-[1.5rem] overflow-hidden group hover:border-cyan-500/40 transition-all">
                <img src="/assets/protocol_architecture.png" alt="Architecture Diagram" className="w-full h-auto rounded-[1.3rem] shadow-xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Technical Innovation Section */}
        <section className="bg-slate-900/30 border-y border-white/5 py-32 mb-32">
          <div className="max-w-[1200px] mx-auto px-12">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-bold tracking-tight text-white mb-4">Technical Innovations</h2>
              <p className="text-slate-400 font-light">Pushing the boundaries of Uniswap v4 Hook potential.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-3xl bg-slate-950 border border-white/5 hover:border-cyan-500/30 transition-all">
                <span className="material-symbols-outlined text-cyan-400 text-4xl mb-6">memory</span>
                <h3 className="text-xl font-bold mb-4">EIP-1153 Transient Storage</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-light">
                  Wraith utilizes TSTORE/TLOAD for block-scoped state management. This eliminates state bloat and reduces gas costs for toxicity updates by over 80%.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-slate-950 border border-white/5 hover:border-cyan-500/30 transition-all">
                <span className="material-symbols-outlined text-cyan-400 text-4xl mb-6">lock</span>
                <h3 className="text-xl font-bold mb-4">Poison Fee Logic</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-light">
                  The protocol doesn't just block; it traps. By overriding swap fees to 99.9% for flagged attackers, we make extraction economically impossible.
                </p>
              </div>
              <div className="p-8 rounded-3xl bg-slate-950 border border-white/5 hover:border-cyan-500/30 transition-all">
                <span className="material-symbols-outlined text-cyan-400 text-4xl mb-6">speed</span>
                <h3 className="text-xl font-bold mb-4">Atomic Quantum Exit</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-light">
                  A high-priority entry point allowing Keepers to rescue liquidity, swap for stablecoins, and deposit to a vault in a single atomic bundle.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-[1200px] mx-auto px-12 pb-40 text-center">
          <div className="relative p-1 bg-gradient-to-r from-cyan-500/20 via-emerald-500/20 to-cyan-500/20 rounded-[3rem] overflow-hidden">
            <div className="bg-[#020617] rounded-[2.9rem] py-20 px-12 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 to-transparent"></div>
              <h2 className="text-5xl font-black text-white mb-8 relative z-10">Ready to Arm Your Liquidity?</h2>
              <p className="text-slate-400 max-w-[600px] mx-auto mb-12 font-light relative z-10">
                Join the decentralized network of protected LPs and secure your capital against the next rug-pull.
              </p>
              <Link href="/protect" className="relative z-10 inline-flex items-center gap-3 bg-cyan-500 text-slate-950 px-10 py-5 rounded-2xl font-bold tracking-widest hover:scale-105 hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all">
                ACTIVATE PROTECTION
                <span className="material-symbols-outlined font-bold">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 border-t border-white/5 py-12 px-12">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <span className="text-xl font-black text-white">WRAITH</span>
            <span className="text-slate-500 text-xs font-mono">// AUTONOMOUS_DEFENSE</span>
          </div>
          <div className="flex gap-8 text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
            <Link href="/" className="hover:text-cyan-400 transition-colors">Dashboard</Link>
            <Link href="/protect" className="hover:text-cyan-400 transition-colors">Protection</Link>
            <Link href="/sentinel" className="hover:text-cyan-400 transition-colors">Sentinel</Link>
            <a href="#" className="hover:text-cyan-400 transition-colors">Github</a>
          </div>
          <div className="text-slate-600 text-[10px] font-mono">
            &copy; 2026 WRAITH PROTOCOL // GEN-KEEPER HACKATHON
          </div>
        </div>
      </footer>
    </div>
  );
}
