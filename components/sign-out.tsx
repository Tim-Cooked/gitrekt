import { signOut } from "@/auth"
import Image from "next/image"
import { LogOut } from "lucide-react"

interface User {
    image?: string | null
    name?: string | null
}

export function SignOut({ user }: { user: User }) {
    return (
        <div className="flex items-center gap-3">
            {user.image && (
                <div className="relative">
                    <Image
                        src={user.image}
                        alt={user.name ?? "User Avatar"}
                        width={40}
                        height={40}
                        className="rounded-full border-2 border-purple-400/50 shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/20"
                    />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 -z-10 blur-sm"></div>
                </div>
            )}
            {user.name && (
                <span className="text-white/90 font-medium hidden sm:block text-sm tracking-wide">
                    {user.name}
                </span>
            )}
            <form
                action={async () => {
                    "use server"
                    await signOut({ redirectTo: "/" })
                }}
            >
                <button
                    type="submit"
                    className="group flex items-center gap-2 rounded-xl bg-white/10 hover:bg-gradient-to-r hover:from-red-600/90 hover:to-red-500/90 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-black/20 border border-white/20 hover:border-red-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 hover:scale-105 active:scale-95"
                >
                    <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
                    <span>Sign Out</span>
                </button>
            </form>
        </div>
    )
}
