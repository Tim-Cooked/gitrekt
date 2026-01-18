"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signOutAction } from "@/app/actions/auth";
import { Settings, LogOut, ChevronDown } from "lucide-react";

interface User {
    image?: string | null;
    name?: string | null;
}

export function UserProfileDropdown({ user }: { user: User }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);


    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-white border-4 border-black shadow-neo-sm hover:shadow-neo-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100"
            >
                {user.image && (
                    <div className="relative">
                        <Image
                            src={user.image}
                            alt={user.name ?? "User Avatar"}
                            width={32}
                            height={32}
                            className="border-2 border-black"
                        />
                    </div>
                )}
                {user.name && (
                    <span className="text-black font-black text-sm uppercase tracking-wide hidden sm:block">
                        {user.name}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 text-black transition-transform duration-100 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border-4 border-black shadow-neo-md z-50">
                    <button
                        onClick={() => {
                            router.push("/dashboard/settings");
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-4 text-left text-black hover:bg-neo-secondary transition-colors border-b-4 border-black font-black uppercase tracking-widest text-xs"
                    >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                    </button>
                    <form action={signOutAction}>
                        <button
                            type="submit"
                            className="w-full flex items-center gap-3 px-4 py-4 text-left text-black hover:bg-neo-accent transition-colors font-black uppercase tracking-widest text-xs"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
