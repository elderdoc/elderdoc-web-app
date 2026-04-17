import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const session = await auth()
  if (!session?.user) redirect('/sign-in')
  return session
}

export async function requireRole(role: 'client' | 'caregiver') {
  const session = await requireAuth()
  if (session.user.role !== role) {
    redirect(session.user.role === 'client' ? '/client/dashboard' : '/caregiver/dashboard')
  }
  return session
}

export async function getOptionalSession() {
  return auth()
}
