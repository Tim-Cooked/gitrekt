import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Twitter from "next-auth/providers/twitter"
import LinkedIn from "@auth/core/providers/linkedin"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { auth, handlers, signIn, signOut } = NextAuth({
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
                    const existingUser = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { email: user.email ?? undefined },
                                { id: user.id ?? undefined },
                            ],
                        },
                    });

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

            if (account?.provider === "twitter") {
                token.xAccessToken = account.access_token;
                token.xRefreshToken = account.refresh_token;
                token.xAccountLinked = true;
            }

            if (account?.provider === "linkedin") {
                token.linkedinAccessToken = account.access_token;
                token.linkedinAccountLinked = true;
            }

            if (!token.accessToken && token.userId) {
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

            if (token.userId) {
                if (!token.xAccountLinked) {
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

                if (!token.linkedinAccountLinked) {
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
            }

            return token;
        },

        async session({ session, token }) {
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