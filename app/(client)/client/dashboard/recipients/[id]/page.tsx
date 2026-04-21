import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/domains/auth/session'
import { BackButton } from '@/components/back-button'
import { db } from '@/services/db'
import { careRecipients } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { CONDITIONS, CLIENT_STATUS_GROUPS } from '@/lib/constants'
import { formatDistanceToNow } from 'date-fns'

const CONDITIONS_LABELS: Record<string, string> = Object.fromEntries(
  CONDITIONS.map((c) => [c.key, c.label])
)

const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  CLIENT_STATUS_GROUPS.flatMap((g) => g.items.map((item) => [item.key, item.label]))
)

interface PageProps {
  params: Promise<{ id: string }>
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <dt className="text-sm text-muted-foreground w-36 shrink-0">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  )
}

export default async function RecipientDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [r] = await db
    .select()
    .from(careRecipients)
    .where(and(eq(careRecipients.id, id), eq(careRecipients.clientId, clientId)))
    .limit(1)

  if (!r) notFound()

  const initials = r.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const location = [r.address?.city, r.address?.state, r.address?.zip].filter(Boolean).join(', ')

  return (
    <div className="p-8">
      <BackButton label="← Back to Care Recipients" />

      <div className="flex items-start gap-5 mt-4 mb-8">
        {r.photoUrl ? (
          <img src={r.photoUrl} alt={r.name} className="h-20 w-20 rounded-full object-cover shrink-0" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{r.name}</h1>
              {r.relationship && (
                <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                  {r.relationship.replace(/-/g, ' ')}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Added {formatDistanceToNow(r.createdAt, { addSuffix: true })}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/client/dashboard/recipients/${r.id}/edit`}
                className="px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-muted whitespace-nowrap"
              >
                Edit
              </Link>
              <Link
                href={`/client/dashboard/requests/new?recipientId=${r.id}`}
                className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium whitespace-nowrap"
              >
                Create Care Request
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Personal Info</h2>
          <dl className="space-y-3">
            <Row label="Date of Birth" value={r.dob ?? <span className="text-muted-foreground">—</span>} />
            <Row label="Gender" value={r.gender ? <span className="capitalize">{r.gender}</span> : <span className="text-muted-foreground">—</span>} />
            <Row label="Phone" value={r.phone ?? <span className="text-muted-foreground">—</span>} />
            <Row label="Mobility" value={r.mobilityLevel ? <span className="capitalize">{r.mobilityLevel.replace(/-/g, ' ')}</span> : <span className="text-muted-foreground">—</span>} />
            {r.height && <Row label="Height" value={r.height} />}
            {r.weight && <Row label="Weight" value={r.weight} />}
          </dl>
        </section>

        <>
          <hr className="border-border" />
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Address</h2>
            {(r.address?.address1 || location) ? (
              <dl className="space-y-3">
                {r.address?.address1 && <Row label="Street" value={r.address.address1} />}
                {r.address?.address2 && <Row label="Unit" value={r.address.address2} />}
                {location && <Row label="City / State" value={location} />}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No address on file.</p>
            )}
          </section>
        </>

        <>
          <hr className="border-border" />
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Conditions</h2>
            {r.conditions && r.conditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {r.conditions.map((c) => (
                  <span key={c} className="rounded bg-muted px-2.5 py-1 text-xs font-medium">
                    {CONDITIONS_LABELS[c] ?? c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No conditions recorded.</p>
            )}
          </section>
        </>

        {r.clientStatus && Object.keys(r.clientStatus).some(k => k !== 'amputeeDetails' && k !== 'diet' && k !== 'other') && (
          <>
            <hr className="border-border" />
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Functional Status</h2>
              <div className="space-y-4">
                {CLIENT_STATUS_GROUPS.map((group) => {
                  const checked = group.items.filter(item => r.clientStatus![item.key])
                  if (checked.length === 0) return null
                  return (
                    <div key={group.label}>
                      <p className="text-xs text-muted-foreground mb-1.5">{group.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {checked.map(item => (
                          <span key={item.key} className="rounded bg-muted px-2.5 py-1 text-xs font-medium">
                            {STATUS_LABELS[item.key] ?? item.key}
                            {item.key === 'amputee' && typeof r.clientStatus!.amputeeDetails === 'string' && r.clientStatus!.amputeeDetails && (
                              <span className="text-muted-foreground ml-1">({r.clientStatus!.amputeeDetails as string})</span>
                            )}
                            {item.key === 'diabetic' && typeof r.clientStatus!.diet === 'string' && r.clientStatus!.diet && (
                              <span className="text-muted-foreground ml-1">({r.clientStatus!.diet as string})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {typeof r.clientStatus.other === 'string' && r.clientStatus.other && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Other</p>
                    <p className="text-sm">{r.clientStatus.other as string}</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        <>
          <hr className="border-border" />
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Notes</h2>
            {r.notes ? (
              <p className="text-sm leading-relaxed whitespace-pre-line">{r.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes added.</p>
            )}
          </section>
        </>
      </div>
    </div>
  )
}
