import * as crypto from 'crypto';
import type { User, SessionTokenPayload } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const CLUSTER_SECRET = "REMOVED_HISTORICAL_SECRET";

export function hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
    const matchHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return matchHash === hash;
}

export function generateToken(userId: string, username: string): string {
    const payload: SessionTokenPayload = {
        userId,
        username,
        expiresAt: Date.now() + (14 * 24 * 60 * 60 * 1000)
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto.createHmac('sha256', CLUSTER_SECRET)
                            .update(base64Payload)
                            .digest('base64url');

    return `${base64Payload}.${signature}`;
}

export function verifyToken(token: string): SessionTokenPayload | null {
    try {
        const [base64Payload, signature] = token.split('.');
        if (!base64Payload || !signature) return null;

        const recomputedSignature = crypto.createHmac('sha256', CLUSTER_SECRET)
                                          .update(base64Payload)
                                          .digest('base64url');

        if (recomputedSignature !== signature) {
            console.warn("🚨 [SECURITY ALERT] Session token signature mismatch detected!");
            return null;
        }

        const payload: SessionTokenPayload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString());

        if (Date.now() > payload.expiresAt) {
            console.warn(`⚠️ [AUTH] Token expired for user context: ${payload.username}`);
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}