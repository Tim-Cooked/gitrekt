"use client"

import { signIn } from "next-auth/react"
import { Code } from "lucide-react"

export default function ConnectXButton() {

  const handleConnectX = () => {
    signIn("linkedin", { callbackUrl: "/dashboard" })
  }

  return (
    <button
      onClick={handleConnectX}
      className="group flex items-center gap-2 rounded-xl bg-white/10 hover:bg-gradient-to-r hover:from-red-600/90 hover:to-red-500/90 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-black/20 border border-white/20 hover:border-red-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 hover:scale-105 active:scale-95"
    >
      <Code className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      <span>Connect with linkedin</span>
    </button>
  )
}

