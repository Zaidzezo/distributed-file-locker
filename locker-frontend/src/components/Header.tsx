import React from 'react';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps { activeTab: string; }

export const Header: React.FC<HeaderProps> = ({ activeTab }) => {
  const { user, logout } = useAuth();

  const transformTitle = (id: string) =>
    id ? id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "Cluster Control";

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 select-none">
      <div>
        <h2 className="text-sm font-bold tracking-wide text-slate-800">{transformTitle(activeTab)}</h2>
        <p className="text-xs text-slate-400 mt-0.5">High-availability immutable chunk data management center.</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl text-[10px] font-mono">
          <span className="text-slate-400">Tenant Identifier:</span>
          <span className="text-slate-700 font-semibold">
            {user ? `Workspace_${user.username}` : 'Workspace_Guest'}
          </span>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-600 px-3 py-1.5 rounded-xl text-[10px] font-mono font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>CLUSTER MESH LIVE</span>
        </div>

        {user && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <User className="h-3 w-3 text-slate-400" />
            <span className="text-[10px] font-mono font-semibold text-slate-700">{user.username}</span>
            <div className="w-px h-3 bg-slate-200 mx-1" />
            <button
              onClick={logout}
              className="flex items-center gap-1 text-[10px] font-mono text-rose-500 hover:text-rose-600 transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};