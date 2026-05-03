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
  MODIFY_LIQUIDITY_TEST_ADDRESS,
  POOL_MANAGER_ADDRESS,
  USDC_ADDRESS,
  WRAITH_ADDRESS
} from "@/lib/contracts";

export default function LiquidityPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  // State - Defaulting to WRAITH/USDC pool
  const [currency0, setCurrency0] = useState(USDC_ADDRESS);
  const [currency1, setCurrency1] = useState(WRAITH_ADDRESS);
  const [fee, setFee] = useState("3000");
  const [tickSpacing, setTickSpacing] = useState("60");
  const [priceRatio, setPriceRatio] = useState("5000"); // 5000:1 ratio as per initialization
  
  // Calculate sqrtPriceX96 from user-friendly ratio
  const getInitialPrice = (ratioStr: string) => {
    try {
      const p = parseFloat(ratioStr);
      if (isNaN(p) || p <= 0) return "79228162514264337593543950336";
      const sqrt = Math.sqrt(p);
      const q96 = BigInt("79228162514264337593543950336"); // 2^96
      return (BigInt(Math.floor(sqrt * 1e18)) * q96 / BigInt(1e18)).toString();
    } catch {
      return "79228162514264337593543950336";
    }
  };
  
  const [tickLower, setTickLower] = useState("-60000");
  const [tickUpper, setTickUpper] = useState("60000");
  const [liquidityDelta, setLiquidityDelta] = useState("1000000"); // Start with a safe 6-decimal scale delta
  
  // Strategy presets
  const [strategy, setStrategy] = useState("balanced"); // 'balanced', 'wraith_only', 'usdc_only'
  const [humanAmount, setHumanAmount] = useState("10"); // Human readable token amount

  // Helper to ensure currency0 < currency1
  const orderTokens = (t0: string, t1: string) => {
    if (!t0 || !t1) return [t0, t1];
    return t0.toLowerCase() < t1.toLowerCase() ? [t0, t1] : [t1, t0];
  };

  const getPoolKey = () => {
    const [c0, c1] = orderTokens(currency0, currency1);
    return {
      currency0: (c0 || "0x0") as `0x${string}`,
      currency1: (c1 || "0x0") as `0x${string}`,
      fee: Number(fee),
      tickSpacing: Number(tickSpacing),
      hooks: WRAITH_HOOK_ADDRESS as `0x${string}`
    };
  };

  const poolKey = getPoolKey();

  const { data: symbol0 } = useReadContract({
    address: poolKey.currency0 !== "0x0" ? poolKey.currency0 : undefined,
    abi: erc20Abi,
    functionName: 'symbol',
  });

  const { data: symbol1 } = useReadContract({
    address: poolKey.currency1 !== "0x0" ? poolKey.currency1 : undefined,
    abi: erc20Abi,
    functionName: 'symbol',
  });

  const { data: decimals0 } = useReadContract({
    address: poolKey.currency0 !== "0x0" ? poolKey.currency0 : undefined,
    abi: erc20Abi,
    functionName: 'decimals',
  });

  const { data: decimals1 } = useReadContract({
    address: poolKey.currency1 !== "0x0" ? poolKey.currency1 : undefined,
    abi: erc20Abi,
    functionName: 'decimals',
  });

  // Calculate under the hood L based on strategy and human amount
  useEffect(() => {
    try {
      const amt = parseFloat(humanAmount);
      if (isNaN(amt) || amt <= 0) return;

      const pa = Math.pow(1.0001, Number(tickLower));
      const pb = Math.pow(1.0001, Number(tickUpper));
      const spa = Math.sqrt(pa);
      const spb = Math.sqrt(pb);
      const sp = 1.0; // Assume tick 0

      const d0 = decimals0 !== undefined ? Number(decimals0) : 6;
      const d1 = decimals1 !== undefined ? Number(decimals1) : 18;

      if (strategy === "token1_only") {
        // Token 1 only
        const wei = amt * Math.pow(10, d1);
        const l = wei / (spb - spa);
        setLiquidityDelta(BigInt(Math.floor(l)).toString());
      } else if (strategy === "token0_only") {
        // Token 0 only
        const wei = amt * Math.pow(10, d0);
        const l = wei * (spb * spa) / (spb - spa);
        setLiquidityDelta(BigInt(Math.floor(l)).toString());
      } else {
        // Balanced (safe delta)
        setLiquidityDelta(BigInt(Math.floor(amt * 1e6)).toString()); 
      }
    } catch(e) {}
  }, [strategy, humanAmount, tickLower, tickUpper, decimals0, decimals1]);

  const handleStrategyChange = (s: string) => {
    setStrategy(s);
    if (s === "balanced") {
      setTickLower("-600");
      setTickUpper("600");
      setHumanAmount("100"); // Safe L
    } else if (s === "token1_only") {
      setTickLower("-1200");
      setTickUpper("-60"); // Below tick 0
      setHumanAmount("50000"); // 50k Token 1
    } else if (s === "token0_only") {
      setTickLower("60");
      setTickUpper("1200"); // Above tick 0
      setHumanAmount("10"); // 10 Token 0
    }
  };

  const [isLoading, setIsLoading] = useState(false);
  const [txHistory, setTxHistory] = useState<Array<{hash: string, type: string, timestamp: number}>>([]);

  useEffect(() => {
    if (!address) {
      setTxHistory([]);
      return;
    }
    
    const fetchHistory = async () => {
      try {
        const res = await fetch(`https://unichain-sepolia.blockscout.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc`);
        const data = await res.json();
        
        if (data && data.status === "1" && Array.isArray(data.result)) {
          const pmAddress = POOL_MANAGER_ADDRESS.toLowerCase();
          const mltAddress = MODIFY_LIQUIDITY_TEST_ADDRESS.toLowerCase();
          
          const formattedHistory = data.result
            .filter((tx: any) => tx.isError === "0")
            .map((tx: any) => {
              const to = tx.to ? tx.to.toLowerCase() : "";
              const input = tx.input ? tx.input.toLowerCase() : "";
              let type = "";

              if (to === pmAddress) {
                if (input.startsWith("0x02b46765") || input.startsWith("0x61446ff7")) {
                  type = "Initialize Pool";
                }
              } else if (to === mltAddress) {
                type = "Seed Liquidity";
              } else if (input.startsWith("0x095ea7b3")) {
                type = "Approve Token";
              }

              if (type !== "") {
                return {
                  hash: tx.hash,
                  type,
                  timestamp: parseInt(tx.timeStamp) * 1000
                };
              }
              return null;
            })
            .filter(Boolean);
            
          setTxHistory(formattedHistory as any);
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 10000); // Auto-sync every 10s
    return () => clearInterval(interval);
  }, [address]);

  // Optimistic UI update
  const addHistory = (hash: string, type: string) => {
    setTxHistory(prev => {
      if (prev.some(t => t.hash === hash)) return prev;
      return [{ hash, type, timestamp: Date.now() }, ...prev];
    });
  };


  // Note: getPoolKey was moved up

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
          BigInt(getInitialPrice(priceRatio))
        ]
      } as any);
      
      toast.success("Pool Initialization Transaction Submitted!");
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: tx });
        toast.success("Pool Initialized Successfully!");
        addHistory(tx, "Initialize Pool");
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
        addHistory(tx, `Approve ${token.slice(0, 4)}...`);
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
        addHistory(tx, "Seed Liquidity");
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
              <h3 className="text-sm text-white font-bold mb-4 uppercase tracking-widest">1. Initialize Pool (Skip if Pool Exists)</h3>
              <label className="text-xs text-cyan-400 uppercase tracking-widest font-bold">Initial Price Ratio (Token 1 per Token 0)</label>
              <input 
                type="number" 
                value={priceRatio}
                onChange={(e) => setPriceRatio(e.target.value)}
                placeholder="1"
                className="w-full mt-1 bg-black/50 border border-white/10 rounded-md p-3 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500 font-mono mt-1 mb-4">Under the hood sqrtPriceX96: {getInitialPrice(priceRatio)}</p>
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

              <div className="mb-6">
                <div className="flex gap-2 mb-4">
                  <button 
                    onClick={() => handleStrategyChange("balanced")}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded transition-all ${strategy === 'balanced' ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >Balanced</button>
                  <button 
                    onClick={() => handleStrategyChange("token1_only")}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded transition-all ${strategy === 'token1_only' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >{symbol1 ? `${symbol1 as string} Only` : 'Token 1 Only'}</button>
                  <button 
                    onClick={() => handleStrategyChange("token0_only")}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded transition-all ${strategy === 'token0_only' ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >{symbol0 ? `${symbol0 as string} Only` : 'Token 0 Only'}</button>
                </div>

                <label className="text-xs text-cyan-400 uppercase tracking-widest font-bold">
                  {strategy === 'token1_only' ? `${symbol1 || 'Token 1'} Amount` : strategy === 'token0_only' ? `${symbol0 || 'Token 0'} Amount` : 'Liquidity Scale (Balanced)'}
                </label>
                <input 
                  type="text" 
                  value={humanAmount}
                  onChange={(e) => setHumanAmount(e.target.value)}
                  className="w-full mt-1 bg-black/50 border border-white/10 rounded-md p-3 text-white font-mono text-sm focus:border-cyan-400 focus:outline-none transition-all"
                />
                
                <div className="mt-4 p-3 bg-black/30 border border-white/5 rounded">
                  <p className="text-[10px] text-slate-400 font-mono flex justify-between">
                    <span>Under the hood Delta:</span>
                    <span className="text-emerald-400">{liquidityDelta}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 flex justify-between">
                    <span>Tick Range:</span>
                    <span className="text-cyan-400">[{tickLower}, {tickUpper}]</span>
                  </p>
                </div>
              </div>

              <button 
                onClick={handleAddLiquidity}
                disabled={isLoading}
                className="w-full py-3 bg-emerald-500 text-black font-bold uppercase tracking-widest rounded-md hover:bg-emerald-400 hover:shadow-[0_0_15px_rgba(52,211,153,0.5)] transition-all disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLoading ? <span className="material-symbols-outlined animate-spin">refresh</span> : "Add Liquidity"}
              </button>
           </div>
        </div>

        {/* Transaction History Panel */}
        <div className="md:col-span-2 glass-panel rounded-lg p-8 relative overflow-hidden h-fit">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400">history</span>
              Liquidity Operation History (Proof)
            </h2>
          </div>
          
          <div className="space-y-4">
            {txHistory.length === 0 ? (
              <div className="text-slate-500 font-mono text-sm uppercase">No operations recorded yet.</div>
            ) : (
              txHistory.map((tx, idx) => (
                <div key={idx} className="bg-slate-900/40 border border-white/5 p-4 rounded-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded uppercase tracking-widest ${tx.type.includes('Seed') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'}`}>
                      {tx.type}
                    </span>
                    <span className="text-slate-400 text-xs font-mono">
                      {new Date(tx.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <a 
                    href={`https://unichain-sepolia.blockscout.com/tx/${tx.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 font-mono text-sm underline flex items-center gap-1"
                  >
                    {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </>
  );
}
