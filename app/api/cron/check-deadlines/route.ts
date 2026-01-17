import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteRepository } from "@/lib/github";

export async function GET(req: NextRequest) {
    // Verify cron secret to prevent unauthorized access
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow access if no secret is configured (development) or if secret matches
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();

        // Find all expired roasts that haven't been processed or fixed
        const expiredRoasts = await prisma.event.findMany({
            where: {
                deadline: {
                    lte: now,
                },
                posted: false,
                fixed: false,
            },
            include: {
                trackedRepo: true,
            },
        });

        console.log(`🔍 Found ${expiredRoasts.length} expired roasts to process`);

        const results = [];

        for (const roast of expiredRoasts) {
            const repo = roast.trackedRepo;
            if (!repo) {
                console.log(`⚠️ No tracked repo found for roast ${roast.id}`);
                // Mark as posted to avoid reprocessing
                await prisma.event.update({
                    where: { id: roast.id },
                    data: { posted: true },
                });
                continue;
            }

            const actions: string[] = [];

            // Mark the roast as posted FIRST (before any deletions)
            await prisma.event.update({
                where: { id: roast.id },
                data: { posted: true },
            });

            // Handle YOLO mode - delete the repository
            if (repo.yoloMode) {
                try {
                    console.log(`🔥 YOLO MODE ACTIVATED: Attempting to delete repository ${repo.repoName}`);
                    await deleteRepository(repo.repoName, repo.accessToken);
                    actions.push("repo_deleted");
                    console.log(`💀 YOLO MODE: Successfully deleted repository ${repo.repoName}`);
                    
                    // Clean up the tracked repo from database since it no longer exists
                    // This will also cascade delete related events
                    await prisma.trackedRepo.delete({
                        where: { repoName: repo.repoName },
                    }).catch((e) => {
                        console.error(`Failed to clean up tracked repo: ${e}`);
                    });
                    
                } catch (error) {
                    console.error(`❌ Failed to delete repo ${repo.repoName}:`, error);
                    actions.push("repo_deletion_failed");
                }
            } else {
                actions.push("no_yolo_mode");
                // TODO: Add social media posting here in the future
                // if (repo.postToTwitter) { ... }
                // if (repo.postToLinkedIn) { ... }
            }

            results.push({
                roastId: roast.id,
                repo: roast.repoName,
                actor: roast.actor,
                commitMessage: roast.commitMessage,
                yoloMode: repo.yoloMode,
                actions,
            });
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results,
            timestamp: now.toISOString(),
        });
    } catch (error) {
        console.error("❌ Cron job error:", error);
        return NextResponse.json(
            { error: "Failed to process deadlines", details: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}