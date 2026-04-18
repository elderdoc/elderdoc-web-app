import Link from 'next/link'
import { requireRole } from '@/domains/auth/session'
import { getClientCarePlans } from '@/domains/clients/care-plans'

export default async function CarePlansPage() {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const rows = await getClientCarePlans(clientId)

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-semibold mb-1">Care Plans</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Manage care instructions for each active job.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active jobs found.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Link
              key={row.jobId}
              href={`/client/dashboard/care-plans/${row.jobId}`}
              className="block rounded-xl border border-border bg-card p-5 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm mb-1">{row.careType}</p>
                  <p className="text-xs text-muted-foreground">
                    Caregiver: {row.caregiverName ?? 'Unknown'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {row.carePlanId ? (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                      Plan saved
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">
                      No plan yet
                    </span>
                  )}
                  {row.updatedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {row.updatedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
