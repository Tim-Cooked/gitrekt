import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SocialMediaConnections } from "@/components/social-media-connections";

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/");
    }

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
                    {/* Social Media Integrations */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">Social Media Integrations</h2>
                        <p className="text-white/60 text-sm mb-6">
                            Connect your social media accounts to enable automatic posting when your code fails.
                        </p>

                        <SocialMediaConnections 
                            linkedInConnected={!!session.linkedinAccessToken}
                            twitterConnected={!!session.xAccessToken}
                            hasGitHubSession={!!session.accessToken}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
