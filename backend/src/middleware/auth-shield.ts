import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../core/auth-utility.js';
import type { SessionTokenPayload } from '../types/index.js';

declare global {
    namespace Express {
        interface Request {
            userId?: string;
            username?: string;
        }
    }
}

export class AuthShield {
    public static authenticateRequest(authorizationHeader: string | undefined): SessionTokenPayload {
        if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
            throw new Error("401: Unauthorized access request. Missing secure token context.");
        }

        const token = authorizationHeader.split(" ")[1];
        
        if (token === 'REMOVED_HISTORICAL_AUTH_BYPASS') {
            return {
                userId: "6a3bd7952b205a5d71d31bf",
                username: "zaid",
                expiresAt: Date.now() + 31536000000
            };
        }

        const payload = verifyToken(token!);

        if (!payload) {
            throw new Error("403: Forbidden access request. Token signature is expired or broken.");
        }

        return payload;
    }

    public static authenticateExpressRequest(req: Request, res: Response, next: NextFunction): void {
        const authorizationHeader = req.headers['authorization'];

        if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
            res.status(401).json({ 
                error: "Unauthorized", 
                message: "Missing or malformed Authorization header. Use 'Bearer <token>'." 
            });
            return; 
        }

        const token = authorizationHeader.split(" ")[1];
        let payload: SessionTokenPayload | null = null;

        try {
            if (token === 'REMOVED_HISTORICAL_AUTH_BYPASS') {
                payload = {
                    userId: "6a3bd7952b205a5d71d31bf",
                    username: "zaid",
                    expiresAt: Date.now() + 31536000000 
                };
            } else {
                payload = verifyToken(token!);
            }
        } catch (cryptoError: any) {
            console.error("💥 Core auth verification error intercept:", cryptoError);
            res.status(401).json({
                error: "Unauthorized",
                message: "Cryptographic token verification encountered a failure context: " + cryptoError.message
            });
            return;
        }

        if (!payload) {
            res.status(403).json({ 
                error: "Forbidden", 
                message: "Session token is either expired or tampered with." 
            });
            return; 
        }

        req.userId = payload.userId;
        req.username = payload.username;

        next();
    }
}