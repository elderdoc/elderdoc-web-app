import Link from 'next/link'

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
      className="block rounded-lg border border-border bg-card p-5 space-y-4 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        {r.photoUrl ? (
          <img src={r.photoUrl} alt={r.name} className="h-12 w-12 rounded-full object-cover shrink-0" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shrink-0">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold truncate">{r.name}</p>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {r.relationship && (
              <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                {r.relationship.replace(/-/g, ' ')}
              </span>
            )}
            {r.gender && (
              <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
                {r.gender}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Key details grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {r.dob && (
          <div>
            <span className="text-muted-foreground">Date of Birth</span>
            <p className="font-medium mt-0.5">{r.dob}</p>
          </div>
        )}
        {r.phone && (
          <div>
            <span className="text-muted-foreground">Phone</span>
            <p className="font-medium mt-0.5">{r.phone}</p>
          </div>
        )}
        {r.mobilityLevel && (
          <div>
            <span className="text-muted-foreground">Mobility</span>
            <p className="font-medium mt-0.5 capitalize">{r.mobilityLevel.replace(/-/g, ' ')}</p>
          </div>
        )}
        {location && (
          <div>
            <span className="text-muted-foreground">Location</span>
            <p className="font-medium mt-0.5">{location}</p>
          </div>
        )}
      </div>

      {/* Conditions */}
      {r.conditions && r.conditions.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Conditions</p>
          <div className="flex flex-wrap gap-1">
            {r.conditions.map((c) => (
              <span key={c} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {conditionLabels[c] ?? c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes preview */}
      {r.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2 border-t border-border pt-3">{r.notes}</p>
      )}
    </Link>
  )
}
