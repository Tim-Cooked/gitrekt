import { signIn } from "@/auth"
import { Code } from "lucide-react"

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
                className="group relative inline-flex items-center gap-3 bg-neo-accent border-4 border-black px-8 py-4 text-xl font-black text-black uppercase tracking-widest shadow-neo-md hover:shadow-neo-lg hover:-translate-y-0.5 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all duration-100"
            >
                <Code className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                <span>Sign in with GitHub</span>
            </button>
        </form>
    )
}
