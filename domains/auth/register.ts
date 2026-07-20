'use server'

import { db } from '@/services/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: 'client' | 'caregiver',
): Promise<{ error?: string }> {
  if (!email || !password || !name || !role) return { error: 'All fields are required' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters' }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing.length > 0) return { error: 'An account with this email already exists' }

  const hashed = await bcrypt.hash(password, 12)
  await db.insert(users).values({ email, name, password: hashed, role })

  return {}
}
