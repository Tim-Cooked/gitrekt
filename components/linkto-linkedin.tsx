"use client"

import { signIn } from "next-auth/react"
import { Code } from "lucide-react"

export default function ConnectLinkedinButton() {

  const handleConnectLinkedin = () => {
    signIn("linkedin", {   redirect: false, })
  }

  return (
    <button
      onClick={handleConnectLinkedin}
      >
      <span>Connect</span>
    </button>
  )
}

