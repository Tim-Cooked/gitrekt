
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    console.log("[DEBUG] LinkedIn Callback: Started");
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
        console.error("[DEBUG] LinkedIn Callback: Error param received:", error);
        return NextResponse.redirect(`${request.nextUrl.origin}/dashboard/settings?error=${error}`);
    }

    if (!code) {
        console.error("[DEBUG] LinkedIn Callback: No code received");
        return NextResponse.redirect(`${request.nextUrl.origin}/dashboard/settings?error=missing_code`);
    }

    // 1. Verify Authentication - User MUST be logged in
    const session = await auth();
    console.log("[DEBUG] LinkedIn Callback: Session object:", JSON.stringify(session, null, 2));

    // @ts-expect-error - custom property
    const userId = session?.user?.id || session?.userId;
    console.log("[DEBUG] LinkedIn Callback: Resolved User ID:", userId);

    if (!userId) {
        console.warn("[DEBUG] LinkedIn Callback: No active session (userId missing). Aborting link.");
        return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard/settings?error=no_session`);
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const baseUrl = process.env.NEXTAUTH_URL;
    const redirectUri = `${baseUrl}/api/connect/linkedin/callback`;

    console.log("[DEBUG] LinkedIn Callback: Using Redirect URI:", redirectUri);

    if (!clientId || !clientSecret) {
        console.error("[DEBUG] LinkedIn Callback: Missing credentials");
        return NextResponse.json({ error: "Missing LinkedIn credentials" }, { status: 500 });
    }

    try {
        // 2. Exchange Code for Access Token
        console.log("[DEBUG] LinkedIn Callback: Exchanging code for token...");
        const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error("[DEBUG] LinkedIn Token Error:", errorText);
            throw new Error(`Failed to exchange token: ${tokenResponse.status}`);
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
        const expiresIn = tokenData.expires_in;
        console.log("[DEBUG] LinkedIn Callback: Token received. Expires in:", expiresIn);

        // 3. Get User Profile (to get the LinkedIn ID)
        console.log("[DEBUG] LinkedIn Callback: Fetching profile...");
        const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!profileResponse.ok) {
            throw new Error("Failed to fetch LinkedIn profile");
        }

        const profileData = await profileResponse.json();
        const linkedinId = profileData.sub; // 'sub' is the user ID in OIDC
        console.log("[DEBUG] LinkedIn Callback: Profile fetched. ID:", linkedinId);

        // 4. Link Account in Database
        const existingLink = await prisma.account.findUnique({
            where: {
                provider_providerAccountId: {
                    provider: "linkedin",
                    providerAccountId: linkedinId,
                },
            },
        });

        if (existingLink) {
            console.log("[DEBUG] LinkedIn Callback: Account already exists. Linked to user:", existingLink.userId);
            if (existingLink.userId !== userId) {
                console.warn("[DEBUG] LinkedIn Callback: Account linked to DIFFERENT user!");
                return NextResponse.redirect(`${baseUrl}/dashboard/settings?error=linkedin_already_linked`);
            }
            // Update tokens
            console.log("[DEBUG] LinkedIn Callback: Updating tokens for existing link...");
            await prisma.account.update({
                where: {
                    provider_providerAccountId: {
                        provider: "linkedin",
                        providerAccountId: linkedinId,
                    },
                },
                data: {
                    access_token: accessToken,
                    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
                    token_type: "Bearer",
                    scope: "openid profile email w_member_social",
                }
            });
        } else {
            console.log("[DEBUG] LinkedIn Callback: Creating NEW link for user:", userId);
            await prisma.account.create({
                data: {
                    userId: userId,
                    type: "oauth",
                    provider: "linkedin",
                    providerAccountId: linkedinId,
                    access_token: accessToken,
                    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
                    token_type: "Bearer",
                    scope: "openid profile email w_member_social",
                },
            });
        }

        console.log("[DEBUG] LinkedIn Callback: Success! Redirecting...");
        return NextResponse.redirect(`${baseUrl}/dashboard/settings?success=linkedin_connected`);

    } catch (error) {
        console.error("[DEBUG] LinkedIn Connect Error:", error);
        return NextResponse.redirect(`${baseUrl}/dashboard/settings?error=connect_failed`);
    }
}
