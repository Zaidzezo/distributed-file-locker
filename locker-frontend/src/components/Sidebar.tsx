import React from 'react';
import { Link, useLocation } from 'react-router'; 
import { HardDrive, LayoutDashboard, Folder, Activity, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ClusterNode } from '../types/cluster';

interface SidebarProps { 
  nodes: ClusterNode[]; 
  expanded: boolean; 
  setExpanded: (ex: boolean) => void; 
}

export const Sidebar: React.FC<SidebarProps> = ({ nodes, expanded, setExpanded }) => {
  const location = useLocation(); 

  
  const totalNodes = nodes?.length || 0;
  const averageLoad = totalNodes > 0
  ? parseFloat(
      (nodes.reduce((sum, node) => {
        const val = typeof node.storageUsed === 'number'
          ? node.storageUsed
          : parseFloat(node.storageUsed) || 0;
        return sum + val;
      }, 0) / totalNodes).toFixed(2)
    )
  : 0;

  const menuItems = [
    { id: 'dashboard', path: '/dashboard', label: 'System Control', icon: LayoutDashboard },
    { id: 'file-manager', path: '/files', label: 'File Repository', icon: Folder },
    { id: 'telemetry', path: '/telemetry', label: 'Network Telemetry', icon: Activity },
    { id: 'tenants', path: '/tenants', label: 'Tenant Spaces', icon: Users },
  ];

  return (
    <aside className={`bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-300 relative select-none ${expanded ? 'w-64' : 'w-20'}`}>
      <div>
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-gradient-to-tr from-indigo-500 to-indigo-600 p-2 rounded-xl shadow-md shadow-indigo-100 shrink-0">
              <HardDrive className="h-4 w-4 text-white" />
            </div>
            {expanded && <span className="font-bold text-sm tracking-widest text-slate-800">LOCKER</span>}
          </div>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="absolute -right-3 top-7 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm rounded-full p-1 text-slate-400 hover:text-slate-600 transition-all z-40"
          >
            {expanded ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.id}
                to={item.path} 
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-medium tracking-wide transition-all ${
                  isActive ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                {expanded && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-medium mb-1.5 font-mono">
            {expanded && <span className="text-slate-400">Mesh Footprint</span>}
            <span className="text-indigo-600 font-bold">{averageLoad}% Load</span>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${averageLoad}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};