import { useState, useCallback, useEffect } from 'react';
import type { ClusterNode, SharedFile, UploadQueueItem, LogEntry } from '../types/cluster';

const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => {
  try {
    const stored = localStorage.getItem('locker_session');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.user?.token) return { 'Authorization': parsed.user.token };
    }
  } catch {}
  return { 'Authorization': 'Bearer REMOVED_HISTORICAL_AUTH_BYPASS' };
};

export function useClusterState() {
  const [nodes, setNodes] = useState<ClusterNode[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [syncingNodeId, setSyncingNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [systemHealth, setSystemHealth] = useState<number>(100);
  const [isConsistent, setIsConsistent] = useState<boolean>(true);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);

  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 'init', text: 'Pipeline online. Mapped to live central brain router.' }
  ]);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [
      { id: `log-${crypto.randomUUID()}`, text: `[${new Date().toLocaleTimeString()}] ${message}` },
      ...prev
    ].slice(0, 30));
  }, []);

const fetchClusterMetrics = useCallback(async () => {
  try {
    const [nodesRes, filesRes] = await Promise.all([
      fetch(`${API_BASE}/nodes`, { headers: getAuthHeaders() }),
      fetch(`${API_BASE}/files`, { headers: getAuthHeaders() })
    ]);

    if (!nodesRes.ok || !filesRes.ok) throw new Error('Auth rejected or backend offline.');

    const nodesData = await nodesRes.json();
    const filesData = await filesRes.json();

    setNodes((prevNodes) => {
      return nodesData.map((incoming: ClusterNode) => {
        const previous = prevNodes.find((n) => n.id === incoming.id);
        if (previous?.status === 'drift' || previous?.status === 'offline') {
          return { ...incoming, status: previous.status };
        }
        return incoming;
      });
    });

    setFiles(filesData);
  } catch (err: unknown) {
    addLog(`Sync error: ${err instanceof Error ? err.message : 'Connection missing'}`);
  } finally {
    setLoading(false);
  }
}, [addLog]);

  useEffect(() => {
    fetchClusterMetrics();
  }, [fetchClusterMetrics]);

  useEffect(() => {
  const intervalId = setInterval(fetchClusterMetrics, 5000);
  return () => clearInterval(intervalId);
}, [fetchClusterMetrics]);

const runSystemDiagnostic = useCallback(async () => {
  setIsDiagnosing(true);
  addLog("🔍 Initiating comprehensive consensus audit & cryptographic block trace...");
  try {
    const response = await fetch(`${API_BASE}/files/system/diagnose`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) throw new Error(`Diagnostic channel rejected with code ${response.status}`);
    const data = await response.json();

    setSystemHealth(data.health);
    setIsConsistent(data.consistencyVerified);
    addLog(`✅ Audit complete. Health: ${data.health}%. Fragments checked: ${data.totalFragmentsChecked}. Missing: ${data.totalMissing}. Mismatches: ${data.totalMismatches}. Alignment: ${data.consistencyVerified ? 'OPTIMAL' : 'DEGRADED'}`);
  } catch (err: unknown) {
    addLog(`💥 Diagnostic structural fault: ${err instanceof Error ? err.message : 'Connection error'}`);
    if (nodes.length > 0) {
      const liveNodes = nodes.filter(n => n.status === 'optimal').length;
      setSystemHealth(Math.round((liveNodes / nodes.length) * 100));
    }
  } finally {
    setIsDiagnosing(false);
  }
}, [addLog, nodes]);

  const handleFileUpload = useCallback(async (file: File) => {
    const trackingId = crypto.randomUUID();
    setUploadQueue((prev) => [...prev, { id: trackingId, name: file.name, progress: 5 }]);
    addLog(`Initiating streaming upload sequence for: ${file.name}`);

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/files`);
      xhr.setRequestHeader('x-file-name', file.name);
      xhr.setRequestHeader('Authorization', getAuthHeaders().Authorization);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadQueue((prev) => 
            prev.map((item) => item.id === trackingId ? { ...item, progress: Math.max(5, Math.min(percentComplete, 95)) } : item)
          );
        }
      };

      xhr.onload = () => {
        setUploadQueue((prev) => prev.filter((item) => item.id !== trackingId));
        if (xhr.status === 201) {
          addLog(`Clean Ingest: ${file.name} fragmented and distributed across storage nodes.`);
          fetchClusterMetrics();
        } else {
          let errorDetails = `Status Code ${xhr.status}`;
          try {
            const parsedError = JSON.parse(xhr.responseText);
            if (parsedError.message) errorDetails += ` - ${parsedError.message}`;
          } catch (_) {
            if (xhr.status === 401) errorDetails += " (Unauthorized / Invalid Auth Token)";
          }
          addLog(`Ingest failure: ${errorDetails}`);
        }
      };

      xhr.onerror = () => {
        setUploadQueue((prev) => prev.filter((item) => item.id !== trackingId));
        addLog(`Ingest failure: Network channel severed or cross-origin policy block hit.`);
      };
      
      xhr.send(file);
    } catch (err: unknown) {
      setUploadQueue((prev) => prev.filter((item) => item.id !== trackingId));
      addLog(`Synchronous configuration error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }, [addLog, fetchClusterMetrics]);

  const handleFileDownload = useCallback(async (fileId: string, filename: string) => {
    addLog(`🗜️ Triggering block assembler download stream for: ${filename}`);
    try {
      const response = await fetch(`${API_BASE}/files/${fileId}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Download stream rejected with status ${response.status}`);
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      addLog(`Successfully compiled and downloaded local asset copy of ${filename}`);
    } catch (err: unknown) {
      addLog(`💥 Reconstruction crash: ${err instanceof Error ? err.message : 'Unknown network failure'}`);
      throw err;
    }
  }, [addLog]);

  const purgeFile = useCallback(async (fileId: string, filename: string) => {
    addLog(`🗑️ Broadcasting global purge sequence for File ID: ${fileId}`);
    try {
      const response = await fetch(`${API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Authorization denial or node lock.');
      
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      addLog(`Successfully wiped file and unlinked remote storage meshes for ${filename}`);
    } catch (err: unknown) {
      addLog(`Wipe structural fault: ${err instanceof Error ? err.message : 'Error'}`);

      fetchClusterMetrics();
    }
  }, [addLog]);

  const triggerNodeHeal = useCallback(async (node: ClusterNode) => {
  setSyncingNodeId(node.id);
  addLog(`Evaluating block checksum integrity map on ${node.name}...`);
  try {
    const response = await fetch(`${API_BASE}/files/system/verify-node`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeUrl: node.internalUrl }),
    });

    if (!response.ok) throw new Error(`Verification channel rejected with code ${response.status}`);
    const data = await response.json();

    if (!data.reachable) {
      setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, status: 'offline' } : n)));
      addLog(`⚠️ ${node.name} unreachable — could not verify checksums.`);
    } else if (data.consistent) {
      setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, status: 'optimal' } : n)));
      addLog(`✅ Checksum verification complete on ${node.name}. ${data.checkedCount} fragment(s) clean.`);
    } else {
      setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, status: 'drift' } : n)));
      addLog(`⚠️ Drift on ${node.name}: ${data.mismatches.length} mismatched, ${data.missing.length} missing.`);
    }
  } catch (err: unknown) {
    addLog(`💥 Verification structural fault: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    setSyncingNodeId(null);
  }
}, [addLog]);

const healNode = useCallback(async (node: ClusterNode) => {
  setSyncingNodeId(node.id);
  addLog(`🧼 Triggering self-heal cycle on ${node.name}...`);
  try {
    const response = await fetch(`${API_BASE}/files/system/heal-node`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodeUrl: node.internalUrl }),
    });

    if (!response.ok) throw new Error(`Heal channel rejected with code ${response.status}`);
    const data = await response.json();

    if (data.consistent) {
      setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, status: 'optimal' } : n)));
      addLog(`✅ ${node.name} healed and re-verified clean. ${data.checkedCount} fragment(s) restored.`);
    } else {
      setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, status: 'drift' } : n)));
      addLog(`⚠️ Heal ran but ${node.name} still shows drift: ${data.missing.length} still missing.`);
    }
  } catch (err: unknown) {
    addLog(`💥 Heal structural fault: ${err instanceof Error ? err.message : 'Unknown error'}`);
  } finally {
    setSyncingNodeId(null);
  }
}, [addLog]);

const renameFile = useCallback(async (fileId: string, newName: string) => {
  setFiles((prev) =>
    prev.map((f) => f.id === fileId ? { ...f, filename: newName } : f)
  );
  addLog(`✏️ File renamed to: ${newName}`);
}, [addLog]);

  return { 
    nodes, 
    files, 
    uploadQueue, 
    syncingNodeId, 
    logs, 
    loading, 
    systemHealth,
    isConsistent,
    isDiagnosing,
    runSystemDiagnostic, 
    triggerNodeHeal, 
    healNode,  
    handleFileUpload, 
    handleFileDownload, 
    purgeFile, 
    renameFile,
    refresh: fetchClusterMetrics 
  };
}