'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { sendMessage, markMessagesRead } from '@/domains/messaging/actions'

interface Message {
  id: string
  body: string
  senderId: string
  senderName: string | null
  createdAt: string
}

interface Props {
  jobId: string
  otherPartyName: string
}

export function ChatWindow({ jobId, otherPartyName }: Props) {
  const router = useRouter()
  const [msgs, setMsgs] = useState<Message[]>([])
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [text, setText] = useState('')
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  async function fetchMessages() {
    const res = await fetch(`/api/messages/${jobId}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setMsgs(data.messages)
      setCurrentUserId(data.currentUserId)
    }
  }

  useEffect(() => {
    fetchMessages()
    markMessagesRead(jobId).then(() => router.refresh())
    const interval = setInterval(fetchMessages, 4000)
    return () => clearInterval(interval)
  }, [jobId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  function handleSend() {
    if (!text.trim()) return
    const optimistic: Message = {
      id: 'temp-' + Date.now(),
      body: text.trim(),
      senderId: currentUserId,
      senderName: 'You',
      createdAt: new Date().toISOString(),
    }
    setMsgs(m => [...m, optimistic])
    setText('')
    startTransition(async () => {
      await sendMessage(jobId, optimistic.body)
      await fetchMessages()
    })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)] rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <p className="font-semibold text-sm">{otherPartyName}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {msgs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">No messages yet. Say hello!</p>
        )}
        {msgs.map(m => {
          const isMe = m.senderId === currentUserId
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                isMe
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}>
                {!isMe && <p className="text-xs font-medium opacity-70 mb-0.5">{m.senderName}</p>}
                <p>{m.body}</p>
                <p className={`text-[10px] mt-1 opacity-60 ${isMe ? 'text-right' : ''}`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-border bg-background">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Type a message…"
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={isPending || !text.trim()}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
