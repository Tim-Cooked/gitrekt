import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Twitter from "next-auth/providers/twitter"
import LinkedIn from "@auth/core/providers/linkedin"
import { PrismaAdapter } from "@auth/prisma-adapter";
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
            clientId: process.env.LINKEDIN_CLIENT_ID,
            clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
            }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token

                if(account.provider === "twitter"){
                    token.xAccountLinked=true;
                    token.xAccessToken=account.access_token
                }

                if(account.provider === "linkedin"){
                    token.linkedinAccessToken = account.access_token
                }
            }
            
            return token
        },
        async session({ session, token }) {
            // @ts-expect-error - session.accessToken is not typed by default
            session.accessToken = token.accessToken
            session.xAccessToken = token.xAccessToken as string | undefined
            return session
        },
    },
})
