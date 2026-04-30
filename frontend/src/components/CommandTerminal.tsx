"use client";

import React, { useState, useEffect, useRef } from "react";

interface CommandTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (cmd: string) => Promise<string | void> | string | void;
}

export const CommandTerminal: React.FC<CommandTerminalProps> = ({
  isOpen,
  onClose,
  onExecute,
}) => {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([
    "WRAITH PROTOCOL [Version 4.0.1]",
    "(c) 2026 Wraith Defense Systems. All rights reserved.",
    "",
    "Type 'help' to see available commands.",
    "",
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const cmd = input.trim();
    setHistory((prev) => [...prev, `> ${cmd}`]);
    
    setInput(""); // Clear input immediately
    
    try {
      const result = await onExecute(cmd);
      if (result) {
        setHistory((prev) => [...prev, result]);
      }
    } catch (err: any) {
      setHistory((prev) => [...prev, `ERR: ${err.message || "Command failed"}`]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 pointer-events-none">
      <div 
        className="w-full max-w-4xl h-[600px] bg-slate-950/90 backdrop-blur-xl border border-cyan-500/30 rounded-lg shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col pointer-events-auto relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Terminal Header */}
        <div className="bg-slate-900 px-4 py-2 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400 text-sm">terminal</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Wraith System Terminal</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-xs text-cyan-500/90 space-y-1 selection:bg-cyan-500/30">
          {history.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">
              {line.startsWith(">") ? (
                <span className="text-white font-bold">{line}</span>
              ) : line.includes("ERR") ? (
                <span className="text-red-400">{line}</span>
              ) : line.includes("OK") ? (
                <span className="text-green-400">{line}</span>
              ) : (
                line
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Terminal Input */}
        <form onSubmit={handleSubmit} className="p-4 bg-slate-950 border-t border-white/10 flex items-center gap-2">
          <span className="text-cyan-400 font-bold font-mono text-xs">{">"}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs"
            placeholder="Enter command..."
            autoComplete="off"
          />
        </form>

        {/* CRT Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      </div>
      
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 pointer-events-auto -z-10" 
        onClick={onClose}
      />
    </div>
  );
};
