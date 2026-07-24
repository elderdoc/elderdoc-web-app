'use client'

import dynamic from 'next/dynamic'

const SupportChatWidget = dynamic(
  () =>
    import('@/components/support-chat/support-chat-widget').then((m) => ({
      default: m.SupportChatWidget,
    })),
  { ssr: false },
)

export function SupportChatLoader() {
  return <SupportChatWidget isLoggedIn={true} />
}
