import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/domains/auth/session'
import { getCarePlanByJob, getClientCarePlans } from '@/domains/clients/care-plans'
import { CarePlanEditor } from './_components/care-plan-editor'

interface PageProps {
  params: Promise<{ jobId: string }>
}

export default async function CarePlanDetailPage({ params }: PageProps) {
  const { jobId } = await params
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [rows, carePlan] = await Promise.all([
    getClientCarePlans(clientId),
    getCarePlanByJob(jobId, clientId),
  ])

  const job = rows.find((r) => r.jobId === jobId)
  if (!job) notFound()

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/client/dashboard/care-plans"
        className="text-xs text-muted-foreground hover:text-foreground mb-6 inline-block"
      >
        ← Back to Care Plans
      </Link>
      <h1 className="text-2xl font-semibold mb-1">Care Plan</h1>
      <p className="text-sm text-muted-foreground mb-8">
        {job.careType} · Caregiver: {job.caregiverName ?? 'Unknown'}
      </p>

      <CarePlanEditor
        key={carePlan?.updatedAt?.toISOString() ?? 'empty'}
        jobId={jobId}
        carePlan={carePlan}
      />
    </div>
  )
}
