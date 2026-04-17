import { Suspense } from 'react'
import { StepShell } from '../_components/step-shell'
import { searchCaregivers } from '@/domains/caregivers/search'
import { PreviewClient } from './_components/preview-client'

interface Step4PageProps {
  searchParams: Promise<{
    relationship?: string
    careTypes?: string
    city?: string
    state?: string
  }>
}

async function CaregiverResults({ searchParams }: { searchParams: Step4PageProps['searchParams'] }) {
  const params = await searchParams
  const careTypes = params.careTypes?.split(',').filter(Boolean) ?? []
  const caregivers = await searchCaregivers({ careTypes, state: params.state })
  return <PreviewClient caregivers={caregivers} />
}

export default async function ClientStep4({ searchParams }: Step4PageProps) {
  const params = await searchParams
  const relationship = params.relationship ?? ''
  const careTypes = params.careTypes ?? ''
  const city = params.city ?? ''
  const state = params.state ?? ''

  return (
    <StepShell
      currentStep={4}
      title="Caregivers near you"
      subtitle={city && state ? `Showing results for ${city}, ${state}` : 'Showing available caregivers'}
      backHref={`/get-started/client/step-3?relationship=${relationship}&careTypes=${careTypes}`}
    >
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-[12px] bg-muted" />
            ))}
          </div>
        }
      >
        <CaregiverResults searchParams={searchParams} />
      </Suspense>
    </StepShell>
  )
}
