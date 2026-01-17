"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Filter, GitBranch, Lock, Star, Code, Loader2 } from "lucide-react";

interface Repo {
    id: number;
    name: string;
    fullName: string;
    description: string | null;
    private: boolean;
    language: string | null;
    stargazersCount: number;
    updatedAt: string;
    defaultBranch: string;
}

interface RepoListProps {
    initialRepos?: Repo[];
}

type FilterType = "all" | "private" | "public" | "tracked";

export function RepoList({ initialRepos = [] }: RepoListProps) {
    const [repos, setRepos] = useState<Repo[]>(initialRepos);
    const [isLoadingRepos, setIsLoadingRepos] = useState(initialRepos.length === 0);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<FilterType>("all");
    const [trackedRepos, setTrackedRepos] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch repos on mount if not provided
    useEffect(() => {
        if (initialRepos.length === 0) {
            fetch("/api/repos", {
                credentials: "include",
            })
                .then(async (res) => {
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({ error: "Failed to fetch repositories" }));
                        throw new Error(errorData.error || `HTTP ${res.status}`);
                    }
                    return res.json();
                })
                .then((data) => {
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    setRepos(data.repos || []);
                    setIsLoadingRepos(false);
                })
                .catch((err) => {
                    console.error("Failed to fetch repos:", err);
                    setError(err.message || "Failed to load repositories. Please refresh the page.");
                    setIsLoadingRepos(false);
                });
        }
    }, [initialRepos.length]);

    // Toggle tracking for a repo
    const toggleTracking = async (repo: Repo) => {
        const isCurrentlyTracked = trackedRepos.has(repo.id);
        const newTrackedState = !isCurrentlyTracked;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/track", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    repoFullName: repo.fullName,
                    tracked: newTrackedState,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "Failed to update tracking" }));
                throw new Error(errorData.error || "Failed to update tracking");
            }

            // Update local state
            const newTracked = new Set(trackedRepos);
            if (newTrackedState) {
                newTracked.add(repo.id);
            } else {
                newTracked.delete(repo.id);
            }
            setTrackedRepos(newTracked);
        } catch (err) {
            setError("Failed to update tracking. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Filter and search repos
    const filteredRepos = useMemo(() => {
        return repos.filter((repo) => {
            // Search filter
            const matchesSearch =
                repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (repo.description &&
                    repo.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                repo.fullName.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            // Type filter
            if (filter === "private" && !repo.private) return false;
            if (filter === "public" && repo.private) return false;
            if (filter === "tracked" && !trackedRepos.has(repo.id)) return false;

            return true;
        });
    }, [repos, searchQuery, filter, trackedRepos]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInDays = Math.floor(
            (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffInDays === 0) return "Today";
        if (diffInDays === 1) return "Yesterday";
        if (diffInDays < 7) return `${diffInDays} days ago`;
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
        return `${Math.floor(diffInDays / 30)} months ago`;
    };

    return (
        <div className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 sticky top-0 z-10 bg-gradient-to-b from-indigo-950/95 to-indigo-900/95 backdrop-blur-sm pb-4 pt-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search repositories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            filter === "all"
                                ? "bg-purple-600 text-white"
                                : "bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter("public")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            filter === "public"
                                ? "bg-purple-600 text-white"
                                : "bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                    >
                        Public
                    </button>
                    <button
                        onClick={() => setFilter("private")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            filter === "private"
                                ? "bg-purple-600 text-white"
                                : "bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                    >
                        Private
                    </button>
                    <button
                        onClick={() => setFilter("tracked")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                            filter === "tracked"
                                ? "bg-purple-600 text-white"
                                : "bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        Tracked ({trackedRepos.size})
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Loading State */}
            {isLoadingRepos ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    <span className="ml-3 text-white/60">Loading repositories...</span>
                </div>
            ) : (
                <>
                    {/* Results Count */}
                    <div className="text-white/60 text-sm">
                        {filteredRepos.length} {filteredRepos.length === 1 ? "repository" : "repositories"}
                    </div>

                    {/* Repo List */}
                    <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto pr-2 custom-scrollbar">
                {filteredRepos.length === 0 ? (
                    <div className="text-center py-12 text-white/40">
                        <Code className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No repositories found</p>
                        <p className="text-sm mt-2">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    filteredRepos.map((repo) => {
                        const isTracked = trackedRepos.has(repo.id);
                        return (
                            <div
                                key={repo.id}
                                className="group bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-purple-500/50 transition-all duration-200 cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
                                                {repo.name}
                                            </h3>
                                            {repo.private ? (
                                                <Lock className="w-4 h-4 text-white/40 flex-shrink-0" />
                                            ) : null}
                                            {isTracked && (
                                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-600/30 text-purple-300 rounded-full flex-shrink-0">
                                                    Tracking
                                                </span>
                                            )}
                                        </div>
                                        {repo.description && (
                                            <p className="text-white/60 text-sm mb-3 line-clamp-2">
                                                {repo.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-sm text-white/40">
                                            {repo.language && (
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                                    <span>{repo.language}</span>
                                                </div>
                                            )}
                                            {repo.stargazersCount > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <Star className="w-4 h-4" />
                                                    <span>{repo.stargazersCount}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1">
                                                <GitBranch className="w-4 h-4" />
                                                <span>{repo.defaultBranch}</span>
                                            </div>
                                            <span>Updated {formatDate(repo.updatedAt)}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleTracking(repo)}
                                        disabled={loading}
                                        className={`px-6 py-2.5 rounded-lg font-medium transition-all flex-shrink-0 ${
                                            isTracked
                                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/30"
                                                : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/20"
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isTracked ? "✓ Tracked" : "Track"}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
                    </div>
                </>
            )}
        </div>
    );
}
