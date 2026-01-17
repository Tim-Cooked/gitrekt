import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string[] }> }
) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const repoName = slug.join("/");

    console.log(`Fetching roasts for ${repoName}`);

    try {
        const roasts = await prisma.event.findMany({
            where: { repoName },
            orderBy: { createdAt: "desc" },
        });

        console.log(`Found ${roasts.length} roasts`);

        return NextResponse.json({ roasts });
    } catch (error) {
        console.error("Failed to fetch roasts:", error);
        return NextResponse.json(
            { error: "Failed to fetch roasts" },
            { status: 500 }
        );
    }
}