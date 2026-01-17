"use client";

import { signIn } from "next-auth/react";

export default function ConnectTwitterButton() {
    const handleConnect = async () => {
        // Use signIn with redirect to link the account
        // The PrismaAdapter will automatically link this to the existing user
        await signIn("twitter", { 
            callbackUrl: "/dashboard/settings",
        });
    };

    return (
        <button
            onClick={handleConnect}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-gray-500/30 hover:scale-105 active:scale-95"
        >
            Connect
        </button>
    );
}