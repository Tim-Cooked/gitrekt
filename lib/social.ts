import { prisma } from "@/lib/prisma";

interface PostResult {
    success: boolean;
    platform: string;
    postId?: string;
    error?: string;
}

/**
 * Refresh Twitter access token if expired
 */
async function refreshTwitterToken(accountId: string, refreshToken: string): Promise<string | null> {
    try {
        const clientId = process.env.AUTH_TWITTER_ID!;
        const clientSecret = process.env.AUTH_TWITTER_SECRET!;
        
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

        const response = await fetch("https://api.twitter.com/2/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${basicAuth}`,
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Failed to refresh Twitter token:", error);
            return null;
        }

        const data = await response.json();
        
        // Update the token in the database
        await prisma.account.update({
            where: { id: accountId },
            data: {
                access_token: data.access_token,
                refresh_token: data.refresh_token || refreshToken,
                expires_at: data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : undefined,
            },
        });

        console.log("✅ Twitter token refreshed successfully");
        return data.access_token;
    } catch (error) {
        console.error("Error refreshing Twitter token:", error);
        return null;
    }
}

/**
 * Post a roast to X/Twitter
 */
export async function postToTwitter(
    userId: string,
    message: string
): Promise<PostResult> {
    try {
        // Get the user's Twitter account from database
        const twitterAccount = await prisma.account.findFirst({
            where: {
                userId: userId,
                provider: "twitter",
            },
        });

        if (!twitterAccount?.access_token) {
            return {
                success: false,
                platform: "twitter",
                error: "No Twitter account connected",
            };
        }

        let accessToken = twitterAccount.access_token;

        // Check if token might be expired (if we have expires_at)
        if (twitterAccount.expires_at) {
            const expiresAt = twitterAccount.expires_at * 1000; // Convert to milliseconds
            const now = Date.now();
            const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

            if (now >= expiresAt - bufferTime) {
                console.log("🔄 Twitter token expired or expiring soon, refreshing...");
                if (twitterAccount.refresh_token) {
                    const newToken = await refreshTwitterToken(
                        twitterAccount.id,
                        twitterAccount.refresh_token
                    );
                    if (newToken) {
                        accessToken = newToken;
                    } else {
                        return {
                            success: false,
                            platform: "twitter",
                            error: "Failed to refresh expired token. Please reconnect your X account.",
                        };
                    }
                } else {
                    return {
                        success: false,
                        platform: "twitter",
                        error: "Token expired and no refresh token available. Please reconnect your X account.",
                    };
                }
            }
        }

        // Post to Twitter API v2
        const response = await fetch("https://api.twitter.com/2/tweets", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: message,
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error("Twitter API error:", result);
            
            // If unauthorized, try to refresh token
            if (response.status === 401 && twitterAccount.refresh_token) {
                console.log("🔄 Got 401, attempting token refresh...");
                const newToken = await refreshTwitterToken(
                    twitterAccount.id,
                    twitterAccount.refresh_token
                );
                
                if (newToken) {
                    // Retry with new token
                    const retryResponse = await fetch("https://api.twitter.com/2/tweets", {
                        method: "POST",
                        headers: {
                            Authorization: `Bearer ${newToken}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            text: message,
                        }),
                    });

                    const retryResult = await retryResponse.json();

                    if (retryResponse.ok) {
                        console.log(`✅ Posted to Twitter (after refresh): ${retryResult.data?.id}`);
                        return {
                            success: true,
                            platform: "twitter",
                            postId: retryResult.data?.id,
                        };
                    }

                    return {
                        success: false,
                        platform: "twitter",
                        error: retryResult.detail || retryResult.title || "Failed after token refresh",
                    };
                }
            }

            return {
                success: false,
                platform: "twitter",
                error: result.detail || result.title || "Failed to post tweet",
            };
        }

        console.log(`✅ Posted to Twitter: ${result.data?.id}`);
        return {
            success: true,
            platform: "twitter",
            postId: result.data?.id,
        };
    } catch (error) {
        console.error("Error posting to Twitter:", error);
        return {
            success: false,
            platform: "twitter",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Post a roast to LinkedIn
 */
export async function postToLinkedIn(
    userId: string,
    message: string
): Promise<PostResult> {
    try {
        const linkedinAccount = await prisma.account.findFirst({
            where: {
                userId: userId,
                provider: "linkedin",
            },
        });

        if (!linkedinAccount?.access_token) {
            return {
                success: false,
                platform: "linkedin",
                error: "No LinkedIn account connected",
            };
        }

        // Get user's LinkedIn ID first
        const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: {
                Authorization: `Bearer ${linkedinAccount.access_token}`,
            },
        });

        if (!profileResponse.ok) {
            return {
                success: false,
                platform: "linkedin",
                error: "Failed to get LinkedIn profile",
            };
        }

        const profile = await profileResponse.json();
        const personUrn = `urn:li:person:${profile.sub}`;

        // Post to LinkedIn
        const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${linkedinAccount.access_token}`,
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0",
            },
            body: JSON.stringify({
                author: personUrn,
                lifecycleState: "PUBLISHED",
                specificContent: {
                    "com.linkedin.ugc.ShareContent": {
                        shareCommentary: {
                            text: message,
                        },
                        shareMediaCategory: "NONE",
                    },
                },
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
                },
            }),
        });

        const postResult = await postResponse.json();

        if (!postResponse.ok) {
            console.error("LinkedIn API error:", postResult);
            return {
                success: false,
                platform: "linkedin",
                error: postResult.message || "Failed to post to LinkedIn",
            };
        }

        console.log(`✅ Posted to LinkedIn: ${postResult.id}`);
        return {
            success: true,
            platform: "linkedin",
            postId: postResult.id,
        };
    } catch (error) {
        console.error("Error posting to LinkedIn:", error);
        return {
            success: false,
            platform: "linkedin",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Post roast to all configured social platforms
 */
export async function postRoastToSocial(
    repoName: string,
    roastText: string,
    postToTwitter: boolean,
    postToLinkedIn: boolean
): Promise<{ platform: string; success: boolean; postId?: string; error?: string }[]> {
    const results: { platform: string; success: boolean; postId?: string; error?: string }[] = [];

    // Get the tracked repo to find the userId
    const trackedRepo = await prisma.trackedRepo.findUnique({
        where: { repoName },
        select: { userId: true },
    });

    console.log(`🔍 TrackedRepo for ${repoName}:`, trackedRepo);

    if (!trackedRepo?.userId) {
        console.error(`No userId found for repo ${repoName}`);
        return [{ platform: "all", success: false, error: "No user associated with repo" }];
    }

    // Find the user's Twitter account from NextAuth Account table
    if (postToTwitter) {
        const twitterAccount = await prisma.account.findFirst({
            where: {
                userId: trackedRepo.userId,
                provider: "twitter",
            },
        });

        console.log(`🐦 Twitter account for user ${trackedRepo.userId}:`, !!twitterAccount);

        if (twitterAccount?.access_token) {
            try {
                // Check if token needs refresh
                let accessToken = twitterAccount.access_token;
                
                if (twitterAccount.refresh_token && twitterAccount.expires_at) {
                    const expiresAt = new Date(twitterAccount.expires_at * 1000);
                    if (expiresAt < new Date()) {
                        console.log("🔄 Twitter token expired, refreshing...");
                        const refreshed = await refreshTwitterToken(twitterAccount.refresh_token);
                        if (refreshed) {
                            accessToken = refreshed.access_token;
                            // Update the stored token
                            await prisma.account.update({
                                where: { id: twitterAccount.id },
                                data: {
                                    access_token: refreshed.access_token,
                                    refresh_token: refreshed.refresh_token || twitterAccount.refresh_token,
                                    expires_at: refreshed.expires_at,
                                },
                            });
                        }
                    }
                }

                const result = await postToTwitterAPI(roastText, accessToken);
                results.push(result);
            } catch (error) {
                console.error("Twitter posting error:", error);
                results.push({
                    platform: "twitter",
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        } else {
            results.push({ platform: "twitter", success: false, error: "No Twitter token found for user" });
        }
    }

    // Find the user's LinkedIn account from NextAuth Account table
    if (postToLinkedIn) {
        const linkedinAccount = await prisma.account.findFirst({
            where: {
                userId: trackedRepo.userId,
                provider: "linkedin",
            },
        });

        console.log(`💼 LinkedIn account for user ${trackedRepo.userId}:`, !!linkedinAccount);

        if (linkedinAccount?.access_token) {
            try {
                const result = await postToLinkedInAPI(roastText, linkedinAccount.access_token);
                results.push(result);
            } catch (error) {
                console.error("LinkedIn posting error:", error);
                results.push({
                    platform: "linkedin",
                    success: false,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }
        } else {
            results.push({ platform: "linkedin", success: false, error: "No LinkedIn token found for user" });
        }
    }

    return results;
}

// Helper function to post to Twitter API v2
async function postToTwitterAPI(
    text: string,
    accessToken: string
): Promise<{ platform: string; success: boolean; postId?: string; error?: string }> {
    const response = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("Twitter API error:", error);
        return { platform: "twitter", success: false, error: `Twitter API error: ${response.status}` };
    }

    const data = await response.json();
    return { platform: "twitter", success: true, postId: data.data?.id };
}

// Helper function to post to LinkedIn API
async function postToLinkedInAPI(
    text: string,
    accessToken: string
): Promise<{ platform: string; success: boolean; postId?: string; error?: string }> {
    // First get the user's LinkedIn ID
    const meResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { "Authorization": `Bearer ${accessToken}` },
    });

    if (!meResponse.ok) {
        return { platform: "linkedin", success: false, error: "Failed to get LinkedIn user info" };
    }

    const me = await meResponse.json();
    const authorUrn = `urn:li:person:${me.sub}`;

    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
            author: authorUrn,
            lifecycleState: "PUBLISHED",
            specificContent: {
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: { text },
                    shareMediaCategory: "NONE",
                },
            },
            visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("LinkedIn API error:", error);
        return { platform: "linkedin", success: false, error: `LinkedIn API error: ${response.status}` };
    }

    const data = await response.json();
    return { platform: "linkedin", success: true, postId: data.id };
}