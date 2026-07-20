import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/services/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined
        if (!email || !password) return null

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
        if (!user?.password) return null

        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return null

        return { id: user.id, email: user.email, name: user.name, image: user.image }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false

      if (account?.provider === 'google') {
        await db.insert(users)
          .values({
            email: user.email,
            name: user.name ?? profile?.name ?? null,
            image: user.image ?? null,
            role: null,
          })
          .onConflictDoNothing()
      }

      return true
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.select().from(users).where(eq(users.email, user.email)).limit(1)
        if (dbUser[0]) {
          token.userId = dbUser[0].id
          token.role   = dbUser[0].role ?? null
        }
      } else if (token.userId && !token.role) {
        const [dbUser] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.id, token.userId as string))
          .limit(1)
        if (dbUser?.role) token.role = dbUser.role
      }
      return token
    },

    session({ session, token }) {
      session.user.id   = token.userId as string
      session.user.role = token.role as 'client' | 'caregiver' | 'admin' | null
      return session
    },
  },
  pages: {
    signIn: '/sign-in',
  },
  session: { strategy: 'jwt' },
})
