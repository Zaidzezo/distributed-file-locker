import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import type { PipelineResult, FileMetadata, FragmentLocation } from '../types/index.js';
import { generateKey, keyToHex, hexToKey } from './encryption.js';
import { splitAndEncrypt, reassembleFragments } from './splitter.js';
import { checksumFile } from '../utils/checksum.js';
import * as path from 'path';
import { Db } from 'mongodb';
import { ClusterManager } from './cluster.js';
import { 
    saveFileMetadata, 
    saveFragmentLocation, 
    getFileMetadata, 
    getFragmentLocations 
} from './database.js';

export async function ingestFile(filePath: string, userId: string) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const fileId = uuidv4();
    const originalName = path.basename(filePath);
    const checksum = await checksumFile(filePath);
    const encKey = generateKey();
    
    const fragments = await splitAndEncrypt(filePath, fileId, encKey.key);

    const metadata: FileMetadata = {
        fileId,
        userId,
        originalName,
        originalSize: stats.size,
        mimeType: 'application/octet-stream',
        fragmentCount: fragments.length,
        fragmentSize: 64 * 1024,
        encryptionKey: keyToHex(encKey.key),
        createdAt: new Date(),
        checksum,
    };

    return { metadata, fragments };
}

export async function reconstructFile(result: PipelineResult, outputPath: string) {
    if (result.fragments.length !== result.metadata.fragmentCount) {
        throw new Error(`Fragment count mismatch: expected ${result.metadata.fragmentCount}, got ${result.fragments.length}`);
    }

    const encKeyBuffer = hexToKey(result.metadata.encryptionKey);
    await reassembleFragments(result.fragments, encKeyBuffer, outputPath);
    const reconstructedChecksum = await checksumFile(outputPath);
    if (reconstructedChecksum !== result.metadata.checksum) {
        throw new Error(`Checksum mismatch: expected ${result.metadata.checksum}, got ${reconstructedChecksum}`);
    }
}


export async function uploadFilePipeline(filePath: string, db: Db, cluster: ClusterManager, userId: string): Promise<string> {
    const { metadata, fragments } = await ingestFile(filePath, userId);

    const locations = await cluster.distributeFragments(fragments);

    metadata.fragments = locations.map(loc => ({
        fragmentId: loc.fragmentId,
        checksum: loc.checksum,
        nodeUrls: loc.nodeUrls
    }));

    await saveFileMetadata(db, metadata);

    for (const location of locations) {
        await saveFragmentLocation(db, location);
    }

    console.log(`🧠 Brain updated: "${metadata.originalName}" is completely indexed for user ${userId}.`);
    return metadata.fileId;
}


export async function downloadFilePipeline(fileId: string, outputPath: string, db: Db, cluster: ClusterManager, userId: string): Promise<void> {
    const metadata = await getFileMetadata(db, fileId, userId);
    if (!metadata) {
        throw new Error(`Access Denied or File Missing for ID: ${fileId}`);
    }

    const rawLocations = await getFragmentLocations(db, fileId);
    if (!rawLocations || rawLocations.length === 0) {
        throw new Error(`No fragment layout records found for file ID: ${fileId}`);
    }
    
    const locations = rawLocations as unknown as FragmentLocation[];
    const fragments = await cluster.retrieveFragments(locations);

    const pipelineResult: PipelineResult = { 
        metadata: metadata as unknown as FileMetadata, 
        fragments 
    };
    await reconstructFile(pipelineResult, outputPath);
    
    console.log(`📦 File successfully reconstructed at: ${outputPath}`);
}