"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Linkedin, Twitter, Skull, Clock, Shield, AlertTriangle, RotateCcw, Loader2 } from "lucide-react";

interface ConfigFormData {
    postToLinkedIn: boolean;
    postToTwitter: boolean;
    yoloMode: boolean;
    revertCommit: boolean;
    timerMinutes: number;
}

export default function ConfigureTrackingPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const repoFullName = resolvedParams.slug.join("/");
    const repo = resolvedParams.slug[resolvedParams.slug.length - 1];

    const [config, setConfig] = useState<ConfigFormData>({
        postToLinkedIn: false,
        postToTwitter: false,
        yoloMode: false,
        revertCommit: false,
        timerMinutes: 30,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showYoloConfirm, setShowYoloConfirm] = useState(false);
    const [loadingConfig, setLoadingConfig] = useState(true);

    // Load existing config on mount
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const response = await fetch(`/api/track?repoFullName=${encodeURIComponent(repoFullName)}`, {
                    credentials: "include",
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.config) {
                        setConfig({
                            postToLinkedIn: data.config.postToLinkedIn ?? false,
                            postToTwitter: data.config.postToTwitter ?? false,
                            yoloMode: data.config.yoloMode ?? false,
                            revertCommit: data.config.revertCommit ?? false,
                            timerMinutes: data.config.timerMinutes ?? 30,
                        });
                    }
                }
            } catch (err) {
                console.error("Failed to load config:", err);
                // Continue with defaults if loading fails
            } finally {
                setLoadingConfig(false);
            }
        };

        loadConfig();
    }, [repoFullName]);

    const handleSubmit = async () => {
        if (config.yoloMode && !showYoloConfirm) {
            setShowYoloConfirm(true);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    repoFullName,
                    tracked: true,
                    config,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to track repository");
            }

            router.push(`/dashboard`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const timerOptions = [
        { value: 0, label: "10 seconds (dev)" }, // 0 = 10 seconds for dev purposes
        { value: 5, label: "5 minutes" },
        { value: 10, label: "10 minutes" },
        { value: 15, label: "15 minutes" },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b-8 border-black bg-white shadow-neo-sm">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="p-3 bg-white border-4 border-black shadow-neo-xs hover:shadow-neo-sm hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
                        >
                            <ArrowLeft className="w-6 h-6 text-black stroke-[3px]" />
                        </button>
                        <div>
                            <div className="bg-neo-secondary border-4 border-black px-4 py-1 -rotate-1 shadow-neo-xs inline-block mb-1">
                                <h1 className="text-2xl font-black text-black uppercase tracking-tight">
                                    Configure Tracking
                                </h1>
                            </div>
                            <p className="text-sm text-black font-black uppercase tracking-widest opacity-60 ml-1">{repo}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {loadingConfig ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white border-4 border-black shadow-neo-md">
                        <Loader2 className="w-12 h-12 text-neo-accent animate-spin stroke-[4px]" />
                        <span className="mt-4 text-black font-black uppercase tracking-widest">Loading Chamber...</span>
                    </div>
                ) : (
                <div className="space-y-10">
                    {/* Info Banner */}
                    <div className="bg-neo-muted border-4 border-black p-6 shadow-neo-sm rotate-1">
                        <div className="flex items-start gap-4">
                            <Shield className="w-8 h-8 text-black stroke-[3px]" />
                            <div>
                                <p className="text-black font-black uppercase tracking-tight text-xl">How it works</p>
                                <p className="text-black font-bold text-lg leading-tight mt-2">
                                    When you push bad code, GitRekt will roast you and start a timer. 
                                    Fix your code before the timer runs out, or face the consequences!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Timer Setting */}
                    <div className="bg-white border-4 border-black p-8 shadow-neo-md">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-3 bg-neo-secondary border-4 border-black">
                                <Clock className="w-6 h-6 text-black" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-black uppercase tracking-tight">Fix Timer</h3>
                                <p className="text-black font-bold uppercase tracking-widest text-xs opacity-60">How long do you have to fix your mistakes?</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {timerOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setConfig({ ...config, timerMinutes: option.value })}
                                    className={`px-4 py-4 border-4 border-black font-black text-sm uppercase tracking-widest transition-all ${
                                        config.timerMinutes === option.value
                                            ? "bg-neo-accent text-black shadow-neo-sm -translate-y-1 -translate-x-1"
                                            : "bg-white text-black hover:bg-neo-muted"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Social Media Options */}
                    <div className="bg-white border-4 border-black p-8 shadow-neo-md">
                        <h3 className="text-2xl font-black text-black uppercase tracking-tight mb-2">Public Shame Platforms</h3>
                        <p className="text-black font-bold uppercase tracking-widest text-xs opacity-60 mb-8">
                            If you don&apos;t fix your code in time, your roast will be posted to:
                        </p>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {/* LinkedIn */}
                            <button
                                onClick={() => setConfig({ ...config, postToLinkedIn: !config.postToLinkedIn })}
                                className={`flex items-center gap-6 p-6 border-4 border-black transition-all ${
                                    config.postToLinkedIn
                                        ? "bg-neo-muted shadow-neo-sm -translate-y-1 -translate-x-1"
                                        : "bg-white hover:bg-neo-muted/30"
                                }`}
                            >
                                <div className={`p-4 border-4 border-black ${config.postToLinkedIn ? "bg-white" : "bg-neo-muted/20"}`}>
                                    <Linkedin className="w-8 h-8 text-black" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-xl font-black text-black uppercase tracking-tight">LinkedIn</p>
                                    <p className="text-black font-bold text-sm leading-tight opacity-70">Share your shame with your professional network</p>
                                </div>
                                <div className={`w-8 h-8 border-4 border-black flex items-center justify-center transition-all ${
                                    config.postToLinkedIn ? "bg-neo-accent" : "bg-white"
                                }`}>
                                    {config.postToLinkedIn && <div className="w-4 h-4 bg-black"></div>}
                                </div>
                            </button>

                            {/* Twitter/X */}
                            <button
                                onClick={() => setConfig({ ...config, postToTwitter: !config.postToTwitter })}
                                className={`flex items-center gap-6 p-6 border-4 border-black transition-all ${
                                    config.postToTwitter
                                        ? "bg-neo-secondary shadow-neo-sm -translate-y-1 -translate-x-1"
                                        : "bg-white hover:bg-neo-secondary/30"
                                }`}
                            >
                                <div className={`p-4 border-4 border-black ${config.postToTwitter ? "bg-white" : "bg-neo-secondary/20"}`}>
                                    <Twitter className="w-8 h-8 text-black" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-xl font-black text-black uppercase tracking-tight">X (Twitter)</p>
                                    <p className="text-black font-bold text-sm leading-tight opacity-70">Tweet your failures for the world to see</p>
                                </div>
                                <div className={`w-8 h-8 border-4 border-black flex items-center justify-center transition-all ${
                                    config.postToTwitter ? "bg-neo-accent" : "bg-white"
                                }`}>
                                    {config.postToTwitter && <div className="w-4 h-4 bg-black"></div>}
                                </div>
                            </button>
                        </div>

                        {(config.postToLinkedIn || config.postToTwitter) && (
                            <div className="mt-8 bg-neo-accent/20 border-2 border-black p-4 flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-black" />
                                <p className="text-black font-black uppercase tracking-widest text-[10px]">
                                    You&apos;ll need to connect your accounts after tracking
                                </p>
                            </div>
                        )}
                    </div>

                    {/* YOLO Mode */}
                    <div className={`border-8 border-black p-8 shadow-neo-xl transition-all ${
                        config.yoloMode ? "bg-neo-accent" : "bg-white"
                    }`}>
                        <button
                            onClick={() => setConfig({ ...config, yoloMode: !config.yoloMode })}
                            className="w-full flex items-center gap-6"
                        >
                            <div className={`p-4 border-4 border-black ${config.yoloMode ? "bg-white" : "bg-neo-accent/20"}`}>
                                <Skull className="w-10 h-10 text-black" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-3xl font-black text-black uppercase tracking-tighter">YOLO Hardcore Mode</p>
                                <p className="text-black font-bold text-lg leading-tight mt-1">
                                    Fail to fix in time? Your entire repository gets DELETED. No mercy.
                                </p>
                            </div>
                            <div className={`w-10 h-10 border-4 border-black flex items-center justify-center transition-all ${
                                config.yoloMode ? "bg-white" : "bg-white/20"
                            }`}>
                                {config.yoloMode && <div className="w-6 h-6 bg-black"></div>}
                            </div>
                        </button>

                        {config.yoloMode && (
                            <div className="mt-8 p-6 bg-white border-4 border-black shadow-neo-sm rotate-1">
                                <p className="text-black font-black uppercase tracking-tight text-xl mb-2">⚠️ Irreversible Consequences</p>
                                <p className="text-black font-bold text-lg leading-tight">
                                    If you fail to fix your code in time, 
                                    GitRekt will permanently delete your repository. Are you sure?
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Revert Commit */}
                    <div className={`border-4 border-black p-8 shadow-neo-md transition-all ${
                        config.revertCommit ? "bg-neo-muted" : "bg-white"
                    }`}>
                        <button
                            onClick={() => setConfig({ ...config, revertCommit: !config.revertCommit })}
                            className="w-full flex items-center gap-6"
                        >
                            <div className={`p-4 border-4 border-black ${config.revertCommit ? "bg-white" : "bg-neo-muted/20"}`}>
                                <RotateCcw className="w-8 h-8 text-black" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-2xl font-black text-black uppercase tracking-tight">Revert Commit</p>
                                <p className="text-black font-bold text-lg leading-tight mt-1">
                                    Automatically revert to the previous successful commit when code fails
                                </p>
                            </div>
                            <div className={`w-8 h-8 border-4 border-black flex items-center justify-center transition-all ${
                                config.revertCommit ? "bg-neo-accent" : "bg-white"
                            }`}>
                                {config.revertCommit && <div className="w-4 h-4 bg-black"></div>}
                            </div>
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-neo-accent border-4 border-black text-black px-6 py-4 shadow-neo-sm rotate-1 flex items-center gap-4">
                            <Skull className="w-8 h-8 stroke-[3px]" />
                            <span className="font-black uppercase tracking-widest">{error}</span>
                        </div>
                    )}

                    {/* YOLO Confirmation Modal */}
                    {showYoloConfirm && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                            <div className="bg-white border-8 border-black p-8 max-w-md w-full shadow-neo-xl rotate-1">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="p-4 bg-neo-accent border-4 border-black">
                                        <Skull className="w-10 h-10 text-black" />
                                    </div>
                                    <h3 className="text-3xl font-black text-black uppercase tracking-tighter leading-none">Death Wish</h3>
                                </div>
                                <p className="text-black font-bold text-lg leading-tight mb-8">
                                    Bad code and no fix in {config.timerMinutes} minutes means <span className="bg-neo-accent px-1 border-2 border-black font-black">{repo}</span> will be purged from existence.
                                </p>
                                <p className="text-black font-black uppercase tracking-widest text-[10px] mb-4">
                                    Type &quot;DELETE MY REPO&quot; to accept your fate:
                                </p>
                                <input
                                    type="text"
                                    placeholder="DELETE MY REPO"
                                    className="w-full px-4 py-4 bg-white border-4 border-black text-black mb-8 focus:outline-none focus:bg-neo-accent font-black uppercase tracking-widest"
                                    id="yolo-confirm"
                                />
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            setShowYoloConfirm(false);
                                            setConfig({ ...config, yoloMode: false });
                                        }}
                                        className="flex-1 px-6 py-4 bg-white border-4 border-black text-black font-black uppercase tracking-widest text-sm hover:bg-neo-muted transition-all"
                                    >
                                        ABORT
                                    </button>
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById("yolo-confirm") as HTMLInputElement;
                                            if (input?.value === "DELETE MY REPO") {
                                                setShowYoloConfirm(false);
                                                handleSubmit();
                                            }
                                        }}
                                        className="flex-1 px-6 py-4 bg-neo-accent border-4 border-black text-black font-black uppercase tracking-widest text-sm shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all"
                                    >
                                        I ACCEPT
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-6 bg-neo-secondary border-8 border-black text-black font-black uppercase tracking-widest text-2xl shadow-neo-lg hover:shadow-neo-xl hover:-translate-y-2 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
                    >
                        {loading ? "PREPARING CHAMBER..." : "START THE RECKONING"}
                    </button>
                </div>
                )}
            </main>
        </div>
    );
}