export type NodeStatus = 'optimal' | 'drift' | 'offline';
export type FileStatus = 'Verified' | 'Awaiting Sync' | 'Degraded';

export interface ClusterNode { id: string; name: string; hostPort: number; internalUrl: string; status: NodeStatus; storageUsed: string; }
export interface SharedFile { id: string; filename: string; size: string; replicas: number[]; status: FileStatus; modifiedDate: string; tenantId: string; }
export interface UploadQueueItem { id: string; name: string; progress: number; }
export interface LogEntry { id: string; text: string; }