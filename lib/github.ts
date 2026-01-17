const GITHUB_API_BASE = "https://api.github.com";

interface GitHubRequestOptions {
    accessToken: string;
    accept?: string;
}

async function githubFetch(
    endpoint: string,
    options: GitHubRequestOptions
): Promise<Response> {
    return fetch(`${GITHUB_API_BASE}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${options.accessToken}`,
            Accept: options.accept || "application/vnd.github+json",
        },
    });
}

export interface CommitInfo {
    author: string;
    message: string;
    branch?: string;
}

export async function getCommitInfo(
    repoName: string,
    accessToken: string,
    sha: string
): Promise<CommitInfo> {
    try {
        const response = await githubFetch(`/repos/${repoName}/commits/${sha}`, {
            accessToken,
        });

        if (!response.ok) {
            console.error(`Failed to fetch commit info: ${response.status}`);
            return { author: "unknown", message: "Unknown commit" };
        }

        const data = await response.json();
        return {
            author: data.author?.login || data.commit?.author?.name || "unknown",
            message: data.commit?.message || "No message",
        };
    } catch (error) {
        console.error("Failed to get commit info:", error);
        return { author: "unknown", message: "Unknown commit" };
    }
}

export async function getCommitDiff(
    repoName: string,
    accessToken: string,
    commitSha: string
): Promise<string | null> {
    try {
        const response = await githubFetch(`/repos/${repoName}/commits/${commitSha}`, {
            accessToken,
            accept: "application/vnd.github.diff",
        });

        if (!response.ok) {
            console.error(`Failed to fetch diff: ${response.status}`);
            return null;
        }

        return await response.text();
    } catch (error) {
        console.error("Failed to fetch diff:", error);
        return null;
    }
}

export async function createWebhook(
    repoName: string,
    accessToken: string
): Promise<void> {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github`;
    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!secret) {
        throw new Error("GITHUB_WEBHOOK_SECRET not configured");
    }

    const response = await fetch(`${GITHUB_API_BASE}/repos/${repoName}/hooks`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
            name: "web",
            active: true,
            events: ["workflow_run", "repository"],
            config: {
                url: webhookUrl,
                content_type: "json",
                secret,
                insecure_ssl: "0",
            },
        }),
    });

    // 422 - hook already exists
    if (!response.ok && response.status !== 422) {
        const error = await response.text();
        throw new Error(`Failed to create webhook: ${error}`);
    }
}

export async function getDefaultBranch(
    repoName: string,
    accessToken: string
): Promise<string> {
    try {
        const response = await githubFetch(`/repos/${repoName}`, { accessToken });

        if (response.ok) {
            const data = await response.json();
            return data.default_branch || "main";
        }
    } catch (error) {
        console.error("Failed to fetch default branch:", error);
    }

    return "main";
}

export async function isRepoEmpty(
    repoName: string,
    accessToken: string,
    branch: string
): Promise<boolean> {
    try {
        const response = await githubFetch(
            `/repos/${repoName}/git/trees/${branch}?recursive=0`,
            { accessToken }
        );

        return response.status === 409;
    } catch (error) {
        console.error("Failed to check if repo is empty:", error);
        return false;
    }
}