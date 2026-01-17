import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteRepository, revertToLastCommit } from "@/lib/github";
import { postRoastToSocial } from "@/lib/social";

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
        });

        console.log(`🔍 Found ${expiredRoasts.length} expired roasts to process`);

        const results = [];

        for (const roast of expiredRoasts) {
            // Fetch the tracked repo separately using repoName
            const repo = await prisma.trackedRepo.findUnique({
                where: { repoName: roast.repoName },
            });

            if (!repo) {
                console.log(`⚠️ No tracked repo found for roast ${roast.id} (repo: ${roast.repoName})`);
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

            // 🆕 POST TO SOCIAL MEDIA
            if (repo.postToTwitter || repo.postToLinkedIn) {
                try {
                    console.log(`📱 Posting roast to social media for ${repo.repoName}`);
                    
                    const socialResults = await postRoastToSocial(
                        repo.repoName,
                        roast.roast || `🔥 Code failure in ${repo.repoName}! #GitRekt`,
                        repo.postToTwitter,
                        repo.postToLinkedIn
                    );

                    for (const result of socialResults) {
                        if (result.success) {
                            actions.push(`posted_to_${result.platform}`);
                            console.log(`✅ Posted to ${result.platform}: ${result.postId}`);
                        } else {
                            actions.push(`${result.platform}_failed: ${result.error}`);
                            console.error(`❌ Failed to post to ${result.platform}: ${result.error}`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Social media posting error:`, error);
                    actions.push("social_posting_error");
                }
            }

            // Handle revert commit - revert to previous commit
            if (repo.revertCommit && roast.commitSha) {
                try {
                    console.log(`↩️ REVERT MODE: Attempting to revert commit ${roast.commitSha} in ${repo.repoName}`);
                    await revertToLastCommit(repo.repoName, repo.accessToken, roast.commitSha);
                    actions.push("commit_reverted");
                    console.log(`✅ REVERT MODE: Successfully reverted commit in ${repo.repoName}`);
                } catch (error) {
                    console.error(`❌ Failed to revert commit in ${repo.repoName}:`, error);
                    actions.push("revert_failed");
                }
            }

            // Handle YOLO mode - delete the repository
            if (repo.yoloMode) {
                try {
                    console.log(`🔥 YOLO MODE ACTIVATED: Attempting to delete repository ${repo.repoName}`);
                    await deleteRepository(repo.repoName, repo.accessToken);
                    actions.push("repo_deleted");
                    console.log(`💀 YOLO MODE: Successfully deleted repository ${repo.repoName}`);
                    
                    // Clean up the tracked repo from database since it no longer exists
                    await prisma.trackedRepo.delete({
                        where: { repoName: repo.repoName },
                    }).catch((e) => {
                        console.error(`Failed to clean up tracked repo: ${e}`);
                    });
                } catch (error) {
                    console.error(`❌ Failed to delete repo ${repo.repoName}:`, error);
                    actions.push("repo_deletion_failed");
                }
            }

            if (actions.length === 0) {
                actions.push("roast_recorded_only");
            }

            results.push({
                roastId: roast.id,
                repo: roast.repoName,
                actor: roast.actor,
                commitMessage: roast.commitMessage,
                roast: roast.roast?.substring(0, 100) + "...",
                yoloMode: repo.yoloMode,
                revertCommit: repo.revertCommit,
                postToTwitter: repo.postToTwitter,
                postToLinkedIn: repo.postToLinkedIn,
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