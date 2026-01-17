import { useState, useEffect } from "react";
import { AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface PendingRoast {
    id: string;
    repoName: string;
    commitSha: string;
    commitMessage: string;
    errorDetails: string | null;
    expiresAt: string;
    createdAt: string;
    timeRemaining: number;
}

export function PendingRoasts() {
    const [pendingRoasts, setPendingRoasts] = useState<PendingRoast[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPendingRoasts = async () => {
        try {
            const response = await fetch("/api/pending-roasts", {
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to fetch pending roasts");
            }

            const data = await response.json();
            setPendingRoasts(data.pendingRoasts || []);
            setError(null);
        } catch (err) {
            console.error("Error fetching pending roasts:", err);
            setError("Failed to load pending roasts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingRoasts();
        
        // Refresh every 5 seconds to update countdown
        const interval = setInterval(() => {
            fetchPendingRoasts();
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Set up timers to trigger processing when roasts expire
    useEffect(() => {
        const timers: NodeJS.Timeout[] = [];

        pendingRoasts.forEach((roast) => {
            const timeRemaining = roast.timeRemaining;
            
            if (timeRemaining > 0) {
                // Set a timer to trigger processing when this roast expires
                const timer = setTimeout(() => {
                    // Trigger processing of expired roasts
                    fetch("/api/process-expired-roasts", {
                        method: "GET",
                        credentials: "include",
                    }).catch((err) => {
                        console.error("Failed to process expired roasts:", err);
                    });
                    
                    // Refresh the list after processing
                    setTimeout(() => {
                        fetchPendingRoasts();
                    }, 1000);
                }, timeRemaining * 1000); // Convert seconds to milliseconds

                timers.push(timer);
            }
        });

        // Cleanup timers on unmount or when roasts change
        return () => {
            timers.forEach((timer) => clearTimeout(timer));
        };
    }, [pendingRoasts]);

    const formatTimeRemaining = (seconds: number): string => {
        if (seconds <= 0) return "Expired";
        
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        }
        return `${secs}s`;
    };

    const resolvePendingRoast = async (id: string) => {
        try {
            const response = await fetch("/api/pending-roasts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ pendingRoastId: id }),
            });

            if (!response.ok) {
                throw new Error("Failed to resolve pending roast");
            }

            // Refresh the list
            fetchPendingRoasts();
        } catch (err) {
            console.error("Error resolving pending roast:", err);
            alert("Failed to resolve pending roast. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-6 h-6 text-yellow-300 animate-spin" />
                    <h3 className="text-xl font-semibold text-white">Loading pending roasts...</h3>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gradient-to-br from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-300" />
                    <p className="text-white/80">{error}</p>
                </div>
            </div>
        );
    }

    if (pendingRoasts.length === 0) {
        return null; // Don't show anything if there are no pending roasts
    }

    return (
        <div className="space-y-4 mb-8">
            <div className="bg-gradient-to-br from-yellow-600/20 via-orange-600/15 to-red-600/20 border border-yellow-500/30 rounded-2xl p-6 backdrop-blur-sm shadow-xl shadow-yellow-900/20">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-yellow-600/40 to-orange-500/30 rounded-xl shadow-lg">
                        <AlertTriangle className="w-6 h-6 text-yellow-200" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-1 tracking-tight">
                            Pending Roasts - Fix Your Code!
                        </h3>
                        <p className="text-white/75 text-sm">
                            You have {pendingRoasts.length} {pendingRoasts.length === 1 ? "error" : "errors"} that will be roasted in:
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    {pendingRoasts.map((roast) => {
                        const isExpiringSoon = roast.timeRemaining < 300; // Less than 5 minutes
                        const isExpired = roast.timeRemaining <= 0;

                        return (
                            <div
                                key={roast.id}
                                className={`bg-white/[0.05] border rounded-xl p-4 transition-all duration-200 ${
                                    isExpiringSoon
                                        ? "border-red-500/50 bg-red-500/10 animate-pulse"
                                        : "border-white/10 hover:border-yellow-500/30"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <Link
                                                href={`/dashboard/repos/${roast.repoName}`}
                                                className="text-white font-semibold hover:text-yellow-300 transition-colors truncate"
                                            >
                                                {roast.repoName}
                                            </Link>
                                            <span className="text-xs text-white/50 font-mono">
                                                {roast.commitSha.substring(0, 7)}
                                            </span>
                                        </div>
                                        <p className="text-white/80 text-sm mb-2 line-clamp-2">
                                            {roast.commitMessage}
                                        </p>
                                        {roast.errorDetails && (
                                            <p className="text-white/60 text-xs mb-2">
                                                {roast.errorDetails}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className={`w-4 h-4 ${isExpiringSoon ? "text-red-400" : "text-yellow-400"}`} />
                                            <span
                                                className={`font-semibold ${
                                                    isExpiringSoon
                                                        ? "text-red-300"
                                                        : "text-yellow-300"
                                                }`}
                                            >
                                                {isExpired
                                                    ? "Time's up! Roast will be posted soon."
                                                    : `${formatTimeRemaining(roast.timeRemaining)} remaining`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <Link
                                            href={`https://github.com/${roast.repoName}/commit/${roast.commitSha}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 rounded-lg bg-white/[0.08] text-white/80 hover:bg-white/[0.15] hover:text-white border border-white/20 hover:border-white/30 transition-all duration-200 text-sm font-medium text-center"
                                        >
                                            View Commit
                                        </Link>
                                        <button
                                            onClick={() => resolvePendingRoast(roast.id)}
                                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-600/80 to-green-500/80 text-white hover:from-green-500 hover:to-green-400 border border-green-500/30 hover:border-green-400/50 transition-all duration-200 text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Mark Fixed
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-white/60 text-xs">
                        💡 Fix your code before the timer expires to save your reputation! You can fix it directly on GitHub or mark it as fixed if you've already resolved the issue.
                    </p>
                </div>
            </div>
        </div>
    );
}
