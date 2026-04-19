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
      className="block rounded-lg border border-border bg-card p-5 space-y-3 hover:border-primary/40 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-3">
        {r.photoUrl ? (
          <img src={r.photoUrl} alt={r.name} className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-medium truncate">{r.name}</p>
          {r.relationship && (
            <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground capitalize">
              {r.relationship.replace(/-/g, ' ')}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {r.dob && <span>DOB: {r.dob}</span>}
        {r.gender && <span className="capitalize">{r.gender}</span>}
        {r.phone && <span>{r.phone}</span>}
        {location && <span>{location}</span>}
        {r.mobilityLevel && (
          <span className="capitalize">Mobility: {r.mobilityLevel.replace(/-/g, ' ')}</span>
        )}
      </div>

      {r.conditions && r.conditions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {r.conditions.map((c) => (
            <span key={c} className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {conditionLabels[c] ?? c}
            </span>
          ))}
        </div>
      )}

      {r.notes && (
        <p className="text-xs text-muted-foreground line-clamp-2">{r.notes}</p>
      )}
    </Link>
  )
}
