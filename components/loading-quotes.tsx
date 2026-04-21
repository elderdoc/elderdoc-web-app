'use client'

import { useState, useEffect, useRef } from 'react'
import { CAREGIVER_QUOTES } from '@/lib/caregiver-quotes'

interface Props {
  label?: string
}

function randomIndex(exclude: number): number {
  const pool = CAREGIVER_QUOTES.length
  let idx = Math.floor(Math.random() * pool)
  if (idx === exclude) idx = (idx + 1) % pool
  return idx
}

export function LoadingQuotes({ label = 'Loading…' }: Props) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * CAREGIVER_QUOTES.length))
  const [visible, setVisible] = useState(true)
  const idxRef = useRef(idx)
  idxRef.current = idx

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx((prev) => randomIndex(prev))
        setVisible(true)
      }, 400)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center gap-6 py-16 px-4 max-w-md mx-auto text-center">
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className="text-base text-foreground/80 leading-relaxed transition-opacity duration-400"
        style={{ opacity: visible ? 1 : 0 }}
      >
        &ldquo;{CAREGIVER_QUOTES[idx]}&rdquo;
      </p>
    </div>
  )
}
