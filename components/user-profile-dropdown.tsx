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
                className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/10 transition-all duration-200"
            >
                {user.image && (
                    <div className="relative">
                        <Image
                            src={user.image}
                            alt={user.name ?? "User Avatar"}
                            width={32}
                            height={32}
                            className="rounded-full border-2 border-purple-400/50 shadow-lg shadow-purple-500/20"
                        />
                    </div>
                )}
                {user.name && (
                    <span className="text-white/90 font-medium text-sm tracking-wide hidden sm:block">
                        {user.name}
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 text-white/70 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-xl shadow-black/20 overflow-hidden z-50">
                    <button
                        onClick={() => {
                            router.push("/dashboard/settings");
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-white/90 hover:bg-white/10 transition-colors"
                    >
                        <Settings className="w-4 h-4 text-white/70" />
                        <span className="text-sm font-medium">Settings</span>
                    </button>
                    <form action={signOutAction}>
                        <button
                            type="submit"
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-white/90 hover:bg-red-600/20 hover:text-red-400 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">Sign Out</span>
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
