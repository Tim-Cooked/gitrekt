import NextAuth from "next-auth"
import { decode } from "next-auth/jwt"
import { cookies } from "next/headers"
import GitHub from "next-auth/providers/github"
import Twitter from "next-auth/providers/twitter"
import LinkedIn from "@auth/core/providers/linkedin"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { auth, handlers, signIn, signOut } = NextAuth({
    debug: true,
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    providers: [
        GitHub({
            authorization: { params: { scope: "read:user repo delete_repo read:org workflow" } },
        }),
        Twitter({
            clientId: process.env.AUTH_TWITTER_ID!,
            clientSecret: process.env.AUTH_TWITTER_SECRET!,
            authorization: {
                url: "https://twitter.com/i/oauth2/authorize",
                params: {
                    scope: "tweet.read tweet.write users.read offline.access",
                },
            },
        }),
        LinkedIn({
            clientId: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
            authorization: {
                url: "https://www.linkedin.com/oauth/v2/authorization",
                params: {
                    scope: "openid profile email w_member_social",
                    response_type: "code",
                },
            },
            token: {
                url: "https://www.linkedin.com/oauth/v2/accessToken",
            },
            userinfo: {
                url: "https://api.linkedin.com/v2/userinfo",
            },
            // Ensure we use the OIDC mapping since we are asking for openid scope
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                }
            }
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (!account) return true;

            // For GitHub (primary auth), allow sign in
            if (account.provider === "github") {
                return true;
            }

            // For Twitter/LinkedIn, link to existing user
            if (account.provider === "twitter" || account.provider === "linkedin") {
                try {
                    let existingUser = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { email: user.email ?? undefined },
                                { id: user.id ?? undefined },
                            ],
                        },
                    });

                    // If no user found by email, try to find by session (account linking)
                    if (!existingUser) {
                        const cookieStore = await cookies();
                        // Try both secure and non-secure cookie names
                        const sessionToken = cookieStore.get("authjs.session-token")?.value ||
                            cookieStore.get("__Secure-authjs.session-token")?.value;

                        console.log("[DEBUG] Session Token found:", !!sessionToken);
                        console.log("[DEBUG] Cookie names:", cookieStore.getAll().map(c => c.name));

                        if (sessionToken) {
                            try {
                                const decoded = await decode({
                                    token: sessionToken,
                                    secret: process.env.AUTH_SECRET!,
                                    salt: sessionToken.includes("__Secure") ? "__Secure-authjs.session-token" : "authjs.session-token",
                                });
                                console.log("[DEBUG] Decoded token sub:", decoded?.sub);

                                if (decoded?.sub) {
                                    const userBySession = await prisma.user.findUnique({
                                        where: { id: decoded.sub },
                                    });

                                    if (userBySession) {
                                        console.log("[DEBUG] Found user by session:", userBySession.id);
                                        // Found the user! We should link to this one.
                                        // @ts-expect-error - mutation
                                        existingUser = userBySession;
                                    }
                                }
                            } catch (e) {
                                console.error("[DEBUG] Failed to decode session:", e);
                            }
                        }
                    }

                    if (existingUser) {
                        const existingAccount = await prisma.account.findUnique({
                            where: {
                                provider_providerAccountId: {
                                    provider: account.provider,
                                    providerAccountId: account.providerAccountId,
                                },
                            },
                        });

                        if (!existingAccount) {
                            await prisma.account.create({
                                data: {
                                    userId: existingUser.id,
                                    type: account.type,
                                    provider: account.provider,
                                    providerAccountId: account.providerAccountId,
                                    access_token: account.access_token,
                                    refresh_token: account.refresh_token,
                                    expires_at: account.expires_at,
                                    token_type: account.token_type,
                                    scope: account.scope,
                                },
                            });
                            console.log(`✅ Linked ${account.provider} account to user ${existingUser.id}`);
                        } else {
                            await prisma.account.update({
                                where: {
                                    provider_providerAccountId: {
                                        provider: account.provider,
                                        providerAccountId: account.providerAccountId,
                                    },
                                },
                                data: {
                                    access_token: account.access_token,
                                    refresh_token: account.refresh_token,
                                    expires_at: account.expires_at,
                                },
                            });
                            console.log(`✅ Updated ${account.provider} tokens for user ${existingUser.id}`);
                        }
                    }
                } catch (error) {
                    console.error(`Failed to link ${account.provider} account:`, error);
                }
                return true;
            }

            return true;
        },

        async jwt({ token, account, user }) {
            if (account?.provider === "github") {
                token.accessToken = account.access_token;
                token.githubAccessToken = account.access_token;
                token.userId = user?.id;
            }

            // Ensure userId is available if not set above (e.g. from existing token)
            if (!token.userId && token.sub) {
                token.userId = token.sub;
            }

            if (account?.provider === "twitter") {
                token.xAccessToken = account.access_token;
                token.xRefreshToken = account.refresh_token;
                token.xAccountLinked = true;
            }

            if (account?.provider === "linkedin") {
                token.linkedinAccessToken = account.access_token;
                token.linkedinAccountLinked = true;
            }

            // Restore GitHub token from DB if missing
            if ((!token.accessToken || !token.githubAccessToken) && token.userId) {
                const githubAccount = await prisma.account.findFirst({
                    where: {
                        userId: token.userId as string,
                        provider: "github",
                    },
                });
                if (githubAccount?.access_token) {
                    token.accessToken = githubAccount.access_token;
                    token.githubAccessToken = githubAccount.access_token;
                }
            }

            // ... rest of restoration logic


            // Restore Twitter token status from database if not set
            if (!token.xAccountLinked && token.userId) {
                const twitterAccount = await prisma.account.findFirst({
                    where: {
                        userId: token.userId as string,
                        provider: "twitter",
                    },
                });
                if (twitterAccount) {
                    token.xAccountLinked = true;
                    token.xAccessToken = twitterAccount.access_token;
                }
            }

            // Restore LinkedIn token status from database if not set
            if (!token.linkedinAccountLinked && token.userId) {
                const linkedinAccount = await prisma.account.findFirst({
                    where: {
                        userId: token.userId as string,
                        provider: "linkedin",
                    },
                });
                if (linkedinAccount) {
                    token.linkedinAccountLinked = true;
                    token.linkedinAccessToken = linkedinAccount.access_token;
                }
            }

            return token;
        },

        async session({ session, token }) {
            if (session.user) {
                session.user.id = (token.userId as string) || (token.sub as string);
            }

            // @ts-expect-error - custom session properties
            session.accessToken = token.accessToken || token.githubAccessToken;
            // @ts-expect-error - custom session properties
            session.userId = token.userId;
            // @ts-expect-error - custom session properties
            session.xAccessToken = token.xAccessToken;
            // @ts-expect-error - custom session properties
            session.xAccountLinked = !!token.xAccountLinked;
            // @ts-expect-error - custom session properties
            session.linkedinAccessToken = token.linkedinAccessToken;
            // @ts-expect-error - custom session properties
            session.linkedinAccountLinked = !!token.linkedinAccountLinked;

            return session;
        },
    },
})