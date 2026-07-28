import { StorageNodeClient } from "./node-client.js";
import type { Fragment, FragmentLocation } from "../types/index.js";

export class ClusterManager {
  private nodes: StorageNodeClient[];
  private replicationFactor: number = 2;

  constructor(nodeUrls: string[]) {
    this.nodes = nodeUrls.map((url) => new StorageNodeClient(url));
  }

  async getLiveClusterStats(): Promise<Array<{ url: string; bytesUsed: number }>> {
    return await Promise.all(
      this.nodes.map(async (node) => {
        try {
          const telemetryUrl = `${node.getUrl()}/internal/disk-telemetry`;
          const response = await fetch(telemetryUrl, { 
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          if (response.ok) {
            const payload = await response.json() as { success: boolean; bytesUsed: number };
            return { url: node.getUrl(), bytesUsed: payload.bytesUsed || 0 };
          }
        } catch (networkError) {
          console.error(`⚠️ Telemetry aggregation skipped for node ${node.getUrl()}:`, networkError);
        }
        return { url: node.getUrl(), bytesUsed: 0 };
      })
    );
  }

async verifyNodeConsistency(
  nodeUrl: string,
  expectedFragments: Array<{ fragmentId: string; checksum: string }>
): Promise<{ reachable: boolean; consistent: boolean; checkedCount: number; mismatches: string[]; missing: string[] }> {
  const node = this.nodes.find((n) => n.getUrl() === nodeUrl);
  const baseUrl = node ? node.getUrl() : nodeUrl;

  try {
    const response = await fetch(`${baseUrl}/internal/verify-fragments`, { method: 'GET' });
    if (!response.ok) {
      return { reachable: false, consistent: false, checkedCount: 0, mismatches: [], missing: [] };
    }

    const payload = await response.json() as { success: boolean; fragmentChecksums: Record<string, string> };
    const actualChecksums = payload.fragmentChecksums || {};

    const mismatches: string[] = [];
    const missing: string[] = [];

    for (const frag of expectedFragments) {
      const actual = actualChecksums[frag.fragmentId];
      if (!actual) {
        missing.push(frag.fragmentId);
      } else if (actual !== frag.checksum) {
        mismatches.push(frag.fragmentId);
      }
    }

    return {
      reachable: true,
      consistent: mismatches.length === 0 && missing.length === 0,
      checkedCount: expectedFragments.length,
      mismatches,
      missing,
    };
  } catch {
    return { reachable: false, consistent: false, checkedCount: 0, mismatches: [], missing: [] };
  }
}

  async deleteRemoteFragment(nodeIdentifier: string, fragmentIdentifier: string): Promise<void> {
    const node = this.nodes.find(
      (n) => n.getUrl() === nodeIdentifier || n.getUrl().includes(nodeIdentifier)
    );

    const baseNodeUrl = node ? node.getUrl() : nodeIdentifier;
    const absoluteUrl = baseNodeUrl.startsWith('http') ? baseNodeUrl : `http://${baseNodeUrl}`;
    const finalUrl = `${absoluteUrl}/fragments/${fragmentIdentifier}`;

    console.log(`📡 Dispatching remote unlinking request to: ${finalUrl}`);
    const response = await fetch(finalUrl, { method: 'DELETE' });

    if (!response.ok) {
      throw new Error(`Node storage array rejected request with status code: ${response.status}`);
    }
  }

async distributeFragments(fragments: Fragment[]): Promise<FragmentLocation[]> {
  await Promise.all(this.nodes.map(node => node.waitForConnection()));

  return await Promise.all(
    fragments.map(async (fragment, index) => {
      const successfulUrls: string[] = [];
      const targetIndices: number[] = [];

      for (let r = 0; r < this.replicationFactor; r++) {
        targetIndices.push((index + r) % this.nodes.length);
      }
      const uniqueIndices = [...new Set(targetIndices)];

      await Promise.all(
        uniqueIndices.map(async (nodeIdx) => {
          const node = this.nodes[nodeIdx]!;
          try {
            await node.storeFragment(fragment);
            successfulUrls.push(node.getUrl());
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Unknown transport failure';
            console.error(`❌ [REPLICATION FAILURE] Node ${nodeIdx} (${node.getUrl()}) rejected chunk ${index}: ${errMsg}. Will retry...`);
          }
        })
      );

      if (successfulUrls.length < this.replicationFactor) {
        const failedIndices = uniqueIndices.filter(
          (nodeIdx) => !successfulUrls.includes(this.nodes[nodeIdx]!.getUrl())
        );

        console.warn(`⚠️ [RETRY] Fragment ${index} under-replicated (${successfulUrls.length}/${this.replicationFactor}). Retrying ${failedIndices.length} failed node(s)...`);

        await Promise.all(
          failedIndices.map(async (nodeIdx) => {
            const node = this.nodes[nodeIdx]!;
            try {
              await node.storeFragment(fragment);
              successfulUrls.push(node.getUrl());
              console.log(`✅ [RETRY SUCCESS] Fragment ${index} written to ${node.getUrl()} on second attempt.`);
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : 'Unknown transport failure';
              console.error(`💥 [RETRY FAILED] Node ${nodeIdx} (${node.getUrl()}) rejected chunk ${index} on retry: ${errMsg}`);
            }
          })
        );
      }

      if (successfulUrls.length === 0) {
        throw new Error(`CRITICAL FAULT: Fragment ${index} completely failed storage across all targeted network nodes.`);
      }

      if (successfulUrls.length < this.replicationFactor) {
        console.warn(`⚠️ [DEGRADED] Fragment ${index} under-replicated after retry. Only committed to (${successfulUrls.length}/${this.replicationFactor}) nodes: [${successfulUrls.join(', ')}]`);
      } else {
        console.log(`✅ [REPLICATED] Fragment ${index} mirrored across nodes: [${successfulUrls.join(', ')}]`);
      }

      return {
        fragmentId: fragment.id,
        fileId: fragment.fileId,
        index: fragment.index,
        nodeUrls: successfulUrls,
        checksum: fragment.checksum,
        size: fragment.size,
      };
    })
  );
}

  async retrieveFragments(locations: FragmentLocation[]): Promise<Fragment[]> {
    const retrievedFragments: Fragment[] = [];
    
    for (const location of locations) {
      let fragmentData: Buffer | null = null;
      
      for (const url of location.nodeUrls) {
        const node = this.nodes.find((n) => n.getUrl() === url);
        
        if (!node) {
          console.warn(`⚠️  Replica configuration mismatch. Client missing for tracked URL: ${url}`);
          continue;
        }

        try {
          fragmentData = await node.retrieveFragment(location.fragmentId);
          break; 
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Node dropped loop pipeline';
          console.error(`⚡ [FAILOVER TRIGGERED] Target node ${url} unreachable for chunk ${location.index}: ${errMsg}. Trying next available backup...`);
        }
      }

      if (!fragmentData) {
        throw new Error(`CRITICAL LOSS: Fragment index ${location.index} is entirely unrecoverable. All mirrors [${location.nodeUrls.join(', ')}] are dead.`);
      }

      retrievedFragments.push({
        id: location.fragmentId,
        fileId: location.fileId,
        index: location.index,
        totalFragments: locations.length,
        data: fragmentData,
        checksum: location.checksum,
        size: location.size,
      });
    }
    return retrievedFragments;
  }

async healNode(nodeUrl: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${nodeUrl}/heal`, { method: 'POST' });
    const payload = await response.json() as { success: boolean; message?: string; error?: string };

    if (!response.ok || !payload.success) {
      return { success: false, message: payload.error || payload.message || 'Heal request rejected.' };
    }
    return { success: true, message: payload.message || 'Heal cycle completed.' };
  } catch (err: unknown) {
    return { success: false, message: err instanceof Error ? err.message : 'Node unreachable.' };
  }
}

  disconnectAll(): void {
    this.nodes.forEach((node) => node.disconnect());
  }
}