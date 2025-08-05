import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Initialize Prisma Client
const prisma = new PrismaClient();

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      // You can specify a custom login form here, but we will build our own.
      // credentials: { ... }

      async authorize(credentials) {
       if (!credentials?.email || !credentials.passwordHash) {
          return null;
        }

        // 1. Find the user in the database
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) {
          // User not found
          return null;
        }

        // 2. Verify the password
        const isPasswordValid = await bcrypt.compare(
          credentials.passwordHash as string,
          user.passwordHash || "" // Ensure passwordHash is defined
        );

        if (!isPasswordValid) {
          // Invalid password
          return null;
        }

        // 3. Return the user object if credentials are valid
        // The user object will be encoded in the JWT.
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // The `session` callback is called whenever a session is checked.
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string;
        session.user.employeeId = token.employeeId as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
    // The `jwt` callback is called whenever a JWT is created or updated.
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role; // Add role to JWT
        token.name = user.name;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login", // Redirect users to our custom login page
  },
  // Add secret for production environments
  secret: process.env.AUTH_SECRET,
});
export default auth;