export async function createWebhook(repoName: string, accessToken: string) {
    const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github`
    const SECRET = process.env.GITHUB_WEBHOOK_SECRET;

    if (!SECRET) {
        throw new Error("GITHUB_WEBHOOK_SECRET is not defined");
    }

    // Get owner and repo
    const response = await fetch(`https://api.github.com/repos/${repoName}/hooks`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({
            name: "web",
            active: true,
            events: ["workflow_run", "repository"],
            config: {
                url: WEBHOOK_URL,
                content_type: "json",
                secret: SECRET,
                insecure_ssl: "0",
            },
        }),
    });

    if (!response.ok) {
        // Check if hook already exists
        if (response.status === 422) {
            console.log("Webhook already exists.");
            return;
        }
        const error = await response.text();
        throw new Error(`Failed to create webhook: ${response.status} ${error}`);
    }

    console.log(`Webhook created for ${repoName}`);
}

export async function getCommitDiff(repoName: string, accessToken: string, commitSha: string) {
    const response = await fetch(`https://api.github.com/repos/${repoName}/commits/${commitSha}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3.diff", // Request diff format
        },
    });

    if (!response.ok) {
        console.error("Failed to fetch diff:", await response.text());
        return null;
    }

    return response.text();
}

export async function getCommitDetails(repoName: string, accessToken: string, commitSha: string) {
    const response = await fetch(`https://api.github.com/repos/${repoName}/commits/${commitSha}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
        },
    });

    if (!response.ok) {
        console.error("Failed to fetch commit details:", await response.text());
        return null;
    }

    const data = await response.json();
    return {
        message: data.commit.message,
        authorName: data.commit.author.name,
    };
}
