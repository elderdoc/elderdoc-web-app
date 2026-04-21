import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { jobs, careRequests, caregiverProfiles, carePlans, users, careRecipients } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { CARE_TYPES } from '@/lib/constants'

const CARE_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CARE_TYPES.map((c) => [c.key, c.label])
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
      jobId:               jobs.id,
      careType:            careRequests.careType,
      recipientName:       careRecipients.name,
      carePlanId:          carePlans.id,
      dailySchedule:       carePlans.dailySchedule,
      medications:         carePlans.medications,
      dietaryRestrictions: carePlans.dietaryRestrictions,
      emergencyContacts:   carePlans.emergencyContacts,
      specialInstructions: carePlans.specialInstructions,
      updatedAt:           carePlans.updatedAt,
    })
    .from(jobs)
    .innerJoin(careRequests, eq(jobs.requestId, careRequests.id))
    .leftJoin(careRecipients, eq(careRequests.recipientId, careRecipients.id))
    .leftJoin(carePlans, eq(carePlans.recipientId, careRequests.recipientId))
    .where(and(eq(jobs.caregiverId, profile.id), eq(jobs.status, 'active')))
    .orderBy(desc(jobs.createdAt))
    .limit(50)
    .offset(0)

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
                  {row.dailySchedule && row.dailySchedule.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Daily Schedule
                      </p>
                      <ul className="space-y-1">
                        {row.dailySchedule.map((item, i) => (
                          <li key={i} className="text-sm flex gap-4">
                            <span className="font-mono text-muted-foreground w-16 shrink-0 whitespace-nowrap">{item.time}</span>
                            <span>{item.activity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {row.medications && row.medications.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Medications
                      </p>
                      <ul className="space-y-1">
                        {row.medications.map((med, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-medium">{med.name}</span>
                            <span className="text-muted-foreground"> — {med.dosage}, {med.frequency}</span>
                            {med.notes && <span className="text-muted-foreground"> ({med.notes})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {row.dietaryRestrictions && row.dietaryRestrictions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Dietary Restrictions
                      </p>
                      <ul className="flex flex-wrap gap-2">
                        {row.dietaryRestrictions.map((r, i) => (
                          <li key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {row.emergencyContacts && row.emergencyContacts.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Emergency Contacts
                      </p>
                      <ul className="space-y-1">
                        {row.emergencyContacts.map((contact, i) => (
                          <li key={i} className="text-sm">
                            <span className="font-medium">{contact.name}</span>
                            <span className="text-muted-foreground"> ({contact.relationship}) — {contact.phone}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {row.specialInstructions && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Special Instructions
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{row.specialInstructions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
