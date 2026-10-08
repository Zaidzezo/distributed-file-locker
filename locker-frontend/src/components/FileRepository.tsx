import React, { useState, useRef, useEffect } from "react";
import {
  MoreVertical, CheckCircle2, AlertTriangle,
  Download, Trash2, Loader2, Pencil, Search, X
} from "lucide-react";
import type { SharedFile } from "../types/cluster";

const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = (): Record<string, string> => {
  try {
    const stored = localStorage.getItem('locker_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.user?.token) return { 'Authorization': parsed.user.token, 'Content-Type': 'application/json' };
    }
  } catch {}
    return { 'Content-Type': 'application/json' };
};

interface FileRepositoryProps {
  files: SharedFile[];
  onDownload: (id: string, filename: string) => Promise<void>;
  onPurge: (id: string, name: string) => void;
  onRename: (id: string, newName: string) => void;
}

export const FileRepository: React.FC<FileRepositoryProps> = ({
  files, onDownload, onPurge, onRename,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const executeDownload = async (id: string, filename: string) => {
    setDownloadingId(id);
    setActiveMenu(null);
    try {
      await onDownload(id, filename);
    } catch (err) {
      console.error("Component failed to stream cluster file download", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const startEdit = (file: SharedFile) => {
    setEditingId(file.id);
    setEditValue(file.filename);
    setActiveMenu(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const commitRename = async (fileId: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) { cancelEdit(); return; }

    setRenamingId(fileId);
    try {
      const response = await fetch(`${API_BASE}/files/${fileId}/rename`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ filename: trimmed }),
      });

      if (!response.ok) throw new Error('Rename failed');
      onRename(fileId, trimmed);
    } catch (err) {
      console.error('Rename error:', err);
    } finally {
      setRenamingId(null);
      setEditingId(null);
      setEditValue('');
    }
  };

  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative">
      <div className="flex items-center justify-between mb-4 gap-4">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono shrink-0">
          GLOBAL CLUSTER MANIFEST REGISTRY
        </h3>

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-8 pr-8 py-1.5 text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto pb-24">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 pb-3 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
              <th className="pb-3 pl-1 font-medium">Logical Filename Mapping</th>
              <th className="pb-3 font-medium">Capacity</th>
              <th className="pb-3 font-medium">Tenant</th>
              <th className="pb-3 font-medium">Replication Matrix Mapping</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 text-right pr-1 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400 font-mono text-[11px]">
                  {searchQuery
                    ? `No files matching "${searchQuery}".`
                    : 'No tracking records found. Seed cluster via input staging pool.'}
                </td>
              </tr>
            ) : (
              filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50/60 transition-colors">

                  <td className="py-3 pl-1 max-w-[220px]">
                    {editingId === file.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          ref={editInputRef}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(file.id);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="flex-1 min-w-0 px-2 py-0.5 text-[11px] font-mono text-indigo-600 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50"
                        />
                        <button
                          onClick={() => commitRename(file.id)}
                          disabled={renamingId === file.id}
                          className="text-emerald-600 hover:text-emerald-700 shrink-0"
                        >
                          {renamingId === file.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <CheckCircle2 className="h-3 w-3" />}
                        </button>
                        <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group">
                        <span className="font-mono text-[11px] text-indigo-600 font-semibold truncate">
                          {file.filename}
                        </span>
                        <button
                          onClick={() => startEdit(file)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-slate-500 transition-opacity shrink-0"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )}
                  </td>

                  <td className="py-3 font-mono text-slate-500">{file.size}</td>
                  <td className="py-3">
                    <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500">
                      T-{file.tenantId}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1.5 items-center">
                      {[1, 2, 3].map((idx) => {
                        const isPresent = file.replicas?.includes(idx);
                        return (
                          <div
                            key={idx}
                            title={`Storage Blade Container ${idx}: ${isPresent ? "Allocated" : "Unused"}`}
                            className={`w-5 h-3 rounded-sm border transition-all flex items-center justify-center text-[8px] font-mono font-bold ${
                              isPresent
                                ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                                : "bg-slate-50 text-slate-300 border-slate-200"
                            }`}
                          >
                            {idx}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      {file.status === "Verified" ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-600">Verified</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-amber-600">Pending</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-1 text-right relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu === file.id ? null : file.id)}
                      disabled={downloadingId !== null}
                      className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 disabled:opacity-50"
                    >
                      {downloadingId === file.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                        : <MoreVertical className="h-3.5 w-3.5" />}
                    </button>
                    {activeMenu === file.id && (
                      <div className="absolute right-0 top-8 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1 font-mono text-[10px] text-left">
                        <button
                          onClick={() => startEdit(file)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg"
                        >
                          <Pencil className="h-3 w-3 text-slate-400" /> Rename File
                        </button>
                        <button
                          onClick={() => executeDownload(file.id, file.filename)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 text-slate-700 rounded-lg"
                        >
                          <Download className="h-3 w-3 text-slate-400" /> Reconstruct &amp; Download
                        </button>
                        <div className="h-[1px] bg-slate-100 my-1" />
                        <button
                          onClick={() => { onPurge(file.id, file.filename); setActiveMenu(null); }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-rose-50 text-rose-600 rounded-lg"
                        >
                          <Trash2 className="h-3 w-3" /> Purge Cluster Nodes
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};