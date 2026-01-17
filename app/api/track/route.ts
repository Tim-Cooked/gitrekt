import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWebhook, getDefaultBranch, isRepoEmpty, deleteWebhook, deleteWorkflow } from "@/lib/github";

async function installWatchdog(repoName: string, accessToken: string) {
    const defaultBranch = await getDefaultBranch(repoName, accessToken);
    const repoEmpty = await isRepoEmpty(repoName, accessToken, defaultBranch);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const workflowContent = `name: GitRekt Judge
on: [push]
jobs:
  judge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Ask AI Judge
        run: |
          echo "Judging your code..."
          HTTP_CODE=$(curl -s -o response.json -w "%{http_code}" -X POST \\
            -H "Content-Type: application/json" \\
            -d "{\\"repo\\": \\"\${{ github.repository }}\\", \\"sha\\": \\"\${{ github.sha }}\\"}" \\
            ${appUrl}/api/judge)
          
          echo "Response Code: $HTTP_CODE"
          cat response.json
          
          if [ "$HTTP_CODE" -ne 200 ]; then
            echo "Your code has been deemed UNWORTHY."
            exit 1
          else
            echo "Your code passes... for now."
            exit 0
          fi
`;

    // Initialize repo if empty
    if (repoEmpty) {
        await initializeEmptyRepo(repoName, accessToken);
    }

    await createOrUpdateWorkflow(repoName, accessToken, workflowContent, defaultBranch, repoEmpty);
}

async function initializeEmptyRepo(repoName: string, accessToken: string) {
    const response = await fetch(
        `https://api.github.com/repos/${repoName}/contents/README.md`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
            },
            body: JSON.stringify({
                message: "Initialize GitRekt Repository",
                content: Buffer.from("# GitRekt Tracked Repo\n\nThis repository is being watched.").toString("base64"),
            }),
        }
    );

    if (!response.ok) {
        console.error("Failed to create README:", await response.text());
    }

    // Wait for GitHub to process
    await new Promise((r) => setTimeout(r, 2000));
}

async function createOrUpdateWorkflow(
    repoName: string,
    accessToken: string,
    content: string,
    defaultBranch: string,
    isRepoEmpty: boolean
) {
    const fileUrl = `https://api.github.com/repos/${repoName}/contents/.github/workflows/gitrekt.yml`;

    // Check if workflow exists to get SHA for update
    let sha: string | undefined;
    const existingRes = await fetch(fileUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
        },
    });

    if (existingRes.ok) {
        const data = await existingRes.json();
        sha = data.sha;
    }

    const body: Record<string, string | undefined> = {
        message: sha ? "Update GitRekt workflow" : "Setup GitRekt workflow",
        content: Buffer.from(content).toString("base64"),
        sha,
    };

    if (!isRepoEmpty) {
        body.branch = defaultBranch;
    }

    const response = await fetch(fileUrl, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("Failed to install workflow:", error);
        throw new Error("Failed to install workflow");
    }

    console.log("Workflow installed successfully.");
}

interface TrackingConfig {
    postToLinkedIn?: boolean;
    postToTwitter?: boolean;
    yoloMode?: boolean;
    revertCommit?: boolean;
    timerMinutes?: number;
}

export async function GET(request: Request) {
    const session = await auth();

    const accessToken = (session as { accessToken?: string })?.accessToken;
    if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const repoFullName = searchParams.get("repoFullName");

        if (!repoFullName) {
            return NextResponse.json(
                { error: "Missing repoFullName parameter" },
                { status: 400 }
            );
        }

        const trackedRepo = await prisma.trackedRepo.findUnique({
            where: { repoName: repoFullName },
            select: {
                postToLinkedIn: true,
                postToTwitter: true,
                yoloMode: true,
                revertCommit: true,
                timerMinutes: true,
            },
        });

        if (!trackedRepo) {
            return NextResponse.json({
                config: {
                    postToLinkedIn: false,
                    postToTwitter: false,
                    yoloMode: false,
                    revertCommit: false,
                    timerMinutes: 30,
                },
            });
        }

        return NextResponse.json({
            config: {
                postToLinkedIn: trackedRepo.postToLinkedIn,
                postToTwitter: trackedRepo.postToTwitter,
                yoloMode: trackedRepo.yoloMode,
                revertCommit: trackedRepo.revertCommit,
                timerMinutes: trackedRepo.timerMinutes,
            },
        });
    } catch (error) {
        console.error("Error fetching tracking config:", error);
        return NextResponse.json(
            { error: "Failed to fetch tracking config" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get userId from session - this comes from the JWT callback
        // @ts-expect-error - custom session property
        const userId = session.userId;
        // @ts-expect-error - custom session property  
        const accessToken = session.accessToken;

        console.log("📍 Track API - userId:", userId);
        console.log("📍 Track API - accessToken exists:", !!accessToken);

        if (!accessToken) {
            return NextResponse.json({ error: "No access token" }, { status: 401 });
        }

        const body = await request.json();
        const { repoFullName, config } = body;

        if (!repoFullName) {
            return NextResponse.json({ error: "Repository name required" }, { status: 400 });
        }

        // Upsert the tracked repo WITH userId
        const trackedRepo = await prisma.trackedRepo.upsert({
            where: { repoName: repoFullName },
            update: {
                accessToken: accessToken,
                userId: userId, // Store the user ID
                postToLinkedIn: config?.postToLinkedIn ?? false,
                postToTwitter: config?.postToTwitter ?? false,
                yoloMode: config?.yoloMode ?? false,
                revertCommit: config?.revertCommit ?? false,
                timerMinutes: config?.timerMinutes ?? 30,
            },
            create: {
                repoName: repoFullName,
                accessToken: accessToken,
                userId: userId, // Store the user ID
                postToLinkedIn: config?.postToLinkedIn ?? false,
                postToTwitter: config?.postToTwitter ?? false,
                yoloMode: config?.yoloMode ?? false,
                revertCommit: config?.revertCommit ?? false,
                timerMinutes: config?.timerMinutes ?? 30,
            },
        });

        console.log("✅ TrackedRepo saved with userId:", trackedRepo.userId);

        return NextResponse.json({ success: true, repo: trackedRepo });
    } catch (error) {
        console.error("Track API error:", error);
        return NextResponse.json(
            { error: "Failed to track repository" },
            { status: 500 }
        );
    }
}