import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { StepShell } from '../_components/step-shell'
import { PostRequestForm } from './_components/post-request-form'

interface Step5PageProps {
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

export default async function ClientStep5({ searchParams }: Step5PageProps) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/sign-in?callbackUrl=%2Fclient%2Fdashboard%2Frequests')
  }

  const params = await searchParams
  const relationship = params.relationship ?? ''
  const careTypes = params.careTypes ?? ''
  const city = params.city ?? ''
  const state = params.state ?? ''
  const zip = params.zip ?? ''
  const address1 = params.address1 ?? ''
  const address2 = params.address2 ?? ''

  const backSearchParams = new URLSearchParams()
  if (relationship) backSearchParams.set('relationship', relationship)
  if (careTypes) backSearchParams.set('careTypes', careTypes)
  if (address1) backSearchParams.set('address1', address1)
  if (address2) backSearchParams.set('address2', address2)
  if (city) backSearchParams.set('city', city)
  if (state) backSearchParams.set('state', state)
  if (zip) backSearchParams.set('zip', zip)

  return (
    <StepShell
      currentStep={5}
      totalSteps={5}
      title="Post your care request"
      subtitle="Tell caregivers what you need — they'll reach out to connect."
      backHref={`/get-started/client/step-4?${backSearchParams.toString()}`}
    >
      <PostRequestForm
        relationship={relationship}
        careTypes={careTypes}
        address1={address1}
        address2={address2}
        city={city}
        state={state}
        zip={zip}
      />
    </StepShell>
  )
}
