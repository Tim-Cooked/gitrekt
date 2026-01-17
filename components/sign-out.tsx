import { signOut } from "@/auth"
import Image from "next/image"
import { LogOut } from "lucide-react"

interface User {
    image?: string | null
    name?: string | null
}

export function SignOut({ user }: { user: User }) {
    return (
        <div className="flex items-center gap-4">
            {user.image && (
                <Image
                    src={user.image}
                    alt={user.name ?? "User Avatar"}
                    width={40}
                    height={40}
                    className="rounded-full border-2 border-purple-500/50 shadow-lg"
                />
            )}
            {user.name && (
                <span className="text-white/80 font-medium hidden sm:block">
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
                    className="flex items-center gap-2 rounded-lg bg-white/10 hover:bg-red-600/80 px-4 py-2 text-sm font-semibold text-white shadow-sm border border-white/20 hover:border-red-500/50 transition-all duration-200"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                </button>
            </form>
        </div>
    )
}
