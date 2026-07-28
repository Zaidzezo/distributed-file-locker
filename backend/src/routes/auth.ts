import type { Request, Response } from 'express';
import { Router } from 'express';
import { Db } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { saveUser, findUserByUsername } from '../core/database.js';
import { hashPassword, verifyPassword, generateToken } from '../core/auth-utility.js';
import { AuthShield } from '../middleware/auth-shield.js';

export function initializeAuthRoutes(db: Db): Router {
    const router = Router();

    router.post('/register', async (req: Request, res: Response): Promise<void> => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                res.status(400).json({ error: "Bad Request", message: "Username and password are required." });
                return;
            }

            const existingUser = await findUserByUsername(db, username);
            if (existingUser) {
                res.status(409).json({ error: "Conflict", message: "That username is already taken." });
                return;
            }

            const { hash, salt } = hashPassword(password);

            const newUser = {
                userId: uuidv4(),
                username,
                passwordHash: hash,
                salt,
                createdAt: new Date()
            };

            await saveUser(db, newUser);

            res.status(201).json({ 
                success: true, 
                message: "User account provisioned successfully.",
                userId: newUser.userId 
            });
        } catch (error: any) {
            console.error("💥 Registration error:", error);
            res.status(500).json({ error: "Internal Server Error", message: error.message });
        }
    });

    router.post('/login', async (req: Request, res: Response): Promise<void> => {
        try {
            const { username, password } = req.body;

            if (!username || !password) {
                res.status(400).json({ error: "Bad Request", message: "Username and password are required." });
                return;
            }

            const user = await findUserByUsername(db, username);
            if (!user) {
                res.status(401).json({ error: "Unauthorized", message: "Invalid username or password credentials." });
                return;
            }

            const isPasswordValid = verifyPassword(password, user.passwordHash, user.salt);
            if (!isPasswordValid) {
                res.status(401).json({ error: "Unauthorized", message: "Invalid username or password credentials." });
                return;
            }

            const token = generateToken(user.userId, user.username);

            res.status(200).json({
                success: true,
                message: "Authentication successful.",
                token: `Bearer ${token}`
            });
        } catch (error: any) {
            console.error("💥 Login error:", error);
            res.status(500).json({ error: "Internal Server Error", message: error.message });
        }
    });

    router.get('/me', AuthShield.authenticateExpressRequest, async (req: Request, res: Response): Promise<void> => {
  try {
    const authenticatedUserId = req.userId!;

    const user = await db.collection('users').findOne({ userId: authenticatedUserId });
    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User record not found.' });
      return;
    }

    const userFiles = await db.collection('files').find({ userId: authenticatedUserId }).toArray();
    const totalFiles = userFiles.length;
    const totalBytes = userFiles.reduce((sum, f) => sum + (Number(f.size) || 0), 0);

    const formatBytes = (bytes: number): string => {
      if (bytes === 0) return '0 B';
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    res.status(200).json({
      username: user.username,
      createdAt: user.createdAt,
      totalFiles,
      storageUsed: formatBytes(totalBytes),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

    return router;
}