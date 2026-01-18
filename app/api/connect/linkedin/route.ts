import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const baseUrl = process.env.NEXTAUTH_URL;
    const redirectUri = `${baseUrl}/api/connect/linkedin/callback`;
    const state = nanoid();
    const scope = "openid profile email w_member_social";

    console.log("[DEBUG] LinkedIn Connect Start");
    console.log("[DEBUG] Origin:", request.nextUrl.origin);
    console.log("[DEBUG] Generated Redirect URI:", redirectUri);
    console.log("[DEBUG] Client ID present:", !!clientId);

    if (!clientId) {
        return NextResponse.json({ error: "Missing LINKEDIN_CLIENT_ID" }, { status: 500 });
    }

    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("state", state);
    authUrl.searchParams.append("scope", scope);

    console.log("[DEBUG] Auth URL:", authUrl.toString());

    // Redirect user to LinkedIn
    return NextResponse.redirect(authUrl.toString());
}
