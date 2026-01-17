// import "next-auth";

// declare module "next-auth" {
//     interface Session {
//         accessToken?: string;
//     }
// }

import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    xAccessToken?: string
    xAccountLinked?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    githubAccessToken?: string
    xAccessToken?: string
  }
}