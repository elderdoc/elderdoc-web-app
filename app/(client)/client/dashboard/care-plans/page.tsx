import Link from 'next/link'
import { ArrowRight, ClipboardList, CheckCircle2, Plus } from 'lucide-react'
import { requireRole } from '@/domains/auth/session'
import { getClientCarePlans } from '@/domains/clients/care-plans'

export default async function CarePlansPage() {
  const session = await requireRole('client')
  const clientId = session.user.id!

  const rows = await getClientCarePlans(clientId)

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 max-w-[1100px] mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[13px] font-medium text-primary mb-2">
          <ClipboardList className="h-3.5 w-3.5" />
          Care plans
        </div>
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-[1.15]">
          Care plans
        </h1>
        <p className="mt-1.5 text-[14.5px] text-muted-foreground max-w-2xl">
          Care instructions for each of your recipients. Caregivers you hire will see this automatically.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-[16px] border-2 border-dashed border-border bg-card p-12 text-center max-w-2xl mx-auto">
          <div className="mx-auto h-14 w-14 rounded-full bg-[var(--forest-soft)] flex items-center justify-center mb-5">
            <ClipboardList className="h-6 w-6 text-[var(--forest-deep)]" />
          </div>
          <h3 className="text-[18px] font-semibold">No recipients yet</h3>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-sm mx-auto">
            Add a care recipient first, then you can create their care plan.
          </p>
          <Link
            href="/client/dashboard/recipients/new"
            className="mt-6 inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
          >
            <Plus className="h-4 w-4" />
            Add a recipient
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map((row) => {
            const initials = (row.recipientName ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
            const hasPlan = Boolean(row.carePlanId)
            return (
              <Link
                key={row.recipientId}
                href={`/client/dashboard/care-plans/${row.recipientId}`}
                className="group/cp relative flex flex-col rounded-[16px] border border-border bg-card p-5 transition-all hover:border-foreground/15 hover:shadow-[0_8px_24px_-12px_rgba(15,20,16,0.1)] hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--forest-soft)] text-[14px] font-semibold text-[var(--forest-deep)] ring-2 ring-card shadow-[0_2px_8px_-2px_rgba(15,77,52,0.15)]">
                    {initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[16px] font-semibold tracking-[-0.005em] truncate group-hover/cp:text-primary transition-colors">
                      {row.recipientName ?? 'Care recipient'}
                    </h3>
                    {hasPlan ? (
                      <p className="text-[12.5px] text-muted-foreground mt-0.5 tabular-nums">
                        Updated {row.updatedAt ? new Date(row.updatedAt).toLocaleDateString() : '—'}
                      </p>
                    ) : (
                      <p className="text-[12.5px] text-muted-foreground mt-0.5">No plan yet</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3.5">
                  {hasPlan ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--forest-deep)]">
                      <CheckCircle2 className="h-3 w-3" />
                      Plan saved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11.5px] font-medium text-amber-800">
                      <Plus className="h-3 w-3" />
                      Add a care plan
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground/70 transition-all group-hover/cp:text-primary group-hover/cp:gap-1.5">
                    {hasPlan ? 'Open' : 'Create'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
