import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWebhook, getDefaultBranch, isRepoEmpty } from "@/lib/github";

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
    timerMinutes?: number;
}

export async function POST(request: Request) {
    const session = await auth();

    const accessToken = (session as { accessToken?: string })?.accessToken;
    if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { repoFullName, tracked, config } = await request.json() as {
            repoFullName: string;
            tracked: boolean;
            config?: TrackingConfig;
        };

        if (!repoFullName || typeof tracked !== "boolean") {
            return NextResponse.json(
                { error: "Invalid request body" },
                { status: 400 }
            );
        }

        if (tracked) {
            try {
                // Create webhook
                await createWebhook(repoFullName, accessToken);
            } catch (error) {
                console.error("Error creating webhook:", error);
                const errorMsg = error instanceof Error ? error.message : "Failed to create webhook";
                throw new Error(`Webhook creation failed: ${errorMsg}`);
            }

            try {
                // Store in database with config
                await prisma.trackedRepo.upsert({
                    where: { repoName: repoFullName },
                    update: { 
                        accessToken: accessToken,
                        postToLinkedIn: config?.postToLinkedIn ?? false,
                        postToTwitter: config?.postToTwitter ?? false,
                        yoloMode: config?.yoloMode ?? false,
                        timerMinutes: config?.timerMinutes ?? 30,
                    },
                    create: { 
                        repoName: repoFullName, 
                        accessToken: accessToken,
                        postToLinkedIn: config?.postToLinkedIn ?? false,
                        postToTwitter: config?.postToTwitter ?? false,
                        yoloMode: config?.yoloMode ?? false,
                        timerMinutes: config?.timerMinutes ?? 30,
                    },
                });
            } catch (error) {
                console.error("Error storing in database:", error);
                const errorMsg = error instanceof Error ? error.message : "Database operation failed";
                throw new Error(`Database error: ${errorMsg}`);
            }

            try {
                // Install the GitHub Actions workflow
                await installWatchdog(repoFullName, accessToken);
            } catch (error) {
                console.error("Error installing workflow:", error);
                const errorMsg = error instanceof Error ? error.message : "Failed to install workflow";
                throw new Error(`Workflow installation failed: ${errorMsg}`);
            }
        } else {
            await prisma.trackedRepo
                .delete({ where: { repoName: repoFullName } })
                .catch(() => {});
        }

        return NextResponse.json({ success: true, tracked });
    } catch (error) {
        console.error("Error updating tracking:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to update tracking";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}