import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignOut } from "@/components/sign-out";
import { RepoList } from "@/components/repo-list";
import { Zap, AlertTriangle } from "lucide-react";

export default async function Dashboard() {
    const session = await auth();

    if (!session?.user) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900">
            {/* Header */}
            <header className="border-b border-white/10 bg-gradient-to-r from-indigo-950/50 to-purple-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                GitRekt
                            </h1>
                            <div className="h-6 w-px bg-white/20"></div>
                            <span className="text-white/70 text-sm">Dashboard</span>
                        </div>
                        <SignOut user={session.user} />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-3xl font-bold text-white">
                            Welcome back, {session.user.name || "Developer"}! 👋
                        </h2>
                    </div>
                    <p className="text-white/60">
                        Select repositories to track and prepare for consequences when your code breaks.
                    </p>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-5 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-600/30 rounded-lg">
                                <Zap className="w-5 h-5 text-purple-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Auto-Tracking</h3>
                        </div>
                        <p className="text-white/70 text-sm">
                            When you track a repo, we'll automatically set up GitHub Actions to monitor your commits.
                        </p>
                    </div>
                    <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-xl p-5 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-red-600/30 rounded-lg">
                                <AlertTriangle className="w-5 h-5 text-red-300" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Punishment System</h3>
                        </div>
                        <p className="text-white/70 text-sm">
                            Breaking code? Face the consequences! Our system will detect failures and trigger punishments.
                        </p>
                    </div>
                </div>

                {/* Repo List - Fetches repos on client side */}
                <RepoList />
            </main>
        </div>
    );
}
