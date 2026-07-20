'use client'

import { useState, useCallback } from 'react'

export function useSingleSelect<T>(initial?: T) {
  const [selected, setSelected] = useState<T | undefined>(initial)
  const select = useCallback((value: T) => setSelected(value), [])
  const isSelected = useCallback((value: T) => selected === value, [selected])
  return { selected, select, isSelected }
}

export function useMultiSelect<T>(initial: T[] = []) {
  const [selected, setSelected] = useState<T[]>(initial)
  const toggle = useCallback((value: T) => {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }, [])
  const isSelected = useCallback((value: T) => selected.includes(value), [selected])
  return { selected, toggle, isSelected }
}
