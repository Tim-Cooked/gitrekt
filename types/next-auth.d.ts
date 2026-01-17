import "next-auth";

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        xAccessToken?: string;
        linkedinAccessToken?: string;
    }
}
