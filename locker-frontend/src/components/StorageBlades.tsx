import React from 'react';
import { Server, RefreshCw } from 'lucide-react';
import type { ClusterNode } from '../types/cluster';

interface StorageBladesProps { 
  nodes: ClusterNode[]; 
  syncingNodeId: string | null; 
  onHeal: (node: ClusterNode) => Promise<void>; 
  onHealNode: (node: ClusterNode) => Promise<void>;
}

export const StorageBlades: React.FC<StorageBladesProps> = ({ nodes, syncingNodeId, onHeal, onHealNode }) => {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
        DISTRIBUTED HARDWARE MATRIX
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {nodes.map((node) => {
          const isOffline = node.status === 'offline';
          const isDrift = node.status === 'drift';
          const isWorking = syncingNodeId === node.id;

          const progressWidth = typeof node.storageUsed === 'number' 
            ? `${node.storageUsed}%` 
            : node.storageUsed.includes('%') ? node.storageUsed : `${node.storageUsed}%`;

          return (
            <div 
              key={node.id} 
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <Server className={`h-4 w-4 ${isOffline ? 'text-rose-500' : isDrift ? 'text-amber-500' : 'text-indigo-600'}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs font-mono text-slate-800">{node.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Port Mapping: {node.hostPort}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono border capitalize font-semibold tracking-wide ${
                    isOffline ? 'bg-rose-50 text-rose-600 border-rose-200' :
                    isDrift ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-emerald-50 text-emerald-600 border-emerald-200'
                  }`}>
                    ● {node.status}
                  </span>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3 mb-4 text-[11px] font-mono text-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Capacity Load:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 font-semibold">{progressWidth}</span>
                      
                      <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-500" 
                          style={{ width: progressWidth }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
              onClick={() => (isDrift ? onHealNode(node) : onHeal(node))}
              disabled={syncingNodeId !== null}
              className={`w-full ${isDrift ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'} border text-[10px] font-mono py-2 rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2`}
            >
              <RefreshCw className={`h-3 w-3 ${isDrift ? 'text-amber-500' : 'text-slate-400'} ${isWorking ? 'animate-spin' : ''}`} />
              {isWorking ? (isDrift ? 'Healing...' : 'Auditing Inodes...') : (isDrift ? 'Heal Node' : 'Verify Consistency')}
            </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};