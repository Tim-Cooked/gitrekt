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
        <div className="space-y-4">
            {/* LinkedIn */}
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                        <LinkedInIcon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-medium">LinkedIn</h3>
                        <p className="text-white/60 text-sm">
                            {"Connect your LinkedIn account"}
                        </p>
                    </div>
                </div>
                {linkedInConnected ? (
                    <button
                        onClick={() => handleUnlink("linkedin")}
                        disabled={isUnlinking === "linkedin"}
                        className="px-6 py-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isUnlinking === "linkedin" ? "Unlinking..." : "Connected"}
                    </button>
                ) : (
                    <button
                        onClick={handleConnectLinkedIn}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30"
                    >
                        Connect
                    </button>
                )}
            </div>

            {/* X (Twitter) */}
            <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-600/20 border border-gray-500/30 rounded-lg">
                        <TwitterIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-medium">X (Twitter)</h3>
                        <p className="text-white/60 text-sm">
                            {"Connect your X account"}
                        </p>
                    </div>
                </div>
                {twitterConnected ? (
                    <button
                        onClick={() => handleUnlink("twitter")}
                        disabled={isUnlinking === "twitter"}
                        className="px-6 py-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isUnlinking === "twitter" ? "Unlinking..." : "Connected"}
                    </button>
                ) : (
                    <button
                        onClick={handleConnectTwitter}
                        className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-gray-500/30"
                    >
                        Connect
                    </button>
                )}
            </div>
        </div>
    );
}
