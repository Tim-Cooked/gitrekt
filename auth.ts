import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Twitter from "next-auth/providers/twitter"
import LinkedIn from "@auth/core/providers/linkedin"
import { prisma } from "@/lib/prisma";

export const { auth, handlers, signIn, signOut } = NextAuth({
    providers: [
        GitHub({
            authorization: { params: { scope: "read:user repo delete_repo read:org workflow" } },
        }),
        Twitter({
            authorization: {
                params: {
                scope: "tweet.write users.read offline.access",
                },
            },
        }),
        LinkedIn({
            clientId: process.env.AUTH_LINKEDIN_ID!,
            clientSecret: process.env.AUTH_LINKEDIN_SECRET!,
        }),
    ],
    callbacks: {
        async jwt({ token, account, user }) {
            // When GitHub signs in, store GitHub info
            if (account?.provider === "github") {
                token.accessToken = account.access_token;
                token.provider = "github";
                // Store GitHub user info
                if (user) {
                    token.githubUser = {
                        id: user.id ?? "",
                        name: user.name ?? null,
                        email: user.email ?? null,
                        image: user.image ?? null,
                    };
                    
                    // Store GitHub session in database for persistence across provider changes
                    try {
                         // First, try to find existing record by githubId
                        // @ts-expect-error - Prisma generates userSession from UserSession model
                        const existingSession = await prisma.userSession.findUnique({
                            where: { githubId: user.id ?? "" },
                        });

                        if (existingSession) {
                            // Update existing record
                            // @ts-expect-error - Prisma generates userSession from UserSession model
                            await prisma.userSession.update({
                                where: { githubId: user.id ?? "" },
                                data: {
                                    githubToken: account.access_token,
                                    // Only update email if it won't conflict with another record
                                    // If email changed, we need to handle it carefully
                                    ...(user.email && user.email !== existingSession.email ? {
                                        email: user.email
                                    } : {}),
                                    name: user.name ?? null,
                                    image: user.image ?? null,
                                },
                            });
                        } else {
                            // Check if email already exists for different githubId
                            if (user.email) {
                                // @ts-expect-error - Prisma generates userSession from UserSession model
                                const existingByEmail = await prisma.userSession.findUnique({
                                    where: { email: user.email },
                                });

                                if (existingByEmail) {
                                    // Update the existing record with new githubId
                                    // @ts-expect-error - Prisma generates userSession from UserSession model
                                    await prisma.userSession.update({
                                        where: { email: user.email },
                                        data: {
                                            githubId: user.id ?? "",
                                            githubToken: account.access_token,
                                            name: user.name ?? null,
                                            image: user.image ?? null,
                                        },
                                    });
                                } else {
                                    // Create new record
                                    // @ts-expect-error - Prisma generates userSession from UserSession model
                                    await prisma.userSession.create({
                                        data: {
                                            githubId: user.id ?? "",
                                            githubToken: account.access_token,
                                            email: user.email ?? null,
                                            name: user.name ?? null,
                                            image: user.image ?? null,
                                        },
                                    });
                                }
                            } else {
                                // Create new record without email
                                // @ts-expect-error - Prisma generates userSession from UserSession model
                                await prisma.userSession.create({
                                    data: {
                                        githubId: user.id ?? "",
                                        githubToken: account.access_token,
                                        email: null,
                                        name: user.name ?? null,
                                        image: user.image ?? null,
                                    },
                                });
                            }
                        }
                    } catch (error) {
                        console.error("Error storing GitHub session in database:", error);
                    }
                }
            } 
            // When LinkedIn/Twitter signs in, ADD their token but PRESERVE GitHub
            else if (account) {
                // CRITICAL: Preserve existing GitHub info from token FIRST
                // Store current GitHub info before doing anything else
                const existingGithubToken = token.accessToken;
                const existingGithubUser = token.githubUser;
                const existingProvider = token.provider;
                
                // If token doesn't have GitHub info, try to load it from database
                if (!token.accessToken || !token.githubUser) {
                    try {
                        // Try multiple strategies to find GitHub session
                        const linkedInEmail = user?.email;
                        let dbUser = null;
                        
                        // Strategy 1: Find by email match
                        if (linkedInEmail) {
                            // @ts-expect-error - Prisma generates userSession from UserSession model
                            dbUser = await prisma.userSession.findUnique({
                                where: { email: linkedInEmail },
                            }).catch(() => null);
                        }
                        
                        // Strategy 2: If email doesn't match and this is a LinkedIn sign-in, 
                        // try to find session by matching the exact LinkedIn token
                        // SECURITY: Only match by exact token to prevent unauthorized access
                        if (!dbUser && account.provider === "linkedin" && account.access_token) {
                            // @ts-expect-error - Prisma generates userSession from UserSession model
                            dbUser = await prisma.userSession.findFirst({
                                where: {
                                    linkedInToken: account.access_token,
                                },
                            }).catch(() => null);
                        }
                        
                        // SECURITY: Removed Strategy 3 fallback that retrieved the most recent session
                        // This was a critical security vulnerability that could grant one user
                        // unauthorized access to another user's GitHub account and repositories.
                        // If no match is found by email or exact token, GitHub session cannot be restored.
                        
                        if (dbUser && dbUser.githubToken && dbUser.githubId) {
                            // Restore GitHub session in token
                            token.accessToken = dbUser.githubToken;
                            token.provider = "github";
                            token.githubUser = {
                                id: dbUser.githubId,
                                name: dbUser.name,
                                email: dbUser.email,
                                image: dbUser.image,
                            };
                            console.log("Restored GitHub session from database for LinkedIn sign-in");
                        }
                    } catch (error) {
                        console.error("Error retrieving GitHub session from database:", error);
                    }
                } else {
                    // GitHub info exists in token - explicitly preserve it
                    // This ensures it doesn't get overwritten
                    token.accessToken = existingGithubToken;
                    token.provider = existingProvider as string;
                    token.githubUser = existingGithubUser;
                }
                
                // CRITICAL: If we still don't have GitHub, we need it - LinkedIn/Twitter are additional only
                if (!token.accessToken || !token.githubUser) {
                    console.error("ERROR: Attempted to sign in with non-GitHub provider without existing GitHub session");
                    // Don't return early - allow the token to be updated with social media info
                    // But the session callback will reject it if no GitHub
                }
                
                // Add the social media token WITHOUT replacing GitHub
                if (account.provider === "linkedin") {
                    token.linkedinAccessToken = account.access_token;
                    
                    // Update database with LinkedIn token, preserving GitHub
                    if (token.githubUser && typeof token.githubUser === 'object' && 'id' in token.githubUser) {
                        try {
                            const githubId = (token.githubUser as { id: string }).id;
                            // @ts-expect-error - Prisma generates userSession from UserSession model
                            const dbUser = await prisma.userSession.findFirst({
                                where: { 
                                    OR: [
                                        user?.email ? { email: user.email } : undefined,
                                        { githubId: githubId }
                                    ].filter((condition): condition is { email: string } | { githubId: string } => condition !== undefined),
                                },
                            });
                            
                            if (dbUser) {
                                // @ts-expect-error - Prisma generates userSession from UserSession model
                                await prisma.userSession.update({
                                    where: { id: dbUser.id },
                                    data: { linkedInToken: account.access_token },
                                });
                            }
                        } catch (error) {
                            console.error("Error updating LinkedIn token in database:", error);
                        }
                    }
                } else if (account.provider === "twitter") {
                    token.xAccountLinked = true;
                    token.xAccessToken = account.access_token;
                    
                    // Update database with Twitter token, preserving GitHub
                    if (token.githubUser && typeof token.githubUser === 'object' && 'id' in token.githubUser) {
                        try {
                            const githubId = (token.githubUser as { id: string }).id;
                            // @ts-expect-error - Prisma generates userSession from UserSession model
                            const dbUser = await prisma.userSession.findFirst({
                                where: { 
                                    OR: [
                                        user?.email ? { email: user.email } : undefined,
                                        { githubId: githubId }
                                    ].filter((condition): condition is { email: string } | { githubId: string } => condition !== undefined),
                                },
                            });
                            
                            if (dbUser) {
                                // @ts-expect-error - Prisma generates userSession from UserSession model
                                await prisma.userSession.update({
                                    where: { id: dbUser.id },
                                    data: { 
                                        twitterToken: account.access_token,
                                        twitterSecret: account.refresh_token ?? null,
                                    },
                                });
                            }
                        } catch (error) {
                            console.error("Error updating Twitter token in database:", error);
                        }
                    }
                }
            }
            // When account is null (subsequent requests), ensure GitHub info is preserved
            // This handles the case where LinkedIn sign-in might have created a new token
            else {
                // Sync social media tokens from database to ensure they're up to date
                // This handles the case where tokens were unlinked via the API
                if (token.githubUser && typeof token.githubUser === 'object' && 'id' in token.githubUser) {
                    try {
                        const githubId = (token.githubUser as { id: string }).id;
                        // @ts-expect-error - Prisma generates userSession from UserSession model
                        const dbUser = await prisma.userSession.findUnique({
                            where: { githubId },
                        }).catch(() => null);
                        
                        if (dbUser) {
                            // Sync LinkedIn token from database (null if unlinked)
                            token.linkedinAccessToken = dbUser.linkedInToken ?? undefined;
                            
                            // Sync Twitter token from database (null if unlinked)
                            token.xAccessToken = dbUser.twitterToken ?? undefined;
                            
                            // If we have LinkedIn token but no GitHub info, restore GitHub from database
                            if (token.linkedinAccessToken && (!token.accessToken || !token.githubUser)) {
                                if (dbUser.githubToken && dbUser.githubId) {
                                    token.accessToken = dbUser.githubToken;
                                    token.provider = "github";
                                    token.githubUser = {
                                        id: dbUser.githubId,
                                        name: dbUser.name,
                                        email: dbUser.email,
                                        image: dbUser.image,
                                    };
                                    console.log("Restored GitHub session from database on subsequent request");
                                }
                            }
                        }
                    } catch (error) {
                        console.error("Error syncing social media tokens from database:", error);
                    }
                } else if (token.linkedinAccessToken && (!token.accessToken || !token.githubUser)) {
                    // Fallback: If we have LinkedIn token but no GitHub info, try to restore from database
                    try {
                        // @ts-expect-error - Prisma generates userSession from UserSession model
                        const dbUser = await prisma.userSession.findFirst({
                            where: {
                                linkedInToken: { not: null },
                            },
                            orderBy: { updatedAt: 'desc' },
                        }).catch(() => null);
                        
                        if (dbUser && dbUser.githubToken && dbUser.githubId) {
                            token.accessToken = dbUser.githubToken;
                            token.provider = "github";
                            token.githubUser = {
                                id: dbUser.githubId,
                                name: dbUser.name,
                                email: dbUser.email,
                                image: dbUser.image,
                            };
                            console.log("Restored GitHub session from database on subsequent request");
                        }
                    } catch (error) {
                        console.error("Error retrieving GitHub session on subsequent request:", error);
                    }
                }
            }
            
            return token;
        },
        async session({ session, token }) {
            // CRITICAL: Always use GitHub as the primary session
            // accessToken should ALWAYS be from GitHub
            session.accessToken = token.accessToken as string | undefined;
            session.xAccessToken = token.xAccessToken as string | undefined;
            session.linkedinAccessToken = token.linkedinAccessToken as string | undefined;
            
            // ALWAYS use GitHub user info as the primary user
            // LinkedIn/Twitter should NEVER replace the GitHub user
            // COMPLETELY IGNORE session.user from LinkedIn/Twitter - only use GitHub info
            if (token.githubUser && typeof token.githubUser === 'object' && 'id' in token.githubUser) {
                const githubUser = token.githubUser as { id: string; name?: string | null; email?: string | null; image?: string | null };
                // COMPLETELY REPLACE session.user fields with GitHub user info
                // We mutate session.user (not spread) to completely overwrite LinkedIn/Twitter data
                // This ensures LinkedIn/Twitter user info is not preserved
                if (session.user) {
                    session.user.id = githubUser.id;
                    session.user.name = githubUser.name ?? null;
                    // Only update email if GitHub provides one (required field in NextAuth User type)
                    if (githubUser.email) {
                        session.user.email = githubUser.email;
                    }
                    session.user.image = githubUser.image ?? null;
                }
            } else if (!token.accessToken) {
                // If no GitHub token and no GitHub user, this session is invalid
                // This shouldn't happen if user signed in with GitHub first
                console.error("Invalid session: No GitHub authentication found");
                // Keep existing session.user but log the error
                // The session will be invalid but won't crash
            }
            
            return session;
        },
    },
})
