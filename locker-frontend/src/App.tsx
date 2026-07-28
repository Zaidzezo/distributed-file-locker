import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { SystemControl } from './components/SystemControl';
import { IngestPipeline } from './components/IngestPipeline';
import { FileRepository } from './components/FileRepository';
import { TerminalConsole } from './components/TerminalConsole';
import { AuthPage } from './pages/AuthPage';
import { useClusterState } from './hooks/useClusterState';
import { useAuth } from './context/AuthContext';
import { RefreshCw } from 'lucide-react';
import { TenantSpaces } from './components/TenantSpaces';

function AppShell() {
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const location = useLocation();

  const {
    nodes, files, uploadQueue, syncingNodeId, logs, loading,
    triggerNodeHeal, healNode, handleFileUpload, handleFileDownload,
    purgeFile, renameFile, systemHealth, isConsistent, isDiagnosing,
    runSystemDiagnostic,
  } = useClusterState();

  const getHeaderTabToken = (): string => {
    switch (location.pathname) {
      case '/dashboard': return 'dashboard';
      case '/telemetry': return 'telemetry';
      case '/tenants': return 'tenants';
      case '/config': return 'config';
      default: return 'file-manager';
    }
  };

  return (
    <div className="flex h-screen bg-space-canvas text-slate-800 font-sans overflow-hidden antialiased">
      <Sidebar nodes={nodes} expanded={sidebarExpanded} setExpanded={setSidebarExpanded} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header activeTab={getHeaderTabToken()} />

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white m-6 rounded-3xl border border-slate-200/60 shadow-sm">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-xs font-mono text-slate-500">Syncing with remote cluster controller plane...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <Routes>
              <Route path="/" element={<Navigate to="/files" replace />} />
              <Route path="/dashboard" element={
                <SystemControl
                  nodes={nodes} syncingNodeId={syncingNodeId}
                  onHeal={triggerNodeHeal} onHealNode={healNode}
                  files={files} systemHealth={systemHealth}
                  isConsistent={isConsistent} isDiagnosing={isDiagnosing}
                  runSystemDiagnostic={runSystemDiagnostic}
                />
              } />
              <Route path="/files" element={
                <div className="space-y-8">
                  <IngestPipeline uploadQueue={uploadQueue} onUpload={handleFileUpload} />
                  <FileRepository files={files} onDownload={handleFileDownload} onPurge={purgeFile} onRename={renameFile} />
                </div>
              } />
              <Route path="/telemetry" element={
                <div className="space-y-8">
                  <TerminalConsole logs={logs} />
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider mb-2">LIVE METRIC HARVESTER STATUS</h3>
                    <p className="text-xs text-slate-500">Polling node telemetry directly from localized environment loop channels via WebSocket simulation blocks every 2000ms.</p>
                  </div>
                </div>
              } />
              <Route path="/tenants" element={<TenantSpaces />} />
              <Route path="*" element={<Navigate to="/files" replace />} />
            </Routes>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return user ? <AppShell /> : <AuthPage />;
}