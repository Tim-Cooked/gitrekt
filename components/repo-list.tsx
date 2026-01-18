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
        <div className="space-y-8">
            {/* Search and Filter Bar */}
            <div className="flex flex-col lg:flex-row gap-6 sticky top-24 z-10 bg-white border-4 border-black p-6 shadow-neo-md">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black w-6 h-6 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="SEARCH REPOSITORIES..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-4 py-4 bg-white border-4 border-black text-black placeholder:text-black/40 focus:outline-none focus:bg-neo-secondary focus:shadow-neo-sm font-black uppercase tracking-widest transition-all"
                    />
                </div>
                <div className="flex gap-3 flex-wrap">
                    {(["all", "public", "private", "tracked"] as FilterType[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setFilter(t)}
                            className={`px-6 py-4 border-4 border-black font-black text-sm uppercase tracking-widest transition-all ${
                                filter === t
                                    ? "bg-neo-accent text-black shadow-neo-sm -translate-y-1 -translate-x-1"
                                    : "bg-white text-black hover:bg-neo-muted"
                            }`}
                        >
                            {t === "tracked" ? (
                                <span className="flex items-center gap-2">
                                    <Filter className="w-4 h-4" />
                                    {t} ({trackedRepos.size})
                                </span>
                            ) : t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-neo-accent border-4 border-black text-black px-6 py-4 shadow-neo-sm rotate-1 flex items-center gap-4">
                    <Skull className="w-8 h-8 stroke-[3px]" />
                    <span className="font-black uppercase tracking-widest">{error}</span>
                </div>
            )}

            {/* Loading State */}
            {isLoadingRepos ? (
                <div className="flex flex-col items-center justify-center py-24 bg-white border-4 border-black shadow-neo-md">
                    <div className="relative">
                        <Loader2 className="w-16 h-16 text-neo-accent animate-spin stroke-[4px]" />
                    </div>
                    <span className="mt-8 text-black font-black uppercase tracking-[0.3em] text-xl">Analyzing Repositories...</span>
                </div>
            ) : (
                <>
                    {/* Results Count */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="bg-black text-white px-4 py-1 font-black uppercase tracking-widest text-xs">
                            {filteredRepos.length} {filteredRepos.length === 1 ? "STASHED REPO" : "STASHED REPOS"}
                        </div>
                    </div>

                    {/* Repo List */}
                    <div className="space-y-6 max-h-[calc(100vh-400px)] overflow-y-auto pr-4 custom-scrollbar">
                {filteredRepos.length === 0 ? (
                    <div className="text-center py-24 bg-white border-4 border-black shadow-neo-md">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-neo-muted border-4 border-black mb-8 rotate-6 shadow-neo-sm">
                            <Code className="w-12 h-12 text-black" />
                        </div>
                        <p className="text-2xl font-black text-black uppercase tracking-tight mb-2">Chamber Empty</p>
                        <p className="text-black font-bold uppercase tracking-widest text-sm">Try adjusting your filters</p>
                    </div>
                ) : (
                    filteredRepos.map((repo) => {
                        const isTracked = trackedRepos.has(repo.id);
                        return (
                            <div
                                key={repo.id}
                                onClick={(e) => {
                                    if ((e.target as HTMLElement).closest('button')) return;
                                    router.push(`/dashboard/repos/${repo.fullName}`);
                                }}
                                className="group bg-white border-4 border-black p-6 hover:bg-neo-secondary hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all cursor-pointer relative"
                            >
                                <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                                    <div className="flex-1 min-w-0 space-y-4">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <h3 className="text-2xl font-black text-black uppercase tracking-tight group-hover:underline decoration-4">
                                                {repo.name}
                                            </h3>
                                            {repo.private ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-black text-white font-black uppercase tracking-widest text-[10px]">
                                                    <Lock className="w-3 h-3" />
                                                    <span>Private</span>
                                                </div>
                                            ) : null}
                                            {isTracked && (
                                                <div className="bg-neo-accent border-2 border-black px-3 py-1 font-black uppercase tracking-widest text-[10px] shadow-neo-xs rotate-2">
                                                    Tracking
                                                </div>
                                            )}
                                        </div>
                                        {repo.description && (
                                            <p className="text-black font-bold text-sm line-clamp-2 leading-tight">
                                                {repo.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-black/60 flex-wrap">
                                            {repo.language && (
                                                <div className="flex items-center gap-2 px-2 py-1 bg-white border-2 border-black shadow-neo-xs">
                                                    <div className="w-2 h-2 bg-neo-accent border-black border"></div>
                                                    <span>{repo.language}</span>
                                                </div>
                                            )}
                                            {repo.stargazersCount > 0 && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-white border-2 border-black shadow-neo-xs">
                                                    <Star className="w-3 h-3 fill-black" />
                                                    <span>{repo.stargazersCount}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white border-2 border-black shadow-neo-xs">
                                                <GitBranch className="w-3 h-3" />
                                                <span>{repo.defaultBranch}</span>
                                            </div>
                                            <div className="ml-auto opacity-40">
                                                UPDATED {formatDate(repo.updatedAt).toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Tracking Settings Icons */}
                                    {isTracked && trackedRepoConfigs[repo.fullName] && (
                                        <div className="flex items-center gap-3 shrink-0 bg-white border-4 border-black p-2 shadow-neo-sm">
                                            {[
                                                { icon: LinkedInIcon, active: trackedRepoConfigs[repo.fullName].postToLinkedIn, color: 'bg-neo-muted', label: 'LinkedIn' },
                                                { icon: TwitterIcon, active: trackedRepoConfigs[repo.fullName].postToTwitter, color: 'bg-neo-secondary', label: 'X' },
                                                { icon: RotateCcw, active: trackedRepoConfigs[repo.fullName].revertCommit, color: 'bg-neo-muted', label: 'Revert' },
                                                { icon: Skull, active: trackedRepoConfigs[repo.fullName].yoloMode, color: 'bg-neo-accent', label: 'Hardcore' }
                                            ].map((social, i) => (
                                                <div 
                                                    key={i}
                                                    className={`p-2 border-2 border-black transition-all ${social.active ? social.color : 'bg-white opacity-20'}`}
                                                    title={`${social.label} ${social.active ? 'enabled' : 'disabled'}`}
                                                >
                                                    <social.icon className="w-5 h-5 text-black" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleTracking(repo);
                                        }}
                                        disabled={loading}
                                        className={`px-8 py-4 border-4 border-black font-black uppercase tracking-widest text-sm transition-all shrink-0 ${
                                            isTracked
                                                ? "bg-neo-accent text-black shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none"
                                                : "bg-white text-black hover:bg-neo-secondary hover:shadow-neo-sm hover:-translate-y-1 active:translate-y-0 active:shadow-none"
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isTracked ? "Untrack" : "Track"}
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
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white border-8 border-black p-8 max-w-md w-full shadow-neo-xl rotate-1">
                        {/* GitRekt Logo */}
                        <div className="flex justify-center mb-8">
                            <div className="bg-neo-accent border-4 border-black px-6 py-2 -rotate-3 shadow-neo-sm">
                                <h2 className="text-4xl font-black text-black uppercase tracking-tighter">
                                    GitRekt
                                </h2>
                            </div>
                        </div>

                        {/* Confirmation Message */}
                        <div className="text-center mb-10 space-y-4">
                            <p className="text-2xl font-black text-black uppercase tracking-tight">
                                UNTRACK REPOSITORY?
                            </p>
                            <p className="text-black font-bold text-lg leading-tight">
                                Are you sure you want to release <span className="bg-neo-secondary px-1 border-2 border-black">{repoToUntrack.name}</span> from the chamber?
                            </p>
                            <p className="text-black/60 font-black uppercase tracking-widest text-[10px] mt-6">
                                This will remove the webhook and workflow file from the repository.
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={handleUntrackCancel}
                                disabled={loading}
                                className="flex-1 px-6 py-4 bg-white border-4 border-black text-black font-black uppercase tracking-widest text-sm hover:bg-neo-muted transition-all disabled:opacity-50"
                            >
                                ABORT
                            </button>
                            <button
                                onClick={handleUntrackConfirm}
                                disabled={loading}
                                className="flex-1 px-6 py-4 bg-neo-accent border-4 border-black text-black font-black uppercase tracking-widest text-sm shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
                            >
                                {loading ? "UNTRACKING..." : "CONFIRM"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
