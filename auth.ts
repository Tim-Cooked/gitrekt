import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Twitter from "next-auth/providers/twitter"

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
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token

                if(account.provider === "twitter"){
                    token.xAccountLinked=true;
                    token.xAccessToken=account.access_token
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
