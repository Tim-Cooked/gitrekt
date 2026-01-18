import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { RepoList } from "@/components/repo-list";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { Zap, AlertTriangle, Skull } from "lucide-react";

export default async function Dashboard() {
    const session = await auth();

    if (!session?.user) {
        redirect("/");
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b-8 border-black bg-white shadow-neo-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center gap-6">
                            <div className="bg-neo-accent border-4 border-black p-2 rotate-3 shadow-neo-sm">
                                <h1 className="text-3xl font-black text-black tracking-tighter uppercase">
                                    GitRekt
                                </h1>
                            </div>
                            <div className="h-10 w-1 bg-black hidden sm:block"></div>
                            <span className="text-black text-lg font-black uppercase tracking-widest hidden sm:block">Dashboard</span>
                        </div>
                        <UserProfileDropdown user={session.user} />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Welcome Section */}
                <div className="mb-16 space-y-4">
                    <div className="inline-block bg-neo-secondary border-4 border-black px-4 py-1 -rotate-1 shadow-neo-sm">
                        <h2 className="text-4xl md:text-6xl font-black text-black uppercase tracking-tight">
                            Welcome, <span className="underline decoration-8 decoration-neo-accent">{session.user.name || "Dev"}</span>
                        </h2>
                    </div>
                    <p className="text-black text-xl md:text-2xl font-bold max-w-3xl leading-snug">
                        Select repositories to track and prepare for consequences when your code breaks.
                    </p>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
                    <div className="group relative bg-white border-4 border-black p-8 shadow-neo-md hover:shadow-neo-lg hover:-translate-y-1 transition-all">
                        <div className="flex items-start gap-6">
                            <div className="p-4 bg-neo-muted border-4 border-black group-hover:rotate-6 transition-transform">
                                <Zap className="w-8 h-8 text-black" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-black uppercase tracking-tight">Auto-Tracking</h3>
                                <p className="text-black font-bold text-lg leading-tight">
                                    When you track a repo, we&apos;ll automatically set up GitHub Actions to monitor your commits.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-neo-accent border-4 border-black p-8 shadow-neo-md hover:shadow-neo-lg hover:-translate-y-1 transition-all">
                        <div className="flex items-start gap-6">
                            <div className="p-4 bg-white border-4 border-black group-hover:-rotate-6 transition-transform">
                                <Skull className="w-8 h-8 text-black" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-black text-black uppercase tracking-tight">Punishment System</h3>
                                <p className="text-black font-bold text-lg leading-tight">
                                    Breaking code? Face the consequences! Our system will detect failures and trigger punishments.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Repo List */}
                <div className="bg-white border-8 border-black p-8 shadow-neo-xl">
                    <div className="mb-8 border-b-4 border-black pb-4 flex items-center gap-4">
                        <AlertTriangle className="w-8 h-8 text-neo-secondary stroke-[3px]" />
                        <h3 className="text-3xl font-black text-black uppercase tracking-widest">Repository Chamber</h3>
                    </div>
                    <RepoList />
                </div>
            </main>
        </div>
    );
}
