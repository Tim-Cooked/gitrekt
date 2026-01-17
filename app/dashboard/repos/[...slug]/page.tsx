"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, GitCommit, Calendar, User, Loader2 } from "lucide-react";

interface Commit {
    sha: string;
    message: string;
    author: {
        name: string;
        email: string;
        date: string;
        avatar: string | null;
    };
    url: string;
}

export default function RepoHistoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const [commits, setCommits] = useState<Commit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const repoFullName = resolvedParams.slug.join("/");
    const [owner, repo] = resolvedParams.slug;

    useEffect(() => {
        fetch(`/api/repos/${repoFullName}/commits`, {
            credentials: "include",
        })
            .then(async (res) => {
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({ error: "Failed to fetch commits" }));
                    throw new Error(errorData.error || `HTTP ${res.status}`);
                }
                return res.json();
            })
            .then((data) => {
                if (data.error) {
                    throw new Error(data.error);
                }
                setCommits(data.commits || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Failed to fetch commits:", err);
                setError(err.message || "Failed to load commit history.");
                setLoading(false);
            });
    }, [repoFullName]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };

    const getShortSha = (sha: string) => {
        return sha.substring(0, 7);
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-indigo-950 via-purple-900 to-pink-900">
            {/* Header */}
            <header className="border-b border-white/10 bg-linear-to-r from-indigo-950/50 to-purple-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white/70" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold bg-linear-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                {repo}
                            </h1>
                            <p className="text-sm text-white/60">{owner}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                        <GitCommit className="w-8 h-8" />
                        Commit History
                    </h2>
                    <p className="text-white/60">Recent commits for this repository</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        <span className="ml-3 text-white/60">Loading commits...</span>
                    </div>
                ) : commits.length === 0 ? (
                    <div className="text-center py-12 text-white/40">
                        <GitCommit className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No commits found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {commits.map((commit) => (
                            <div
                                key={commit.sha}
                                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-purple-500/50 transition-all duration-200"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="shrink-0 mt-1">
                                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-mono text-xs font-bold">
                                            {commit.author.avatar ? (
                                                <Image
                                                    src={commit.author.avatar}
                                                    alt={commit.author.name}
                                                    width={40}
                                                    height={40}
                                                    className="w-full h-full rounded-full"
                                                />
                                            ) : (
                                                commit.author.name.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-medium mb-1 wrap-break-word">
                                                    {commit.message.split("\n")[0]}
                                                </p>
                                                <div className="flex items-center gap-4 text-sm text-white/60 flex-wrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <User className="w-4 h-4" />
                                                        <span>{commit.author.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-4 h-4" />
                                                        <span>{formatDate(commit.author.date)}</span>
                                                    </div>
                                                    <a
                                                        href={commit.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-mono text-purple-300 hover:text-purple-200 transition-colors"
                                                    >
                                                        {getShortSha(commit.sha)}
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
