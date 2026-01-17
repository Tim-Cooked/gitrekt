import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCommitDiff } from "@/lib/github";

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

    if (event === "workflow_run") {
        const { action, workflow_run } = payload;

        if (action === "completed" && workflow_run.conclusion === "failure") {
            const actor = workflow_run.actor.login;
            const repo = workflow_run.repository.full_name;
            const commitMessage = workflow_run.head_commit?.message || "No commit message";
            const branch = workflow_run.head_branch;
            const commitSha = workflow_run.head_sha;

            console.log(`FAIL: ${actor} broke the build in ${repo} on branch ${branch}!`);

            // Get Access Token for this Repo
            const trackedRepo = await prisma.trackedRepo.findUnique({
                where: { repoName: repo },
            });

            // Fetch Diff
            let diff = "";
            if (trackedRepo) {
                console.log("Fetching diff for commit:", commitSha);
                const fetchedDiff = await getCommitDiff(repo, trackedRepo.accessToken, commitSha);
                if (fetchedDiff) diff = fetchedDiff;
            } else {
                console.log("No token found for repo, skipping diff fetch.");
            }

            // Generate roast
            const roast = "You suck!"
            console.log("\n--- ROAST ---");
            console.log(roast);
            console.log("----------------------------\n");

            // Save to DB
            try {
                await prisma.Event.create({
                    data: {
                        repoName: repo,
                        actor: actor,
                        commitMessage: commitMessage,
                        diffSummary: diff ? diff.substring(0, 5000) : null,
                        roast: roast || "Failed to generate roast.",
                    }
                });
                console.log("Saved event to DB.");
            } catch (e) {
                console.error("Failed to save to DB:", e);
            }
        }
    } else if (event === "repository") {
        const { action, repository } = payload;

        if (action === "deleted") {
            const repoName = repository.full_name;
            console.log(`🗑️ Repository deleted on GitHub: ${repoName}. Cleaning up data...`);

            try {
                // Determine if we have data to delete
                const trackedRepo = await prisma.trackedRepo.findUnique({
                    where: { repoName: repoName },
                });

                if (trackedRepo) {
                    // Delete associated roasts
                    await prisma.Event.deleteMany({
                        where: { repoName: repoName },
                    });

                    // Delete tracked repo entry
                    await prisma.trackedRepo.delete({
                        where: { repoName: repoName },
                    });
                    console.log(`Automatically cleaned up data for ${repoName}`);
                }
            } catch (e) {
                console.error("Failed to auto-cleanup:", e);
            }
        }
    }

    return NextResponse.json({ message: "Received" });
}
