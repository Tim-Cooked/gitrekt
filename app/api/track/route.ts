import { auth } from "@/auth";
import { NextResponse } from "next/server";

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

        // TODO: Store tracking state in database
        // For now, we'll just return success
        // In a real implementation, you'd save this to a database
        
        // If tracking is enabled, create webhook and add workflow file
        if (tracked) {
            // TODO: Create webhook via GitHub API
            // TODO: Create .github/workflows/gitrekt.yml file in repo
            // This would require additional API calls to:
            // 1. Create webhook: POST /repos/{owner}/{repo}/hooks
            // 2. Create workflow file: PUT /repos/{owner}/{repo}/contents/.github/workflows/gitrekt.yml
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
