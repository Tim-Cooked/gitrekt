import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCommitDiff } from "@/lib/github";

export async function POST(req: NextRequest) {
    try {
        const { repo, sha } = await req.json();

        if (!repo || !sha) {
            return NextResponse.json(
                { error: "Missing repo or sha" },
                { status: 400 }
            );
        }

        // Get tracked repo for access token
        const trackedRepo = await prisma.trackedRepo.findUnique({
            where: { repoName: repo },
        });

        if (!trackedRepo) {
            return NextResponse.json(
                { error: "Repo not tracked" },
                { status: 404 }
            );
        }

        // Fetch the diff
        const diff = await getCommitDiff(repo, trackedRepo.accessToken, sha);

        // TODO
        // For now, just return success (the actual failure detection
        // happens via the workflow_run webhook)
        return NextResponse.json({ 
            message: "Judgment recorded",
            verdict: "pending" 
        });
    } catch (error) {
        console.error("Judge error:", error);
        return NextResponse.json(
            { error: "Judgment failed" },
            { status: 500 }
        );
    }
}