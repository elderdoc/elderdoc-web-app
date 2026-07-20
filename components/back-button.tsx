'use client'

import { useRouter } from 'next/navigation'

export function BackButton({ label = '← Back', className = '' }: { label?: string; className?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={className || 'text-xs text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1'}
    >
      {label}
    </button>
  )
}
