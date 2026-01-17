import { signOut } from "@/auth"
import Image from "next/image"

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
                    width={32}
                    height={32}
                    className="rounded-full"
                />
            )}
            <form
                action={async () => {
                    "use server"
                    await signOut({ redirectTo: "/" })
                }}
            >
                <button
                    type="submit"
                    className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                >
                    Sign Out
                </button>
            </form>
        </div>
    )
}
