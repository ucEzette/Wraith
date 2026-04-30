"use client";

import React from "react";

export interface Alert {
  id: string;
  poolId: string;
  toxicity: number;
  time: string;
  isRead: boolean;
}

interface AlertSystemProps {
  alerts: Alert[];
  isOpen: boolean;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
}

export const AlertSystem: React.FC<AlertSystemProps> = ({
  alerts,
  isOpen,
  onClose,
  onMarkRead,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-0 w-80 max-h-[500px] bg-slate-950/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-[200] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">Security Alerts</h3>
        <div className="flex gap-2">
          <button 
            onClick={onClearAll}
            className="text-[9px] text-slate-500 hover:text-white uppercase font-bold tracking-tighter"
          >
            Clear All
          </button>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-slate-700 text-4xl">notifications_off</span>
            <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">No active threats detected.</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer relative ${!alert.isRead ? 'bg-cyan-500/5' : ''}`}
                onClick={() => onMarkRead(alert.id)}
              >
                {!alert.isRead && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-full"></div>
                )}
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-bold ${alert.toxicity > 85 ? 'text-red-400' : 'text-orange-400'}`}>
                    CRITICAL TOXICITY
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">{alert.time}</span>
                </div>
                <div className="text-[11px] text-white font-mono mb-1">
                  Pool: {alert.poolId.slice(0, 10)}...{alert.poolId.slice(-8)}
                </div>
                <div className="flex items-center gap-2">
                   <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: `${alert.toxicity}%` }}></div>
                   </div>
                   <span className="text-[10px] font-bold text-red-500">{alert.toxicity.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-900/50 border-t border-white/10 text-center">
        <button className="text-[10px] text-cyan-400 hover:text-cyan-200 font-bold uppercase tracking-widest transition-colors">
          View All History
        </button>
      </div>
    </div>
  );
};
