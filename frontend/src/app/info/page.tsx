"use client";

import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function HowItWorks() {
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
              <Link className="text-slate-400 hover:text-cyan-200 transition-all" href="/protect">Protection</Link>
              <Link className="text-cyan-400 border-b border-cyan-400 pb-1" href="/info">How it Works</Link>
            </nav>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="max-w-[900px] mx-auto pt-20 pb-32 px-12">
        <div className="text-center mb-20">
          <h1 className="text-5xl font-black tracking-tighter text-white mb-6">Active Defense Architecture</h1>
          <p className="text-xl text-slate-400 leading-relaxed max-w-[700px] mx-auto">
            Wraith is a high-speed security layer for Uniswap v4, designed to detect and front-run malicious pool activity before it drains your liquidity.
          </p>
        </div>

        {/* Section: The Metrics */}
        <section className="mb-20">
          <div className="flex items-center gap-4 mb-8">
            <span className="material-symbols-outlined text-cyan-400 text-4xl">analytics</span>
            <h2 className="text-2xl font-bold tracking-tight">Toxicity Metrics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl">
              <h3 className="text-cyan-400 font-bold mb-3 uppercase tracking-widest text-xs">HFT Intensity</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Measures the frequency of recursive trades (sandwiches/wash-trading). High intensity indicates bot-dominated extraction.
              </p>
            </div>
            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl">
              <h3 className="text-cyan-400 font-bold mb-3 uppercase tracking-widest text-xs">Liquidity Velocity</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tracks the rate of capital withdrawal. Sudden spikes in velocity often precede a "Soft Rug" or exit drain.
              </p>
            </div>
            <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl">
              <h3 className="text-cyan-400 font-bold mb-3 uppercase tracking-widest text-xs">Price Dislocation</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Detects deviations between pool price and external oracles, identifying potential price-manipulation exploits.
              </p>
            </div>
          </div>
        </section>

        {/* Section: Keeper Hub */}
        <section className="mb-20">
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-3xl p-10 flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <span className="material-symbols-outlined text-cyan-400 text-4xl">hub</span>
                <h2 className="text-2xl font-bold tracking-tight">Keeper Hub</h2>
              </div>
              <p className="text-slate-400 leading-relaxed mb-6">
                The Keeper Hub is the decentralized execution engine of Wraith. It monitors "Armed" pools 24/7. When a pool's Toxicity Score exceeds a user's threshold, Keepers automatically trigger the **Quantum Exit**.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm font-bold text-slate-300">
                  <span className="material-symbols-outlined text-cyan-400 text-[18px]">check_circle</span>
                  No Manual Input Required
                </li>
                <li className="flex items-center gap-3 text-sm font-bold text-slate-300">
                  <span className="material-symbols-outlined text-cyan-400 text-[18px]">check_circle</span>
                  Beats Attackers in the Same Block
                </li>
              </ul>
            </div>
            <div className="w-full md:w-64 h-64 bg-slate-950 rounded-2xl border border-white/10 flex items-center justify-center relative overflow-hidden">
               <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500 to-transparent"></div>
               <span className="material-symbols-outlined text-6xl text-cyan-400 animate-pulse">radar</span>
            </div>
          </div>
        </section>

        {/* Section: The Tech Stack */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <span className="material-symbols-outlined text-cyan-400 text-4xl">layers</span>
            <h2 className="text-2xl font-bold tracking-tight">Technology Stack</h2>
          </div>
          <div className="space-y-4">
            <div className="flex gap-6 items-start bg-slate-900/30 p-6 rounded-2xl border border-white/5">
              <div className="bg-slate-950 p-3 rounded-lg border border-white/10">
                <span className="material-symbols-outlined text-cyan-400">hook</span>
              </div>
              <div>
                <h4 className="font-bold text-white mb-1">Uniswap v4 Hooks</h4>
                <p className="text-sm text-slate-400">The core integration point. Allows Wraith to intercept swaps and manage liquidity atomically.</p>
              </div>
            </div>
            <div className="flex gap-6 items-start bg-slate-900/30 p-6 rounded-2xl border border-white/5">
              <div className="bg-slate-950 p-3 rounded-lg border border-white/10">
                <span className="material-symbols-outlined text-cyan-400">psychology</span>
              </div>
              <div>
                <h4 className="font-bold text-white mb-1">Gensyn Sentinel</h4>
                <p className="text-sm text-slate-400">The off-chain analysis engine that processes thousands of data points to generate the Toxicity Score.</p>
              </div>
            </div>
            <div className="flex gap-6 items-start bg-slate-900/30 p-6 rounded-2xl border border-white/5">
              <div className="bg-slate-950 p-3 rounded-lg border border-white/10">
                <span className="material-symbols-outlined text-cyan-400">key</span>
              </div>
              <div>
                <h4 className="font-bold text-white mb-1">Permit2 Authorization</h4>
                <p className="text-sm text-slate-400">Used for secure, signature-based liquidity management without requiring constant manual approvals.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-24 text-center">
           <Link href="/protect" className="inline-flex items-center gap-2 bg-cyan-500 text-slate-950 px-8 py-4 rounded-xl font-bold tracking-widest hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] transition-all">
             ACTIVATE PROTECTION
             <span className="material-symbols-outlined">arrow_forward</span>
           </Link>
        </div>
      </main>

      <footer className="bg-slate-950/80 backdrop-blur-lg text-cyan-500 font-mono text-[10px] tracking-tighter uppercase docked full-width bottom-0 border-t-[0.5px] border-white/5 w-full py-6 px-12 flex justify-between items-center relative z-50">
        <div className="text-cyan-400 font-bold">WRAITH PROTOCOL // ARCHITECTURE_V4</div>
        <div className="flex gap-lg">
          <Link className="text-slate-500 hover:text-cyan-300 transition-colors" href="/">Dashboard</Link>
          <Link className="text-slate-500 hover:text-cyan-300 transition-colors" href="/protect">Protection</Link>
          <a className="text-slate-500 hover:text-cyan-300 transition-colors" href="#">Github</a>
        </div>
      </footer>
    </div>
  );
}
