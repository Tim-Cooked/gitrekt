import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { LinkedInIcon, TwitterIcon } from "@/components/brand-icons";
import { prisma } from "@/lib/prisma";
import { TestTwitterButton } from "@/components/test-twitter-button";

async function getConnectedAccounts(userId: string) {
    const accounts = await prisma.account.findMany({
        where: { userId },
        select: {
            provider: true,
            providerAccountId: true,
            access_token: true,
        },
    });

    return {
        github: accounts.find((a) => a.provider === "github"),
        twitter: accounts.find((a) => a.provider === "twitter"),
        linkedin: accounts.find((a) => a.provider === "linkedin"),
    };
}

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/");
    }

    // Get user from database
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { email: session.user.email ?? undefined },
                { name: session.user.name ?? undefined },
            ],
        },
    });

    if (!user) {
        redirect("/");
    }

    const connectedAccounts = await getConnectedAccounts(user.id);

    // Determine connection status based on access token existence
    const isGitHubConnected = !!connectedAccounts.github?.access_token; // Or just existence depending on your schema
    const isXConnected = !!connectedAccounts.twitter?.access_token;
    const isLinkedInConnected = !!connectedAccounts.linkedin?.access_token;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b-8 border-black bg-white shadow-neo-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-6">
                        <Link
                            href="/dashboard"
                            className="p-3 bg-white border-4 border-black shadow-neo-xs hover:shadow-neo-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
                        >
                            <ArrowLeft className="w-6 h-6 text-black stroke-[3px]" />
                        </Link>
                        <div>
                            <div className="bg-neo-secondary border-4 border-black px-4 py-1 -rotate-1 shadow-neo-xs inline-block mb-1">
                                <h1 className="text-2xl font-black text-black uppercase tracking-tight">
                                    Settings
                                </h1>
                            </div>
                            <p className="text-sm text-black font-black uppercase tracking-widest opacity-60 ml-1">Manage your account and integrations</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="space-y-10">
                    {/* Account Info */}
                    <div className="bg-white border-4 border-black p-8 shadow-neo-md">
                        <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-6">Account</h2>
                        <div className="flex items-center gap-6">
                            {session.user.image && (
                                <img
                                    src={session.user.image}
                                    alt={session.user.name || "User"}
                                    className="w-20 h-20 border-4 border-black shadow-neo-xs"
                                />
                            )}
                            <div className="space-y-1">
                                <p className="text-xl font-black text-black uppercase tracking-tight">{session.user.name}</p>
                                <p className="text-black font-bold uppercase tracking-widest text-xs opacity-60">{session.user.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Social Media Integrations */}
                    <div className="bg-white border-4 border-black p-8 shadow-neo-md">
                        <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-2">Connected Accounts</h2>
                        <p className="text-black font-bold uppercase tracking-widest text-xs opacity-60 mb-8">
                            Connect your social media accounts to enable automatic posting when your code fails.
                        </p>

                        <div className="space-y-6">
                            {/* GitHub - Always connected (assuming login via GitHub) */}
                            <div className="flex items-center justify-between p-6 bg-white border-4 border-black shadow-neo-xs">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-neo-muted border-4 border-black">
                                        <svg className="w-8 h-8 text-black" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-black uppercase tracking-tight">GitHub</h3>
                                        <p className="text-black font-bold uppercase tracking-widest text-[10px] opacity-60">Primary authentication</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-neo-secondary border-4 border-black font-black uppercase tracking-widest text-[10px] shadow-neo-xs">
                                    <Check className="w-4 h-4" />
                                    <span>Connected</span>
                                </div>
                            </div>

                            {/* X (Twitter) */}
                            <div className="flex items-center justify-between p-6 bg-white border-4 border-black shadow-neo-xs">
                                <div className="flex items-center gap-6">
                                    <div className={`p-4 border-4 border-black ${isXConnected ? "bg-neo-secondary" : "bg-neo-secondary/20"}`}>
                                        <TwitterIcon className={`w-8 h-8 text-black`} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-black uppercase tracking-tight">X (Twitter)</h3>
                                        <p className="text-black font-bold uppercase tracking-widest text-[10px] opacity-60">
                                            {isXConnected ? "Connected and ready to post roasts" : "Connect to post roasts to X"}
                                        </p>
                                    </div>
                                </div>
                                {isXConnected ? (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-neo-secondary border-4 border-black font-black uppercase tracking-widest text-[10px] shadow-neo-xs">
                                        <Check className="w-4 h-4" />
                                        <span>Connected</span>
                                    </div>
                                ) : (
                                    <form
                                        action={async () => {
                                            "use server";
                                            const { signIn } = await import("@/auth");
                                            await signIn("twitter", { redirectTo: "/dashboard/settings" });
                                        }}
                                    >
                                        <button
                                            type="submit"
                                            className="px-8 py-3 bg-white border-4 border-black text-black font-black uppercase tracking-widest text-xs shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all"
                                        >
                                            Connect
                                        </button>
                                    </form>
                                )}
                            </div>

                            {/* LinkedIn */}
                            <div className="flex items-center justify-between p-6 bg-white border-4 border-black shadow-neo-xs">
                                <div className="flex items-center gap-6">
                                    <div className={`p-4 border-4 border-black ${isLinkedInConnected ? "bg-neo-muted" : "bg-neo-muted/20"}`}>
                                        <LinkedInIcon className={`w-8 h-8 text-black`} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-black uppercase tracking-tight">LinkedIn</h3>
                                        <p className="text-black font-bold uppercase tracking-widest text-[10px] opacity-60">
                                            {isLinkedInConnected ? "Connected and ready to post" : "Connect to share roasts professionally"}
                                        </p>
                                    </div>
                                </div>
                                {isLinkedInConnected ? (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-neo-muted border-4 border-black font-black uppercase tracking-widest text-[10px] shadow-neo-xs">
                                        <Check className="w-4 h-4" />
                                        <span>Connected</span>
                                    </div>
                                ) : (
                                    <a
                                        href="/api/connect/linkedin"
                                        className="px-8 py-3 bg-white border-4 border-black text-black font-black uppercase tracking-widest text-xs shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all inline-block"
                                    >
                                        Connect
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Test Section - Only visible if X is connected */}
                    {isXConnected && (
                        <div className="bg-white border-4 border-black p-8 shadow-neo-md">
                            <h2 className="text-2xl font-black text-black uppercase tracking-tight mb-4">Test Integration</h2>
                            <p className="text-black font-bold uppercase tracking-widest text-xs opacity-60 mb-8">
                                Verify your X/Twitter connection is working properly.
                            </p>
                            <div className="flex gap-4">
                                <Link
                                    href="/api/debug/connections"
                                    target="_blank"
                                    className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-black text-black font-black uppercase tracking-widest text-xs shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View Connections
                                </Link>

                                <TestTwitterButton />
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="bg-neo-secondary border-4 border-black p-6 shadow-neo-sm rotate-1">
                        <p className="text-black font-bold text-sm leading-tight">
                            💡 <strong className="font-black uppercase tracking-widest">Tip:</strong> Connecting your social accounts allows GitRekt to automatically post roasts when you fail to fix your code in time. Your followers will witness your shame!
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}