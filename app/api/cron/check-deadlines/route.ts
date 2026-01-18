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

            // Debug: Log LinkedIn posting status
            console.log(`🔍 LinkedIn posting check for ${roast.repoName}: postToLinkedIn=${repo.postToLinkedIn}, hasToken=${!!repo.linkedInToken}`);

            // Handle LinkedIn posting FIRST (before any deletions/reverts)
            if (repo.postToLinkedIn && repo.linkedInToken) {
                try {
                    console.log(`📱 LINKEDIN POST: Generating post for ${roast.repoName}`);
                    
                    // Generate LinkedIn post using Gemini
                    const linkedInPostText = await generateLinkedInPost(
                        roast.actor,
                        roast.repoName,
                        roast.commitMessage,
                        roast.failReason || "Code quality issues",
                        roast.roast
                    );

                    // Get LinkedIn user profile to get person URN
                    const profileResponse = await fetch("https://api.linkedin.com/v2/me", {
                        headers: {
                            Authorization: `Bearer ${repo.linkedInToken}`,
                            "X-Restli-Protocol-Version": "2.0.0",
                        },
                    });

                    if (!profileResponse.ok) {
                        throw new Error(`Failed to fetch LinkedIn profile: ${profileResponse.status}`);
                    }

                    const profileData = await profileResponse.json();
                    // Extract numeric ID from response
                    // LinkedIn /v2/me returns either a numeric ID or URN format
                    let personId = profileData.id;
                    if (typeof personId === "string") {
                        // If it's already a URN, extract the ID part
                        if (personId.startsWith("urn:li:person:")) {
                            personId = personId.replace("urn:li:person:", "");
                        }
                    }
                    const personUrn = `urn:li:person:${personId}`;
                    console.log(`📱 LinkedIn person URN: ${personUrn}`);

                    // Post to LinkedIn
                    const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${repo.linkedInToken}`,
                            "X-Restli-Protocol-Version": "2.0.0",
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            author: personUrn,
                            lifecycleState: "PUBLISHED",
                            specificContent: {
                                "com.linkedin.ugc.ShareContent": {
                                    shareCommentary: {
                                        text: linkedInPostText,
                                    },
                                    shareMediaCategory: "NONE",
                                },
                            },
                            visibility: {
                                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
                            },
                        }),
                    });

                    if (!postResponse.ok) {
                        const errorText = await postResponse.text();
                        console.error(`❌ LinkedIn post failed: ${postResponse.status}`, errorText);
                        throw new Error(`LinkedIn API error: ${postResponse.status} - ${errorText}`);
                    }
                    
                    const postResult = await postResponse.json().catch(() => ({}));
                    console.log(`✅ LinkedIn post created:`, postResult);

                    actions.push("linkedin_posted");
                    console.log(`✅ LINKEDIN POST: Successfully posted to LinkedIn for ${roast.repoName}`);
                } catch (error) {
                    console.error(`❌ Failed to post to LinkedIn for ${roast.repoName}:`, error);
                    actions.push("linkedin_post_failed");
                }
            }

            // Mark the roast as posted (after LinkedIn posting, before deletions)
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