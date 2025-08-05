// /next-auth.d.ts
import { UserRole } from '@prisma/client';
import NextAuth, { type DefaultSession } from 'next-auth';
import { JWT } from '@auth/core/jwt';

// Extend the User object in the session
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name: string;
      email: string;
      employeeId: string;
    } & DefaultSession['user'];
  }
  
  // If you also need to extend the User object returned by the database
  interface User {
    role: UserRole;
    email: string;
  }
}

// Extend the token object
declare module '@auth/core/jwt' {
  interface JWT {
    role?: UserRole;
    email?: string;
  }
}