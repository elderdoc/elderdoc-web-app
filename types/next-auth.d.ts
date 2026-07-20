import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'client' | 'caregiver' | 'admin' | null
    } & DefaultSession['user']
  }

  interface User {
    role?: 'client' | 'caregiver' | 'admin' | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string
    role?: 'client' | 'caregiver' | 'admin' | null
  }
}
