import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignOut } from "@/components/sign-out";

export default async function Dashboard() {
    const session = await auth();

    if (!session?.user) {
        redirect("/");
    }
    
    return (
        <div className="min-h-screen bg-black text-white">
            Dashboard Test.
            <SignOut user={session.user} />
        </div>
    );
}
