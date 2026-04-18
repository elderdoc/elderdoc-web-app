'use client'

import { useRouter } from 'next/navigation'
import { CaregiverCard } from '@/components/caregiver-card'
import type { CaregiverPreview } from '@/components/caregiver-card'

interface PreviewClientProps {
  caregivers: CaregiverPreview[]
}

export function PreviewClient({ caregivers }: PreviewClientProps) {
  const router = useRouter()

  function handleSendOffer() {
    router.push('/sign-in?callbackUrl=%2Fclient%2Fdashboard%2Frequests')
  }

  if (caregivers.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[15px] font-medium text-foreground">No caregivers found yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Be the first to post a care request — we'll match you as caregivers join.
        </p>
        <button
          type="button"
          onClick={handleSendOffer}
          className="mt-6 rounded-[8px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Post a Care Request
        </button>
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
          onSendOffer={handleSendOffer}
        />
      ))}
    </div>
  )
}
