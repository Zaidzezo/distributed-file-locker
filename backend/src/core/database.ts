import { MongoClient, Db } from "mongodb";
import type { FileMetadata, FragmentLocation, User } from "../types/index.js";

const connectionString = process.env.MONGO_URI;

if (!connectionString) {
  throw new Error("MONGO_URI is not configured");
}
let client: MongoClient | null = null;
let db: Db | null = null;

async function connectDB(): Promise<Db> {
  if (db) return db;
  
  client = new MongoClient(connectionString!);
  await client.connect();
  db = client.db("locker");
  return db;
}

async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    console.log("🔌 MongoDB connection pool closed cleanly.");
    client = null;
    db = null;
  }
}

async function saveFileMetadata(db: Db, fileMetadata: FileMetadata) {
    const filesCollection = db.collection("files");
    await filesCollection.insertOne(fileMetadata);
}

async function saveFragmentLocation(db: Db, fragmentLocation: FragmentLocation) {
    const fragmentsCollection = db.collection("fragments");
    await fragmentsCollection.insertOne(fragmentLocation);
}

async function getFileMetadata(db: Db, fileId: string, userId: string) {
    const filesCollection = db.collection("files");
    return await filesCollection.findOne({ fileId, userId });
}

async function getFragmentLocations(db: Db, fileId: string) {
    const fragmentsCollection = db.collection("fragments");
    return await fragmentsCollection.find({ fileId }).toArray();
}

async function getNodeManifest(db: Db, nodeUrl: string): Promise<FragmentLocation[]> {
    const fragmentsCollection = db.collection("fragments");
    // Array query matches if nodeUrl is present inside the nodeUrls string array
    const cursor = fragmentsCollection.find({ nodeUrls: nodeUrl });
    const rawResults = await cursor.toArray();
    return rawResults as unknown as FragmentLocation[];
}

async function saveUser(db: Db, user: User): Promise<void> {
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    await usersCollection.insertOne(user);
}

async function findUserByUsername(db: Db, username: string): Promise<User | null> {
    const usersCollection = db.collection("users");
    const doc = await usersCollection.findOne({ username });
    return doc as unknown as User | null;
}

export { 
    connectDB, 
    closeDB, 
    saveFileMetadata, 
    saveFragmentLocation, 
    getFileMetadata, 
    getFragmentLocations,
    getNodeManifest,
    saveUser,          
    findUserByUsername 
};