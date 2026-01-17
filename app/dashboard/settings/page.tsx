import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { LinkedInIcon, TwitterIcon } from "@/components/brand-icons";
import { prisma } from "@/lib/prisma";
import { TestTwitterButton } from "@/components/test-twitter-button"; // Import the new component

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
        <div className="min-h-screen bg-linear-to-br from-indigo-950 via-purple-900 to-pink-900">
            {/* Header */}
            <header className="border-b border-white/10 bg-linear-to-r from-indigo-950/50 to-purple-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/dashboard"
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white/70" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold bg-linear-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                Settings
                            </h1>
                            <p className="text-sm text-white/60">Manage your account and integrations</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="space-y-8">
                    {/* Account Info */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Account</h2>
                        <div className="flex items-center gap-4">
                            {session.user.image && (
                                <img
                                    src={session.user.image}
                                    alt={session.user.name || "User"}
                                    className="w-16 h-16 rounded-full border-2 border-white/20"
                                />
                            )}
                            <div>
                                <p className="text-white font-medium">{session.user.name}</p>
                                <p className="text-white/60 text-sm">{session.user.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Social Media Integrations */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Connected Accounts</h2>
                        <p className="text-white/60 text-sm mb-6">
                            Connect your social media accounts to enable automatic posting when your code fails.
                        </p>

                        <div className="space-y-4">
                            {/* GitHub - Always connected (assuming login via GitHub) */}
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">GitHub</h3>
                                        <p className="text-white/60 text-sm">Primary authentication</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-xl text-green-400">
                                    <Check className="w-4 h-4" />
                                    <span className="text-sm font-medium">Connected</span>
                                </div>
                            </div>

                            {/* X (Twitter) */}
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${isXConnected ? "bg-gray-700/50 border border-gray-600/50" : "bg-gray-600/20 border border-gray-500/30"}`}>
                                        <TwitterIcon className={`w-6 h-6 ${isXConnected ? "text-white" : "text-gray-400"}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">X (Twitter)</h3>
                                        <p className="text-white/60 text-sm">
                                            {isXConnected ? "Connected and ready to post roasts" : "Connect to post roasts to X"}
                                        </p>
                                    </div>
                                </div>
                                {isXConnected ? (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-xl text-green-400">
                                        <Check className="w-4 h-4" />
                                        <span className="text-sm font-medium">Connected</span>
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
                                            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-gray-500/30"
                                        >
                                            Connect
                                        </button>
                                    </form>
                                )}
                            </div>

                            {/* LinkedIn */}
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${isLinkedInConnected ? "bg-blue-600/30 border border-blue-500/50" : "bg-blue-600/20 border border-blue-500/30"}`}>
                                        <LinkedInIcon className={`w-6 h-6 ${isLinkedInConnected ? "text-blue-300" : "text-blue-400"}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">LinkedIn</h3>
                                        <p className="text-white/60 text-sm">
                                            {isLinkedInConnected ? "Connected and ready to post" : "Connect to share roasts professionally"}
                                        </p>
                                    </div>
                                </div>
                                {isLinkedInConnected ? (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-xl text-green-400">
                                        <Check className="w-4 h-4" />
                                        <span className="text-sm font-medium">Connected</span>
                                    </div>
                                ) : (
                                    <form
                                        action={async () => {
                                            "use server";
                                            const { signIn } = await import("@/auth");
                                            await signIn("linkedin", { redirectTo: "/dashboard/settings" });
                                        }}
                                    >
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30"
                                        >
                                            Connect
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Test Section - Only visible if X is connected */}
                    {isXConnected && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                            <h2 className="text-xl font-semibold text-white mb-4">Test Integration</h2>
                            <p className="text-white/60 text-sm mb-4">
                                Verify your X/Twitter connection is working properly.
                            </p>
                            <div className="flex gap-3">
                                <Link
                                    href="/api/debug/connections"
                                    target="_blank"
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-xl hover:bg-purple-600/30 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    View Connections
                                </Link>
                                
                                {/* Replaced the old form with the new Client Component */}
                                <TestTwitterButton />
                            </div>
                        </div>
                    )}

                    {/* Info */}
                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                        <p className="text-purple-200/80 text-sm">
                            💡 <strong>Tip:</strong> Connecting your social accounts allows GitRekt to automatically post roasts when you fail to fix your code in time. Your followers will witness your shame!
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}