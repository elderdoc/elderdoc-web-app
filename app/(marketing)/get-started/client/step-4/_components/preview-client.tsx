'use client'

import { useRouter } from 'next/navigation'
import { CaregiverCard } from '@/components/caregiver-card'
import type { CaregiverPreview } from '@/components/caregiver-card'

interface SearchParams {
  relationship?: string
  careTypes?: string
  city?: string
  state?: string
  zip?: string
  address1?: string
  address2?: string
}

interface PreviewClientProps {
  caregivers: CaregiverPreview[]
  isAuthenticated: boolean
  searchParams: SearchParams
}

export function PreviewClient({ caregivers, isAuthenticated, searchParams }: PreviewClientProps) {
  const router = useRouter()

  function buildStep5Href() {
    const p = new URLSearchParams()
    if (searchParams.relationship) p.set('relationship', searchParams.relationship)
    if (searchParams.careTypes) p.set('careTypes', searchParams.careTypes)
    if (searchParams.address1) p.set('address1', searchParams.address1)
    if (searchParams.address2) p.set('address2', searchParams.address2)
    if (searchParams.city) p.set('city', searchParams.city)
    if (searchParams.state) p.set('state', searchParams.state)
    if (searchParams.zip) p.set('zip', searchParams.zip)
    return `/get-started/client/step-5?${p.toString()}`
  }

  function handleUnauthSendOffer() {
    router.push('/sign-in?callbackUrl=%2Fclient%2Fdashboard%2Frequests')
  }

  if (caregivers.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] font-medium text-foreground">No caregivers found yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Be the first to post a care request — we'll match you as caregivers join.
        </p>
        {isAuthenticated ? (
          <a
            href={buildStep5Href()}
            className="mt-6 inline-block rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Post a Care Request →
          </a>
        ) : (
          <button
            type="button"
            onClick={handleUnauthSendOffer}
            className="mt-6 rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Post a Care Request
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {caregivers.map((caregiver, i) => (
        <CaregiverCard
          key={caregiver.id}
          caregiver={caregiver}
          rank={i + 1}
          onSendOffer={isAuthenticated ? undefined : handleUnauthSendOffer}
        />
      ))}

      {isAuthenticated && (
        <div className="mt-4 flex justify-center">
          <a
            href={buildStep5Href()}
            className="rounded-[8px] bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Post Care Request to Connect →
          </a>
        </div>
      )}
    </div>
  )
}
