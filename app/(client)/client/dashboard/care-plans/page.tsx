import Link from 'next/link'
import { requireRole } from '@/domains/auth/session'
import { getClientCarePlans } from '@/domains/clients/care-plans'

export default async function CarePlansPage() {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const rows = await getClientCarePlans(clientId)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-1">Care Plans</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Care instructions for each of your care recipients. You can add a care plan for any recipient — caregivers you hire will automatically see it.
      </p>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
          <p className="text-muted-foreground">No care recipients yet.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add a care recipient first, then you can create a care plan for them.
          </p>
          <Link
            href="/client/dashboard/recipients/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            + Add Care Recipient
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Link
              key={row.recipientId}
              href={`/client/dashboard/care-plans/${row.recipientId}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 hover:shadow-md hover:border-primary/30 transition-all group"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                  {row.recipientName ?? 'Care Recipient'}
                </p>
              </div>
              <div className="shrink-0 text-right ml-4">
                {row.carePlanId ? (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                    Plan saved
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-700">
                    + Add care plan
                  </span>
                )}
                {row.updatedAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Updated {row.updatedAt.toLocaleDateString()}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
