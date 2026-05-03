"use client";

import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 blur-[120px] rounded-full"></div>
        <div className="scanlines"></div>
      </div>

      <header className="fixed top-0 left-0 w-full z-[100] bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1440px] mx-auto px-12 h-20 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center group gap-4">
              <img src="/logo.png" alt="Wraith Logo" className="h-10 w-auto" />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tighter text-white group-hover:text-cyan-400 transition-colors uppercase">WRAITH</span>
                <span className="text-[8px] font-bold text-cyan-500/50 tracking-[0.2em] uppercase">Security Protocol</span>
              </div>
            </Link>
            <nav className="hidden md:flex gap-8 font-mono tracking-wider uppercase text-[11px] font-medium">
              <Link className="text-slate-400 hover:text-white transition-all" href="/dashboard">Dashboard</Link>
              <Link className="text-slate-400 hover:text-white transition-all" href="/protect">Protection</Link>
              <Link className="text-slate-400 hover:text-white transition-all" href="/info">How it Works</Link>
              <Link className="text-slate-400 hover:text-white transition-all" href="/liquidity">Liquidity</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ConnectButton chainStatus="icon" showBalance={false} />
            <Link 
              href="/dashboard"
              className="px-6 py-2 bg-cyan-500 text-black text-xs font-bold rounded-full hover:bg-cyan-400 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.5)]"
            >
              LAUNCH APP
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* Billboard Hero Section */}
        <section className="pt-48 pb-32 px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-[120px] leading-[0.9] font-black tracking-tighter text-white mb-12 uppercase">
              DEFEAT THE <br />
              <span className="text-cyan-400">RUG-PULL</span> <br />
              INSTANTLY
            </h1>
            <p className="text-2xl text-slate-400 max-w-[800px] mx-auto font-light leading-relaxed mb-16">
              Rug-pulls happen in blocks. Human defense happens in minutes. <br />
              <span className="text-white font-bold">Wraith defends in the SAME block.</span> Verifiable AI security 
              for modern Liquidity Providers.
            </p>
            <div className="flex justify-center gap-6">
              <Link 
                href="/dashboard"
                className="px-12 py-5 bg-white text-black text-lg font-black tracking-tight rounded-xl hover:bg-cyan-400 transition-all transform hover:scale-105"
              >
                SECURE YOUR LIQUIDITY
              </Link>
              <Link 
                href="/info"
                className="px-12 py-5 bg-slate-900 border border-white/10 text-white text-lg font-black tracking-tight rounded-xl hover:border-cyan-500 transition-all"
              >
                READ THE PROTOCOL
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Mood Board / Design Vision */}
        <section className="py-32 px-12 bg-white/5 border-y border-white/5">
          <div className="max-w-[1440px] mx-auto">
            <div className="mb-20">
              <h2 className="text-sm font-mono text-cyan-400 tracking-[0.3em] uppercase mb-4">Design Skill & Vision</h2>
              <h3 className="text-5xl font-black tracking-tight text-white uppercase">The Aesthetic of Verifiable Defense</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-8">
                <div className="aspect-[4/5] bg-slate-900 rounded-[2rem] overflow-hidden border border-white/5 group hover:border-cyan-500/30 transition-all">
                  <img src="/assets/wraith_moodboard_1.png" alt="Mood 1" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                </div>
                <div className="p-8 bg-slate-900/50 rounded-3xl border border-white/5">
                  <h4 className="text-xl font-bold text-white mb-4">Cybernetic Logic</h4>
                  <p className="text-slate-400 text-sm font-light leading-relaxed">
                    Inspired by high-fidelity mission control systems, our UI prioritizes data clarity and immediate actionability during high-stress liquidity events.
                  </p>
                </div>
              </div>
              <div className="space-y-8 pt-12">
                <div className="aspect-[4/5] bg-slate-900 rounded-[2rem] overflow-hidden border border-white/5 group hover:border-cyan-500/30 transition-all">
                  <img src="/assets/wraith_moodboard_2.png" alt="Mood 2" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                </div>
                <div className="p-8 bg-slate-900/50 rounded-3xl border border-white/5">
                  <h4 className="text-xl font-bold text-white mb-4">Neural Verification</h4>
                  <p className="text-slate-400 text-sm font-light leading-relaxed">
                    Abstracting the complexity of Gensyn's verifiable AI proofs into clean, understandable visual indicators of trust and malice.
                  </p>
                </div>
              </div>
              <div className="space-y-8">
                <div className="aspect-[4/5] bg-slate-900 rounded-[2rem] overflow-hidden border border-white/5 group hover:border-cyan-500/30 transition-all">
                  <img src="/assets/wraith_moodboard_3.png" alt="Mood 3" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" />
                </div>
                <div className="p-8 bg-slate-900/50 rounded-3xl border border-white/5">
                  <h4 className="text-xl font-bold text-white mb-4">Financial Precision</h4>
                  <p className="text-slate-400 text-sm font-light leading-relaxed">
                    Melding the aesthetics of premium fintech with the raw power of decentralized hooks. Sleek, glassmorphic, and undeniably professional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Integration / Tech Stack */}
        <section className="py-40 px-12">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-6xl font-black tracking-tight text-white mb-12 uppercase leading-none">
                Integrated <br />
                <span className="text-cyan-400">Security</span>
              </h2>
              <div className="space-y-12">
                <div className="flex gap-8 group">
                  <div className="w-16 h-16 flex-shrink-0 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                    <span className="material-symbols-outlined text-3xl">psychology</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Gensyn AEL (The Brain)</h4>
                    <p className="text-slate-400 text-sm font-light leading-relaxed">Runs real-time toxicity models on the mempool. It doesn't just guess—it produces a verifiable proof that a rug-pull is starting.</p>
                  </div>
                </div>
                <div className="flex gap-8 group">
                  <div className="w-16 h-16 flex-shrink-0 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                    <span className="material-symbols-outlined text-3xl">shield</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Uniswap v4 (The Sword)</h4>
                    <p className="text-slate-400 text-sm font-light leading-relaxed">Our custom WraithHook intercepts malicious swaps instantly, poisoning the attacker's path and arming the LP rescue gate.</p>
                  </div>
                </div>
                <div className="flex gap-8 group">
                  <div className="w-16 h-16 flex-shrink-0 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                    <span className="material-symbols-outlined text-3xl">bolt</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">Keeper Hub (The Hands)</h4>
                    <p className="text-slate-400 text-sm font-light leading-relaxed">Automated agents execute the flash-rescue bundle, moving your capital to safety in the very same block as the threat detection.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 blur-[120px] rounded-full"></div>
              <div className="relative aspect-square bg-slate-950 border border-white/10 rounded-[3rem] p-12 flex items-center justify-center overflow-hidden">
                <div className="text-center">
                  <div className="text-8xl font-black text-white mb-4 tracking-tighter">1</div>
                  <div className="text-2xl font-bold text-cyan-400 uppercase tracking-widest">BLOCK DEFENSE</div>
                  <div className="mt-8 text-slate-500 font-mono text-[10px] leading-tight max-w-[200px] mx-auto uppercase">
                    Detection. Verification. Poisoning. Rescue. All executed atomically.
                  </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-12 left-12 w-12 h-12 border-t-2 border-l-2 border-cyan-500/50"></div>
                <div className="absolute bottom-12 right-12 w-12 h-12 border-b-2 border-r-2 border-cyan-500/50"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Closing Billboard */}
        <section className="py-48 px-12 text-center bg-cyan-500 text-black">
          <h2 className="text-[100px] leading-[0.8] font-black tracking-tighter uppercase mb-12">
            YOUR LIQUIDITY <br />IS NOW IMMUNE
          </h2>
          <Link 
            href="/dashboard"
            className="inline-block px-16 py-6 bg-black text-white text-2xl font-black tracking-tight rounded-2xl hover:scale-105 transition-all shadow-2xl"
          >
            ENTER THE WRAITH GUARD
          </Link>
        </section>
      </main>

      <footer className="py-20 px-12 border-t border-white/5">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Wraith Logo" className="h-8 w-auto opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
            <div className="text-xl font-black tracking-tighter text-white uppercase">WRAITH PROTOCOL</div>
          </div>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Link href="/info" className="hover:text-cyan-400 transition-colors">Documentation</Link>
            <a href="https://github.com/ucEzette/Wraith" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://docs.gensyn.ai" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">Gensyn</a>
            <a href="https://docs.keeperhub.io" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">Keeper Hub</a>
            <a href="https://docs.uniswap.org" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors">Uniswap v4</a>
          </div>
          <div className="text-[10px] text-slate-600 font-mono">© 2026 WRAITH DEFENSE SYSTEMS</div>
        </div>
      </footer>
    </div>
  );
}
