"use client";

import { signIn } from "next-auth/react";
import { LinkedInIcon, TwitterIcon } from "@/components/brand-icons";
import { useState } from "react";

interface SocialMediaConnectionsProps {
    linkedInConnected: boolean;
    twitterConnected: boolean;
    hasGitHubSession: boolean;
}

export function SocialMediaConnections({ linkedInConnected, twitterConnected, hasGitHubSession }: SocialMediaConnectionsProps) {
    const [isUnlinking, setIsUnlinking] = useState<string | null>(null);

    const handleConnectLinkedIn = async () => {
        // CRITICAL: Only allow linking if user is already authenticated with GitHub
        if (!hasGitHubSession) {
            alert("Please sign in with GitHub first before linking LinkedIn");
            window.location.href = "/";
            return;
        }
        
        // Pass the GitHub session info via state to preserve it
        await signIn("linkedin", { 
            callbackUrl: "/dashboard/settings", 
            redirect: true,
        });
    };

    const handleConnectTwitter = async () => {
        // CRITICAL: Only allow linking if user is already authenticated with GitHub
        if (!hasGitHubSession) {
            alert("Please sign in with GitHub first before linking Twitter");
            window.location.href = "/";
            return;
        }
        
        // Pass the GitHub session info via state to preserve it
        await signIn("twitter", { 
            callbackUrl: "/dashboard/settings", 
            redirect: true,
        });
    };

    const handleUnlink = async (provider: "linkedin" | "twitter") => {
        const providerName = provider === "linkedin" ? "LinkedIn" : "Twitter";
        const confirmed = window.confirm(
            `Are you sure you want to unlink your ${providerName} account? You will need to reconnect it to post to ${providerName} again.`
        );

        if (!confirmed) {
            return;
        }

        setIsUnlinking(provider);

        try {
            const response = await fetch("/api/unlink-account", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ provider }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to unlink account");
            }

            // Refresh the page to update the connection status
            window.location.reload();
        } catch (error) {
            console.error("Error unlinking account:", error);
            alert(error instanceof Error ? error.message : "Failed to unlink account. Please try again.");
            setIsUnlinking(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* LinkedIn */}
            <div className="flex items-center justify-between p-6 bg-white border-4 border-black shadow-neo-xs">
                <div className="flex items-center gap-6">
                    <div className={`p-4 border-4 border-black ${linkedInConnected ? "bg-neo-muted" : "bg-neo-muted/20"}`}>
                        <LinkedInIcon className="w-8 h-8 text-black" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-black uppercase tracking-tight">LinkedIn</h3>
                        <p className="text-black font-bold uppercase tracking-widest text-[10px] opacity-60">
                            {"Connect your LinkedIn account"}
                        </p>
                    </div>
                </div>
                {linkedInConnected ? (
                    <button
                        onClick={() => handleUnlink("linkedin")}
                        disabled={isUnlinking === "linkedin"}
                        className="px-6 py-3 bg-neo-muted border-4 border-black text-black font-black uppercase tracking-widest text-xs shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
                    >
                        {isUnlinking === "linkedin" ? "Unlinking..." : "Connected"}
                    </button>
                ) : (
                    <button
                        onClick={handleConnectLinkedIn}
                        className="px-8 py-3 bg-white border-4 border-black text-black font-black uppercase tracking-widest text-xs shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all"
                    >
                        Connect
                    </button>
                )}
            </div>

            {/* X (Twitter) */}
            <div className="flex items-center justify-between p-6 bg-white border-4 border-black shadow-neo-xs">
                <div className="flex items-center gap-6">
                    <div className={`p-4 border-4 border-black ${twitterConnected ? "bg-neo-secondary" : "bg-neo-secondary/20"}`}>
                        <TwitterIcon className="w-8 h-8 text-black" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-black uppercase tracking-tight">X (Twitter)</h3>
                        <p className="text-black font-bold uppercase tracking-widest text-[10px] opacity-60">
                            {"Connect your X account"}
                        </p>
                    </div>
                </div>
                {twitterConnected ? (
                    <button
                        onClick={() => handleUnlink("twitter")}
                        disabled={isUnlinking === "twitter"}
                        className="px-6 py-3 bg-neo-secondary border-4 border-black text-black font-black uppercase tracking-widest text-xs shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
                    >
                        {isUnlinking === "twitter" ? "Unlinking..." : "Connected"}
                    </button>
                ) : (
                    <button
                        onClick={handleConnectTwitter}
                        className="px-8 py-3 bg-white border-4 border-black text-black font-black uppercase tracking-widest text-xs shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all"
                    >
                        Connect
                    </button>
                )}
            </div>
        </div>
    );
}
