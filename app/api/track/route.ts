import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWebhook } from "@/lib/github";

async function installWatchdog(repoName: string, accessToken: string) {
    // Get the default branch
    let defaultBranch = "main";
    try {
        const repoRes = await fetch(`https://api.github.com/repos/${repoName}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (repoRes.ok) {
            const repoData = await repoRes.json();
            defaultBranch = repoData.default_branch || "main";
        }
    } catch (e) {
        console.error("Failed to fetch default branch", e);
    }

    // Check if repo is empty
    let isRepoEmpty = false;
    try {
        const treesRes = await fetch(
            `https://api.github.com/repos/${repoName}/git/trees/${defaultBranch}?recursive=0`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (treesRes.status === 409) {
            isRepoEmpty = true;
        }
    } catch (e) {
        console.error("Failed to fetch file tree", e);
    }

    // Define the workflow
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
    if (isRepoEmpty) {
        const readmeRes = await fetch(
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

        if (!readmeRes.ok) {
            console.error("Failed to create README:", await readmeRes.text());
        }
        await new Promise(r => setTimeout(r, 2000));
    }

    // Check if workflow already exists (to get SHA for update)
    const fileUrl = `https://api.github.com/repos/${repoName}/contents/.github/workflows/gitrekt.yml`;
    let sha: string | undefined;

    const existingRes = await fetch(fileUrl, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json"
        }
    });

    if (existingRes.ok) {
        const data = await existingRes.json();
        sha = data.sha;
    }

    // Create or update workflow file
    const putBody: Record<string, string | undefined> = {
        message: sha ? "Update GitRekt workflow" : "Setup GitRekt workflow",
        content: Buffer.from(workflowContent).toString("base64"),
        sha: sha,
    };

    if (!isRepoEmpty) {
        putBody.branch = defaultBranch;
    }

    const response = await fetch(fileUrl, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
        },
        body: JSON.stringify(putBody),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("Failed to install workflow:", error);
        throw new Error("Failed to install workflow");
    }

    console.log("Workflow installed successfully.");
}

export async function POST(request: Request) {
    const session = await auth();
    
    const accessToken = (session as { accessToken?: string })?.accessToken;
    if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { repoFullName, tracked } = await request.json();

        if (!repoFullName || typeof tracked !== "boolean") {
            return NextResponse.json(
                { error: "Invalid request body" },
                { status: 400 }
            );
        }

        if (tracked) {
            // Create webhook
            await createWebhook(repoFullName, accessToken);

            // Store in database
            await prisma.trackedRepo.upsert({
                where: { repoName: repoFullName },
                update: { accessToken: accessToken },
                create: { 
                    repoName: repoFullName, 
                    accessToken: accessToken 
                },
            });

            // Install the GitHub Actions workflow
            await installWatchdog(repoFullName, accessToken);
        } else {
            // Remove from database
            await prisma.trackedRepo.delete({
                where: { repoName: repoFullName },
            }).catch(() => {});
        }

        return NextResponse.json({ 
            success: true,
            tracked 
        });
    } catch (error) {
        console.error("Error updating tracking:", error);
        return NextResponse.json(
            { error: "Failed to update tracking" },
            { status: 500 }
        );
    }
}