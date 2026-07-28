import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NodeHealingEngine } from './node/healing-engine.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const FRAGMENTS_DIR = path.join(process.cwd(), 'fragments');
fs.mkdirSync(FRAGMENTS_DIR, { recursive: true });

const MY_CLUSTER_URL = process.env.NODE_URL || `http://localhost:${PORT}`;
console.log(`🆔 Node operating internal cluster identity as: ${MY_CLUSTER_URL}`);

const healingEngine = new NodeHealingEngine({
    myUrl: MY_CLUSTER_URL,
    storageDir: FRAGMENTS_DIR,
    backendManifestUrl: 'http://locker_central_brain:5000/api/files/cluster/manifest'
});

const app = express();
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));
app.use(express.json());

function resolveFragmentPath(fragmentId: string): string | null {
  const chunkPath = path.join(FRAGMENTS_DIR, `${fragmentId}.chunk`);
  const binPath   = path.join(FRAGMENTS_DIR, `${fragmentId}.bin`);
  if (fs.existsSync(chunkPath)) return chunkPath;
  if (fs.existsSync(binPath))   return binPath;
  return null;
}

app.get('/internal/disk-telemetry', (req, res) => {
  try {
    const rawDiskFiles = fs.readdirSync(FRAGMENTS_DIR);
    let cumulativeFragmentBytes = 0;

    rawDiskFiles.forEach((file) => {
      if (file.endsWith('.chunk') || file.endsWith('.bin')) {
        const fileMetadata = fs.statSync(path.join(FRAGMENTS_DIR, file));
        cumulativeFragmentBytes += fileMetadata.size;
      }
    });

    const imageFootprints: Record<number, number> = {
      3001: 21020000,
      3002: 19960000,
      3003: 19660000
    };

    res.status(200).json({
      success: true,
      bytesUsed: (imageFootprints[PORT] || 20000000) + cumulativeFragmentBytes
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: "Telemetry local disk scan failure: " + error.message });
  }
});

app.get('/internal/verify-fragments', (req, res) => {
  try {
    const rawDiskFiles = fs.readdirSync(FRAGMENTS_DIR);
    const fragmentChecksums: Record<string, string> = {};

    rawDiskFiles.forEach((file) => {
      if (file.endsWith('.chunk') || file.endsWith('.bin')) {
        const fragmentId = file.endsWith('.chunk')
          ? file.replace('.chunk', '')
          : file.replace('.bin', '');
        const content = fs.readFileSync(path.join(FRAGMENTS_DIR, file));
        fragmentChecksums[fragmentId] = crypto.createHash('sha256').update(content).digest('hex');
      }
    });

    res.status(200).json({ success: true, fragmentChecksums });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Verification scan failed: ' + error.message });
  }
});

app.post('/heal', async (req, res) => {
    console.log(`⚡ [TRIGGER] Manual self-healing instruction received on port ${PORT}`);
    try {
        await healingEngine.executeSelfHeal();
        res.json({ success: true, message: "Anti-entropy recovery cycle finished processing." });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post(['/fragment/:id', '/fragments/:id'], (req, res) => {
  try {
    const filePath = path.join(FRAGMENTS_DIR, `${req.params.id}.chunk`);
    fs.writeFileSync(filePath, req.body);
    res.json({ success: true, fragmentId: req.params.id });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to store fragment' });
  }
});

app.get(['/fragment/:id', '/fragments/:id'], (req, res) => {
  try {
    const id = req.params.id;
    if (!id) { res.status(400).json({ success: false, message: 'Fragment ID missing' }); return; }
    const filePath = resolveFragmentPath(id);
    if (filePath) {
      res.send(fs.readFileSync(filePath));
    } else {
      res.status(404).json({ success: false, message: 'Fragment not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve fragment' });
  }
});

app.delete(['/fragment/:id', '/fragments/:id'], (req, res) => {
  try {
    const id = req.params.id;
    if (!id) { res.status(400).json({ success: false, message: 'Fragment ID missing' }); return; }
    const filePath = resolveFragmentPath(id);
    if (filePath) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Local disk hardware purged chunk file: ${id}`);
      res.json({ success: true, message: 'Fragment unlinked and dropped from node local storage.' });
    } else {
      res.status(404).json({ success: false, message: 'Fragment already absent from disk storage.' });
    }
  } catch (error: any) {
    console.error(`💥 Disk unlinking fault on node port ${PORT}:`, error);
    res.status(500).json({ success: false, message: 'Failed to remove local fragment structural file: ' + error.message });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e8,
  transports: ['polling']
});

io.on('connection', (socket) => {
    socket.on('store-fragment', (data) => {
        console.log(`📦 Received fragment via Socket: ${data.id}`);
        try {
            const filePath = path.join(FRAGMENTS_DIR, `${data.id}.chunk`);
            fs.writeFileSync(filePath, data.content);
            socket.emit('fragment-stored', { success: true, fragmentId: data.id });
        } catch (error) {
            socket.emit('fragment-stored', { success: false, fragmentId: data.id, message: 'Failed to store fragment' });
        }
    });

    socket.on('retrieve-fragment', (data) => {
        try {
            const filePath = resolveFragmentPath(data.id);
            if (filePath) {
                const content = fs.readFileSync(filePath);
                socket.emit('fragment-retrieved', { success: true, fragmentId: data.id, content });
            } else {
                socket.emit('fragment-retrieved', { success: false, fragmentId: data.id, message: 'Fragment not found' });
            }
        } catch (error) {
            socket.emit('fragment-retrieved', { success: false, fragmentId: data.id, message: 'Failed to retrieve fragment' });
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Storage node running on port ${PORT}`);
});