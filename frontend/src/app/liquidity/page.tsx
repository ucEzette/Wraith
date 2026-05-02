"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useAccount, usePublicClient, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { toast } from "react-hot-toast";
import { useState, useEffect } from "react";
import { parseAbiItem, erc20Abi, parseUnits, keccak256, encodeAbiParameters, parseAbiParameters, stringToBytes } from "viem";
import {
  WRAITH_HOOK_ADDRESS,
  poolManagerConfig,
  modifyLiquidityTestConfig,
  MODIFY_LIQUIDITY_TEST_ADDRESS
} from "@/lib/contracts";

export default function LiquidityPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // State
  const [currency0, setCurrency0] = useState("");
  const [currency1, setCurrency1] = useState("");
  const [fee, setFee] = useState("3000");
  const [tickSpacing, setTickSpacing] = useState("60");
  const [initialPrice, setInitialPrice] = useState("79228162514264337593543950336"); // 1:1 price
  
  const [tickLower, setTickLower] = useState("-600");
  const [tickUpper, setTickUpper] = useState("600");
  const [liquidityDelta, setLiquidityDelta] = useState("1000000000000000000"); // 1 token (18 decimals)

  const [isLoading, setIsLoading] = useState(false);

  // Helper to ensure currency0 < currency1
  const orderTokens = (t0: string, t1: string) => {
    if (!t0 || !t1) return [t0, t1];
    return t0.toLowerCase() < t1.toLowerCase() ? [t0, t1] : [t1, t0];
  };

  const getPoolKey = () => {
    const [c0, c1] = orderTokens(currency0, currency1);
    return {
      currency0: c0 as `0x${string}`,
      currency1: c1 as `0x${string}`,
      fee: Number(fee),
      tickSpacing: Number(tickSpacing),
      hooks: WRAITH_HOOK_ADDRESS as `0x${string}`
    };
  };

  const handleInitialize = async () => {
    if (!currency0 || !currency1) {
      toast.error("Please provide both token addresses");
      return;
    }
    setIsLoading(true);
    try {
      const tx = await writeContractAsync({
        ...poolManagerConfig,
        functionName: 'initialize',
        args: [
          getPoolKey(),
          BigInt(initialPrice)
        ]
      } as any);
      
      toast.success("Pool Initialization Transaction Submitted!");
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
        toast.success("Pool Initialized Successfully!");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.shortMessage || e.message || "Failed to initialize pool");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (token: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const tx = await writeContractAsync({
        address: token as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [
          MODIFY_LIQUIDITY_TEST_ADDRESS as `0x${string}`,
          BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935") // Max uint256
        ]
      });
      toast.success(`Approval Transaction Submitted for ${token.slice(0, 8)}...`);
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
        toast.success(`Approved ${token.slice(0, 8)}!`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.shortMessage || e.message || "Failed to approve token");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLiquidity = async () => {
    if (!currency0 || !currency1) {
      toast.error("Please provide both token addresses");
      return;
    }
    setIsLoading(true);
    try {
      const salt = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const hookData = "0x";
      
      const tx = await writeContractAsync({
        ...modifyLiquidityTestConfig,
        functionName: 'modifyLiquidity',
        args: [
          getPoolKey(),
          {
            tickLower: Number(tickLower),
            tickUpper: Number(tickUpper),
            liquidityDelta: BigInt(liquidityDelta),
            salt: salt as `0x${string}`,
          },
          hookData as `0x${string}`
        ]
      } as any);

      toast.success("Add Liquidity Transaction Submitted!");
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
        toast.success("Liquidity Added Successfully!");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.shortMessage || e.message || "Failed to add liquidity");
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoTokens = () => {
    // USDC and WRAITH
    setCurrency0("0x31d0220469e10c4E71834a79b1f276d740d3768F");
    setCurrency1("0x9dA26648257a17bEB42d9464663b7b9Ce1c4f174");
  };

  return (
    <>
      <div className="scanlines"></div>
      {/* TopNavBar */}
      <nav className="bg-slate-950/60 backdrop-blur-md text-cyan-400 font-sans tracking-widest uppercase text-xs font-bold flex justify-between items-center px-12 h-20 fixed top-0 w-full z-50 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] max-w-[1440px] left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-12">
          <Link href="/">
            <img src="/logo.png" alt="Wraith Logo" className="h-12 w-auto cursor-pointer hover:drop-shadow-[0_0_10px_rgba(0,240,255,0.8)] transition-all" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 transition-all duration-300" href="/">Home</Link>
            <Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 transition-all duration-300" href="/dashboard">Dashboard</Link>
            <Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 transition-all duration-300" href="/protect">Protection</Link>
            <Link className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 transition-all duration-300" href="/sentinel">Sentinel</Link>
            <Link className="text-cyan-400 border-b border-cyan-400 pb-1 transition-all" href="/liquidity">Liquidity</Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </nav>

      <main className="max-w-[1440px] mx-auto px-12 pt-32 pb-24 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-screen">
        {/* Pool Configuration */}
        <div className="glass-panel rounded-lg p-8 flex flex-col gap-6 relative overflow-hidden h-fit">
           <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
             <span className="material-symbols-outlined text-9xl">water_drop</span>
           </div>
           
           <div>
             <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-2">
               <span className="material-symbols-outlined text-cyan-400">tune</span>
               Pool Configuration
             </h2>
             <p className="text-slate-400 text-sm mt-1">Define the v4 pool key parameters.</p>
           </div>

           <div className="grid grid-cols-1 gap-4 z-10">
              <div className="flex justify-between items-center">
                <label className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Currency 0</label>
                <button onClick={setDemoTokens} className="text-[10px] text-slate-500 hover:text-cyan-400 uppercase underline">Load Demo (USDC/WRAITH)</button>
              </div>
              <input 
                type="text" 
                value={currency0}
                onChange={(e) => setCurrency0(e.target.value)}
                placeholder="0x..." 
                className="w-full bg-black/50 border border-white/10 rounded-md p-3 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all"
              />

              <label className="text-xs text-cyan-400 uppercase tracking-widest font-bold mt-2">Currency 1</label>
              <input 
                type="text" 
                value={currency1}
                onChange={(e) => setCurrency1(e.target.value)}
                placeholder="0x..." 
                className="w-full bg-black/50 border border-white/10 rounded-md p-3 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all"
              />

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Fee (bps)</label>
                  <input 
                    type="number" 
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    className="w-full mt-1 bg-black/50 border border-white/10 rounded-md p-3 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Tick Spacing</label>
                  <input 
                    type="number" 
                    value={tickSpacing}
                    onChange={(e) => setTickSpacing(e.target.value)}
                    className="w-full mt-1 bg-black/50 border border-white/10 rounded-md p-3 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all"
                  />
                </div>
              </div>
           </div>

           <div className="mt-4 pt-6 border-t border-white/10 z-10">
              <h3 className="text-sm text-white font-bold mb-4 uppercase tracking-widest">1. Initialize Pool</h3>
              <label className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Initial sqrtPriceX96</label>
              <input 
                type="text" 
                value={initialPrice}
                onChange={(e) => setInitialPrice(e.target.value)}
                className="w-full mt-1 mb-4 bg-black/50 border border-white/10 rounded-md p-3 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all"
              />
              <button 
                onClick={handleInitialize}
                disabled={isLoading}
                className="w-full py-3 bg-cyan-500 text-black font-bold uppercase tracking-widest rounded-md hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLoading ? <span className="material-symbols-outlined animate-spin">refresh</span> : "Initialize Pool"}
              </button>
           </div>
        </div>

        {/* Liquidity Management */}
        <div className="glass-panel rounded-lg p-8 flex flex-col gap-6 relative overflow-hidden h-fit">
            <div>
             <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-2">
               <span className="material-symbols-outlined text-emerald-400">layers</span>
               Seed Liquidity
             </h2>
             <p className="text-slate-400 text-sm mt-1">Approve router and add liquidity.</p>
           </div>

           <div className="mt-2 z-10 border-b border-white/10 pb-6">
              <h3 className="text-sm text-white font-bold mb-4 uppercase tracking-widest">2. Approve Tokens</h3>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleApprove(currency0)}
                  disabled={isLoading || !currency0}
                  className="flex-1 py-3 bg-slate-800 text-white border border-white/10 font-bold uppercase tracking-widest rounded-md hover:bg-slate-700 hover:border-cyan-500 transition-all disabled:opacity-50"
                >
                  Approve Token 0
                </button>
                <button 
                  onClick={() => handleApprove(currency1)}
                  disabled={isLoading || !currency1}
                  className="flex-1 py-3 bg-slate-800 text-white border border-white/10 font-bold uppercase tracking-widest rounded-md hover:bg-slate-700 hover:border-cyan-500 transition-all disabled:opacity-50"
                >
                  Approve Token 1
                </button>
              </div>
           </div>

           <div className="z-10 mt-2">
              <h3 className="text-sm text-white font-bold mb-4 uppercase tracking-widest">3. Add Liquidity</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Tick Lower</label>
                  <input 
                    type="number" 
                    value={tickLower}
                    onChange={(e) => setTickLower(e.target.value)}
                    className="w-full mt-1 bg-black/50 border border-white/10 rounded-md p-3 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Tick Upper</label>
                  <input 
                    type="number" 
                    value={tickUpper}
                    onChange={(e) => setTickUpper(e.target.value)}
                    className="w-full mt-1 bg-black/50 border border-white/10 rounded-md p-3 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <label className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Liquidity Delta</label>
              <input 
                type="text" 
                value={liquidityDelta}
                onChange={(e) => setLiquidityDelta(e.target.value)}
                className="w-full mt-1 mb-6 bg-black/50 border border-white/10 rounded-md p-3 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all"
              />

              <button 
                onClick={handleAddLiquidity}
                disabled={isLoading}
                className="w-full py-3 bg-emerald-500 text-black font-bold uppercase tracking-widest rounded-md hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.5)] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLoading ? <span className="material-symbols-outlined animate-spin">refresh</span> : "Add Liquidity"}
              </button>
           </div>
        </div>
      </main>
    </>
  );
}
