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