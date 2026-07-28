import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { connectDB } from './core/database.js';
import { ClusterManager } from './core/cluster.js';
import { initializeAuthRoutes } from './routes/auth.js';
import { initializeFileRoutes } from './routes/files.js';

async function bootLockerBrainServer() {
    const app = express();
    const PORT = 5000;

    app.use(cors({
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-file-name'],
        credentials: true
    }));

    app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-file-name');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(204);
    return;
  }
  next();
});

    app.use(express.json());

    console.log("🔌 Initializing connection pool to Central MongoDB Registry...");
    const db = await connectDB();

    console.log("⚙️ Mapping distributed active target cluster nodes...");
    const cluster = new ClusterManager([
        "http://storage-node-1:3001",
        "http://storage-node-2:3001",
        "http://storage-node-3:3001"
    ]);

    app.use('/api/auth', initializeAuthRoutes(db));
    app.use('/api/files', initializeFileRoutes(db, cluster));

    app.get('/api/nodes', async (req: Request, res: Response): Promise<void> => {
        try {
            const totalDiskBytes = 5.65 * 1024 * 1024 * 1024; 
            const liveClusterData = await cluster.getLiveClusterStats();

            const transformedNodeMetrics = liveClusterData.map((nodeData, elementIndex) => {
                const calculatedNodeId = elementIndex + 1;
                const allocationPercentage = ((nodeData.bytesUsed / totalDiskBytes) * 100).toFixed(2) + '%';

                return {
                    id: String(calculatedNodeId),
                    name: `storage-node-${calculatedNodeId}`,
                    hostPort: 3000 + calculatedNodeId,
                    internalUrl: nodeData.url,
                    status: 'optimal',
                    storageUsed: allocationPercentage
                };
            });

            res.status(200).json(transformedNodeMetrics);
        } catch (err: any) {
            console.error("💥 SYSTEM TELEMETRY DEGRADATION DIRECTIVE:", err);

            res.status(200).json([
                { id: '1', name: 'storage-node-1', hostPort: 3001, internalUrl: 'http://storage-node-1:3001', status: 'offline', storageUsed: '0.00%' },
                { id: '2', name: 'storage-node-2', hostPort: 3002, internalUrl: 'http://storage-node-2:3001', status: 'offline', storageUsed: '0.00%' },
                { id: '3', name: 'storage-node-3', hostPort: 3003, internalUrl: 'http://storage-node-3:3001', status: 'offline', storageUsed: '0.00%' }
            ]);
        }
    });

    app.get('/health', (req: Request, res: Response) => {
        res.status(200).json({ status: "ONLINE", timestamp: new Date() });
    });

    app.listen(PORT, () => {
        console.log(`\n======================================================`);
        console.log(`🧠 LOCKER PROTOCOL CENTRAL BRAIN ONLINE ON PORT: ${PORT}`);
        console.log(`🚀 Ready to receive secure, multi-tenant HTTP requests.`);
        console.log(`======================================================\n`);
    });
}

bootLockerBrainServer().catch((error) => {
    console.error("💥 FATAL CRASH DURING SERVER BOOT SEQUENCE:", error);
    process.exit(1);
});