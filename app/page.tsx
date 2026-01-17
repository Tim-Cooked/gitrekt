import { SignIn } from "@/components/sign-in";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <main className="flex flex-col items-center justify-center gap-8 text-center p-4">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold tracking-tighter sm:text-7xl">
            GitRekt
          </h1>
        </div>
        <SignIn />
      </main>
    </div>
  );
}
