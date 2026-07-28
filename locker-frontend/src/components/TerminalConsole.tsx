import React, { useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';
import type { LogEntry } from '../types/cluster';

interface TerminalConsoleProps { logs: LogEntry[]; }

export const TerminalConsole: React.FC<TerminalConsoleProps> = ({ logs }) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const getLogClassName = (text: string): string => {
    if (text.includes('💥') || text.toLowerCase().includes('error') || text.toLowerCase().includes('failure')) {
      return 'text-rose-400';
    }
    if (text.includes('🗑️') || text.includes('⚠️')) {
      return 'text-amber-400';
    }
    if (text.includes('✅') || text.includes('Successfully')) {
      return 'text-emerald-400';
    }
    return 'text-slate-200';
  };

  return (
    <section className="bg-slate-900 border border-slate-950 rounded-2xl p-5 font-mono shadow-md select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-300">REAL-TIME DAEMON STREAM DIAGNOSTICS</span>
        </div>
        <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 font-bold">API PIPELINE ACTIVE</span>
      </div>
      
      <div className="space-y-1 overflow-y-auto max-h-40 text-[11px] text-slate-300 leading-relaxed pr-2 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">[Listening for system monitoring hooks...]</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="tracking-wide flex gap-2 items-start whitespace-pre-wrap font-mono">
              <span className="text-slate-600 select-none">&gt;</span>
              <span className={getLogClassName(log.text)}>
                {log.text}
              </span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>
    </section>
  );
};