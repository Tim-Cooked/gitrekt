import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        xAccessToken?: string;
        xAccountLinked?: boolean;
        linkedinAccessToken?: string;
        linkedinAccountLinked?: boolean;
        user: DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string;
        githubAccessToken?: string;
        xAccessToken?: string;
        xAccountLinked?: boolean;
        linkedinAccessToken?: string;
        linkedinAccountLinked?: boolean;
    }
}