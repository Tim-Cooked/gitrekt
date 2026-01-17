import { signIn } from "@/auth"
import { Github } from "lucide-react"

export function SignIn() {
    return (
        <form
            action={async () => {
                "use server"
                await signIn("github", { redirectTo: "/dashboard" })
            }}
        >
            <button
                type="submit"
                className="group relative inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 px-8 py-4 text-lg font-bold text-white shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-105 transition-all duration-200 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600"
            >
                <Github className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span>Sign in with GitHub</span>
            </button>
        </form>
    )
}
