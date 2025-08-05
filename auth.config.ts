import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: "/",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")

      if (isOnDashboard) {
        return isLoggedIn // Protect dashboard routes
      }

      return true // Allow all other routes
    },
  },
} satisfies NextAuthConfig
