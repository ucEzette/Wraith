"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";

import { useReadContract, usePublicClient, useWriteContract } from "wagmi";
import { useState, useEffect } from "react";
import { parseAbiItem } from "viem";
import {
  WRAITH_HOOK_ADDRESS,
  wraithHookConfig,
  POOL_MANAGER_ADDRESS,
  poolManagerConfig,
} from "../lib/contracts";
import { erc20Abi } from "viem";
import { CommandTerminal } from "../components/CommandTerminal";
import { AlertSystem, Alert } from "../components/AlertSystem";
import { useRef } from "react";

export default function DashboardPage() {
  const { address } = useAccount(); // Need to import useAccount too

  const [targetPoolId, setTargetPoolId] = useState("");
  const [newPoolId, setNewPoolId] = useState("");
  const [resolvedName, setResolvedName] = useState("");
  const [monitoredPools, setMonitoredPools] = useState<any[]>([]);
  const [poolData, setPoolData] = useState<
    Record<string, { toxicity: number; isArmed: boolean }>
  >({});

  // Live Data Fetching for focused pool (large gauge)
  const { data: liveScore } = useReadContract({
    ...wraithHookConfig,
    functionName: "toxicityScores",
    args: [targetPoolId as `0x${string}`],
    query: {
      enabled: targetPoolId?.length === 66,
      refetchInterval: 5000,
    },
  });

  const { data: isArmed } = useReadContract({
    ...wraithHookConfig,
    functionName: "isArmedPool",
    args: [targetPoolId as `0x${string}`],
    query: {
      enabled: targetPoolId?.length === 66,
      refetchInterval: 5000,
    },
  });

  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [isAutoExitEnabled, setIsAutoExitEnabled] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [rescueVault, setRescueVault] = useState("");
  const [rescueToken, setRescueToken] = useState(
    "0x31d0220469e10c4E71834a79b1f276d740d3768F",
  ); // USDC default
  const [isOperatorApproved, setIsOperatorApproved] = useState(false);
  const [rescueHistory, setRescueHistory] = useState<any[]>([]);

  // Terminal & Alert State
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const seenAlerts = useRef<Set<string>>(new Set());

  const { writeContractAsync } = useWriteContract();

  const handleToggleAutoExit = async () => {
    if (!address) return;

    try {
      const newEnabled = !isAutoExitEnabled;

      // Step 1: If enabling auto-exit, grant operator permission first
      if (newEnabled && !isOperatorApproved) {
        const approvalTx = await writeContractAsync({
          ...poolManagerConfig,
          functionName: "setOperator",
          args: [WRAITH_HOOK_ADDRESS as `0x${string}`, true],
        } as any);

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approvalTx });
        }
        setIsOperatorApproved(true);
      }

      // Step 2: Register on WraithHook
      const vault = rescueVault || address;
      const threshold = 8500n; // 85% default

      await writeContractAsync({
        ...wraithHookConfig,
        functionName: "registerWraithGuard",
        args: [
          vault as `0x${string}`,
          threshold,
          rescueToken as `0x${string}`,
          newEnabled,
        ],
      } as any);

      setIsAutoExitEnabled(newEnabled);
      setIsRegistered(true);
      alert(
        `Quantum Auto-Exit ${newEnabled ? "Enabled" : "Disabled"} successfully!`,
      );
    } catch (e: any) {
      console.error(e);
      if (e.message?.includes("AlreadyRegistered")) {
        setIsRegistered(true);
        alert(
          "You are already registered. Use the Protection page to update your settings.",
        );
      } else {
        alert("Transaction failed: " + (e.shortMessage || e.message));
      }
    }
  };

  const [stats, setStats] = useState({
    attacksBlocked: 0,
    valueRescued: 0,
    activeGuards: 0,
    currentBlock: 0n,
  });

  const publicClient = usePublicClient();

  const getRegistryName = (id: string) => {
    const registry: Record<string, string> = {
      // Latest deployment (WraithHook 0xD56388a4ce5Cd9E236201AD3DF27Edfbb28E0280)
      "0x7a207acaddeb221078ce37512f88e050c2bceecc95f5e7ae7527830b8e0e5734":
        "ETH / USDC",
      "0xa869e4cae78878d6a85917f3e3556c307c18c8e6d1112d04625f16ff77655b2f":
        "QPHAN / USDC",
      "0xafd44b0172fc530c071d599a1832e335e9e4444eb03cdbe6e10b7c584e383a45":
        "ECHO / USDC",
      "0xbf4bf38f15e9235195e7fe78f4f789a6f5cbd1625fc7e47d5485bfd0f44aeee2":
        "WRAITH / USDC",
      // Previous IDs
      "0x7515fdadafd1f8154c328b5832264fde3e9d25289920bfaadc0f4661d81adafd":
        "ETH / eiETH",
      "0xdd466e67e58989e504c8651a24d27e1d5838d6438676239f8f2d579298495570":
        "WETH / USDC",
    };
    return registry[id.toLowerCase()];
  };

  const getStorageKey = () =>
    address
      ? `wraith_monitored_pools_${address.toLowerCase()}`
      : "wraith_monitored_pools_global";

  const getTokenSymbol = async (tokenAddress: string) => {
    if (tokenAddress === "0x0000000000000000000000000000000000000000")
      return "ETH";
    try {
      const symbol = await (publicClient as any)?.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "symbol",
      });
      return symbol as string;
    } catch (e) {
      return tokenAddress.slice(0, 6);
    }
  };

  const resolvePoolOnChain = async (id: string) => {
    const regName = getRegistryName(id);
    if (regName) return regName;

    try {
      const currentBlock = await publicClient?.getBlockNumber();
      const logs = await (publicClient as any)?.getLogs({
        address: POOL_MANAGER_ADDRESS as `0x${string}`,
        event: parseAbiItem(
          "event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks, uint160 sqrtPriceX96, int24 tick)",
        ) as any,
        args: { id: id as `0x${string}` } as any,
        fromBlock: currentBlock && currentBlock > 10000n ? currentBlock - 10000n : 0n,
      });

      if (logs && logs.length > 0) {
        const l = logs[0] as { args: { currency0: string; currency1: string } };
        const c0 = l.args.currency0;
        const c1 = l.args.currency1;
        const s0 = await getTokenSymbol(c0);
        const s1 = await getTokenSymbol(c1);
        return `${s0} / ${s1}`;
      }
    } catch (err) {
      console.error("On-chain resolution failed:", err);
    }
    return "UNKNOWN POOL";
  };

  useEffect(() => {
    const fetchName = async () => {
      if (newPoolId.length === 66) {
        const name = await resolvePoolOnChain(newPoolId);
        setResolvedName(name);
      } else {
        setResolvedName("");
      }
    };
    fetchName();
  }, [newPoolId]);

  const handleAddPool = async (id: string) => {
    if (!id || id.length !== 66) return;
    const key = getStorageKey();
    const savedPoolsJson = localStorage.getItem(key);
    let currentPools: any[] = [];
    if (savedPoolsJson) {
      try {
        currentPools = JSON.parse(savedPoolsJson);
      } catch (e) {}
    }

    const pair = resolvedName || (await resolvePoolOnChain(id));
    const existingIndex = currentPools.findIndex((p) =>
      typeof p === "string" ? p === id : p.id === id,
    );

    if (existingIndex === -1) {
      currentPools.push({ id, pair });
    } else {
      currentPools[existingIndex] = { id, pair };
    }

    localStorage.setItem(key, JSON.stringify(currentPools));

    // Remove from hidden list if re-added manually
    const hiddenKey = "wraith_hidden_pools";
    const hiddenPoolsJson = localStorage.getItem(hiddenKey);
    if (hiddenPoolsJson) {
      try {
        let hiddenPools = JSON.parse(hiddenPoolsJson);
        if (hiddenPools.includes(id)) {
          hiddenPools = hiddenPools.filter((p: string) => p !== id);
          localStorage.setItem(hiddenKey, JSON.stringify(hiddenPools));
        }
      } catch (e) {}
    }

    setMonitoredPools(
      currentPools.map((p: any) =>
        typeof p === "string"
          ? { id: p, pair: getRegistryName(p) || "UNKNOWN" }
          : p,
      ),
    );
    setTargetPoolId(id);
    localStorage.setItem("wraith_focused_pool", id);
    setNewPoolId("");
    setResolvedName("");
    syncAll();
  };

  const handleRemoveMonitor = (id: string) => {
    const key = getStorageKey();
    const savedPoolsJson = localStorage.getItem(key);
    let currentPools: any[] = [];
    if (savedPoolsJson) {
      try {
        currentPools = JSON.parse(savedPoolsJson);
      } catch (e) {}
    }
    const updatedPools = currentPools.filter((p) =>
      typeof p === "string" ? p !== id : p.id !== id,
    );
    localStorage.setItem(key, JSON.stringify(updatedPools));
    
    // PERMANENT FIX: Track hidden pools to prevent auto-discovery from re-adding them
    const hiddenKey = "wraith_hidden_pools";
    const hiddenPoolsJson = localStorage.getItem(hiddenKey);
    let hiddenPools: string[] = [];
    if (hiddenPoolsJson) {
      try { hiddenPools = JSON.parse(hiddenPoolsJson); } catch (e) {}
    }
    if (!hiddenPools.includes(id)) {
      hiddenPools.push(id);
      localStorage.setItem(hiddenKey, JSON.stringify(hiddenPools));
    }

    setMonitoredPools(
      updatedPools.map((p: any) =>
        typeof p === "string"
          ? { id: p, pair: getRegistryName(p) || "UNKNOWN" }
          : p,
      ),
    );

    toast.success("Monitor Removed Successfully");

    if (targetPoolId === id) {
      const nextId =
        updatedPools.length > 0
          ? typeof updatedPools[0] === "string"
            ? updatedPools[0]
            : updatedPools[0].id
          : "";
      setTargetPoolId(nextId);
      if (nextId) localStorage.setItem("wraith_focused_pool", nextId);
      else localStorage.removeItem("wraith_focused_pool");
    }
    syncAll();
  };

  const syncAll = async () => {
    if (!publicClient) return;
    try {
      const currentBlock = await publicClient.getBlockNumber();

      const toxicityLogs = await (publicClient as any).getLogs({
        address: WRAITH_HOOK_ADDRESS as `0x${string}`,
        event: parseAbiItem(
          "event ToxicityUpdated(bytes32 indexed poolId, uint256 score, bytes32 proofHash)",
        ) as any,
        fromBlock: currentBlock > 500n ? currentBlock - 500n : 0n,
      });

      const exitLogs = await (publicClient as any).getLogs({
        address: WRAITH_HOOK_ADDRESS as `0x${string}`,
        event: parseAbiItem(
          "event QuantumExitTriggered(bytes32 indexed poolId, address indexed user, address rescueToken, uint256 amount0, uint256 amount1)",
        ) as any,
        fromBlock: currentBlock > 500n ? currentBlock - 500n : 0n,
      });

      setStats({
        attacksBlocked: exitLogs.length,
        valueRescued:
          exitLogs.reduce(
            (acc: any, log: any) =>
              acc +
              Number(log.args.amount0 || 0n) +
              Number(log.args.amount1 || 0n),
            0,
          ) / 1e18,
        activeGuards: 12 + exitLogs.length,
        currentBlock,
      });

      const allEvents = [
        ...toxicityLogs.slice(-10).map((l: any) => ({
          type: "ToxicityUpdated",
          time: "RECENT",
          msg: `Pool ${l.args.poolId?.slice(0, 8)} toxicity updated to ${(Number(l.args.score) / 100).toFixed(1)}%.`,
          icon: "warning",
          color: "text-error",
          ts: Date.now(),
          poolId: l.args.poolId,
        })),
        ...exitLogs.slice(-10).map((l: any) => ({
          type: "QuantumExitTriggered",
          time: "RECENT",
          msg: `Emergency rescue triggered for user ${l.args.user?.slice(0, 8)}.`,
          icon: "bolt",
          color: "text-tertiary-fixed-dim",
          ts: Date.now(),
          poolId: l.args.poolId,
        })),
      ].sort((a, b) => b.ts - a.ts);

      setLiveEvents(allEvents.slice(0, 10));

      const discoveredPoolIds = Array.from(
        new Set(
          toxicityLogs.map((l: any) => l.args.poolId as string).filter(Boolean),
        ),
      );

      const registrationLogs = address
        ? await (async () => {
            const logs = [];
            let start = 50680000n;
            while (start < currentBlock) {
              const end = start + 9999n > currentBlock ? currentBlock : start + 9999n;
              const chunk = await (publicClient as any).getLogs({
                address: WRAITH_HOOK_ADDRESS as `0x${string}`,
                event: parseAbiItem(
                  "event WraithGuardRegistered(address indexed user, bytes32 indexed poolId, address vault)",
                ) as any,
                args: { user: address } as any,
                fromBlock: start,
                toBlock: end,
              });
              logs.push(...chunk);
              start = end + 1n;
            }
            return logs;
          })()
        : [];

      const registeredPoolIds = registrationLogs.map(
        (l: any) => l.args.poolId as string,
      );

      const sKey = getStorageKey();
      const savedPoolsJson = localStorage.getItem(sKey);
      let currentPools: any[] = [];
      if (savedPoolsJson) {
        try {
          currentPools = JSON.parse(savedPoolsJson);
        } catch (e) {}
      }

      let changed = false;
      const hiddenKey = "wraith_hidden_pools";
      const hiddenPoolsJson = localStorage.getItem(hiddenKey);
      let hiddenPools: string[] = [];
      if (hiddenPoolsJson) {
        try { hiddenPools = JSON.parse(hiddenPoolsJson); } catch (e) {}
      }
      for (const id of discoveredPoolIds) {
        if (
          id &&
          !hiddenPools.includes(id as string) && 
          !currentPools.some((p) =>
            typeof p === "string" ? p === id : p.id === id,
          )
        ) {
          const pair = await resolvePoolOnChain(id as string);
          currentPools.push({ id, pair });
          changed = true;
        }
      }
      for (const id of registeredPoolIds) {
        if (
          id &&
          !currentPools.some((p) =>
            typeof p === "string" ? p === id : p.id === id,
          )
        ) {
          const pair = await resolvePoolOnChain(id);
          currentPools.push({ id, pair });
          changed = true;
        }
      }
      const eiETH =
        "0x7515fdadafd1f8154c328b5832264fde3e9d25289920bfaadc0f4661d81adafd";
      if (
        !currentPools.some((p) =>
          typeof p === "string" ? p === eiETH : p.id === eiETH,
        )
      ) {
        currentPools.push({ id: eiETH, pair: "ETH / eiETH" });
        changed = true;
      }

      // Re-resolve any RESOLVING... names and ensure we have pairs
      const mappedPools = await Promise.all(
        currentPools.map(async (p: any) => {
          const id = typeof p === "string" ? p : p.id;
          let pair = typeof p === "object" && p.pair ? p.pair : "";
          if (!pair || pair === "RESOLVING...") {
             pair = getRegistryName(id) || await resolvePoolOnChain(id);
          }
          return { id, pair };
        }),
      );

      // ALWAYS save the state if we have resolved new names or added new pools
      localStorage.setItem(sKey, JSON.stringify(mappedPools));
      setMonitoredPools(mappedPools);

      // Fetch registration status
      if (address) {
        try {
          const registered = await (publicClient as any).readContract({
            ...wraithHookConfig,
            functionName: "isWraithGuard",
            args: [address as `0x${string}`],
          } as any);
          setIsRegistered(registered as boolean);

          if (registered) {
            const autoExit = await (publicClient as any).readContract({
              ...wraithHookConfig,
              functionName: "userAutoExit",
              args: [address as `0x${string}`],
            } as any);
            setIsAutoExitEnabled(autoExit as boolean);
          }

          const operatorApproved = await (publicClient as any).readContract({
            ...poolManagerConfig,
            functionName: "isOperator",
            args: [
              address as `0x${string}`,
              WRAITH_HOOK_ADDRESS as `0x${string}`,
            ],
          } as any);
          setIsOperatorApproved(operatorApproved as boolean);
        } catch (e) {}
      }

      // Fetch User's Rescue History
      if (address) {
        const userExitLogs = await (async () => {
          const logs = [];
          let start = 50680000n;
          while (start < currentBlock) {
            const end = start + 9999n > currentBlock ? currentBlock : start + 9999n;
            const chunk = await publicClient.getLogs({
              address: WRAITH_HOOK_ADDRESS as `0x${string}`,
              event: parseAbiItem(
                "event QuantumExitTriggered(bytes32 indexed poolId, address indexed user, address rescueToken, uint256 amount0, uint256 amount1)",
              ),
              args: { user: address },
              fromBlock: start,
              toBlock: end,
            });
            logs.push(...chunk);
            start = end + 1n;
          }
          return logs;
        })();

        const history = userExitLogs.map((l: any) => ({
          id: l.args.poolId,
          pair: getRegistryName(l.args.poolId) || "Unknown",
          amount: (Number(l.args.amount0 || 0n) + Number(l.args.amount1 || 0n)) / 1e18,
          txHash: l.transactionHash,
          time: "COMPLETED"
        }));
        setRescueHistory(history);
      }

      // Fetch live data for all monitored pools (toxicity/armed status)
      const newData: Record<string, { toxicity: number; isArmed: boolean }> = {};
      for (const pool of mappedPools) {
        try {
            const [score, armed] = await Promise.all([
              (publicClient as any).readContract({
                ...wraithHookConfig,
                functionName: "toxicityScores",
                args: [pool.id as `0x${string}`],
              } as any),
              (publicClient as any).readContract({
                ...wraithHookConfig,
                functionName: "isArmedPool",
                args: [pool.id as `0x${string}`],
              } as any),
            ]);
          newData[pool.id] = {
            toxicity: Number(score as bigint) / 100,
            isArmed: armed as boolean,
          };
        } catch (e) {}
      }
      setPoolData(newData);

    } catch (err) {
      console.error("Dashboard sync error:", err);
    }
  };

  useEffect(() => {
    // MIGRATION
    if (address) {
      const globalKey = "wraith_monitored_pools";
      const addressKey = getStorageKey();
      const globalSaved = localStorage.getItem(globalKey);
      const addressSaved = localStorage.getItem(addressKey);

      if (globalSaved && !addressSaved) {
        localStorage.setItem(addressKey, globalSaved);
        localStorage.removeItem(globalKey);
      }
    }

    if (!publicClient) return;

    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMonitoredPools(
          parsed.map((p: any) =>
            typeof p === "string"
              ? { id: p, pair: getRegistryName(p) || "RESOLVING..." }
              : p,
          ),
        );
      } catch (e) {}
    }

    const savedFocused = localStorage.getItem("wraith_focused_pool");
    if (savedFocused) setTargetPoolId(savedFocused);

    syncAll();
    const interval = setInterval(syncAll, 10000);
    return () => clearInterval(interval);
  }, [publicClient, address]);

  // Alert Monitoring Loop
  useEffect(() => {
    Object.entries(poolData).forEach(([id, data]) => {
      if (data.toxicity > 85 && !seenAlerts.current.has(id)) {
        const newAlert: Alert = {
          id: Math.random().toString(36).substring(7),
          poolId: id,
          toxicity: data.toxicity,
          time: new Date().toLocaleTimeString(),
          isRead: false
        };
        setAlerts(prev => [newAlert, ...prev]);
        seenAlerts.current.add(id);
        
        toast.error(`CRITICAL TOXICITY: Pool ${id.slice(0, 8)} at ${data.toxicity.toFixed(1)}%`, {
          icon: '⚠️',
          duration: 6000,
          style: {
            background: '#020617',
            color: '#ef4444',
            border: '1px solid #ef4444'
          }
        });

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Wraith Protocol Alert", {
            body: `Critical toxicity detected in pool ${id.slice(0, 8)}`,
            icon: "/logo.png"
          });
        }
      } else if (data.toxicity < 70) {
        seenAlerts.current.delete(id);
      }
    });
  }, [poolData]);

  const handleCommandExecute = async (cmd: string) => {
    const args = cmd.split(' ');
    const action = args[0].toLowerCase();
    const val = args[1];

    switch(action) {
      case 'help':
        return "Commands: \n- add <id>     : Monitor a pool\n- score <id>   : Fetch on-chain toxicity\n- armed <id>   : Check armed status\n- focus <id>   : Select for main view\n- logs <n>     : Show last N events\n- status       : System health\n- alerts       : Open notifications\n- clear        : Reset buffer";
      case 'add':
        if (!val) return "ERR: Missing Pool ID";
        await handleAddPool(val);
        return `OK: Pool ${val.slice(0, 10)}... registered.`;
      case 'score':
        if (!val) return "ERR: Missing Pool ID";
        try {
          const score = await (publicClient as any)?.readContract({
            ...wraithHookConfig,
            functionName: 'toxicityScores',
            args: [val as `0x${string}`]
          });
          return `ON-CHAIN SCORE [${val.slice(0, 8)}]: ${(Number(score) / 100).toFixed(2)}%`;
        } catch (e) { return `ERR: Failed to fetch score for ${val.slice(0, 8)}`; }
      case 'armed':
        if (!val) return "ERR: Missing Pool ID";
        try {
          const armed = await (publicClient as any)?.readContract({
            ...wraithHookConfig,
            functionName: 'isArmedPool',
            args: [val as `0x${string}`]
          });
          return `ARM STATUS [${val.slice(0, 8)}]: ${armed ? 'ACTIVE (ARMED)' : 'STANDBY'}`;
        } catch (e) { return `ERR: Failed to fetch status for ${val.slice(0, 8)}`; }
      case 'focus':
        if (!val) return "ERR: Missing Pool ID";
        handleFocusMonitor(val);
        return `OK: Focusing ${val.slice(0, 10)}...`;
      case 'remove':
        if (!val) return "ERR: Missing Pool ID";
        handleRemoveMonitor(val);
        return `OK: Pool ${val.slice(0, 10)} removed.`;
      case 'status':
        return `SYSTEM STATUS: OK\n- BLOCK: ${stats.currentBlock}\n- MONITOR_COUNT: ${monitoredPools.length}\n- ARM_STATUS: ${displayArmed ? 'ACTIVE' : 'STANDBY'}\n- SYNC: 100% (LOCAL_RPC)`;
      case 'logs':
        const count = parseInt(val) || 5;
        const events = liveEvents.slice(0, count);
        return events.length > 0 ? 
          events.map(e => `[${e.time}] ${e.type}: ${e.msg}`).join('\n') :
          "NO RECENT EVENTS DETECTED.";
      case 'alerts':
        setIsAlertsOpen(true);
        return "OK: Opening alert dashboard.";
      case 'clear':
        return "OK: Terminal buffer cleared.";
      default:
        return `ERR: Unknown command '${action}'. Type 'help' for options.`;
    }
  };

  const handleFocusMonitor = (id: string) => {
    setTargetPoolId(id);
    localStorage.setItem("wraith_focused_pool", id);
  };

  const displayScore =
    liveScore !== undefined ? (Number(liveScore) / 100).toFixed(0) : 0;
  const displayArmed = isArmed ?? false;

  return (
    <>
      {/* Global Scanlines */}
      <div className="scanlines"></div>
      {/* TopNavBar (Shared Component) */}
      <nav className="bg-slate-950/60 backdrop-blur-md text-cyan-400 font-sans tracking-widest uppercase text-xs font-bold docked full-width top-0 border-b-[0.5px] border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] fixed top-0 left-0 w-full z-[100] flex justify-between items-center px-12 h-20 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-xl">
          <div className="flex items-center">
            <img src="/logo.png" alt="Wraith Logo" className="h-12 w-auto" />
          </div>
          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-lg">
            <Link
              className="text-cyan-400 border-b border-cyan-400 pb-1 transition-all"
              href="/"
            >
              Dashboard
            </Link>
            <Link
              className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300"
              href="/protect"
            >
              Protection
            </Link>
            <Link
              className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300"
              href="/sentinel"
            >
              Sentinel
            </Link>
            <Link
              className="text-slate-400 hover:text-cyan-200 pb-1 hover:bg-cyan-400/10 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all duration-300 flex items-center gap-1"
              href="/info"
            >
              <span className="material-symbols-outlined text-[16px]">help</span>
              How it Works
            </Link>
          </div>
        </div>
        {/* Trailing Actions */}
        <div className="flex items-center gap-lg">
          <div className="flex items-center gap-sm relative">
            <div className="relative">
              <span 
                className={`material-symbols-outlined text-[18px] cursor-pointer hover:text-cyan-200 transition-colors ${alerts.some(a => !a.isRead) ? 'text-cyan-400' : ''}`}
                onClick={() => setIsAlertsOpen(!isAlertsOpen)}
              >
                notifications
              </span>
              {alerts.some(a => !a.isRead) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
              )}
              
              <AlertSystem 
                alerts={alerts}
                isOpen={isAlertsOpen}
                onClose={() => setIsAlertsOpen(false)}
                onMarkRead={(id) => setAlerts(prev => prev.map(a => a.id === id ? {...a, isRead: true} : a))}
                onClearAll={() => { setAlerts([]); seenAlerts.current.clear(); }}
              />
            </div>

            <span 
              className="material-symbols-outlined text-[18px] cursor-pointer hover:text-cyan-200 transition-colors"
              onClick={() => setIsTerminalOpen(true)}
            >
              terminal
            </span>
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
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          ></div>
          <div className="flex items-center gap-md relative z-10">
            <div className="flex items-center gap-base">
              <div className="w-3 h-3 rounded-full bg-primary-container shadow-[0_0_8px_rgba(0,240,255,0.6)]"></div>
              <span className="font-label-caps text-label-caps text-primary-container uppercase tracking-widest">
                System Online
              </span>
            </div>
            <div className="h-4 w-[1px] bg-white/20"></div>
            <div className="flex items-center gap-xs font-mono-data text-mono-data text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px]">
                view_in_ar
              </span>
              <span>BLK: {stats.currentBlock.toString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-lg relative z-10">
            <div className="flex flex-col items-end">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                Pools Monitored
              </span>
              <span className="font-mono-data text-mono-data text-on-surface text-[18px]">
                {monitoredPools.length}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                TVL Protected
              </span>
              <span className="font-mono-data text-mono-data text-primary-container text-[18px]">
                ${(stats.valueRescued * 1.5).toFixed(1)}M
              </span>
            </div>
          </div>
        </div>

        {/* Left Column: Stats & Data */}
        <div className="col-span-1 md:col-span-8 flex flex-col gap-gutter">
          {/* 4 Stat Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
            <div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                Attacks Blocked
              </span>
              <div className="flex items-end justify-between">
                <span className="font-display-xl text-display-xl text-on-surface">
                  {stats.attacksBlocked}
                </span>
                <span className="font-mono-data text-[12px] text-primary-container">
                  +{stats.attacksBlocked} 24h
                </span>
              </div>
            </div>
            <div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                Value Rescued
              </span>
              <div className="flex items-end justify-between">
                <span className="font-display-xl text-display-xl text-on-surface text-[32px] md:text-display-xl">
                  ${stats.valueRescued.toFixed(2)}M
                </span>
              </div>
            </div>
            <div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                MEV Captured
              </span>
              <div className="flex items-end justify-between">
                <span className="font-display-xl text-display-xl text-on-surface text-[32px] md:text-display-xl">
                  {(stats.attacksBlocked * 0.4).toFixed(1)} Ξ
                </span>
              </div>
            </div>
            <div className="glass-panel rounded-lg p-md flex flex-col justify-between min-h-[120px] hover:border-primary-container/30 transition-colors group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary-container/5 blur-[30px] rounded-full group-hover:bg-primary-container/10 transition-colors"></div>
              <span className="font-label-caps text-label-caps text-on-surface-variant">
                Active Guards
              </span>
              <div className="flex items-center gap-sm">
                <div className="w-2 h-2 rounded-full bg-primary-container shadow-[0_0_5px_rgba(0,240,255,0.8)]"></div>
                <span className="font-display-xl text-display-xl text-on-surface">
                  {stats.activeGuards}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Placeholder */}
          <div className="glass-panel rounded-lg p-lg flex flex-col gap-md h-[200px] relative">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary-container">
                timeline
              </span>
              Toxicity Timeline (24h)
            </h3>
            <div className="flex-1 w-full border-b border-l border-white/10 relative mt-sm z-10 flex items-end">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-full border-t border-white/10 h-0"
                  ></div>
                ))}
              </div>
              <svg
                className="w-full h-full"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
              >
                <path
                  d="M0,80 Q10,70 20,85 T40,60 T60,75 T80,30 T100,50"
                  fill="none"
                  stroke="rgba(0, 240, 255, 0.8)"
                  strokeWidth="1"
                ></path>
              </svg>
            </div>
          </div>

          {/* Active Monitored Pools */}
          <div className="glass-panel rounded-lg p-lg flex flex-col gap-md relative">
            <div className="flex justify-between items-center z-10">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary-container">
                  radar
                </span>
                Active Pool Monitors
              </h3>
              <div className="flex flex-col gap-xs">
                <div className="flex items-center gap-sm">
                  <input
                    type="text"
                    placeholder="Pool ID (bytes32)"
                    value={newPoolId}
                    onChange={(e) => setNewPoolId(e.target.value)}
                    className="bg-surface-container-highest/50 border border-white/10 rounded px-3 py-1 text-[10px] font-mono text-on-surface focus:border-primary-container outline-none w-64"
                  />
                  <button
                    onClick={() => handleAddPool(newPoolId)}
                    className="bg-primary-container text-on-primary-container px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-primary-container/80 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {resolvedName && (
                  <div className="text-[10px] text-primary-container animate-pulse flex items-center gap-xs ml-1">
                    <span className="material-symbols-outlined text-[12px]">
                      check_circle
                    </span>
                    Detected: {resolvedName}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto z-10">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-label-caps text-on-surface-variant font-label-caps">
                    <th
                      className="py-md"
                      title="The asset pair and liquidity pool structure."
                    >
                      Pair / Pool
                    </th>
                    <th
                      className="py-md"
                      title="The unique 32-byte identifier for this Uniswap v4 pool."
                    >
                      ID
                    </th>
                    <th
                      className="py-md"
                      title="The current toxicity score (0-100%) calculated by the Sentinel."
                    >
                      Toxicity
                    </th>
                    <th
                      className="py-md"
                      title="ARMED means the pool is being actively monitored for emergency exits."
                    >
                      Status
                    </th>
                    <th className="py-md text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoredPools.length > 0 ? (
                    monitoredPools.map((pool: any) => {
                      const liveToxicity = poolData[pool.id]?.toxicity ?? 0;
                      const liveArmed = poolData[pool.id]?.isArmed ?? false;
                      return (
                        <tr
                          key={pool.id}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors text-[12px]"
                        >
                          <td className="py-md text-on-surface font-bold">
                            <div className="flex items-center gap-xs">
                              {pool.pair}
                              {targetPoolId === pool.id && (
                                <span className="material-symbols-outlined text-primary-container text-[14px]">
                                  my_location
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-md text-on-surface-variant font-mono text-[10px]">
                            {pool.id.slice(0, 10)}...{pool.id.slice(-8)}
                          </td>
                          <td className="py-md">
                            <div className="flex items-center gap-xs">
                              <div className="h-1.5 w-16 bg-surface-container-highest rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-1000 ${liveToxicity > 85 ? "bg-error" : "bg-primary-container"}`}
                                  style={{ width: `${liveToxicity}%` }}
                                ></div>
                              </div>
                              <span
                                className={`${liveToxicity > 85 ? "text-error" : "text-primary-container"}`}
                              >
                                {liveToxicity.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-md">
                            <span
                              className={`px-2 py-1 rounded-[2px] text-[10px] uppercase font-bold tracking-widest border ${liveArmed ? "bg-primary-container/20 text-cyan-400 border-primary-container/30" : "bg-white/5 text-slate-500 border-white/10"}`}
                            >
                              {liveArmed ? "Armed" : "Monitoring"}
                            </span>
                          </td>
                          <td className="py-md text-right">
                            <div className="flex justify-end gap-sm">
                              <button
                                onClick={() => handleFocusMonitor(pool.id)}
                                className={`p-1 rounded hover:bg-primary-container/20 ${targetPoolId === pool.id ? "text-primary-container" : "text-slate-500"}`}
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  visibility
                                </span>
                              </button>
                              <button
                                onClick={() => handleRemoveMonitor(pool.id)}
                                className="p-1 rounded hover:bg-error/20 text-slate-500 hover:text-error"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  delete
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-slate-600 text-[10px] uppercase tracking-widest font-bold"
                      >
                        No active monitors.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Right Column: Command Center Context */}
        <div className="col-span-1 md:col-span-4 flex flex-col gap-gutter">
          {/* Large Radial Gauge: Highest Toxicity */}
          <div className="glass-panel rounded-lg p-lg flex flex-col items-center justify-center relative min-h-[340px]">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant absolute top-lg left-lg">
              Highest Active Toxicity
            </h3>
            <div className="relative w-48 h-48 flex items-center justify-center mt-md">
              {/* Background Circle */}
              <svg
                className="absolute inset-0 w-full h-full transform -rotate-90"
                viewBox="0 0 100 100"
              >
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="45"
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="282.7"
                  strokeDashoffset="0"
                  strokeWidth="8"
                ></circle>
                {/* Value Circle */}
                <circle
                  className={`transition-all duration-1000 ${Number(displayScore) > 85 ? "drop-shadow-[0_0_8px_rgba(255,180,171,0.6)]" : "drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]"}`}
                  cx="50"
                  cy="50"
                  fill="none"
                  r="45"
                  stroke={Number(displayScore) > 85 ? "#ffb4ab" : "#00f0ff"}
                  strokeDasharray="282.7"
                  strokeDashoffset={
                    282.7 - 282.7 * (Number(displayScore) / 100)
                  }
                  strokeLinecap="round"
                  strokeWidth="8"
                ></circle>
              </svg>
              <div
                className={`flex flex-col items-center z-10 ${Number(displayScore) > 85 ? "threat-pulse" : ""} w-32 h-32 rounded-full justify-center bg-surface-container-lowest/50 backdrop-blur-sm`}
              >
                <span
                  className={`font-display-xl text-display-xl leading-none tracking-tighter ${Number(displayScore) > 85 ? "text-error" : "text-primary-container"}`}
                >
                  {displayScore}
                  <span className="text-[24px]">%</span>
                </span>
                <span
                  className={`font-label-caps text-[10px] mt-xs uppercase tracking-widest font-bold ${Number(displayScore) > 85 ? "text-error" : "text-primary-container"}`}
                >
                  {Number(displayScore) > 85 ? "Elevated" : "Stable"}
                </span>
              </div>
            </div>
            <div className="mt-lg text-center w-full">
              <p className="font-mono-data text-[12px] text-on-surface-variant border-t border-white/10 pt-sm">
                Target:{" "}
                <span className="text-on-surface font-bold">
                  {targetPoolId ? `${targetPoolId.slice(0, 10)}...` : "NONE"}
                </span>
              </p>
            </div>
            {/* Guard Strategy Card */}
            <div className="glass-panel rounded-lg p-lg border border-primary-container/20 mt-gutter mb-gutter">
              <div className="flex justify-between items-center mb-md pb-xs border-b border-white/10">
                <h3 className="font-label-caps text-label-caps text-on-surface-variant">
                  Guard Strategy
                </h3>
                <span
                  className={`material-symbols-outlined text-[18px] ${isAutoExitEnabled ? "text-primary-container" : "text-slate-500"}`}
                >
                  {isAutoExitEnabled ? "verified_user" : "notifications_active"}
                </span>
              </div>

              <div className="flex flex-col gap-md">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[14px] font-bold text-on-surface">
                      Quantum Auto-Exit
                    </p>
                    <p className="text-[11px] text-on-surface-variant leading-tight mt-xs">
                      The Sentinel will automatically trigger liquidity removal
                      if toxicity hits 85%.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-xs">
                    <span className={`px-2 py-1 rounded-[2px] text-[9px] font-bold uppercase tracking-tighter ${isAutoExitEnabled ? "bg-primary-container/20 text-primary-container" : "bg-white/5 text-slate-500"}`}>
                      {isAutoExitEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operator & Security Status (From Protect Page) */}
            <div className="glass-panel rounded-lg p-lg border border-white/5 mt-md">
              <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-md">
                Security Authorization
              </h3>
              
              <div className="flex items-center gap-md p-md rounded-lg bg-surface-container-low border border-white/5">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOperatorApproved ? "bg-primary-container/20 text-primary-container" : "bg-amber-500/20 text-amber-500"}`}>
                  <span className="material-symbols-outlined">
                    {isOperatorApproved ? "verified_user" : "security"}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-bold text-on-surface">
                    Operator Permit
                  </p>
                  <p className="text-[10px] text-on-surface-variant leading-tight">
                    {isOperatorApproved 
                      ? "Protocol authorized to rescue funds." 
                      : "Authorization required for auto-rescue."}
                  </p>
                </div>
                {!isOperatorApproved && (
                  <button 
                    onClick={async () => {
                      if (!address) return;
                      const tx = await writeContractAsync({
                        ...poolManagerConfig,
                        functionName: "setOperator",
                        args: [WRAITH_HOOK_ADDRESS as `0x${string}`, true],
                      } as any);
                      if (publicClient) await publicClient.waitForTransactionReceipt({ hash: tx });
                      syncAll();
                    }}
                    className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded text-[9px] font-bold hover:bg-amber-500/30 transition-all"
                  >
                    SIGN
                  </button>
                )}
              </div>

              {rescueHistory.length > 0 && (
                <div className="mt-md pt-md border-t border-white/5">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-sm">
                    Recent Rescues
                  </h4>
                  <div className="flex flex-col gap-sm">
                    {rescueHistory.slice(0, 3).map((h: any, i: number) => (
                      <div key={i} className="flex justify-between items-center bg-white/5 p-sm rounded border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-on-surface">{h.pair}</span>
                          <span className="text-[9px] text-slate-500">{h.txHash.slice(0, 12)}...</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-primary-container">
                          +{h.amount.toFixed(2)} USDC
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="glass-panel rounded-lg p-lg border border-primary-container/10 mt-md">
              <div className="flex justify-between items-center mb-md">
                <h3 className="font-label-caps text-label-caps text-on-surface-variant">
                  Guard Configuration
                </h3>
                <button
                    onClick={handleToggleAutoExit}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isAutoExitEnabled ? "bg-primary-container" : "bg-surface-container-highest"}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAutoExitEnabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-md py-sm border-t border-white/5">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                    Protection Mode
                  </span>
                  <span className={`text-[11px] font-bold uppercase tracking-widest ${isAutoExitEnabled ? "text-primary-container" : "text-slate-400"}`}>
                    {isAutoExitEnabled ? "QUANTUM EXIT" : "ALERT ONLY"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                    Rescue Vault
                  </span>
                  <span className="text-[11px] font-mono text-on-surface truncate">
                    {isRegistered ? "Verified Active" : "Uninitialized"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Recent Events Feed */}
          <div className="glass-panel rounded-lg p-lg flex flex-col flex-1 min-h-[400px]">
            <div className="flex justify-between items-center mb-md border-b border-white/10 pb-sm">
              <h3 className="font-headline-md text-[18px] text-on-surface font-semibold flex items-center gap-xs">
                <span className="material-symbols-outlined text-[20px] text-primary-container">
                  radar
                </span>
                Live Feed
              </h3>
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-primary-container rounded-full animate-pulse"></div>
                <span className="font-label-caps text-[10px] text-primary-container">
                  SYNCING
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-md overflow-y-auto pr-sm scrollbar-thin">
              {liveEvents.length > 0 ? (
                liveEvents.map((event: any, i: number) => (
                  <div key={i} className="flex gap-sm items-start">
                    <div className={`mt-1 ${event.color}`}>
                      <span className="material-symbols-outlined text-[16px]">
                        {event.icon}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center w-full">
                        <span className="font-mono-data text-[13px] text-on-surface font-bold">
                          {event.type}
                        </span>
                        <span className="font-mono-data text-[10px] text-on-surface-variant">
                          {event.time}
                        </span>
                      </div>
                      <span className="font-mono-data text-[12px] text-on-surface-variant mt-xs">
                        {event.msg}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-600 text-[10px] uppercase font-bold tracking-widest">
                  Awaiting on-chain signals...
                </div>
              )}
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
          <Link
            className="text-cyan-400 border-b border-cyan-400 pb-1 transition-all"
            href="/"
          >
            Dashboard
          </Link>
          <Link
            className="text-slate-400 hover:text-cyan-200 transition-all"
            href="/protect"
          >
            Protection
          </Link>
          <Link
            className="text-slate-400 hover:text-cyan-200 transition-all"
            href="/info"
          >
            How it Works
          </Link>
          <a
            className="text-slate-500 hover:text-cyan-300 transition-colors"
            href="#"
          >
            Status
          </a>
        </div>
        {/* Scanline Overlay hint from JSON applied as class/style previously, maintaining clean footer structural output */}
      </footer>
      
      <CommandTerminal 
        isOpen={isTerminalOpen}
        onClose={() => setIsTerminalOpen(false)}
        onExecute={handleCommandExecute}
      />
    </>
  );
}
