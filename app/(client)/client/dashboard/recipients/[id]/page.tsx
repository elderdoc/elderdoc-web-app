import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit3, FileText, Cake, Phone, Activity, MapPin, User2, Heart, Ruler, Weight, ArrowRight, AlertCircle } from 'lucide-react'
import { requireRole } from '@/domains/auth/session'
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

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/60 last:border-b-0">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground/70">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <div className="text-[14px] text-foreground font-medium">{value}</div>
      </div>
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
    <div className="relative px-6 lg:px-10 py-8 lg:py-10 max-w-[1100px] mx-auto">
      {/* Soft glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-15%] top-[-10%] h-[400px] w-[400px] rounded-full bg-[var(--forest-soft)] blur-[100px] opacity-40" />
      </div>

      <Link
        href="/client/dashboard/recipients"
        className="inline-flex items-center gap-1.5 text-[14px] text-foreground/70 hover:text-foreground mb-6 group/back"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover/back:-translate-x-0.5" />
        Back to Care Recipients
      </Link>

      {/* Hero card */}
      <div className="rounded-[20px] border border-border bg-card overflow-hidden shadow-[0_4px_20px_-8px_rgba(15,20,16,0.08)]">
        <div className="relative">
          {/* Green banner */}
          <div
            className="relative h-52 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1a3d2b 0%, #2d6b48 45%, #1f5238 75%, #163322 100%)' }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.13) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute right-4 bottom-0 translate-y-4 select-none text-[104px] font-black tracking-tighter text-white/[0.055] leading-none"
            >
              elderdoc
            </span>
          </div>
          <div className="relative z-10 px-6 sm:px-8 pb-6">
            {/* Avatar + action buttons */}
            <div className="flex items-end justify-between gap-4 flex-wrap -mt-12">
              {r.photoUrl ? (
                <img src={r.photoUrl} alt={r.name} className="h-24 w-24 rounded-2xl object-cover ring-4 ring-card shadow-[0_8px_24px_-8px_rgba(15,20,16,0.2)]" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary text-[24px] font-bold text-primary-foreground ring-4 ring-card shadow-[0_8px_24px_-8px_rgba(15,77,52,0.4)]">
                  {initials}
                </div>
              )}
              <div className="flex gap-2 pb-1">
                <Link
                  href={`/client/dashboard/recipients/${r.id}/edit`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-[13.5px] font-medium hover:border-foreground/30 hover:bg-muted transition-all"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </Link>
                <Link
                  href={`/client/dashboard/requests/new?recipientId=${r.id}`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13.5px] font-medium text-primary-foreground hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Create care request
                </Link>
              </div>
            </div>
            {/* Name + badges — fully in white space */}
            <div className="mt-4">
              <h1 className="text-[32px] font-semibold tracking-[-0.02em] leading-tight">{r.name}</h1>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {r.relationship && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--forest-deep)] capitalize">
                    <Heart className="h-3 w-3" />
                    {r.relationship.replace(/-/g, ' ')}
                  </span>
                )}
                {r.gender && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[12px] text-foreground/70 capitalize">
                    {r.gender}
                  </span>
                )}
                <span className="text-[12px] text-muted-foreground">
                  Added {formatDistanceToNow(r.createdAt, { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Personal Info */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3">Personal info</h2>
          <div>
            <InfoRow icon={Cake}     label="Date of birth" value={r.dob ?? <span className="text-muted-foreground">—</span>} />
            <InfoRow icon={Phone}    label="Phone"         value={r.phone ?? <span className="text-muted-foreground">—</span>} />
            <InfoRow icon={Activity} label="Mobility"      value={r.mobilityLevel ? <span className="capitalize">{r.mobilityLevel.replace(/-/g, ' ')}</span> : <span className="text-muted-foreground">—</span>} />
            {r.height && <InfoRow icon={Ruler} label="Height" value={r.height} />}
            {r.weight && <InfoRow icon={Weight} label="Weight" value={r.weight} />}
          </div>
        </div>

        {/* Address */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3">Address</h2>
          {(r.address?.address1 || location) ? (
            <div>
              {r.address?.address1 && <InfoRow icon={MapPin} label="Street" value={r.address.address1} />}
              {r.address?.address2 && <InfoRow icon={MapPin} label="Unit" value={r.address.address2} />}
              {location && <InfoRow icon={MapPin} label="City, State" value={location} />}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/40 p-6 text-center">
              <MapPin className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-[13px] text-muted-foreground">No address on file.</p>
            </div>
          )}
        </div>

        {/* Conditions */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
            Medical conditions
            {r.conditions && r.conditions.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {r.conditions.length}
              </span>
            )}
          </h2>
          {r.conditions && r.conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {r.conditions.map((c) => (
                <span key={c} className="inline-flex rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--forest-deep)]">
                  {CONDITIONS_LABELS[c] ?? c}
                </span>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/40 p-6 text-center">
              <AlertCircle className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-[13px] text-muted-foreground">No conditions recorded.</p>
            </div>
          )}
        </div>
      </div>

      {/* Functional Status */}
      {r.clientStatus && Object.keys(r.clientStatus).some(k => k !== 'amputeeDetails' && k !== 'diet' && k !== 'other') && (
        <div className="mt-5 rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-4">Functional status</h2>
          <div className="space-y-4">
            {CLIENT_STATUS_GROUPS.map((group) => {
              const checked = group.items.filter(item => (r.clientStatus as Record<string, unknown>)?.[item.key])
              if (checked.length === 0) return null
              return (
                <div key={group.label} className="border-t border-border/60 pt-4 first:border-t-0 first:pt-0">
                  <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-2">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {checked.map(item => (
                      <span key={item.key} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {STATUS_LABELS[item.key] ?? item.key}
                        {item.key === 'amputee' && typeof r.clientStatus!.amputeeDetails === 'string' && r.clientStatus!.amputeeDetails && (
                          <span className="text-muted-foreground">· {r.clientStatus!.amputeeDetails as string}</span>
                        )}
                        {item.key === 'diabetic' && typeof r.clientStatus!.diet === 'string' && r.clientStatus!.diet && (
                          <span className="text-muted-foreground">· {r.clientStatus!.diet as string}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
            {typeof r.clientStatus.other === 'string' && r.clientStatus.other && (
              <div className="border-t border-border/60 pt-4">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Other</p>
                <p className="text-[14px] leading-relaxed">{r.clientStatus.other as string}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mt-5 rounded-[18px] border border-border bg-card p-5">
        <h2 className="text-[15px] font-semibold mb-3">Notes</h2>
        {r.notes ? (
          <p className="text-[14.5px] leading-[1.6] whitespace-pre-line text-foreground/85">{r.notes}</p>
        ) : (
          <p className="text-[13px] text-muted-foreground">No notes added.</p>
        )}
      </div>
    </div>
  )
}
