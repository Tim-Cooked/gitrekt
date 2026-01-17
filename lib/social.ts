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
// export async function postRoastToSocial(
//     repoName: string,
//     roastMessage: string,
//     postToTwitterEnabled: boolean,
//     postToLinkedInEnabled: boolean
// ): Promise<PostResult[]> {
//     const results: PostResult[] = [];

//     // Find the user who owns this repo
//     const trackedRepo = await prisma.trackedRepo.findUnique({
//         where: { repoName },
//     });

//     if (!trackedRepo) {
//         console.error(`No tracked repo found for ${repoName}`);
//         return results;
//     }

//     // Find the user by matching the access token to an account
//     const account = await prisma.account.findFirst({
//         where: {
//             provider: "github",
//             access_token: trackedRepo.accessToken,
//         },
//     });

//     if (!account) {
//         console.error(`No user found for repo ${repoName}`);
//         return results;
//     }

//     const userId = account.userId;

//     if (postToTwitterEnabled) {
//         const twitterResult = await postToTwitter(userId, roastMessage);
//         results.push(twitterResult);
//     }

//     if (postToLinkedInEnabled) {
//         const linkedinResult = await postToLinkedIn(userId, roastMessage);
//         results.push(linkedinResult);
//     }

//     return results;
// }

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

    if (!trackedRepo?.userId) {
        console.error(`No userId found for repo ${repoName}`);
        return [{ platform: "all", success: false, error: "No user associated with repo" }];
    }

    // Find the user's social tokens using their GitHub ID
    // @ts-expect-error - Prisma generates userSession from UserSession model
    const userSession = await prisma.userSession.findUnique({
        where: { githubId: trackedRepo.userId },
    });

    if (!userSession) {
        console.error(`No user session found for userId ${trackedRepo.userId}`);
        return [{ platform: "all", success: false, error: "User session not found" }];
    }

    // Post to Twitter if enabled and token exists
    if (postToTwitter && userSession.twitterToken) {
        try {
            const result = await postToTwitter(roastText, userSession.twitterToken, userSession.twitterSecret);
            results.push(result);
        } catch (error) {
            results.push({ 
                platform: "twitter", 
                success: false, 
                error: error instanceof Error ? error.message : "Unknown error" 
            });
        }
    } else if (postToTwitter) {
        results.push({ platform: "twitter", success: false, error: "No Twitter token found" });
    }

    // Post to LinkedIn if enabled and token exists
    if (postToLinkedIn && userSession.linkedInToken) {
        try {
            const result = await postToLinkedInAPI(roastText, userSession.linkedInToken);
            results.push(result);
        } catch (error) {
            results.push({ 
                platform: "linkedin", 
                success: false, 
                error: error instanceof Error ? error.message : "Unknown error" 
            });
        }
    } else if (postToLinkedIn) {
        results.push({ platform: "linkedin", success: false, error: "No LinkedIn token found" });
    }

    return results;
}