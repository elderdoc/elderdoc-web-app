import { getActiveCareTypes } from '@/lib/care-types'
import Step2Provider from './step-2-provider'

export default async function Step2Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const careTypes = await getActiveCareTypes()

  return <Step2Provider careTypes={careTypes}>{children}</Step2Provider>
}
