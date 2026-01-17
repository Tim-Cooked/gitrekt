import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
        return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    // Verify Signature
    const signature = req.headers.get("x-hub-signature-256");
    const body = await req.text();

    const hmac = crypto.createHmac("sha256", secret);
    const digest = Buffer.from("sha256=" + hmac.update(body).digest("hex"), "utf8");
    const checksum = Buffer.from(signature || "", "utf8");

    if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = req.headers.get("x-github-event");
    const payload = JSON.parse(body);

    // Handle push events - trigger judgment
    if (event === "push") {
        const repoName = payload.repository.full_name;
        const commitSha = payload.after; // The commit SHA that was pushed
        const ref = payload.ref; // e.g., "refs/heads/main"
        
        // Only judge commits to the default branch (not tags or other refs)
        if (ref && ref.startsWith("refs/heads/")) {
            console.log(`📥 Push event received for ${repoName} - commit ${commitSha}`);
            
            // Check if repo is tracked
            const trackedRepo = await prisma.trackedRepo.findUnique({
                where: { repoName },
            });
            
            if (trackedRepo) {
                // Trigger judgment asynchronously (don't block webhook response)
                fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/judge`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        repo: repoName,
                        sha: commitSha,
                    }),
                }).catch((error) => {
                    console.error(`Failed to trigger judgment for ${commitSha}:`, error);
                });
                
                console.log(`✅ Triggered judgment for commit ${commitSha} in ${repoName}`);
            } else {
                console.log(`⏭️ Repo ${repoName} is not tracked, skipping judgment`);
            }
        }
        
        return NextResponse.json({ message: "Push event received" });
    }

    // Handle repository deletion
    if (event === "repository" && payload.action === "deleted") {
        const repoName = payload.repository.full_name;
        console.log(`Repository deleted: ${repoName}. Cleaning up...`);

        try {
            await prisma.event.deleteMany({ where: { repoName } });
            await prisma.trackedRepo.delete({ where: { repoName } }).catch(() => {});
            console.log(`Cleaned up data for ${repoName}`);
        } catch (e) {
            console.error("Failed to cleanup:", e);
        }
    }

    return NextResponse.json({ message: "Received" });
}