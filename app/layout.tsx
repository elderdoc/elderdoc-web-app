import type { Metadata } from 'next'
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google'
import dynamic from 'next/dynamic'
import './globals.css'
import { ToastProvider } from '@/components/toast'
import { auth } from '@/auth'
import { getAppKnowledge } from '@/lib/knowledge-cache'

const SupportChatWidget = dynamic(
  () => import('@/components/support-chat/support-chat-widget').then((m) => ({ default: m.SupportChatWidget })),
  { ssr: false },
)

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'Elderdoc — Trusted care for the people you love',
  description: 'Find verified, compassionate caregivers for your elderly loved ones. Matched to your needs, in minutes.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [session] = await Promise.all([
    auth(),
    getAppKnowledge(),
  ])

  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ToastProvider>{children}</ToastProvider>
        {session?.user?.id && <SupportChatWidget isLoggedIn={true} />}
      </body>
    </html>
  )
}
