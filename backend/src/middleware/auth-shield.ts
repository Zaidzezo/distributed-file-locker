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
        if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ") || !authorizationHeader.slice(7).trim()) {
            throw new Error("401: Unauthorized access request. Missing secure token context.");
        }

        const token = authorizationHeader.slice(7).trim();
        const payload = verifyToken(token);

        if (!payload) {
            throw new Error("403: Forbidden access request. Token signature is expired or broken.");
        }

        return payload;
    }

    public static authenticateExpressRequest(
        req: Request,
        res: Response,
        next: NextFunction
    ): void {
        const authorizationHeader = req.headers['authorization'];

        if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ") || !authorizationHeader.slice(7).trim()) {
            res.status(401).json({
                error: "Unauthorized",
                message: "Missing or malformed Authorization header. Use 'Bearer <token>'."
            });
            return;
        }

        const token = authorizationHeader.slice(7).trim();
        let payload: SessionTokenPayload | null = null;

        try {
            payload = verifyToken(token);
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