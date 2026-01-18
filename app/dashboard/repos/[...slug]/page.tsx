"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, GitCommit, Calendar, User, Loader2, Flame, Clock, CheckCircle, AlertTriangle, Skull, Settings, RotateCcw } from "lucide-react";
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
    deleted?: boolean; // True if commit was deleted (reverted/force-pushed)
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
    commitDate: string | null; // When the commit was actually made
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
            <div className="flex items-center gap-2 bg-neo-secondary border-2 border-black px-3 py-1 shadow-neo-xs">
                <CheckCircle className="w-4 h-4 text-black" />
                <span className="text-sm font-black uppercase tracking-widest text-black">Fixed in time!</span>
            </div>
        );
    }

    if (posted || isExpired) {
        return (
            <div className="flex items-center gap-2 bg-neo-accent border-2 border-black px-3 py-1 shadow-neo-xs">
                <AlertTriangle className="w-4 h-4 text-black" />
                <span className="text-sm font-black uppercase tracking-widest text-black">Time expired!</span>
            </div>
        );
    }

    const isUrgent = new Date(deadline).getTime() - new Date().getTime() < 5 * 60 * 1000; // Less than 5 minutes

    return (
        <div className={`flex items-center gap-2 border-2 border-black px-3 py-1 shadow-neo-xs ${isUrgent ? "bg-neo-accent animate-pulse" : "bg-neo-secondary"}`}>
            <Clock className="w-4 h-4 text-black" />
            <span className="text-sm font-black uppercase tracking-widest text-black">
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
    const [trackingConfig, setTrackingConfig] = useState<{ postToLinkedIn: boolean; postToTwitter: boolean; yoloMode: boolean; revertCommit: boolean; createdAt?: string } | null>(null);

    const repoFullName = resolvedParams.slug.join("/");
    const [owner, repo] = resolvedParams.slug;

    // ... (fetch logic remains the same)
    
    // Poll for updates if there are commits being evaluated
    useEffect(() => {
        if (!trackingConfig || !trackingConfig.createdAt) return;
        
        const roastMap = new Map(roasts.map((r) => [r.commitSha, r]));
        const trackingStartDate = new Date(trackingConfig.createdAt);
        
        // Check if any commits are being evaluated
        const hasEvaluatingCommits = commits.some(commit => {
            const commitDate = new Date(commit.author.date);
            if (commitDate < trackingStartDate) return false;
            
            const roast = roastMap.get(commit.sha);
            // If there's no roast record, it's being evaluated
            return !roast;
        });
        
        if (!hasEvaluatingCommits) return;
        
        // Poll every 3 seconds while there are evaluating commits
        const pollInterval = setInterval(() => {
            async function refreshData() {
                try {
                    const roastsRes = await fetch(`/api/roasts/${repoFullName}`, {
                        credentials: "include",
                    });
                    if (roastsRes.ok) {
                        const roastsData = await roastsRes.json();
                        setRoasts(roastsData.roasts || []);
                    }
                } catch (err) {
                    console.error("Failed to refresh roasts:", err);
                }
            }
            refreshData();
        }, 3000);
        
        return () => clearInterval(pollInterval);
    }, [commits, roasts, trackingConfig, repoFullName]);

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

    const getCommitStatus = (commit: Commit, roast: RoastEvent | undefined): "untracked" | "success" | "failure" | "evaluating" => {
        // If no tracking config, all commits are untracked
        if (!trackingConfig || !trackingConfig.createdAt) {
            return "untracked";
        }

        const commitDate = new Date(commit.author.date);
        const trackingStartDate = new Date(trackingConfig.createdAt);

        // If commit was made before tracking started, it's untracked
        if (commitDate < trackingStartDate) {
            return "untracked";
        }

        // If there's a judgment record (roast)
        if (roast) {
            // If fixed = true, it's a success (either passed judgment or fixed in time)
            // If fixed = false, it's a failure (judged and failed)
            return roast.fixed ? "success" : "failure";
        }

        // No judgment record means it's currently being evaluated by the AI
        return "evaluating";
    };

    const getStatusBadge = (status: "untracked" | "success" | "failure" | "evaluating") => {
        switch (status) {
            case "untracked":
                return (
                    <span className="bg-white border-2 border-black px-2 py-0.5 text-black font-black uppercase tracking-widest text-[10px] shadow-neo-xs">UNTRACKED</span>
                );
            case "evaluating":
                return (
                    <span className="bg-neo-secondary border-2 border-black px-2 py-0.5 text-black font-black uppercase tracking-widest text-[10px] shadow-neo-xs">EVALUATING</span>
                );
            case "success":
                return (
                    <span className="bg-neo-muted border-2 border-black px-2 py-0.5 text-black font-black uppercase tracking-widest text-[10px] shadow-neo-xs">SUCCESSFUL</span>
                );
            case "failure":
                return (
                    <span className="bg-neo-accent border-2 border-black px-2 py-0.5 text-black font-black uppercase tracking-widest text-[10px] shadow-neo-xs">FAILURE</span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b-8 border-black bg-white shadow-neo-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => router.back()}
                            className="p-3 bg-white border-4 border-black shadow-neo-xs hover:shadow-neo-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
                        >
                            <ArrowLeft className="w-6 h-6 text-black stroke-[3px]" />
                        </button>
                        <div>
                            <div className="bg-neo-secondary border-4 border-black px-4 py-1 -rotate-1 shadow-neo-xs inline-block mb-1">
                                <h1 className="text-2xl font-black text-black uppercase tracking-tight">
                                    {repo}
                                </h1>
                            </div>
                            <p className="text-sm text-black font-black uppercase tracking-widest opacity-60 ml-1">{owner}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white border-4 border-black p-8 shadow-neo-md">
                    <div className="space-y-4">
                        <div className="inline-block bg-neo-muted border-4 border-black px-4 py-1 rotate-1 shadow-neo-xs">
                            <h2 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight flex items-center gap-4">
                                <GitCommit className="w-10 h-10" />
                                Commit History
                            </h2>
                        </div>
                        <p className="text-black font-bold text-lg leading-tight uppercase tracking-widest opacity-60">
                            Recent activity in the chamber
                            {roasts.length > 0 && (
                                <span className="ml-4 text-neo-accent font-black">
                                    • {roasts.length} ROAST{roasts.length !== 1 ? "S" : ""} DETECTED 🔥
                                </span>
                            )}
                        </p>
                    </div>
                    
                    {/* Tracking Settings Section */}
                    {trackingConfig && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3 bg-white border-4 border-black p-3 shadow-neo-sm">
                                {[
                                    { icon: LinkedInIcon, active: trackingConfig.postToLinkedIn, color: 'bg-neo-muted', label: 'LinkedIn' },
                                    { icon: TwitterIcon, active: trackingConfig.postToTwitter, color: 'bg-neo-secondary', label: 'X' },
                                    { icon: Skull, active: trackingConfig.yoloMode, color: 'bg-neo-accent', label: 'Hardcore' },
                                    { icon: RotateCcw, active: trackingConfig.revertCommit, color: 'bg-neo-muted', label: 'Revert' }
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
                            <button
                                onClick={() => router.push(`/dashboard/repos/configure/${repoFullName}`)}
                                className="p-4 bg-white border-4 border-black shadow-neo-sm hover:bg-neo-secondary hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all"
                            >
                                <Settings className="w-6 h-6 text-black" />
                            </button>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-neo-accent border-4 border-black text-black px-6 py-4 shadow-neo-sm rotate-1 flex items-center gap-4 mb-8">
                        <Skull className="w-8 h-8 stroke-[3px]" />
                        <span className="font-black uppercase tracking-widest">{error}</span>
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border-4 border-black shadow-neo-md">
                        <Loader2 className="w-16 h-16 text-neo-accent animate-spin stroke-[4px]" />
                        <span className="mt-6 text-black font-black uppercase tracking-widest text-xl">Extracting Commits...</span>
                    </div>
                ) : commits.length === 0 ? (
                    <div className="text-center py-20 bg-white border-4 border-black shadow-neo-md">
                        <GitCommit className="w-20 h-20 mx-auto mb-6 text-black opacity-20" />
                        <p className="text-2xl font-black text-black uppercase tracking-tight">Chamber Empty</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {commits.map((commit) => {
                            const roast = roastMap.get(commit.sha);
                            const hasRoast = !!roast;
                            const isGitRekt = isGitRektCommit(commit.message);
                            const commitStatus = getCommitStatus(commit, roast);
                            const isDeleted = commit.deleted;

                            return (
                                <div
                                    key={commit.sha}
                                    className={`border-4 border-black transition-all ${
                                        isGitRekt
                                            ? "bg-white/50 border-black p-4 opacity-70 border-dashed"
                                            : isDeleted
                                            ? "bg-neo-muted/20 border-black p-8 shadow-neo-sm grayscale"
                                            : hasRoast
                                            ? "bg-white border-black p-8 shadow-neo-md"
                                            : "bg-white border-black p-8 shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1"
                                    }`}
                                >
                                    {isGitRekt ? (
                                        // Single row layout for GitRekt commits
                                        <div className="flex items-center justify-between gap-4 flex-wrap text-[10px] font-black uppercase tracking-widest text-black/40">
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <p>{commit.message.split("\n")[0]}</p>
                                                <span>•</span>
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3 h-3" />
                                                    <span>{commit.author.name}</span>
                                                </div>
                                                <span>•</span>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{formatDate(commit.author.date).toUpperCase()}</span>
                                                </div>
                                                <span>•</span>
                                                <a
                                                    href={commit.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-mono text-black underline decoration-2 hover:bg-neo-secondary"
                                                >
                                                    {getShortSha(commit.sha)}
                                                </a>
                                            </div>
                                            {!isGitRekt && getStatusBadge(commitStatus)}
                                        </div>
                                    ) : (
                                        // Normal layout for user commits
                                        <div className="flex flex-col md:flex-row items-start gap-8">
                                            <div className="shrink-0">
                                                <div className={`w-16 h-16 border-4 border-black flex items-center justify-center shadow-neo-xs ${
                                                    isDeleted ? "bg-neo-muted" : "bg-neo-secondary"
                                                }`}>
                                                    {commit.author.avatar ? (
                                                        <Image
                                                            src={commit.author.avatar}
                                                            alt={commit.author.name}
                                                            width={64}
                                                            height={64}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-2xl font-black">{commit.author.name.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-6">
                                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-4 flex-wrap">
                                                            <p className={`text-2xl font-black uppercase tracking-tight ${
                                                                isDeleted ? "text-black/40 line-through" : "text-black"
                                                            }`}>
                                                                {commit.message.split("\n")[0]}
                                                            </p>
                                                            {isDeleted && (
                                                                <div className="bg-neo-accent border-2 border-black px-3 py-1 font-black uppercase tracking-widest text-[10px] shadow-neo-xs rotate-3">
                                                                    {roast && !roast.fixed && trackingConfig?.revertCommit ? "REVERTED" : "PURGED"}
                                                                </div>
                                                            )}
                                                            {hasRoast && !isDeleted && (
                                                                <Flame className="w-8 h-8 text-neo-accent" />
                                                            )}
                                                        </div>
                                                        <div className={`flex items-center gap-6 text-[10px] font-black uppercase tracking-widest ${
                                                            isDeleted ? "text-black/30" : "text-black/60"
                                                        }`}>
                                                            <div className="flex items-center gap-2">
                                                                <User className="w-4 h-4" />
                                                                <span>{commit.author.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="w-4 h-4" />
                                                                <span>{formatDate(commit.author.date).toUpperCase()}</span>
                                                            </div>
                                                            <a
                                                                href={commit.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={`font-mono underline decoration-2 transition-all ${
                                                                    isDeleted 
                                                                        ? "text-black/30" 
                                                                        : "text-black hover:bg-neo-secondary"
                                                                }`}
                                                            >
                                                                {getShortSha(commit.sha)}
                                                            </a>
                                                        </div>
                                                    </div>
                                                    <div className="shrink-0 self-start lg:self-center">
                                                        {getStatusBadge(commitStatus)}
                                                    </div>
                                                </div>

                                                {/* Roast Section */}
                                                {hasRoast && roast && (
                                                    <div className="space-y-6 mt-8 pt-8 border-t-4 border-black">
                                                        {/* Countdown Timer */}
                                                        {roast.deadline && (
                                                            <div className="inline-block">
                                                                <CountdownTimer
                                                                    deadline={roast.deadline}
                                                                    posted={roast.posted}
                                                                    fixed={roast.fixed}
                                                                />
                                                            </div>
                                                        )}

                                                        {roast.failReason && (
                                                            <div className="bg-neo-accent/20 border-4 border-black p-4 rotate-1 shadow-neo-xs">
                                                                <p className="text-black font-bold text-sm leading-tight">
                                                                    <strong className="font-black uppercase tracking-widest mr-2">The Sin:</strong> {roast.failReason}
                                                                </p>
                                                            </div>
                                                        )}
                                                        <div className="bg-white border-4 border-black p-6 shadow-neo-sm relative">
                                                            <div className="absolute -top-4 -left-4 bg-neo-secondary border-4 border-black px-3 py-1 font-black uppercase tracking-widest text-[10px] rotate-[-2deg]">
                                                                The Judgment
                                                            </div>
                                                            <p className="text-black font-black italic text-xl leading-snug">&quot;{roast.roast}&quot;</p>
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