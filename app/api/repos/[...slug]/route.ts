import { auth } from "@/auth";
import { NextResponse } from "next/server";

interface GitHubCommit {
    sha: string;
    html_url: string;
    commit: {
        message: string;
        author: {
            name: string;
            email: string;
            date: string;
        };
    };
    author: {
        avatar_url: string;
    } | null;
}

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

    // Check if the last segment is "commits"
    if (resolvedParams.slug.length > 0 && resolvedParams.slug[resolvedParams.slug.length - 1] === "commits") {
        // Handle commits endpoint
        const repoSlug = resolvedParams.slug.slice(0, -1); // Remove "commits" from the end
        const repoFullName = repoSlug.join("/");

        try {
            // Fetch commits from GitHub API
            const commitsResponse = await fetch(
                `https://api.github.com/repos/${repoFullName}/commits?per_page=30`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: "application/vnd.github.v3+json",
                    },
                }
            );

            if (!commitsResponse.ok) {
                const errorText = await commitsResponse.text().catch(() => "Unknown error");
                console.error(`GitHub API error: ${commitsResponse.status} - ${errorText}`);
                throw new Error(`GitHub API error: ${commitsResponse.status} - ${errorText}`);
            }

            const commits: GitHubCommit[] = await commitsResponse.json();

            // Transform commits to include only needed data
            const formattedCommits = commits.map((commit) => ({
                sha: commit.sha,
                message: commit.commit.message,
                author: {
                    name: commit.commit.author.name,
                    email: commit.commit.author.email,
                    date: commit.commit.author.date,
                    avatar: commit.author?.avatar_url || null,
                },
                url: commit.html_url,
            }));

            return NextResponse.json({ commits: formattedCommits });
        } catch (error) {
            console.error("Error fetching commits:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to fetch commits";
            return NextResponse.json(
                { error: errorMessage },
                { status: 500 }
            );
        }
    }

    // If not commits, return 404 for now (can extend later for other endpoints)
    return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
    );
}
