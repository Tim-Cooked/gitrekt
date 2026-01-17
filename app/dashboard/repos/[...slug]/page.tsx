"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, GitCommit, Calendar, User, Loader2, Flame, Clock, CheckCircle, AlertTriangle, Skull, Settings } from "lucide-react";
import { GITREKT_COMMIT_MESSAGES } from "@/lib/github";
import { LinkedInIcon, TwitterIcon } from "@/components/brand-icons";

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

interface RoastEvent {
    id: string;
    commitSha: string | null;
    actor: string;
    commitMessage: string;
    roast: string;
    failReason: string | null;
    deadline: string | null;
    posted: boolean;
    fixed: boolean;
    createdAt: string;
}

function CountdownTimer({ deadline, posted, fixed }: { deadline: string; posted: boolean; fixed: boolean }) {
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date().getTime();
            const deadlineTime = new Date(deadline).getTime();
            const difference = deadlineTime - now;

            if (difference <= 0) {
                setIsExpired(true);
                setTimeLeft("Expired");
                return;
            }

            const hours = Math.floor(difference / (1000 * 60 * 60));
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((difference % (1000 * 60)) / 1000);

            if (hours > 0) {
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            } else if (minutes > 0) {
                setTimeLeft(`${minutes}m ${seconds}s`);
            } else {
                setTimeLeft(`${seconds}s`);
            }
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [deadline]);

    if (fixed) {
        return (
            <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Fixed in time!</span>
            </div>
        );
    }

    if (posted || isExpired) {
        return (
            <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Time expired!</span>
            </div>
        );
    }

    const isUrgent = new Date(deadline).getTime() - new Date().getTime() < 5 * 60 * 1000; // Less than 5 minutes

    return (
        <div className={`flex items-center gap-2 ${isUrgent ? "text-red-400 animate-pulse" : "text-amber-400"}`}>
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
                Fix in: <span className="font-mono">{timeLeft}</span>
            </span>
        </div>
    );
}

export default function RepoHistoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const [commits, setCommits] = useState<Commit[]>([]);
    const [roasts, setRoasts] = useState<RoastEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [trackingConfig, setTrackingConfig] = useState<{ postToLinkedIn: boolean; postToTwitter: boolean; yoloMode: boolean } | null>(null);

    const repoFullName = resolvedParams.slug.join("/");
    const [owner, repo] = resolvedParams.slug;

    // Create a map of commit SHA to roast for quick lookup
    const roastMap = new Map(roasts.map((r) => [r.commitSha, r]));

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch commits
                const commitsRes = await fetch(`/api/repos/${repoFullName}/commits`, {
                    credentials: "include",
                });
                if (!commitsRes.ok) {
                    const errorData = await commitsRes.json().catch(() => ({ error: "Failed to fetch commits" }));
                    throw new Error(errorData.error || `HTTP ${commitsRes.status}`);
                }
                const commitsData = await commitsRes.json();
                setCommits(commitsData.commits || []);

                // Fetch roasts for this repo
                const roastsRes = await fetch(`/api/roasts/${repoFullName}`, {
                    credentials: "include",
                });
                if (roastsRes.ok) {
                    const roastsData = await roastsRes.json();
                    setRoasts(roastsData.roasts || []);
                }

                // Fetch tracking config for this repo
                const configRes = await fetch(`/api/track?repoFullName=${encodeURIComponent(repoFullName)}`, {
                    credentials: "include",
                });
                if (configRes.ok) {
                    const configData = await configRes.json();
                    if (configData.config) {
                        setTrackingConfig(configData.config);
                    }
                }
            } catch (err: unknown) {
                console.error("Failed to fetch data:", err);
                setError(err instanceof Error ? err.message : "Failed to load data.");
            } finally {
                setLoading(false);
            }
        }

        fetchData();
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

    const getShortSha = (sha: string) => sha.substring(0, 7);

    const isGitRektCommit = (message: string): boolean => {
        return GITREKT_COMMIT_MESSAGES.some((msg) => message.startsWith(msg));
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
                <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                            <GitCommit className="w-8 h-8" />
                            Commit History
                        </h2>
                        <p className="text-white/60">
                            Recent commits for this repository
                            {roasts.length > 0 && (
                                <span className="ml-2 text-red-400">
                                    • {roasts.length} roast{roasts.length !== 1 ? "s" : ""} 🔥
                                </span>
                            )}
                        </p>
                    </div>
                    
                    {/* Tracking Settings Section */}
                    {trackingConfig && (
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                                {trackingConfig.postToLinkedIn ? (
                                    <div className="p-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg" title="LinkedIn posting enabled">
                                        <LinkedInIcon className="w-5 h-5 text-blue-400" />
                                    </div>
                                ) : (
                                    <div className="p-1.5 bg-white/5 border border-white/10 rounded-lg opacity-40" title="LinkedIn posting disabled">
                                        <LinkedInIcon className="w-5 h-5 text-white/30" />
                                    </div>
                                )}
                                {trackingConfig.postToTwitter ? (
                                    <div className="p-1.5 bg-gray-600/20 border border-gray-500/30 rounded-lg" title="X (Twitter) posting enabled">
                                        <TwitterIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                ) : (
                                    <div className="p-1.5 bg-white/5 border border-white/10 rounded-lg opacity-40" title="X (Twitter) posting disabled">
                                        <TwitterIcon className="w-5 h-5 text-white/30" />
                                    </div>
                                )}
                                {trackingConfig.yoloMode ? (
                                    <div className="p-1.5 bg-red-600/20 border border-red-500/30 rounded-lg" title="Hardcore mode enabled">
                                        <Skull className="w-5 h-5 text-red-400" />
                                    </div>
                                ) : (
                                    <div className="p-1.5 bg-white/5 border border-white/10 rounded-lg opacity-40" title="Hardcore mode disabled">
                                        <Skull className="w-5 h-5 text-white/30" />
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => router.push(`/dashboard/repos/configure/${repoFullName}`)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/8 hover:bg-white/15 text-white/80 hover:text-white border border-white/20 hover:border-white/35 rounded-xl transition-all duration-200 hover:shadow-md hover:shadow-black/10"
                            >
                                <Settings className="w-4 h-4" />
                                <span className="text-sm font-medium">Settings</span>
                            </button>
                        </div>
                    )}
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
                        {commits.map((commit) => {
                            const roast = roastMap.get(commit.sha);
                            const hasRoast = !!roast;
                            const isGitRekt = isGitRektCommit(commit.message);

                            return (
                                <div
                                    key={commit.sha}
                                    className={`border rounded-xl transition-all duration-200 ${
                                        isGitRekt
                                            ? "bg-white/3 border-white/5 p-3 opacity-90"
                                            : hasRoast
                                            ? "bg-white/5 border-red-500/50 hover:border-red-400/70 p-5"
                                            : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/50 p-5"
                                    }`}
                                >
                                    {isGitRekt ? (
                                        // Single row layout for GitRekt commits
                                        <div className="flex items-center gap-3 flex-wrap text-xs text-white/30">
                                            <p className="text-white/40 font-normal shrink-0">
                                                {commit.message.split("\n")[0]}
                                            </p>
                                            <span className="text-white/20">•</span>
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3 h-3" />
                                                <span>{commit.author.name}</span>
                                            </div>
                                            <span className="text-white/20">•</span>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                <span>{formatDate(commit.author.date)}</span>
                                            </div>
                                            <span className="text-white/20">•</span>
                                            <a
                                                href={commit.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-mono text-purple-400/30 hover:text-purple-400/40 transition-colors"
                                            >
                                                {getShortSha(commit.sha)}
                                            </a>
                                        </div>
                                    ) : (
                                        // Normal layout for user commits
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
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-white font-medium mb-1 wrap-break-word">
                                                                {commit.message.split("\n")[0]}
                                                            </p>
                                                            {hasRoast && (
                                                                <Flame className="w-5 h-5 text-red-500 shrink-0" />
                                                            )}
                                                        </div>
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

                                                {/* Roast Section */}
                                                {hasRoast && roast && (
                                                    <div className="mt-4 space-y-3">
                                                        {/* Countdown Timer */}
                                                        {roast.deadline && (
                                                            <CountdownTimer
                                                                deadline={roast.deadline}
                                                                posted={roast.posted}
                                                                fixed={roast.fixed}
                                                            />
                                                        )}

                                                        {roast.failReason && (
                                                            <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                                                                <p className="text-red-400 text-sm">
                                                                    <strong>Issue:</strong> {roast.failReason}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div className="bg-orange-950/30 border border-orange-500/30 rounded-lg p-4">
                                                            <p className="text-orange-300 font-medium flex items-center gap-2 mb-2">
                                                                <Flame className="w-4 h-4" />
                                                                Roast
                                                            </p>
                                                            <p className="text-white/90">{roast.roast}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}