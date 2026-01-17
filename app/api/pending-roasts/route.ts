import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processExpiredRoasts } from "@/lib/process-expired-roasts";

// GET: Fetch all pending roasts for the authenticated user
export async function GET() {
    const session = await auth();
    
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Process any expired roasts first (lazy processing - no cron needed)
        processExpiredRoasts().catch((err) => {
            console.error("Failed to process expired roasts in background:", err);
        });

        // Get all repos tracked by this user
        // Note: We need to match repos by the user's GitHub username
        // For now, we'll get all pending roasts and filter by user's repos
        const userEmail = session.user.email;
        const userName = session.user.name || session.user.email?.split("@")[0] || "";

        // Get all pending roasts
        const pendingRoasts = await prisma.pendingRoast.findMany({
            where: {
                status: "pending",
                expiresAt: {
                    gt: new Date(), // Only get ones that haven't expired yet
                },
            },
            orderBy: {
                expiresAt: "asc", // Soonest to expire first
            },
        });

        // Filter by repos that belong to this user (by matching actor or repo ownership)
        // For simplicity, we'll return all pending roasts where the actor matches the user
        // In a production system, you'd want to verify repo ownership
        const userPendingRoasts = pendingRoasts.filter(
            (roast) => roast.actor.toLowerCase() === userName.toLowerCase()
        );

        return NextResponse.json({
            pendingRoasts: userPendingRoasts.map((roast) => ({
                id: roast.id,
                repoName: roast.repoName,
                commitSha: roast.commitSha,
                commitMessage: roast.commitMessage,
                errorDetails: roast.errorDetails,
                expiresAt: roast.expiresAt.toISOString(),
                createdAt: roast.createdAt.toISOString(),
                timeRemaining: Math.max(0, Math.floor((roast.expiresAt.getTime() - Date.now()) / 1000)), // seconds remaining
            })),
        });
    } catch (error) {
        console.error("Error fetching pending roasts:", error);
        return NextResponse.json(
            { error: "Failed to fetch pending roasts" },
            { status: 500 }
        );
    }
}

// POST: Check if a pending roast should be resolved (called when user fixes code)
export async function POST(request: Request) {
    const session = await auth();
    
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { pendingRoastId } = await request.json();

        if (!pendingRoastId) {
            return NextResponse.json(
                { error: "Missing pendingRoastId" },
                { status: 400 }
            );
        }

        // Get the pending roast
        const pendingRoast = await prisma.pendingRoast.findUnique({
            where: { id: pendingRoastId },
        });

        if (!pendingRoast) {
            return NextResponse.json(
                { error: "Pending roast not found" },
                { status: 404 }
            );
        }

        if (pendingRoast.status !== "pending") {
            return NextResponse.json(
                { error: "Pending roast already processed" },
                { status: 400 }
            );
        }

        // Check if the error is fixed by checking the latest commit status
        // For now, we'll mark it as resolved if the user explicitly requests it
        // In a full implementation, you'd check GitHub API for latest workflow status
        await prisma.pendingRoast.update({
            where: { id: pendingRoastId },
            data: {
                status: "resolved",
                resolvedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Pending roast resolved",
        });
    } catch (error) {
        console.error("Error resolving pending roast:", error);
        return NextResponse.json(
            { error: "Failed to resolve pending roast" },
            { status: 500 }
        );
    }
}
