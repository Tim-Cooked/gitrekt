import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { auth, handlers, signIn, signOut } = NextAuth({
    providers: [
        GitHub({
            authorization: { params: { scope: "read:user repo read:org workflow" } },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        },
        async session({ session, token }) {
            // @ts-expect-error - session.accessToken is not typed by default
            session.accessToken = token.accessToken
            return session
        },
    },
})
