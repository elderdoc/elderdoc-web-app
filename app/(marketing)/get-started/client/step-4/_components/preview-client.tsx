'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Lock } from 'lucide-react'
import { CaregiverCard, type CaregiverPreview } from '@/components/caregiver-card'

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
      <div className="rounded-[16px] border-2 border-dashed border-border bg-card p-12 text-center max-w-2xl mx-auto">
        <h3 className="text-[18px] font-semibold">No caregivers found yet</h3>
        <p className="mt-2 text-[14px] text-muted-foreground max-w-sm mx-auto">
          Be the first to post a care request — we&apos;ll match you as caregivers join your area.
        </p>
        {isAuthenticated ? (
          <a
            href={buildStep5Href()}
            className="mt-6 inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
          >
            Post a care request
            <ArrowRight className="h-4 w-4" />
          </a>
        ) : (
          <button
            type="button"
            onClick={handleUnauthSendOffer}
            className="mt-6 inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
          >
            Post a care request
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!isAuthenticated && (
        <div className="rounded-[14px] border border-[var(--forest-soft)] bg-[var(--forest-soft)]/40 px-4 py-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card">
            <Lock className="h-4 w-4 text-[var(--forest-deep)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13.5px] font-semibold text-foreground">Create your free account to send offers</p>
            <p className="text-[12.5px] text-foreground/70">It takes less than a minute. No fee until you choose a caregiver.</p>
          </div>
          <button
            type="button"
            onClick={handleUnauthSendOffer}
            className="shrink-0 inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
          >
            Sign up
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {caregivers.map((caregiver, i) => (
        <CaregiverCard
          key={caregiver.id}
          caregiver={caregiver}
          rank={i + 1}
          onSendOffer={isAuthenticated ? undefined : handleUnauthSendOffer}
          unauthenticatedOfferLabel={isAuthenticated ? undefined : 'Sign in to send offer'}
        />
      ))}

      {isAuthenticated && (
        <div className="mt-6 flex justify-center">
          <a
            href={buildStep5Href()}
            className="group/cta inline-flex h-12 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)]"
          >
            Post care request to connect
            <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
          </a>
        </div>
      )}
    </div>
  )
}
