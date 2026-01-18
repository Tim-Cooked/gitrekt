import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SignIn } from "@/components/sign-in";
import { Skull, Zap, Lock, AlertTriangle, Star } from "lucide-react";

export default async function Home() {
    const session = await auth();

    if (session?.user) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-20 left-10 rotate-12 opacity-20 hidden md:block">
                <Star className="w-32 h-32 fill-neo-secondary stroke-black stroke-[4px]" />
            </div>
            <div className="absolute bottom-20 right-10 -rotate-12 opacity-20 hidden md:block">
                <Skull className="w-40 h-40 text-neo-accent stroke-[4px]" />
            </div>
            
            <div className="max-w-6xl w-full text-center space-y-12 relative z-10">
                <div className="space-y-6">
                    <div className="inline-block bg-neo-secondary border-4 border-black px-6 py-2 -rotate-2 shadow-neo-sm mb-4">
                        <span className="text-xl font-black uppercase tracking-widest text-black">Hack & Roll 2026</span>
                    </div>
                    
                    <h1 className="text-8xl md:text-[10rem] font-black text-black leading-none uppercase tracking-tighter">
                        Git<span className="bg-neo-accent px-4 border-4 border-black inline-block rotate-3 shadow-neo-md">Rekt</span>
                    </h1>
                    
                    <p className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight max-w-4xl mx-auto leading-tight">
                        The <span className="underline decoration-8 decoration-neo-muted">Ultimate</span> Code Punishment System
                    </p>
                    
                    <div className="max-w-2xl mx-auto bg-white border-4 border-black p-8 shadow-neo-md rotate-1">
                        <p className="text-xl md:text-2xl font-bold text-black leading-relaxed">
                            Connect your GitHub repos and face the consequences when your code breaks. 
                            <span className="block mt-4 text-neo-accent font-black">NO MERCY FOR BAD COMMITS. 💀</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-12 pt-8">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-black translate-x-4 translate-y-4 group-hover:translate-x-6 group-hover:translate-y-6 transition-all"></div>
                        <SignIn />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl">
                        <div className="bg-white border-4 border-black p-6 shadow-neo-sm flex flex-col items-center gap-4 -rotate-1">
                            <div className="p-4 bg-neo-muted border-4 border-black">
                                <Lock className="w-8 h-8 text-black" />
                            </div>
                            <span className="font-black uppercase tracking-widest text-sm">Secure OAuth</span>
                        </div>
                        <div className="bg-white border-4 border-black p-6 shadow-neo-sm flex flex-col items-center gap-4 rotate-2">
                            <div className="p-4 bg-neo-secondary border-4 border-black">
                                <Zap className="w-8 h-8 text-black" />
                            </div>
                            <span className="font-black uppercase tracking-widest text-sm">Real-time Tracking</span>
                        </div>
                        <div className="bg-white border-4 border-black p-6 shadow-neo-sm flex flex-col items-center gap-4 -rotate-1">
                            <div className="p-4 bg-neo-accent border-4 border-black">
                                <AlertTriangle className="w-8 h-8 text-black" />
                            </div>
                            <span className="font-black uppercase tracking-widest text-sm">Instant Punishment</span>
                        </div>
                    </div>
                </div>

                <div className="pt-16">
                    <div className="inline-block border-t-4 border-black pt-4">
                        <p className="text-black font-black uppercase tracking-[0.2em] text-sm">
                            Created with rage for the lazy developer
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
