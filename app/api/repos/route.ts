import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface GitHubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    private: boolean;
    language: string | null;
    stargazers_count: number;
    updated_at: string;
    default_branch: string;
}

export async function GET() {
    const session = await auth();
    
    const accessToken = (session as { accessToken?: string })?.accessToken;
    if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Fetch ALL repos including private ones
        // Use visibility=all and affiliation to get everything the user has access to
        const allRepos: GitHubRepo[] = [];
        let page = 1;
        const perPage = 100;

        while (true) {
            const reposResponse = await fetch(
                `https://api.github.com/user/repos?per_page=${perPage}&page=${page}&sort=updated&visibility=all&affiliation=owner,collaborator,organization_member`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        Accept: "application/vnd.github.v3+json",
                    },
                }
            );

            if (!reposResponse.ok) {
                const errorText = await reposResponse.text().catch(() => "Unknown error");
                console.error(`GitHub API error: ${reposResponse.status} - ${errorText}`);
                throw new Error(`GitHub API error: ${reposResponse.status} - ${errorText}`);
            }

            const repos: GitHubRepo[] = await reposResponse.json();
            allRepos.push(...repos);

            // If we got fewer repos than requested, we've reached the end
            if (repos.length < perPage) {
                break;
            }

            page++;
            
            // Safety limit to prevent infinite loops
            if (page > 10) {
                console.warn("Reached page limit for repo fetching");
                break;
            }
        }

        // Fetch tracked repos from database with config
        let trackedRepoSet = new Set<string>();
        let trackedRepoConfigs: Record<string, { postToLinkedIn: boolean; postToTwitter: boolean; yoloMode: boolean; revertCommit: boolean }> = {};
        
        try {
            const trackedRepos: Array<{ repoName: string; postToLinkedIn: boolean; postToTwitter: boolean; yoloMode: boolean; revertCommit: boolean }> = await prisma.trackedRepo.findMany({
                select: { 
                    repoName: true,
                    postToLinkedIn: true,
                    postToTwitter: true,
                    yoloMode: true,
                    revertCommit: true,
                },
            });
            trackedRepoSet = new Set<string>(trackedRepos.map((tr) => tr.repoName));
            trackedRepoConfigs = trackedRepos.reduce((acc, tr) => {
                acc[tr.repoName] = {
                    postToLinkedIn: tr.postToLinkedIn,
                    postToTwitter: tr.postToTwitter,
                    yoloMode: tr.yoloMode,
                    revertCommit: tr.revertCommit,
                };
                return acc;
            }, {} as Record<string, { postToLinkedIn: boolean; postToTwitter: boolean; yoloMode: boolean; revertCommit: boolean }>);
        } catch (dbError) {
            console.error("Error fetching tracked repos from database:", dbError);
            // Continue without tracked repos if DB query fails
        }

        // Transform repos to include only needed data
        const formattedRepos = allRepos.map((repo) => ({
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

        return NextResponse.json({ 
            repos: formattedRepos,
            trackedRepos: Array.from(trackedRepoSet),
            trackedRepoConfigs
        });
    } catch (error) {
        console.error("Error fetching repos:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch repositories";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}