import { useEffect, useState } from 'react';
import { Users, Calendar, FileText, Database, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api';

interface TenantInfo {
  username: string;
  createdAt: string;
  totalFiles: number;
  storageUsed: string;
}

export function TenantSpaces() {
  const { user } = useAuth();
  const [info, setInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTenantInfo = async () => {
      setLoading(true);
      try {
        const stored = localStorage.getItem('locker_session');
        const token = stored ? JSON.parse(stored).user.token : '';

        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': token }
        });

        if (!response.ok) throw new Error('Failed to fetch tenant data.');
        const data = await response.json();
        setInfo(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTenantInfo();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center">
        <p className="text-xs font-mono text-rose-500">{error}</p>
      </div>
    );
  }

  const formattedDate = info?.createdAt
    ? new Date(info.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      })
    : '—';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Tenant Namespace</h3>
            <p className="text-xs text-slate-400">Your isolated storage partition on the cluster.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Username</span>
            </div>
            <p className="text-sm font-bold text-slate-800 font-mono">{info?.username}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-mono text-emerald-600 font-semibold">ACTIVE</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Files Stored</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{info?.totalFiles}</p>
            <p className="text-[10px] font-mono text-slate-400 mt-1">distributed across cluster nodes</p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Storage Used</span>
            </div>
            <p className="text-2xl font-bold text-indigo-600">{info?.storageUsed}</p>
            <p className="text-[10px] font-mono text-slate-400 mt-1">across all replicated fragments</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-4">
          ACCOUNT DETAILS
        </h4>
        <div className="space-y-3 text-xs font-mono">
          <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>Account Created</span>
            </div>
            <span className="text-slate-700 font-semibold">{formattedDate}</span>
          </div>
          <div className="flex justify-between items-center py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-400">
              <Users className="h-3.5 w-3.5" />
              <span>Tenant Identifier</span>
            </div>
            <span className="text-slate-700 font-semibold">
              Workspace_{info?.username}
            </span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <div className="flex items-center gap-2 text-slate-400">
              <Database className="h-3.5 w-3.5" />
              <span>Replication Factor</span>
            </div>
            <span className="text-slate-700 font-semibold">2 nodes per fragment</span>
          </div>
        </div>
      </div>
    </div>
  );
}