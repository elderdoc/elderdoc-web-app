import { requireRole } from '@/domains/auth/session'
import { getClientPayments } from '@/domains/payments/queries'
import { db } from '@/services/db'
import { jobs, careRequests, caregiverProfiles, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { BillingClient } from './_components/billing-client'

export default async function ClientBillingPage() {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [paymentRows, activeJobs] = await Promise.all([
    getClientPayments(clientId),
    db
      .select({
        jobId: jobs.id,
        careType: careRequests.careType,
        caregiverName: users.name,
      })
      .from(jobs)
      .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
      .innerJoin(caregiverProfiles, eq(jobs.caregiverId, caregiverProfiles.id))
      .innerJoin(users, eq(caregiverProfiles.userId, users.id))
      .where(and(eq(jobs.clientId, clientId), eq(jobs.status, 'active')))
      .limit(50)
      .offset(0),
  ])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1">Billing</h1>
      <p className="text-sm text-muted-foreground mb-8">Record and view payments for your care services.</p>
      <BillingClient
        paymentRows={paymentRows}
        activeJobs={activeJobs}
        stripePublishableKey={process.env.STRIPE_PUBLISHABLE_KEY ?? ''}
      />
    </div>
  )
}
