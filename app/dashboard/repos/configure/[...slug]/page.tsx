"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Linkedin, Twitter, Skull, Clock, Shield, AlertTriangle, RotateCcw } from "lucide-react";

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
        <div className="min-h-screen bg-linear-to-br from-indigo-950 via-purple-900 to-pink-900">
            {/* Header */}
            <header className="border-b border-white/10 bg-linear-to-r from-indigo-950/50 to-purple-900/50 backdrop-blur-sm">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white/70" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold bg-linear-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                                Configure Tracking
                            </h1>
                            <p className="text-sm text-white/60">{repo}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loadingConfig ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-white/70">Loading configuration...</div>
                    </div>
                ) : (
                <div className="space-y-8">
                    {/* Info Banner */}
                    <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-purple-300 mt-0.5" />
                            <div>
                                <p className="text-purple-200 font-medium">How it works</p>
                                <p className="text-purple-200/70 text-sm mt-1">
                                    When you push bad code, GitRekt will roast you and start a timer. 
                                    Fix your code before the timer runs out, or face the consequences!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Timer Setting */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <Clock className="w-5 h-5 text-blue-300" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Fix Timer</h3>
                                <p className="text-white/60 text-sm">How long do you have to fix your mistakes?</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            {timerOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setConfig({ ...config, timerMinutes: option.value })}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        config.timerMinutes === option.value
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                            : "bg-white/5 text-white/70 hover:bg-white/10"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Social Media Options */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <h3 className="text-white font-semibold mb-4">Public Shame Platforms</h3>
                        <p className="text-white/60 text-sm mb-6">
                            If you don&apos;t fix your code in time, your roast will be posted to:
                        </p>
                        
                        <div className="space-y-3">
                            {/* LinkedIn */}
                            <button
                                onClick={() => setConfig({ ...config, postToLinkedIn: !config.postToLinkedIn })}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                    config.postToLinkedIn
                                        ? "bg-blue-600/20 border-blue-500/50"
                                        : "bg-white/5 border-white/10 hover:border-white/20"
                                }`}
                            >
                                <div className={`p-2 rounded-lg ${config.postToLinkedIn ? "bg-blue-600" : "bg-white/10"}`}>
                                    <Linkedin className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-white font-medium">LinkedIn</p>
                                    <p className="text-white/60 text-sm">Share your shame with your professional network</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                                    config.postToLinkedIn 
                                        ? "bg-blue-500 border-blue-500" 
                                        : "border-white/30"
                                }`}>
                                    {config.postToLinkedIn && (
                                        <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </button>

                            {/* Twitter/X */}
                            <button
                                onClick={() => setConfig({ ...config, postToTwitter: !config.postToTwitter })}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                                    config.postToTwitter
                                        ? "bg-gray-600/20 border-gray-500/50"
                                        : "bg-white/5 border-white/10 hover:border-white/20"
                                }`}
                            >
                                <div className={`p-2 rounded-lg ${config.postToTwitter ? "bg-gray-800" : "bg-white/10"}`}>
                                    <Twitter className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-white font-medium">X (Twitter)</p>
                                    <p className="text-white/60 text-sm">Tweet your failures for the world to see</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                                    config.postToTwitter 
                                        ? "bg-gray-700 border-gray-700" 
                                        : "border-white/30"
                                }`}>
                                    {config.postToTwitter && (
                                        <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        </div>

                        {(config.postToLinkedIn || config.postToTwitter) && (
                            <p className="mt-4 text-amber-300/80 text-sm flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                You&apos;ll need to connect your accounts after tracking
                            </p>
                        )}
                    </div>

                    {/* YOLO Mode */}
                    <div className={`border rounded-xl p-6 transition-all ${
                        config.yoloMode 
                            ? "bg-red-500/20 border-red-500/50" 
                            : "bg-white/5 border-white/10"
                    }`}>
                        <button
                            onClick={() => setConfig({ ...config, yoloMode: !config.yoloMode })}
                            className="w-full flex items-center gap-4"
                        >
                            <div className={`p-2 rounded-lg ${config.yoloMode ? "bg-red-600" : "bg-white/10"}`}>
                                <Skull className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-white font-semibold">🔥 YOLO Hardcore Mode 🔥</p>
                                <p className="text-white/60 text-sm">
                                    Fail to fix in time? Your entire repository gets DELETED. No mercy.
                                </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                                config.yoloMode 
                                    ? "bg-red-500 border-red-500" 
                                    : "border-white/30"
                            }`}>
                                {config.yoloMode && (
                                    <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                        </button>

                        {config.yoloMode && (
                            <div className="mt-4 p-3 bg-red-900/30 rounded-lg border border-red-500/30">
                                <p className="text-red-200 text-sm font-medium">⚠️ Warning: This is irreversible!</p>
                                <p className="text-red-200/70 text-sm mt-1">
                                    If you enable YOLO mode and fail to fix your code in time, 
                                    GitRekt will permanently delete your repository. Are you sure you want this?
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Revert Commit */}
                    <div className={`border rounded-xl p-6 transition-all ${
                        config.revertCommit 
                            ? "bg-orange-500/20 border-orange-500/50" 
                            : "bg-white/5 border-white/10"
                    }`}>
                        <button
                            onClick={() => setConfig({ ...config, revertCommit: !config.revertCommit })}
                            className="w-full flex items-center gap-4"
                        >
                            <div className={`p-2 rounded-lg ${config.revertCommit ? "bg-orange-600" : "bg-white/10"}`}>
                                <RotateCcw className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-white font-semibold">↩️ Revert Commit</p>
                                <p className="text-white/60 text-sm">
                                    Automatically revert to the previous successful commit when code fails
                                </p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                                config.revertCommit 
                                    ? "bg-orange-500 border-orange-500" 
                                    : "border-white/30"
                            }`}>
                                {config.revertCommit && (
                                    <svg className="w-full h-full text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* YOLO Confirmation Modal */}
                    {showYoloConfirm && (
                        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                            <div className="bg-gray-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-red-600 rounded-full">
                                        <Skull className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">Final Warning</h3>
                                </div>
                                <p className="text-white/80 mb-6">
                                    You&apos;re about to enable YOLO Hardcore Mode. If you push bad code and don&apos;t fix it within {config.timerMinutes} minutes, your repository <strong className="text-red-400">{repo}</strong> will be permanently deleted.
                                </p>
                                <p className="text-red-300 mb-6 font-medium">
                                    Type &quot;DELETE MY REPO&quot; to confirm:
                                </p>
                                <input
                                    type="text"
                                    placeholder="DELETE MY REPO"
                                    className="w-full px-4 py-2 bg-black/50 border border-red-500/30 rounded-lg text-white mb-4 focus:outline-none focus:border-red-500"
                                    id="yolo-confirm"
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowYoloConfirm(false);
                                            setConfig({ ...config, yoloMode: false });
                                        }}
                                        className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById("yolo-confirm") as HTMLInputElement;
                                            if (input?.value === "DELETE MY REPO") {
                                                setShowYoloConfirm(false);
                                                handleSubmit();
                                            }
                                        }}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-medium"
                                    >
                                        I Accept My Fate
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-4 bg-linear-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Setting up tracking..." : "Start Tracking"}
                    </button>
                </div>
                )}
            </main>
        </div>
    );
}