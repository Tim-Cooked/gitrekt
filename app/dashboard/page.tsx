import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignOut } from "@/components/sign-out";
import { RepoList } from "@/components/repo-list";
import { Zap, AlertTriangle } from "lucide-react";
import ConnectXButton from "@/components/linkto-x";

export default async function Dashboard() {
    const session = await auth();

    if (!session?.user) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-indigo-950 via-purple-900 to-pink-900">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-white/10 bg-linear-to-r from-indigo-950/80 via-purple-900/80 to-pink-900/80 backdrop-blur-xl shadow-lg shadow-black/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-bold bg-linear-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
                                GitRekt
                            </h1>
                            <div className="h-6 w-px bg-linear-to-b from-transparent via-white/20 to-transparent"></div>
                            <span className="text-white/80 text-sm font-medium tracking-wide">Dashboard</span>
                        </div>
                        <SignOut user={session.user} />
                        <ConnectXButton />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Welcome Section */}
                <div className="mb-10">
                    <div className="mb-3">
                        <h2 className="text-4xl font-bold text-white tracking-tight mb-2">
                            Welcome back, <span className="bg-linear-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">{session.user.name || "Developer"}</span>
                        </h2>
                    </div>
                    <p className="text-white/70 text-lg leading-relaxed max-w-2xl">
                        Select repositories to track and prepare for consequences when your code breaks.
                    </p>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <div className="group relative bg-linear-to-br from-purple-600/20 via-purple-600/15 to-pink-600/20 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm shadow-xl shadow-purple-900/20 hover:shadow-2xl hover:shadow-purple-900/30 transition-all duration-300 hover:border-purple-500/50 hover:-translate-y-1">
                        <div className="flex items-start gap-4 mb-3">
                            <div className="p-3 bg-linear-to-br from-purple-600/40 to-purple-500/30 rounded-xl shadow-lg shadow-purple-900/30 group-hover:scale-110 transition-transform duration-300">
                                <Zap className="w-6 h-6 text-purple-200" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Auto-Tracking</h3>
                                <p className="text-white/75 text-sm leading-relaxed">
                                    When you track a repo, we&apos;ll automatically set up GitHub Actions to monitor your commits.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-linear-to-br from-red-600/20 via-orange-600/15 to-red-600/20 border border-red-500/30 rounded-2xl p-6 backdrop-blur-sm shadow-xl shadow-red-900/20 hover:shadow-2xl hover:shadow-red-900/30 transition-all duration-300 hover:border-red-500/50 hover:-translate-y-1">
                        <div className="flex items-start gap-4 mb-3">
                            <div className="p-3 bg-linear-to-br from-red-600/40 to-red-500/30 rounded-xl shadow-lg shadow-red-900/30 group-hover:scale-110 transition-transform duration-300">
                                <AlertTriangle className="w-6 h-6 text-red-200" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Punishment System</h3>
                                <p className="text-white/75 text-sm leading-relaxed">
                                    Breaking code? Face the consequences! Our system will detect failures and trigger punishments.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Repo List - Fetches repos on client side */}
                <RepoList />
            </main>
        </div>
    );
}
