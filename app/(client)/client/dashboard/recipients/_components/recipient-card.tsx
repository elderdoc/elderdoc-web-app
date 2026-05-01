import Link from 'next/link'
import { ArrowRight, MapPin, Phone, Cake, Activity } from 'lucide-react'

interface Recipient {
  id: string
  name: string
  relationship: string | null
  photoUrl: string | null
  conditions: string[] | null
  mobilityLevel: string | null
  dob: string | null
  phone: string | null
  gender: string | null
  notes: string | null
  address: { address1?: string; address2?: string; city?: string; state?: string } | null
}

interface Props {
  recipient: Recipient
  conditionLabels: Record<string, string>
}

export function RecipientCard({ recipient: r, conditionLabels }: Props) {
  const initials = r.name.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
  const location = [r.address?.city, r.address?.state].filter(Boolean).join(', ')

  return (
    <Link
      href={`/client/dashboard/recipients/${r.id}`}
      className="group/rec relative block rounded-[16px] border border-border bg-card overflow-hidden transition-all hover:border-foreground/15 hover:shadow-[0_8px_28px_-12px_rgba(15,20,16,0.12)] hover:-translate-y-0.5"
    >
      {/* Header */}
      <div className="flex items-start gap-4 p-5">
        <div className="shrink-0">
          {r.photoUrl ? (
            <img
              src={r.photoUrl}
              alt={r.name}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-card shadow-[0_2px_8px_-2px_rgba(15,20,16,0.1)]"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--forest-soft)] text-[16px] font-semibold text-[var(--forest-deep)] ring-2 ring-card shadow-[0_2px_8px_-2px_rgba(15,20,16,0.08)]">
              {initials}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold tracking-[-0.01em] truncate transition-colors group-hover/rec:text-primary">
            {r.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {r.relationship && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11.5px] text-foreground/70 capitalize">
                {r.relationship.replace(/-/g, ' ')}
              </span>
            )}
            {r.gender && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11.5px] text-foreground/70 capitalize">
                {r.gender}
              </span>
            )}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-foreground/30 transition-all group-hover/rec:translate-x-0.5 group-hover/rec:text-primary" />
      </div>

      {/* Key details */}
      {(r.dob || r.phone || r.mobilityLevel || location) && (
        <div className="px-5 pb-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
          {r.dob && (
            <div className="flex items-center gap-2 text-[12.5px]">
              <Cake className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground/80">{r.dob}</span>
            </div>
          )}
          {r.phone && (
            <div className="flex items-center gap-2 text-[12.5px]">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground/80 truncate">{r.phone}</span>
            </div>
          )}
          {r.mobilityLevel && (
            <div className="flex items-center gap-2 text-[12.5px]">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground/80 capitalize truncate">{r.mobilityLevel.replace(/-/g, ' ')}</span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2 text-[12.5px]">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground/80 truncate">{location}</span>
            </div>
          )}
        </div>
      )}

      {/* Conditions */}
      {r.conditions && r.conditions.length > 0 && (
        <div className="px-5 pb-4 border-t border-border/60 pt-4">
          <p className="text-[11.5px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Conditions</p>
          <div className="flex flex-wrap gap-1.5">
            {r.conditions.slice(0, 6).map((c) => (
              <span key={c} className="inline-flex rounded-full bg-[var(--forest-soft)] px-2.5 py-0.5 text-[11.5px] font-medium text-[var(--forest-deep)]">
                {conditionLabels[c] ?? c}
              </span>
            ))}
            {r.conditions.length > 6 && (
              <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-[11.5px] text-muted-foreground">
                +{r.conditions.length - 6}
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  )
}
