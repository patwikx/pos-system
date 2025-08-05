import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

export default NextAuth(authConfig).auth

export const config = {
  // Only protect dashboard routes, don't interfere with login page
  matcher: ["/dashboard/:path*"],
}
