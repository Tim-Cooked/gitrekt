import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { postToTwitter } from "@/lib/social";

export async function POST() {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Find the user
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: session.user.email ?? undefined },
                    { name: session.user.name ?? undefined },
                ],
            },
            include: {
                accounts: {
                    where: { provider: "twitter" },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const twitterAccount = user.accounts[0];

        if (!twitterAccount) {
            return NextResponse.json({
                error: "No Twitter account connected",
                hint: "Go to /dashboard/settings and connect your X account first",
            }, { status: 400 });
        }

        // Show debug info about the token
        const tokenInfo = {
            hasAccessToken: !!twitterAccount.access_token,
            hasRefreshToken: !!twitterAccount.refresh_token,
            tokenPreview: twitterAccount.access_token
                ? `${twitterAccount.access_token.slice(0, 10)}...${twitterAccount.access_token.slice(-4)}`
                : null,
            expiresAt: twitterAccount.expires_at
                ? new Date(twitterAccount.expires_at * 1000).toISOString()
                : "No expiry set",
            isExpired: twitterAccount.expires_at
                ? Date.now() > twitterAccount.expires_at * 1000
                : "Unknown",
            scope: twitterAccount.scope,
            tokenType: twitterAccount.token_type,
        };

        console.log("Token info:", tokenInfo);

        // Create a test message
        const testMessage = `🧪 GitRekt Test Post!

This is a test roast to verify X/Twitter integration is working.

If you're seeing this, the shame pipeline is operational! 💀

#GitRekt #TestPost #${Date.now()}`;

        const result = await postToTwitter(user.id, testMessage);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: "Test tweet posted successfully!",
                tweetId: result.postId,
                tweetUrl: `https://twitter.com/i/web/status/${result.postId}`,
                tokenInfo,
            });
        } else {
            return NextResponse.json({
                success: false,
                error: result.error,
                tokenInfo,
                hint: "If the token is expired, try disconnecting and reconnecting your X account in settings.",
            }, { status: 400 });
        }
    } catch (error) {
        console.error("Test post error:", error);
        return NextResponse.json(
            { error: "Failed to test post", details: error instanceof Error ? error.message : "Unknown" },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: "Use POST to send a test tweet",
        endpoint: "/api/debug/test-twitter-post",
    });
}