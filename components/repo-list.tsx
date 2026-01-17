"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, GitBranch, Lock, Star, Code, Loader2, Skull, RotateCcw } from "lucide-react";
import { LinkedInIcon, TwitterIcon } from "@/components/brand-icons";

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
    const router = useRouter();
    const [repos, setRepos] = useState<Repo[]>(initialRepos);
    const [isLoadingRepos, setIsLoadingRepos] = useState(initialRepos.length === 0);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<FilterType>("all");
    const [trackedRepos, setTrackedRepos] = useState<Set<number>>(new Set());
    const [trackedRepoConfigs, setTrackedRepoConfigs] = useState<Record<string, { postToLinkedIn: boolean; postToTwitter: boolean; yoloMode: boolean; revertCommit: boolean }>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUntrackModal, setShowUntrackModal] = useState(false);
    const [repoToUntrack, setRepoToUntrack] = useState<Repo | null>(null);

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
                    // Load tracked repos from API response
                    if (data.trackedRepos && Array.isArray(data.trackedRepos)) {
                        const trackedSet = new Set<number>();
                        data.repos.forEach((repo: Repo) => {
                            if (data.trackedRepos.includes(repo.fullName)) {
                                trackedSet.add(repo.id);
                            }
                        });
                        setTrackedRepos(trackedSet);
                    }
                    // Load tracked repo configs
                    if (data.trackedRepoConfigs) {
                        setTrackedRepoConfigs(data.trackedRepoConfigs);
                    }
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
        
        if (!isCurrentlyTracked) {
            // Redirect to configure page for new tracking
            router.push(`/dashboard/repos/configure/${repo.fullName}`);
            return;
        }

        // Untracking - show confirmation modal
        setRepoToUntrack(repo);
        setShowUntrackModal(true);
    };

    // Handle untrack confirmation
    const handleUntrackConfirm = async () => {
        if (!repoToUntrack) return;

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
                    repoFullName: repoToUntrack.fullName,
                    tracked: false,
                }),
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                const errorMessage = errorData.error || `Failed to update tracking (HTTP ${response.status})`;
                console.error("API error response:", errorData);
                throw new Error(errorMessage);
            }

            // Update local state
            const newTracked = new Set(trackedRepos);
            newTracked.delete(repoToUntrack.id);
            setTrackedRepos(newTracked);

            // Remove config from state
            const newConfigs = { ...trackedRepoConfigs };
            delete newConfigs[repoToUntrack.fullName];
            setTrackedRepoConfigs(newConfigs);

            // Close modal
            setShowUntrackModal(false);
            setRepoToUntrack(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to update tracking. Please try again.";
            setError(errorMessage);
            console.error("Tracking error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Handle untrack cancel
    const handleUntrackCancel = () => {
        setShowUntrackModal(false);
        setRepoToUntrack(null);
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
            <div className="flex flex-col sm:flex-row gap-4 sticky top-0 z-10 bg-linear-to-b from-indigo-950/95 to-indigo-900/95 backdrop-blur-sm pb-4 pt-4 rounded-xl px-4 border border-white/10">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5 pointer-events-none transition-colors duration-200" />
                    <input
                        type="text"
                        placeholder="Search repositories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-white/4 border border-white/10 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/40 transition-all shadow-lg shadow-black/10 backdrop-blur-sm hover:bg-white/6 hover:border-white/20 focus:shadow-xl focus:shadow-purple-500/10"
                    />
                </div>
                <div className="flex gap-2.5 flex-wrap">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                            filter === "all"
                                ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/40 scale-105 ring-2 ring-purple-500/30"
                                : "bg-white/6 text-white/80 hover:bg-white/12 hover:text-white border border-white/10 hover:border-white/25 hover:shadow-md hover:shadow-black/10"
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter("public")}
                        className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                            filter === "public"
                                ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/40 scale-105 ring-2 ring-purple-500/30"
                                : "bg-white/6 text-white/80 hover:bg-white/12 hover:text-white border border-white/10 hover:border-white/25 hover:shadow-md hover:shadow-black/10"
                        }`}
                    >
                        Public
                    </button>
                    <button
                        onClick={() => setFilter("private")}
                        className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                            filter === "private"
                                ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/40 scale-105 ring-2 ring-purple-500/30"
                                : "bg-white/6 text-white/80 hover:bg-white/12 hover:text-white border border-white/10 hover:border-white/25 hover:shadow-md hover:shadow-black/10"
                        }`}
                    >
                        Private
                    </button>
                    <button
                        onClick={() => setFilter("tracked")}
                        className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                            filter === "tracked"
                                ? "bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/40 scale-105 ring-2 ring-purple-500/30"
                                : "bg-white/6 text-white/80 hover:bg-white/12 hover:text-white border border-white/10 hover:border-white/25 hover:shadow-md hover:shadow-black/10"
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        Tracked ({trackedRepos.size})
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-linear-to-r from-red-500/20 to-orange-500/20 border border-red-500/40 text-red-100 px-6 py-4 rounded-xl backdrop-blur-sm shadow-xl shadow-red-500/20 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse shadow-lg shadow-red-400/50"></div>
                        <span className="font-semibold tracking-wide">{error}</span>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoadingRepos ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative">
                        <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                        <div className="absolute inset-0 w-12 h-12 border-2 border-purple-500/20 rounded-full"></div>
                    </div>
                    <span className="mt-6 text-white/70 font-medium tracking-wide">Loading repositories...</span>
                </div>
            ) : (
                <>
                    {/* Results Count */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-white/80 text-sm font-semibold tracking-wide">
                            {filteredRepos.length} {filteredRepos.length === 1 ? "repository" : "repositories"}
                        </div>
                    </div>

                    {/* Repo List */}
                    <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2 custom-scrollbar">
                {filteredRepos.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-linear-to-br from-white/5 to-white/2 border border-white/10 mb-6 shadow-lg shadow-black/10">
                            <Code className="w-12 h-12 text-white/40" />
                        </div>
                        <p className="text-xl font-semibold text-white/90 mb-2 tracking-tight">No repositories found</p>
                        <p className="text-sm text-white/60">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    filteredRepos.map((repo) => {
                        const isTracked = trackedRepos.has(repo.id);
                        return (
                            <div
                                key={repo.id}
                                onClick={(e) => {
                                    // Don't navigate if clicking the button
                                    if ((e.target as HTMLElement).closest('button')) return;
                                    router.push(`/dashboard/repos/${repo.fullName}`);
                                }}
                                className="group bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-purple-500/50 transition-all duration-200 cursor-pointer"
                            >
                                <div className="flex items-start justify-between gap-5">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                                            <h3 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-linear-to-r group-hover:from-purple-300 group-hover:to-pink-300 transition-all duration-300 truncate">
                                                {repo.name}
                                            </h3>
                                            {repo.private ? (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/8 border border-white/10 rounded-lg">
                                                    <Lock className="w-3.5 h-3.5 text-white/50" />
                                                    <span className="text-xs font-medium text-white/60">Private</span>
                                                </div>
                                            ) : null}
                                            {isTracked && (
                                                <span className="px-3 py-1 text-xs font-semibold bg-linear-to-r from-purple-600/40 to-pink-600/40 text-purple-200 rounded-full border border-purple-500/30 backdrop-blur-sm shadow-sm">
                                                    Tracking
                                                </span>
                                            )}
                                        </div>
                                        {repo.description && (
                                            <p className="text-white/70 text-sm mb-4 line-clamp-2 leading-relaxed">
                                                {repo.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-5 text-sm text-white/50 flex-wrap">
                                            {repo.language && (
                                                <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-linear-to-br from-purple-400 to-pink-400 shadow-sm"></div>
                                                    <span className="font-medium">{repo.language}</span>
                                                </div>
                                            )}
                                            {repo.stargazersCount > 0 && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
                                                    <Star className="w-4 h-4 text-yellow-400/70 fill-yellow-400/20" />
                                                    <span className="font-medium">{repo.stargazersCount.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
                                                <GitBranch className="w-4 h-4 text-white/50" />
                                                <span className="font-medium">{repo.defaultBranch}</span>
                                            </div>
                                            <div className="text-white/40 text-xs">
                                                Updated {formatDate(repo.updatedAt)}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Tracking Settings Icons */}
                                    {isTracked && trackedRepoConfigs[repo.fullName] && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            {trackedRepoConfigs[repo.fullName].postToLinkedIn ? (
                                                <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg" title="LinkedIn posting enabled">
                                                    <LinkedInIcon className="w-5 h-5 text-blue-400" />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-white/5 border border-white/10 rounded-lg opacity-40" title="LinkedIn posting disabled">
                                                    <LinkedInIcon className="w-5 h-5 text-white/30" />
                                                </div>
                                            )}
                                            {trackedRepoConfigs[repo.fullName].postToTwitter ? (
                                                <div className="p-2 bg-gray-600/20 border border-gray-500/30 rounded-lg" title="X (Twitter) posting enabled">
                                                    <TwitterIcon className="w-5 h-5 text-gray-400" />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-white/5 border border-white/10 rounded-lg opacity-40" title="X (Twitter) posting disabled">
                                                    <TwitterIcon className="w-5 h-5 text-white/30" />
                                                </div>
                                            )}
                                            {trackedRepoConfigs[repo.fullName].yoloMode ? (
                                                <div className="p-2 bg-red-600/20 border border-red-500/30 rounded-lg" title="Hardcore mode enabled">
                                                    <Skull className="w-5 h-5 text-red-400" />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-white/5 border border-white/10 rounded-lg opacity-40" title="Hardcore mode disabled">
                                                    <Skull className="w-5 h-5 text-white/30" />
                                                </div>
                                            )}
                                            {trackedRepoConfigs[repo.fullName].revertCommit ? (
                                                <div className="p-2 bg-orange-600/20 border border-orange-500/30 rounded-lg" title="Revert commit enabled">
                                                    <RotateCcw className="w-5 h-5 text-orange-400" />
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-white/5 border border-white/10 rounded-lg opacity-40" title="Revert commit disabled">
                                                    <RotateCcw className="w-5 h-5 text-white/30" />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTracking(repo);
                                        }}
                                        disabled={loading}
                                        className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shrink-0 ${
                                            isTracked
                                                ? "bg-linear-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/60 hover:scale-105 active:scale-95 ring-2 ring-purple-500/30"
                                                : "bg-white/8 text-white/80 hover:bg-white/15 hover:text-white border border-white/20 hover:border-white/35 hover:shadow-md hover:shadow-black/10 hover:scale-105 active:scale-95"
                                        } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                                    >
                                        {isTracked ? (
                                            <span className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                                Tracked
                                            </span>
                                        ) : (
                                            "Track"
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
                    </div>
                </>
            )}

            {/* Untrack Confirmation Modal */}
            {showUntrackModal && repoToUntrack && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 border border-purple-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-purple-500/20">
                        {/* GitRekt Logo */}
                        <div className="flex justify-center mb-6">
                            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-400 via-purple-400 to-blue-400">
                                GitRekt
                            </h2>
                        </div>

                        {/* Confirmation Message */}
                        <div className="text-center mb-8">
                            <p className="text-white text-lg font-semibold mb-2">
                                Untrack Repository?
                            </p>
                            <p className="text-white/70 text-sm">
                                Are you sure you want to untrack <span className="font-medium text-white">{repoToUntrack.name}</span> from GitRekt?
                            </p>
                            <p className="text-white/60 text-xs mt-3">
                                This will remove the webhook and workflow file from the repository.
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleUntrackCancel}
                                disabled={loading}
                                className="flex-1 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUntrackConfirm}
                                disabled={loading}
                                className="flex-1 px-4 py-3 bg-linear-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all font-medium shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Untracking..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
