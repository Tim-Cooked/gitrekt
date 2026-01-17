import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Twitter from "next-auth/providers/twitter"
import LinkedIn from "next-auth/providers/linkedin"

import { OAuthConfig } from "@auth/core/providers";

const LinkedInProvider: OAuthConfig<any> = {
  id: "linkedin",
  name: "LinkedIn",
  type: "oauth",
  clientId: process.env.AUTH_LINKEDIN_ID!,
  clientSecret: process.env.AUTH_LINKEDIN_SECRET!,

  authorization: {
    url: "https://www.linkedin.com/oauth/v2/authorization",
    params: {
      scope: "openid profile email",
    },
  },

  token: {
    url: "https://www.linkedin.com/oauth/v2/accessToken",
    async request(context: Parameters<OAuthConfig<any>['token']['request']>[0]) {
      const response = await fetch(context.provider.token!.url!, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: context.params.code!,
          redirect_uri: context.provider.callbackUrl!,
          client_id: context.provider.clientId!,        // 🔴 REQUIRED
          client_secret: context.provider.clientSecret!,// 🔴 REQUIRED
        }),
      });

      const tokens = await response.json();

      if (!response.ok) {
        throw tokens;
      }

      return { tokens };
    },
  },

  userinfo: {
    url: "https://api.linkedin.com/v2/userinfo",
  },

  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: profile.picture,
    };
  },
};

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
        LinkedInProvider,
        
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
