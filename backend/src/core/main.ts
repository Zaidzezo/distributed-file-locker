import * as fs from 'fs';
import { connectDB, closeDB, findUserByUsername, saveUser } from "../core/database.js";
import { ClusterManager } from "../core/cluster.js";
import { uploadFilePipeline, downloadFilePipeline } from "../core/pipeline.js";
import { hashPassword, generateToken } from "../core/auth-utility.js";
import { AuthShield } from "../middleware/auth-shield.js";
import { v4 as uuidv4 } from "uuid";

const TEST_FILE_PATH = "./dummy-upload.txt";
const OUTPUT_FILE_PATH = "./dummy-downloaded.txt";

if (!fs.existsSync(TEST_FILE_PATH)) {
    fs.writeFileSync(TEST_FILE_PATH, "Distributed, authenticated, and multi-tenant cloud storage test data.");
}

async function runSecureSystemTest() {
    console.log("🔌 Connecting to MongoDB registry cluster...");
    const db = await connectDB();

    console.log("⚙️ Initializing storage node cluster connections...");
    const cluster = new ClusterManager([
        "http://storage-node-1:3001",
        "http://storage-node-2:3001",
        "http://storage-node-3:3001"
    ]);

    console.log("\n👤 [PHASE 1: USER REGISTRATION / LOOKUP]");
    const targetUsername = "zaid_developer";
    const targetPassword = "REMOVED_HISTORICAL_TEST_PASSWORD";

    let user = await findUserByUsername(db, targetUsername);
    if (!user) {
        console.log(`📝 User "${targetUsername}" not found. Provisioning fresh credentials...`);
        const { hash, salt } = hashPassword(targetPassword);
        user = {
            userId: uuidv4(),
            username: targetUsername,
            passwordHash: hash,
            salt,
            createdAt: new Date()
        };
        await saveUser(db, user);
        console.log(`✅ User profile successfully written to MongoDB.`);
    } else {
        console.log(`✨ User profile found: "${user.username}" (ID: ${user.userId})`);
    }

    console.log("\n🔑 [PHASE 2: AUTHENTICATION & TOKEN ISSUANCE]");
    const sessionToken = generateToken(user.userId, user.username);
    console.log(`🎟️ Generated Secure Crypto Token: ${sessionToken.slice(0, 30)}...`);

    console.log("\n🛡️ [PHASE 3: THE GATEWAY MIDDLEWARE SHIELD]");
    const mockAuthorizationHeader = `Bearer ${sessionToken}`;
    
    const verifiedSession = AuthShield.authenticateRequest(mockAuthorizationHeader);
    console.log(`🔓 Gateway Access Granted for tenant context: ${verifiedSession.username}`);

    console.log("\n🚀 [PHASE 4: MULTI-TENANT SECURE UPLOAD]");
    const fileId = await uploadFilePipeline(TEST_FILE_PATH, db, cluster, verifiedSession.userId);
    console.log(`🎉 Upload Complete! File UUID registered under tenant: ${fileId}`);

    console.log("\n📥 [PHASE 5: MULTI-TENANT SECURE DOWNLOAD]");
    await downloadFilePipeline(fileId, OUTPUT_FILE_PATH, db, cluster, verifiedSession.userId);
    console.log("📦 File successfully verified and reconstructed under absolute tenant isolation!");

    await closeDB();
}

runSecureSystemTest().catch(async (error) => {
    console.error("💥 System loop crashed during authentication sequence:", error);
    await closeDB();
});