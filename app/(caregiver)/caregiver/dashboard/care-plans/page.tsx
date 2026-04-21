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
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {sectionLabel}
        </p>
        <ul className="space-y-1">
          {entries.map((entry, i) => (
            <li key={i} className="text-sm flex gap-2 items-start">
              <span className="font-medium">{itemLabels[entry.key] ?? entry.key}</span>
              <span className="text-muted-foreground text-xs">({entry.frequency})</span>
              {entry.notes && (
                <span className="text-muted-foreground text-xs">— {entry.notes}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8">
      <h1 className="text-2xl font-semibold mb-1">Care Plans</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Care instructions for each of your care recipients.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active jobs found.</p>
      ) : (
        <div className="space-y-6">
          {rows.map((row) => (
            <div key={row.jobId} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-sm">{row.recipientName ?? 'Care Recipient'}</p>
                  <p className="text-xs text-muted-foreground">{CARE_TYPE_LABELS[row.careType] ?? row.careType}</p>
                </div>
                {row.updatedAt && (
                  <p className="text-xs text-muted-foreground">
                    Updated {row.updatedAt.toLocaleDateString()}
                  </p>
                )}
              </div>

              {!row.carePlanId ? (
                <p className="text-sm text-muted-foreground">No care plan added yet.</p>
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
          ))}
        </div>
      )}
    </div>
  )
}
