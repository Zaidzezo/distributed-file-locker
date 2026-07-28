import type { Request, Response } from "express";
import { Router } from "express";
import { Db } from "mongodb";
import * as fs from "fs";
import * as path from "path";
import { ClusterManager } from "../core/cluster.js";
import { uploadFilePipeline, downloadFilePipeline } from "../core/pipeline.js";
import { AuthShield } from "../middleware/auth-shield.js";

export function initializeFileRoutes(db: Db, cluster: ClusterManager): Router {
  const router = Router();

  const tempDir = path.resolve("./temp_uploads");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  router.get(
    "/debug/dump",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map((c) => c.name);

        let fragmentsSample: any[] = [];
        if (collectionNames.includes("fragments")) {
          fragmentsSample = await db
            .collection("fragments")
            .find({})
            .limit(3)
            .toArray();
        }

        res.status(200).json({
          existingCollections: collectionNames,
          fragmentsSample: fragmentsSample,
        });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: "Debug dump failed", message: error.message });
      }
    },
  );

  router.get(
    "/cluster/manifest",
    async (req: Request, res: Response): Promise<void> => {
      try {
        const nodeUrl = req.query.url as string;
        if (!nodeUrl) {
          res.status(400).json({
            error: "Bad Request",
            message: "Missing target node URL query parameter (?url=...)",
          });
          return;
        }

        const manifest = await db
          .collection("fragments")
          .find({ nodeUrls: nodeUrl })
          .project({
            _id: 0,
            fragmentId: 1,
            checksum: 1,
            nodeUrls: 1,
          })
          .toArray();

        res.status(200).json(manifest);
      } catch (error: any) {
        console.error("💥 Manifest source retrieval crash:", error);
        res
          .status(500)
          .json({ error: "Internal Server Error", message: error.message });
      }
    },
  );

  router.post(
    "/system/diagnose",
    AuthShield.authenticateExpressRequest,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authenticatedUserId = req.userId!;
        const userFiles = await db
          .collection("files")
          .find({ userId: authenticatedUserId })
          .toArray();

        const fragmentsByNode: Record<
          string,
          Array<{ fragmentId: string; checksum: string }>
        > = {};

        for (const file of userFiles) {
          if (!file.fragments || !Array.isArray(file.fragments)) continue;
          for (const frag of file.fragments) {
            if (!frag.nodeUrls || !Array.isArray(frag.nodeUrls)) continue;
            for (const nodeUrl of frag.nodeUrls) {
              if (!fragmentsByNode[nodeUrl]) fragmentsByNode[nodeUrl] = [];
              fragmentsByNode[nodeUrl].push({
                fragmentId: frag.fragmentId,
                checksum: frag.checksum,
              });
            }
          }
        }

        let totalMissing = 0;
        let totalMismatches = 0;
        let totalChecked = 0;
        let allReachable = true;

        for (const [nodeUrl, expectedFragments] of Object.entries(
          fragmentsByNode,
        )) {
          const result = await cluster.verifyNodeConsistency(
            nodeUrl,
            expectedFragments,
          );
          if (!result.reachable) {
            allReachable = false;
            continue;
          }
          totalChecked += result.checkedCount;
          totalMissing += result.missing.length;
          totalMismatches += result.mismatches.length;
        }

        const totalProblems = totalMissing + totalMismatches;
        const healthPercentage =
          totalChecked > 0
            ? Math.max(
                0,
                Math.round(
                  ((totalChecked - totalProblems) / totalChecked) * 100,
                ),
              )
            : 100;

        res.status(200).json({
          success: true,
          health: healthPercentage,
          consistencyVerified: totalProblems === 0,
          allNodesReachable: allReachable,
          totalFilesTracked: userFiles.length,
          totalFragmentsChecked: totalChecked,
          totalMissing,
          totalMismatches,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error("💥 Diagnostic processing fault:", error);
        res
          .status(500)
          .json({
            error: "Internal Diagnostic Failure",
            message: error.message,
          });
      }
    },
  );

  router.post(
    "/system/verify-node",
    AuthShield.authenticateExpressRequest,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authenticatedUserId = req.userId!;
        const { nodeUrl } = req.body;

        if (!nodeUrl) {
          res
            .status(400)
            .json({ error: "Bad Request", message: "nodeUrl is required." });
          return;
        }

        const userFiles = await db
          .collection("files")
          .find({ userId: authenticatedUserId })
          .toArray();
        const expectedFragments: Array<{
          fragmentId: string;
          checksum: string;
        }> = [];

        for (const file of userFiles) {
          if (file.fragments && Array.isArray(file.fragments)) {
            for (const frag of file.fragments) {
              if (frag.nodeUrls && frag.nodeUrls.includes(nodeUrl)) {
                expectedFragments.push({
                  fragmentId: frag.fragmentId,
                  checksum: frag.checksum,
                });
              }
            }
          }
        }

        const result = await cluster.verifyNodeConsistency(
          nodeUrl,
          expectedFragments,
        );
        res.status(200).json({ success: true, ...result });
      } catch (error: any) {
        console.error("💥 Node verification crash:", error);
        res
          .status(500)
          .json({ error: "Internal Server Error", message: error.message });
      }
    },
  );

  router.post(
    "/system/heal-node",
    AuthShield.authenticateExpressRequest,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authenticatedUserId = req.userId!;
        const { nodeUrl } = req.body;

        if (!nodeUrl) {
          res
            .status(400)
            .json({ error: "Bad Request", message: "nodeUrl is required." });
          return;
        }

        const healResult = await cluster.healNode(nodeUrl);
        if (!healResult.success) {
          res.status(502).json({ success: false, message: healResult.message });
          return;
        }

        const userFiles = await db
          .collection("files")
          .find({ userId: authenticatedUserId })
          .toArray();
        const expectedFragments: Array<{
          fragmentId: string;
          checksum: string;
        }> = [];

        for (const file of userFiles) {
          if (file.fragments && Array.isArray(file.fragments)) {
            for (const frag of file.fragments) {
              if (frag.nodeUrls && frag.nodeUrls.includes(nodeUrl)) {
                expectedFragments.push({
                  fragmentId: frag.fragmentId,
                  checksum: frag.checksum,
                });
              }
            }
          }
        }

        const verifyResult = await cluster.verifyNodeConsistency(
          nodeUrl,
          expectedFragments,
        );
        res
          .status(200)
          .json({
            success: true,
            healMessage: healResult.message,
            ...verifyResult,
          });
      } catch (error: any) {
        console.error("💥 Node heal crash:", error);
        res
          .status(500)
          .json({ error: "Internal Server Error", message: error.message });
      }
    },
  );

  router.patch(
    "/:fileId/rename",
    AuthShield.authenticateExpressRequest,
    async (req: Request<{ fileId: string }>, res: Response): Promise<void> => {
      try {
        const authenticatedUserId = req.userId!;
        const { fileId } = req.params;
        const { filename } = req.body;

        if (!filename || !filename.trim()) {
          res
            .status(400)
            .json({ error: "Bad Request", message: "Filename is required." });
          return;
        }

        const fileRecord = await db.collection("files").findOne({ fileId });
        if (!fileRecord) {
          res
            .status(404)
            .json({ error: "Not Found", message: "File not found." });
          return;
        }
        if (fileRecord.userId !== authenticatedUserId) {
          res
            .status(403)
            .json({ error: "Forbidden", message: "You do not own this file." });
          return;
        }

        const originalFilename =
          fileRecord.filename || fileRecord.originalName || "";
        const extension = path.extname(originalFilename);

        const cleanBaseName = path.parse(filename.trim()).name;
        const protectedFilename = `${cleanBaseName}${extension}`;

        await db
          .collection("files")
          .updateOne({ fileId }, { $set: { filename: protectedFilename } });

        res.status(200).json({ success: true, filename: protectedFilename });
      } catch (error: any) {
        res
          .status(500)
          .json({ error: "Internal Server Error", message: error.message });
      }
    },
  );

  router.post(
    "/",
    AuthShield.authenticateExpressRequest,
    async (req: Request, res: Response): Promise<void> => {
      const authenticatedUserId = req.userId!;
      const originalName =
        (req.headers["x-file-name"] as string) || `upload_${Date.now()}.bin`;
      const localTempPath = path.join(
        tempDir,
        `raw_${uuidSuffix()}_${originalName}`,
      );

      const writeStream = fs.createWriteStream(localTempPath);
      req.pipe(writeStream);

      writeStream.on("error", (err) => {
        console.error("💥 Local disk write stream error:", err);
        res.status(500).json({
          error: "Internal Server Error",
          message: "Failed to write temp storage chunk.",
        });
      });

      writeStream.on("finish", async () => {
        try {
          const fileSize = fs.statSync(localTempPath).size;

          if (fileSize === 0) {
            fs.unlinkSync(localTempPath);
            res.status(400).json({
              error: "Bad Request",
              message: "Cannot ingest an empty data body.",
            });
            return;
          }

          console.log(`📥 Raw upload buffered locally at: ${localTempPath}`);

          const fileId = await uploadFilePipeline(
            localTempPath,
            db,
            cluster,
            authenticatedUserId,
          );

          await db
            .collection("files")
            .updateOne({ fileId: fileId }, { $set: { size: fileSize } });

          fs.unlinkSync(localTempPath);

          res.status(201).json({
            success: true,
            message:
              "File fragmented, encrypted, and replicated across nodes cleanly.",
            fileId,
          });
        } catch (pipelineError: any) {
          if (fs.existsSync(localTempPath)) fs.unlinkSync(localTempPath);
          console.error("💥 Cluster ingestion crash:", pipelineError);
          res.status(500).json({
            error: "Storage Engine Failure",
            message: pipelineError.message,
          });
        }
      });
    },
  );

  router.get(
    "/",
    AuthShield.authenticateExpressRequest,
    async (req: Request, res: Response): Promise<void> => {
      try {
        const authenticatedUserId = req.userId!;

        const userFiles = await db
          .collection("files")
          .find({ userId: authenticatedUserId })
          .toArray();

        const formatBytes = (bytes: any): string => {
          if (bytes === undefined || bytes === null || isNaN(Number(bytes)))
            return "Determining...";
          const num = Number(bytes);
          if (num === 0) return "0 B";
          if (num < 1024) return `${num} B`;
          if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
          return `${(num / (1024 * 1024)).toFixed(1)} MB`;
        };

        const mappedFiles = userFiles.map((doc) => {
          const rawSize = doc.size ?? doc.fileSize ?? doc.length;
          const cleanCapacity = formatBytes(rawSize);

          const activeReplicaIndices: number[] = [];

          if (doc.fragments && Array.isArray(doc.fragments)) {
            doc.fragments.forEach((frag: any) => {
              if (frag.nodeUrls && Array.isArray(frag.nodeUrls)) {
                frag.nodeUrls.forEach((url: string) => {
                  const match = url.match(/storage-node-(\d+)/);
                  if (match && match[1]) {
                    const nodeNum = parseInt(match[1], 10);
                    if (!activeReplicaIndices.includes(nodeNum)) {
                      activeReplicaIndices.push(nodeNum);
                    }
                  }
                });
              }
            });
          }

          return {
            id: doc.fileId,
            filename:
              doc.filename || doc.originalName || `file_${doc.fileId}.bin`,
            size: cleanCapacity,
            capacity: cleanCapacity,

            replicas:
              activeReplicaIndices.length > 0
                ? activeReplicaIndices.sort()
                : [1, 2],

            status: "Verified",
            tenantId: doc.userId.substring(0, 7),
          };
        });

        res.status(200).json(mappedFiles);
      } catch (error: any) {
        res.status(500).json({
          error: "Storage Engine Failure",
          message: "Could not fetch cluster manifests: " + error.message,
        });
      }
    },
  );

  router.get(
    "/:fileId",
    AuthShield.authenticateExpressRequest,
    async (req: Request<{ fileId: string }>, res: Response): Promise<void> => {
      const authenticatedUserId = req.userId!;
      const { fileId } = req.params;

      if (!fileId) {
        res.status(400).json({
          error: "Bad Request",
          message: "URL Parameter fileId is missing.",
        });
        return;
      }

      const localReconstructionPath = path.join(
        tempDir,
        `downloaded_${fileId}.bin`,
      );

      try {
        console.log(
          `📥 Querying cluster layout map for File ID: ${fileId} on behalf of Tenant: ${authenticatedUserId}`,
        );

        await downloadFilePipeline(
          fileId,
          localReconstructionPath,
          db,
          cluster,
          authenticatedUserId,
        );

        if (!fs.existsSync(localReconstructionPath)) {
          throw new Error(
            "File reconstruction failed to output valid asset data.",
          );
        }

        res
          .status(200)
          .download(
            localReconstructionPath,
            "reconstructed-asset.bin",
            (downloadError) => {
              if (fs.existsSync(localReconstructionPath)) {
                fs.unlinkSync(localReconstructionPath);
              }
              if (downloadError) {
                console.error(
                  "⚠️ Connection severed during file streaming:",
                  downloadError,
                );
              }
            },
          );
      } catch (pipelineError: any) {
        if (fs.existsSync(localReconstructionPath))
          fs.unlinkSync(localReconstructionPath);
        console.error("💥 Reconstruction retrieval crash:", pipelineError);
        res.status(404).json({
          error: "Not Found",
          message: "File registry missing or access denied.",
        });
      }
    },
  );

  router.delete(
    "/:fileId",
    AuthShield.authenticateExpressRequest,
    async (req: Request<{ fileId: string }>, res: Response): Promise<void> => {
      const authenticatedUserId = req.userId!;
      const { fileId } = req.params;

      try {
        console.log(
          `🗑️ Deletion requested for File ID: ${fileId} by Tenant: ${authenticatedUserId}`,
        );

        const fileRecord = await db
          .collection("files")
          .findOne({ fileId: fileId });

        if (!fileRecord) {
          res.status(404).json({
            error: "Not Found",
            message: "File registry entry not found.",
          });
          return;
        }

        if (fileRecord.userId !== authenticatedUserId) {
          res.status(403).json({
            error: "Forbidden",
            message: "You do not own this file resource.",
          });
          return;
        }

        const fragmentTargets = fileRecord.fragments || [];

        for (const target of fragmentTargets) {
          for (const nodeUrl of target.nodeUrls) {
            try {
              await cluster.deleteRemoteFragment(nodeUrl, target.fragmentId);
              console.log(
                `🗑️ Deleted chunk ${target.fragmentId} from ${nodeUrl}`,
              );
            } catch (nodeError) {
              console.error(
                `⚠️ Failed to clear chunk from node ${nodeUrl}:`,
                nodeError,
              );
            }
          }
        }

        await db.collection("files").deleteOne({ fileId: fileId });
        await db.collection("fragments").deleteMany({ fileId: fileId });

        res.status(200).json({
          success: true,
          message:
            "File fragments unlinked from network and database registry wiped completely.",
        });
      } catch (error: any) {
        console.error("💥 Deletion pipeline crash:", error);
        res
          .status(500)
          .json({ error: "Storage Engine Failure", message: error.message });
      }
    },
  );

  return router;
}

function uuidSuffix(): string {
  return Math.random().toString(36).substring(2, 7);
}
