'use client'

import { createContext, useContext } from 'react'
import type { CareType } from '@/lib/care-types'

const Step2Context = createContext<CareType[] | null>(null)

export default function Step2Provider({
  children,
  careTypes,
}: {
  children: React.ReactNode
  careTypes: CareType[]
}) {
  return (
    <Step2Context.Provider value={careTypes}>{children}</Step2Context.Provider>
  )
}

export function useCareTypes() {
  const careTypes = useContext(Step2Context)
  if (!careTypes) {
    throw new Error('useCareTypes must be used within Step2Provider')
  }
  return careTypes
}
