import { Suspense } from 'react'
import { auth } from '@/auth'
import { StepShell } from '../_components/step-shell'
import { searchCaregivers } from '@/domains/caregivers/search'
import { PreviewClient } from './_components/preview-client'

interface Step4PageProps {
  searchParams: Promise<{
    relationship?: string
    careTypes?: string
    city?: string
    state?: string
    zip?: string
    address1?: string
    address2?: string
  }>
}

async function CaregiverResults({ searchParams, isAuthenticated }: {
  searchParams: Step4PageProps['searchParams']
  isAuthenticated: boolean
}) {
  const params = await searchParams
  const careTypes = params.careTypes?.split(',').filter(Boolean) ?? []
  const caregivers = await searchCaregivers({ careTypes, state: params.state })
  return <PreviewClient caregivers={caregivers} isAuthenticated={isAuthenticated} searchParams={params} />
}

export default async function ClientStep4({ searchParams }: Step4PageProps) {
  const params = await searchParams
  const session = await auth()
  const isAuthenticated = !!session?.user?.id

  const relationship = params.relationship ?? ''
  const careTypes = params.careTypes ?? ''
  const city = params.city ?? ''
  const state = params.state ?? ''

  return (
    <StepShell
      currentStep={4}
      totalSteps={isAuthenticated ? 5 : 4}
      title="Caregivers near you"
      subtitle={city && state ? `Showing results for ${city}, ${state}` : 'Showing available caregivers'}
      backHref={`/get-started/client/step-3?relationship=${relationship}&careTypes=${careTypes}`}
    >
      <Suspense
        fallback={
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-[12px] bg-muted" />
            ))}
          </div>
        }
      >
        <CaregiverResults searchParams={searchParams} isAuthenticated={isAuthenticated} />
      </Suspense>
    </StepShell>
  )
}
