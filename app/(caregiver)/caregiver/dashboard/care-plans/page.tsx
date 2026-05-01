import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { jobs, careRequests, caregiverProfiles, carePlans, careRecipients } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { CARE_TYPES, CARE_PLAN_SECTIONS } from '@/lib/constants'
import type { CareTaskEntry } from '@/db/schema'

const CARE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CARE_TYPES.map((c) => [c.key, c.label])
)

const SECTION_ITEM_LABELS: Record<string, Record<string, string>> = Object.fromEntries(
  CARE_PLAN_SECTIONS.map((section) => [
    section.key,
    Object.fromEntries(section.items.map((item) => [item.key, item.label])),
  ])
)

export default async function CaregiverCarePlansPage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  if (!profile) {
    return (
      <div className="p-4 lg:p-8 text-muted-foreground text-sm">
        Complete your profile to view care plans.
      </div>
    )
  }

  const rows = await db
    .select({
      jobId:                  jobs.id,
      careType:               careRequests.careType,
      recipientName:          careRecipients.name,
      carePlanId:             carePlans.id,
      activityMobilitySafety: carePlans.activityMobilitySafety,
      hygieneElimination:     carePlans.hygieneElimination,
      homeManagement:         carePlans.homeManagement,
      hydrationNutrition:     carePlans.hydrationNutrition,
      medicationReminders:    carePlans.medicationReminders,
      updatedAt:              carePlans.updatedAt,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .leftJoin(carePlans, eq(carePlans.requestId, jobs.requestId))
    .where(and(eq(jobs.caregiverId, profile.id), eq(jobs.status, 'active')))
    .orderBy(desc(jobs.createdAt))
    .limit(50)
    .offset(0)

  function renderSection(
    sectionKey: string,
    sectionLabel: string,
    entries: CareTaskEntry[] | null | undefined,
  ) {
    if (!entries || entries.length === 0) return null
    const itemLabels = SECTION_ITEM_LABELS[sectionKey] ?? {}
    return (
      <div className="border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-1 w-1 rounded-full bg-primary" />
          <p className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-wider">
            {sectionLabel}
          </p>
        </div>
        <ul className="space-y-2">
          {entries.map((entry, i) => (
            <li key={i} className="flex items-start gap-2.5 rounded-[10px] bg-muted/40 px-3 py-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[14px] font-semibold tracking-[-0.005em]">{itemLabels[entry.key] ?? entry.key}</span>
                  <span className="inline-flex items-center rounded-full bg-card px-2 py-0.5 text-[10.5px] font-medium text-foreground/70 capitalize">
                    {entry.frequency.replace('-', ' ')}
                  </span>
                </div>
                {entry.notes && (
                  <p className="mt-1 text-[12.5px] text-muted-foreground leading-snug">{entry.notes}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-12 max-w-[1100px] mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[13px] font-medium text-primary mb-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Care plans
        </div>
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-[1.15]">
          Care plans
        </h1>
        <p className="mt-1.5 text-[14.5px] text-muted-foreground max-w-2xl">
          Care instructions for each of your active recipients.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-[16px] border-2 border-dashed border-border bg-card p-12 text-center max-w-2xl mx-auto">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
              <path d="M9 11l3 3L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-[18px] font-semibold">No active jobs</h3>
          <p className="mt-2 text-[14px] text-muted-foreground">
            When you start a job, your client&apos;s care plan will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((row) => {
            const initials = (row.recipientName ?? '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
            return (
              <div key={row.jobId} className="rounded-[18px] border border-border bg-card overflow-hidden">
                {/* Header band */}
                <div className="flex items-center gap-3 p-5 border-b border-border/60 bg-[var(--cream-deep)]/30">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--forest-soft)] text-[14px] font-semibold text-[var(--forest-deep)] ring-2 ring-card shadow-[0_2px_8px_-2px_rgba(15,77,52,0.15)]">
                    {initials}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[17px] font-semibold tracking-[-0.01em] truncate">
                      {row.recipientName ?? 'Care recipient'}
                    </h3>
                    <p className="text-[12.5px] text-muted-foreground">{CARE_TYPE_LABELS[row.careType] ?? row.careType}</p>
                  </div>
                  {row.updatedAt && (
                    <span className="text-[11.5px] text-muted-foreground tabular-nums shrink-0">
                      Updated {row.updatedAt.toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Sections */}
                <div className="p-5">
                  {!row.carePlanId ? (
                    <div className="rounded-[12px] bg-muted/40 p-6 text-center">
                      <p className="text-[13.5px] text-muted-foreground italic">
                        No care plan added yet by the family.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {renderSection('activityMobilitySafety', 'Activity, Mobility & Safety', row.activityMobilitySafety)}
                      {renderSection('hygieneElimination', 'Hygiene & Elimination', row.hygieneElimination)}
                      {renderSection('homeManagement', 'Home Management', row.homeManagement)}
                      {renderSection('hydrationNutrition', 'Hydration & Nutrition', row.hydrationNutrition)}
                      {renderSection('medicationReminders', 'Medication Reminders', row.medicationReminders)}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
