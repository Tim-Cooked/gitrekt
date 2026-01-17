import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignIn } from "@/components/sign-in";

export default async function Home() {
    const session = await auth();

    if (session?.user) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full text-center space-y-8 animate-fade-in">
                <div className="space-y-4">
                    <h1 className="text-7xl md:text-9xl font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-400 via-purple-400 to-blue-400 animate-pulse">
                        GitRekt
                    </h1>
                    <p className="text-2xl md:text-3xl text-white/90 font-light">
                        The Ultimate Code Punishment System
                    </p>
                    <p className="text-lg md:text-xl text-white/70 mt-6 md:whitespace-nowrap">
                        Connect your GitHub repos and face the consequences when your code breaks.
                        <span className="block mt-2 text-purple-300">No mercy for bad commits. 💀</span>
                    </p>
                </div>

                <div className="flex flex-col items-center gap-6 pt-8">
                    <SignIn />
                    <div className="flex gap-4 text-white/60 text-sm">
                        <div className="flex items-center gap-2">
                            <span>🔒</span>
                            <span>Secure OAuth</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>⚡</span>
                            <span>Real-time Tracking</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span>🚨</span>
                            <span>Instant Punishment</span>
                        </div>
                    </div>
                </div>

                <div className="pt-12 text-white/50 text-sm">
                    Built for Hack and Roll 2026 🎉
                </div>
            </div>
        </div>
    );
}
