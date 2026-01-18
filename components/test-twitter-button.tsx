"use client";

import { useState } from "react";
import { TwitterIcon } from "@/components/brand-icons";

export function TestTwitterButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleTestClick = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/debug/test-twitter-post", {
                method: "POST",
            });
            const data = await res.json();
            
            if (data.success) {
                alert(`✅ Test tweet posted! View it at: ${data.tweetUrl}`);
            } else {
                alert(`❌ Failed: ${data.error}`);
            }
        } catch (err) {
            alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleTestClick}
            disabled={isLoading}
            className="flex items-center gap-2 px-6 py-3 bg-white border-4 border-black text-black font-black uppercase tracking-widest text-xs shadow-neo-sm hover:shadow-neo-md hover:-translate-y-1 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <TwitterIcon className="w-4 h-4" />
            {isLoading ? "SENDING..." : "SEND TEST TWEET"}
        </button>
    );
}