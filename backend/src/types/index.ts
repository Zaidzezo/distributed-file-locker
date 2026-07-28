export interface Fragment {
    id: string;
    fileId: string;
    index: number;
    totalFragments: number;
    data: Buffer;
    checksum: string;
    size: number;
}

export interface EncryptionKey {
    key: Buffer;
    iv: Buffer;
}

export interface EncryptedChunk {
    ciphertext: Buffer;
    authTag: Buffer;
    iv: Buffer;
}

export interface FileMetadata {
    fileId: string;
    userId: string; 
    originalName: string;
    originalSize: number;
    mimeType: string;
    fragmentCount: number;
    fragmentSize: number;
    encryptionKey: string;
    createdAt: Date;
    checksum: string;
    fragments?: {
        fragmentId: string;
        checksum: string;
        nodeUrls: string[];
    }[];
}

export interface FragmentLocation {
    fragmentId: string;
    fileId: string;
    index: number;
    nodeUrls: string[];
    checksum: string;
    size: number;
}

export interface PipelineResult {
    metadata: FileMetadata;
    fragments: Fragment[];
}

export interface User {
    userId: string;
    username: string;
    passwordHash: string;
    salt: string;
    createdAt: Date;
}

export interface SessionTokenPayload {
    userId: string;
    username: string;
    expiresAt: number;
}