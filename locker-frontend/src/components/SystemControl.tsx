import { StorageBlades } from './StorageBlades';
import type { ClusterNode, SharedFile } from '../types/cluster';

interface SystemControlProps {
  nodes: ClusterNode[];
  syncingNodeId: string | null;
  onHeal: (node: ClusterNode) => Promise<void>;
  onHealNode: (node: ClusterNode) => Promise<void>;
  files: SharedFile[];
  systemHealth: number;
  isConsistent: boolean;
  isDiagnosing: boolean;
  runSystemDiagnostic: () => Promise<void>;
}

export function SystemControl({
  nodes,
  syncingNodeId,
  onHeal,
  onHealNode,
  files,
  systemHealth,
  isConsistent,
  isDiagnosing,
  runSystemDiagnostic,
}: SystemControlProps) {

  const totalNodes = nodes.length;
  const averageLoad = totalNodes > 0
    ? Math.round(
        nodes.reduce((sum, node) => {
          const val = typeof node.storageUsed === 'number'
            ? node.storageUsed
            : parseFloat(node.storageUsed) || 0;
          return sum + val;
        }, 0) / totalNodes
      )
    : 0;

  const hasDriftedNodes = nodes.some((n) => n.status === 'drift' || n.status === 'offline');
  const clusterIsConsistent = isConsistent && !hasDriftedNodes;

  return (
    <div className="space-y-8">
      <StorageBlades
        nodes={nodes}
        syncingNodeId={syncingNodeId}
        onHeal={onHeal}
        onHealNode={onHealNode} 
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider mb-4">
          ACTIVE CONTROL TOPOLOGY METRICS
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-slate-400">TOTAL REGISTERED SHARD VOLUME</p>
              <p className="text-lg font-bold text-slate-800 mt-1">{files.length} Managed Blobs</p>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              Current Pressure: {averageLoad}% cluster capacity utilized
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-slate-400">BLOCK RESOLUTION INTEGRITY</p>
              <p className={`text-lg font-bold mt-1 ${clusterIsConsistent ? 'text-emerald-600' : 'text-amber-600'}`}>
                {clusterIsConsistent ? 'CONSISTENT' : 'DEGRADED SHARDS'}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">
              {clusterIsConsistent
                ? 'Cryptographic block mapping secure.'
                : hasDriftedNodes
                  ? 'One or more nodes report fragment drift.'
                  : 'Fragment mismatches detected.'}
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <p className="text-slate-400">COMPREHENSIVE CLUSTER HEALTH</p>
              <p className={`text-lg font-bold mt-1 ${systemHealth === 100 && !hasDriftedNodes ? 'text-indigo-600' : 'text-amber-600'}`}>
                {hasDriftedNodes ? `${Math.round(((nodes.filter(n => n.status === 'optimal').length) / totalNodes) * 100)}%` : `${systemHealth}%`}
              </p>
            </div>
            <button
              onClick={runSystemDiagnostic}
              disabled={isDiagnosing}
              className="mt-3 w-full text-center text-[10px] font-bold uppercase tracking-wider bg-slate-900 hover:bg-indigo-600 disabled:bg-slate-200 text-white disabled:text-slate-400 py-2 rounded-lg transition-all shadow-sm flex items-center justify-center"
            >
              {isDiagnosing ? 'Auditing Array...' : 'Execute Diagnostic Sweep'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}