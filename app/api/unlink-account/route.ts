import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    const session = await auth();
    
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { provider } = body; // "linkedin" or "twitter"

        if (!provider || (provider !== "linkedin" && provider !== "twitter")) {
            return NextResponse.json(
                { error: "Invalid provider. Must be 'linkedin' or 'twitter'" },
                { status: 400 }
            );
        }

        // Find the user session by GitHub ID
        // @ts-expect-error - Prisma generates userSession from UserSession model
        const userSession = await prisma.userSession.findUnique({
            where: { githubId: session.user.id },
        });

        if (!userSession) {
            return NextResponse.json(
                { error: "User session not found" },
                { status: 404 }
            );
        }

        // Update the user session to remove the token
        const updateData: { linkedInToken?: null; twitterToken?: null; twitterSecret?: null } = {};
        
        if (provider === "linkedin") {
            updateData.linkedInToken = null;
        } else if (provider === "twitter") {
            updateData.twitterToken = null;
            updateData.twitterSecret = null;
        }

        // @ts-expect-error - Prisma generates userSession from UserSession model
        await prisma.userSession.update({
            where: { githubId: session.user.id },
            data: updateData,
        });

        return NextResponse.json({ 
            success: true,
            message: `${provider === "linkedin" ? "LinkedIn" : "Twitter"} account unlinked successfully`
        });
    } catch (error) {
        console.error("Error unlinking account:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to unlink account";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
