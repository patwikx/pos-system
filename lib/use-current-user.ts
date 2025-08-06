"use client"

import { useSession } from "next-auth/react"

export const useSessionState = () => {
  const { data: session, status } = useSession()

  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
  }
}
