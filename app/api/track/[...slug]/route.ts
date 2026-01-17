import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ slug: string[] }> }
) {
    const session = await auth();
    
    const accessToken = (session as { accessToken?: string })?.accessToken;
    if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const repoFullName = resolvedParams.slug.join("/");

    try {
        const trackedRepo = await prisma.trackedRepo.findUnique({
            where: { repoName: repoFullName },
            select: {
                postToLinkedIn: true,
                postToTwitter: true,
                yoloMode: true,
                timerMinutes: true,
            },
        });

        if (!trackedRepo) {
            return NextResponse.json({ tracked: false });
        }

        return NextResponse.json({
            tracked: true,
            config: {
                postToLinkedIn: trackedRepo.postToLinkedIn,
                postToTwitter: trackedRepo.postToTwitter,
                yoloMode: trackedRepo.yoloMode,
                timerMinutes: trackedRepo.timerMinutes,
            },
        });
    } catch (error) {
        console.error("Error fetching tracking status:", error);
        return NextResponse.json(
            { error: "Failed to fetch tracking status" },
            { status: 500 }
        );
    }
}
