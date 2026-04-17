import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { db } from '@/services/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      if (!user.email) return false

      await db.insert(users)
        .values({
          email: user.email,
          name: user.name ?? profile?.name ?? null,
          image: user.image ?? null,
          role: null,
        })
        .onConflictDoNothing()

      return true
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
        if (dbUser[0]) {
          token.userId = dbUser[0].id
          token.role   = dbUser[0].role ?? null
        }
      }
      return token
    },

    session({ session, token }) {
      session.user.id   = token.userId as string
      session.user.role = token.role as 'client' | 'caregiver' | null
      return session
    },
  },
  pages: {
    signIn: '/sign-in',
  },
})
