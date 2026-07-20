'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@ai-sdk/react'
import { TextStreamChatTransport, type UIMessage } from 'ai'
import { MessageCircle, X, Send } from 'lucide-react'
import Markdown from 'react-markdown'

interface Props {
  isLoggedIn: boolean
}

export function SupportChatWidget({ isLoggedIn }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)

  if (!isLoggedIn) return null

  function handleOpen() {
    setIsOpen((o) => !o)
    setEverOpened(true)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {everOpened && (
        <div className={isOpen ? '' : 'hidden'}>
          <ChatPanel onClose={() => setIsOpen(false)} />
        </div>
      )}
      <button
        onClick={handleOpen}
        aria-label="Open Elderdoc support chat"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  )
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const { messages, sendMessage, status } = useChat({
    transport: new TextStreamChatTransport({ api: '/api/support-chat' }),
  })
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const isLoading = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  return (
    <div className="flex h-[480px] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-[13.5px] font-semibold">Elderdoc Support</p>
          <p className="text-[11px] text-muted-foreground">Ask me anything about Elderdoc</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-[12px] text-muted-foreground pt-8">
            Hi! How can I help you with Elderdoc today?
          </p>
        )}
        {messages.map((m: UIMessage) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-primary text-white rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}
            >
              {m.parts.map((part, i) =>
                part.type === 'text' ? (
                  m.role === 'user' ? (
                    <span key={i} className="whitespace-pre-wrap">{part.text}</span>
                  ) : (
                    <Markdown
                      key={i}
                      components={{
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-1">{children}</ol>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-1">{children}</ul>,
                        li: ({ children }) => <li>{children}</li>,
                        a: ({ href, children }) => <a href={href} className="underline opacity-80" target="_blank" rel="noreferrer">{children}</a>,
                      }}
                    >
                      {part.text}
                    </Markdown>
                  )
                ) : null,
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-border px-3 py-2.5 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40 transition-opacity"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  )
}
