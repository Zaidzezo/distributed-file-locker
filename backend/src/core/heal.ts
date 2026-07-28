import { connectDB, closeDB, getNodeManifest } from "./database.js";
import { StorageNodeClient } from "./node-client.js";
import type { Fragment } from "../types/index.js";

const NODE_URLS = [
    "http://storage-node-1:3001",
    "http://storage-node-2:3001",
    "http://storage-node-3:3001"
];

async function runSelfHealing(targetUrl: string) {
    console.log(`🔌 Connecting to MongoDB cluster registry...`);
    const db = await connectDB();

    console.log(`📋 Requesting source-of-truth manifest for: ${targetUrl}`);
    const manifest = await getNodeManifest(db, targetUrl);
    console.log(`🔎 Manifest compiled. This node is expected to host ${manifest.length} total fragments.`);

    console.log(`⚙️ Establishing direct client pipelines to cluster nodes...`);
    const targetNode = new StorageNodeClient(targetUrl);
    
    const peerClients = NODE_URLS
        .filter(url => url !== targetUrl)
        .map(url => new StorageNodeClient(url));

    await targetNode.waitForConnection();
    await Promise.all(peerClients.map(peer => peer.waitForConnection()));

    let repairedCount = 0;

    for (const location of manifest) {
        console.log(`\n🔍 Auditing Fragment Index ${location.index} (ID: ${location.fragmentId.slice(0, 8)}...)`);
        
        let targetHasFragment = false;
        try {
            await targetNode.retrieveFragment(location.fragmentId);
            targetHasFragment = true;
            console.log(`✅ Check passed: Node already possesses this fragment.`);
        } catch (err) {
            console.log(`🚨 [DATA DRIFT] Fragment index ${location.index} is missing or corrupted on target node!`);
        }

        if (!targetHasFragment) {
            const validPeerUrls = location.nodeUrls.filter(url => url !== targetUrl);
            let healed = false;

            for (const peerUrl of validPeerUrls) {
                const peerClient = peerClients.find(p => p.getUrl() === peerUrl);
                if (!peerClient) continue;

                try {
                    console.log(`📡 [P2P REPAIR] Streaming clone chunk from healthy peer: ${peerUrl}`);
                    const fragmentData = await peerClient.retrieveFragment(location.fragmentId);

                    const restoredFragment: Fragment = {
                        id: location.fragmentId,
                        fileId: location.fileId,
                        index: location.index,
                        totalFragments: manifest.length,
                        data: fragmentData,
                        checksum: location.checksum,
                        size: location.size
                    };

                    console.log(`💾 Committing recovered chunk back to restored node target...`);
                    await targetNode.storeFragment(restoredFragment);
                    
                    console.log(`✨ [REPAIRED] Fragment index ${location.index} has been successfully synchronized!`);
                    healed = true;
                    repairedCount++;
                    break; 
                } catch (peerErr: any) {
                    console.error(`⚠️ Peer mirror ${peerUrl} failed to emit repair stream: ${peerErr.message}`);
                }
            }

            if (!healed) {
                console.error(`💥 [CRITICAL FAILURE] Fragment index ${location.index} cannot be recovered! All peer mirrors dead.`);
            }
        }
    }

    console.log(`\n🏁 [ANTI-ENTROPY COMPLETE] Self-healing routine finished.`);
    console.log(`🎉 Total data drift fragments synchronized back to target: ${repairedCount}`);
    
    targetNode.disconnect();
    peerClients.forEach(p => p.disconnect());
    await closeDB();
}

const TARGET_DEAD_NODE = "http://storage-node-3:3001";
runSelfHealing(TARGET_DEAD_NODE).catch((error) => {
    console.error("💥 Self-healing runner collapsed unexpectedly:", error);
    process.exit(1);
});