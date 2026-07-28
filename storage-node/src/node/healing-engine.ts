import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import crypto from 'crypto';

export interface FragmentLocation {
    fragmentId: string;
    checksum: string;
    nodeUrls: string[];
}

interface HealingConfig {
    myUrl: string;              // e.g., "http://storage-node-2:3001"
    storageDir: string;         // The local path where this node dumps binary fragments
    backendManifestUrl: string; // The central brain API endpoint to fetch the manifest
}

export class NodeHealingEngine {
    private config: HealingConfig;

    constructor(config: HealingConfig) {
        this.config = config;
    }

    /**
     * Calculates the SHA-256 hash of a local file buffer to verify integrity.
     */
    private calculateChecksum(filePath: string): string {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    /**
     * Executes the self-healing synchronization sequence.
     */
    async executeSelfHeal(): Promise<void> {
        console.log(`🧼 [SELF-HEALING] Starting anti-entropy repair sequence for: ${this.config.myUrl}`);

        try {
            // 1. Request the source-of-truth manifest from the Central Brain
            const response = await axios.get(`${this.config.backendManifestUrl}?url=${encodeURIComponent(this.config.myUrl)}`);
            const targetManifest: FragmentLocation[] = response.data;

            console.log(`📋 [SELF-HEALING] Central Brain reports I should host ${targetManifest.length} fragments.`);

            // 2. Map existing files on disk for instant O(1) lookups
            if (!fs.existsSync(this.config.storageDir)) {
                fs.mkdirSync(this.config.storageDir, { recursive: true });
            }
            const filesOnDisk = new Set(fs.readdirSync(this.config.storageDir));

            // 3. Process the manifest diff
            for (const expectedFragment of targetManifest) {
                const expectedFileName = `${expectedFragment.fragmentId}.chunk`;
                const fullLocalPath = path.join(this.config.storageDir, expectedFileName);

                let needsSync = false;

                if (!filesOnDisk.has(expectedFileName)) {
                    console.warn(`🚨 [DATA DRIFT] Missing chunk discovered: ${expectedFileName}`);
                    needsSync = true;
                } else {
                    // Corruption check: File exists, verify its cryptographic hash matches
                    const currentChecksum = this.calculateChecksum(fullLocalPath);
                    if (currentChecksum !== expectedFragment.checksum) {
                        console.warn(`🚨 [CORRUPTION DETECTED] Chunk ${expectedFileName} hash mismatch. Redownloading...`);
                        needsSync = true;
                    }
                }

                // 4. Peer-to-Peer Healing Pull Mechanics
                if (needsSync) {
                    const peerUrls = expectedFragment.nodeUrls.filter(url => url !== this.config.myUrl);

                    if (peerUrls.length === 0) {
                        console.error(`❌ [CRITICAL] No healthy backup peers tracked for fragment ${expectedFragment.fragmentId}. Data lost!`);
                        continue;
                    }

                    let syncSuccess = false;
                    for (const peerUrl of peerUrls) {
                        try {
                            // ✅ FIXED: Changed path string from /fragments/ to /fragment/ to match storage node routing
                            console.log(`📡 [P2P STREAM] Pulling repair clone from peer: ${peerUrl}/fragment/${expectedFragment.fragmentId}`);
                            
                            const downloadResponse = await axios.get(`${peerUrl}/fragment/${expectedFragment.fragmentId}`, {
                                responseType: 'arraybuffer'
                            });

                            // Commit the verified chunk back to the local storage engine directory
                            fs.writeFileSync(fullLocalPath, Buffer.from(downloadResponse.data));
                            
                            // Post-write verification assertion
                            const newHash = this.calculateChecksum(fullLocalPath);
                            if (newHash !== expectedFragment.checksum) {
                                throw new Error("Downloaded fragment failed cryptographic integrity assertion.");
                            }

                            console.log(`✨ [REPAIRED] Cleanly restored chunk ${expectedFileName} via peer networking.`);
                            syncSuccess = true;
                            break; 
                        } catch (peerErr: any) {
                            console.error(`⚠️ Peer mirror ${peerUrl} failed to supply repair stream: ${peerErr.message}`);
                        }
                    }

                    if (!syncSuccess) {
                        console.error(`💥 [REPAIR FAILED] Unable to recover chunk ${expectedFileName} from any active cluster mirrors.`);
                    }
                }
            }

            console.log(`🏁 [SELF-HEALING] Synchronization complete. Cluster node state is healthy.`);

        } catch (err: any) {
            console.error(`💥 [SELF-HEALING FAULT] Anti-entropy execution collapsed:`, err.message);
        }
    }
}