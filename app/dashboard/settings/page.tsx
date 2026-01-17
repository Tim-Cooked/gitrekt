import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LinkedInIcon, TwitterIcon } from "@/components/brand-icons";
import ConnectLinkedinButton from "@/components/linkto-linkedin";

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

                        <div className="space-y-4">
                            {/* LinkedIn */}
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                                        <LinkedInIcon className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">LinkedIn</h3>
                                        <p className="text-white/60 text-sm">Connect your LinkedIn account</p>
                                    </div>
                                </div>
                                <button
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30"
                                >
                                    <ConnectLinkedinButton />
                                </button>
                            </div>

                            {/* X (Twitter) */}
                            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-600/20 border border-gray-500/30 rounded-lg">
                                        <TwitterIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-medium">X (Twitter)</h3>
                                        <p className="text-white/60 text-sm">Connect your X account</p>
                                    </div>
                                </div>
                                <button
                                    className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-gray-500/30"
                                >
                                    Connect
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
