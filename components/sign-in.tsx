import { signIn } from "@/auth"

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
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black shadow-sm hover:bg-zinc-100 dark:bg-zinc-100 dark:text-black dark:hover:bg-white"
            >
                Sign in with GitHub
            </button>
        </form>
    )
}
