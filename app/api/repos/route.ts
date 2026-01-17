import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await auth();
    
    if (!session?.accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch all repos (including private ones)
        const reposResponse = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (!reposResponse.ok) {
            throw new Error("Failed to fetch repos");
        }

        const repos = await reposResponse.json();

        // Transform repos to include only needed data
        const formattedRepos = repos.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            private: repo.private,
            language: repo.language,
            stargazersCount: repo.stargazers_count,
            updatedAt: repo.updated_at,
            defaultBranch: repo.default_branch,
        }));

        return NextResponse.json({ repos: formattedRepos });
    } catch (error) {
        console.error("Error fetching repos:", error);
        return NextResponse.json(
            { error: "Failed to fetch repositories" },
            { status: 500 }
        );
    }
}
