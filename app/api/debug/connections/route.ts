import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Find user
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: session.user.email ?? undefined },
                    { name: session.user.name ?? undefined },
                ],
            },
            include: {
                accounts: {
                    select: {
                        provider: true,
                        providerAccountId: true,
                        access_token: true,
                        refresh_token: true,
                        expires_at: true,
                        token_type: true,
                        scope: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Mask tokens for security (show first/last 4 chars)
        const maskedAccounts = user.accounts.map((acc) => ({
            provider: acc.provider,
            providerAccountId: acc.providerAccountId,
            hasAccessToken: !!acc.access_token,
            accessTokenPreview: acc.access_token
                ? `${acc.access_token.slice(0, 4)}...${acc.access_token.slice(-4)}`
                : null,
            hasRefreshToken: !!acc.refresh_token,
            expiresAt: acc.expires_at ? new Date(acc.expires_at * 1000).toISOString() : null,
            tokenType: acc.token_type,
            scope: acc.scope,
        }));

        // Test GitHub token
        let githubValid = false;
        const githubAccount = user.accounts.find((a) => a.provider === "github");
        if (githubAccount?.access_token) {
            const ghRes = await fetch("https://api.github.com/user", {
                headers: { Authorization: `Bearer ${githubAccount.access_token}` },
            });
            githubValid = ghRes.ok;
        }

        // Test Twitter token
        let twitterValid = false;
        const twitterAccount = user.accounts.find((a) => a.provider === "twitter");
        if (twitterAccount?.access_token) {
            const twRes = await fetch("https://api.twitter.com/2/users/me", {
                headers: { Authorization: `Bearer ${twitterAccount.access_token}` },
            });
            twitterValid = twRes.ok;
        }

        return NextResponse.json({
            userId: user.id,
            email: user.email,
            name: user.name,
            accounts: maskedAccounts,
            tokenValidation: {
                github: githubValid,
                twitter: twitterValid,
            },
        });
    } catch (error) {
        console.error("Debug connections error:", error);
        return NextResponse.json(
            { error: "Failed to fetch connections" },
            { status: 500 }
        );
    }
}