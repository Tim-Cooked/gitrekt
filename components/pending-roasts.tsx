import { useState, useEffect } from "react";
import { AlertTriangle, Clock, CheckCircle2, Skull } from "lucide-react";
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
            <div className="bg-white border-4 border-black p-8 shadow-neo-md mb-8">
                <div className="flex items-center gap-4">
                    <Clock className="w-8 h-8 text-neo-secondary animate-spin stroke-[3px]" />
                    <h3 className="text-xl font-black text-black uppercase tracking-tight">Loading pending roasts...</h3>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-neo-accent border-4 border-black p-8 shadow-neo-md mb-8 rotate-1">
                <div className="flex items-center gap-4">
                    <Skull className="w-8 h-8 text-black stroke-[3px]" />
                    <p className="text-black font-black uppercase tracking-widest text-sm">{error}</p>
                </div>
            </div>
        );
    }

    if (pendingRoasts.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6 mb-12">
            <div className="bg-neo-secondary border-4 border-black p-8 shadow-neo-md -rotate-1 relative overflow-hidden">
                <div className="absolute top-[-20px] right-[-20px] opacity-10">
                    <AlertTriangle className="w-40 h-40 text-black stroke-[10px]" />
                </div>
                
                <div className="flex items-center gap-4 mb-8 relative z-10">
                    <div className="p-3 bg-white border-4 border-black shadow-neo-xs rotate-3">
                        <AlertTriangle className="w-8 h-8 text-black stroke-[3px]" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-3xl font-black text-black uppercase tracking-tighter">
                            Pending Roasts
                        </h3>
                        <p className="text-black font-bold uppercase tracking-widest text-xs opacity-60">
                            You have {pendingRoasts.length} {pendingRoasts.length === 1 ? "sin" : "sins"} that will be exposed in:
                        </p>
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    {pendingRoasts.map((roast) => {
                        const isExpiringSoon = roast.timeRemaining < 300; // Less than 5 minutes
                        const isExpired = roast.timeRemaining <= 0;

                        return (
                            <div
                                key={roast.id}
                                className={`bg-white border-4 border-black p-6 shadow-neo-sm transition-all ${
                                    isExpiringSoon ? "bg-neo-accent/10 animate-pulse" : ""
                                }`}
                            >
                                <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                                    <div className="flex-1 min-w-0 space-y-4">
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <Link
                                                href={`/dashboard/repos/${roast.repoName}`}
                                                className="text-xl font-black text-black uppercase tracking-tight hover:underline decoration-4"
                                            >
                                                {roast.repoName}
                                            </Link>
                                            <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                                                {roast.commitSha.substring(0, 7)}
                                            </span>
                                        </div>
                                        <p className="text-black font-bold text-sm leading-tight line-clamp-2">
                                            {roast.commitMessage}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div className={`flex items-center gap-2 px-3 py-1 border-2 border-black font-black uppercase tracking-widest text-[10px] shadow-neo-xs ${
                                                isExpiringSoon ? "bg-neo-accent" : "bg-white"
                                            }`}>
                                                <Clock className="w-3 h-3 text-black" />
                                                <span className="text-black">
                                                    {isExpired
                                                        ? "TIME EXPIRED! POSTING SOON."
                                                        : formatTimeRemaining(roast.timeRemaining).toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 shrink-0 w-full md:w-auto">
                                        <Link
                                            href={`https://github.com/${roast.repoName}/commit/${roast.commitSha}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-6 py-3 bg-white border-4 border-black text-black font-black uppercase tracking-widest text-xs shadow-neo-xs hover:shadow-neo-sm hover:-translate-y-1 transition-all text-center"
                                        >
                                            View Commit
                                        </Link>
                                        <button
                                            onClick={() => resolvePendingRoast(roast.id)}
                                            className="px-6 py-3 bg-neo-muted border-4 border-black text-black font-black uppercase tracking-widest text-xs shadow-neo-xs hover:shadow-neo-sm hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Resolve Sin
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 pt-6 border-t-4 border-black">
                    <p className="text-black font-black uppercase tracking-widest text-[10px]">
                        💡 FIX YOUR CODE BEFORE THE TIMER EXPIRES TO SAVE YOUR REPUTATION!
                    </p>
                </div>
            </div>
        </div>
    );
}
