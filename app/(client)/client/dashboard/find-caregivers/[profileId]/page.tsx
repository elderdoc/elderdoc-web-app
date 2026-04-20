import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import {
  caregiverProfiles, users, caregiverCareTypes, caregiverLocations,
  caregiverCertifications, caregiverLanguages, caregiverWorkPrefs,
  careRequests, matches, caregiverFavorites,
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import {
  CARE_TYPES, CERTIFICATIONS, LANGUAGES,
  WORK_TYPES, DAYS_OF_WEEK, SHIFTS, START_AVAILABILITY,
} from '@/lib/constants'
import { SendOfferModal } from '../_components/send-offer-modal'
import { FavoriteButton } from '../_components/favorite-button'
import { BackButton } from '@/components/back-button'

const CARE_TYPE_LABELS  = Object.fromEntries(CARE_TYPES.map((c) => [c.key, c.label]))
const CERT_LABELS       = Object.fromEntries(CERTIFICATIONS.map((c) => [c.key, c.label]))
const LANG_LABELS       = Object.fromEntries(LANGUAGES.map((l) => [l.key, l.label]))
const WORK_TYPE_LABELS  = Object.fromEntries(WORK_TYPES.map((w) => [w.key, w.label]))
const DAY_LABELS        = Object.fromEntries(DAYS_OF_WEEK.map((d) => [d.key, d.label]))
const SHIFT_LABELS      = Object.fromEntries(SHIFTS.map((s) => [s.key, s.label]))
const START_LABELS      = Object.fromEntries(START_AVAILABILITY.map((s) => [s.key, s.label]))

interface PageProps {
  params: Promise<{ profileId: string }>
}

export default async function CaregiverProfilePage({ params }: PageProps) {
  const { profileId } = await params
  const session = await requireRole('client')
  const clientId = session.user.id!

  const [profile, careTypes, locations, certs, langs, workPrefs, activeRequests, existingMatch, favoriteRow] = await Promise.all([
    db
      .select({
        id:          caregiverProfiles.id,
        headline:    caregiverProfiles.headline,
        about:       caregiverProfiles.about,
        photoUrl:    caregiverProfiles.photoUrl,
        hourlyMin:   caregiverProfiles.hourlyMin,
        hourlyMax:   caregiverProfiles.hourlyMax,
        rating:      caregiverProfiles.rating,
        experience:  caregiverProfiles.experience,
        education:   caregiverProfiles.education,
        relocatable: caregiverProfiles.relocatable,
        name:        users.name,
        image:       users.image,
        phone:       users.phone,
      })
      .from(caregiverProfiles)
      .innerJoin(users, eq(caregiverProfiles.userId, users.id))
      .where(eq(caregiverProfiles.id, profileId))
      .limit(1),
    db.select({ careType: caregiverCareTypes.careType })
      .from(caregiverCareTypes).where(eq(caregiverCareTypes.caregiverId, profileId)),
    db.select({ city: caregiverLocations.city, state: caregiverLocations.state, address1: caregiverLocations.address1 })
      .from(caregiverLocations).where(eq(caregiverLocations.caregiverId, profileId)).limit(1),
    db.select({ certification: caregiverCertifications.certification })
      .from(caregiverCertifications).where(eq(caregiverCertifications.caregiverId, profileId)),
    db.select({ language: caregiverLanguages.language })
      .from(caregiverLanguages).where(eq(caregiverLanguages.caregiverId, profileId)),
    db.select({
        workType:            caregiverWorkPrefs.workType,
        shift:               caregiverWorkPrefs.shift,
        day:                 caregiverWorkPrefs.day,
        travelDistanceMiles: caregiverWorkPrefs.travelDistanceMiles,
        startAvailability:   caregiverWorkPrefs.startAvailability,
      })
      .from(caregiverWorkPrefs).where(eq(caregiverWorkPrefs.caregiverId, profileId)),
    db.select({ id: careRequests.id, title: careRequests.title, careType: careRequests.careType })
      .from(careRequests)
      .where(and(eq(careRequests.clientId, clientId), eq(careRequests.status, 'active'))),
    db.select({ id: matches.id })
      .from(matches)
      .innerJoin(careRequests, eq(matches.requestId, careRequests.id))
      .where(and(eq(matches.caregiverId, profileId), eq(careRequests.clientId, clientId)))
      .limit(1),
    db.select({ clientId: caregiverFavorites.clientId })
      .from(caregiverFavorites)
      .where(and(eq(caregiverFavorites.clientId, clientId), eq(caregiverFavorites.caregiverId, profileId)))
      .limit(1),
  ])

  const isFavorited = favoriteRow.length > 0

  if (!profile.length) notFound()
  const p = profile[0]
  const loc = locations[0]
  const location = loc ? [loc.city, loc.state].filter(Boolean).join(', ') : null
  const initials = (p.name ?? '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()
  const alreadyOffered = existingMatch.length > 0

  // Deduplicate work prefs
  const workTypes = [...new Set(workPrefs.map((w) => w.workType).filter(Boolean))] as string[]
  const availDays = [...new Set(workPrefs.map((w) => w.day).filter(Boolean))] as string[]
  const availShifts = [...new Set(workPrefs.map((w) => w.shift).filter(Boolean))] as string[]
  const travelDistances = [...new Set(workPrefs.map((w) => w.travelDistanceMiles).filter((v) => v != null))] as number[]
  const startAvail = workPrefs.find((w) => w.startAvailability)?.startAvailability ?? null

  return (
    <div className="p-8">
      <BackButton label="← Back" />

      {/* Header */}
      <div className="flex items-start gap-5 mt-4 mb-8">
        {(p.photoUrl ?? p.image) ? (
          <img src={p.photoUrl ?? p.image!} alt={p.name ?? ''} className="h-20 w-20 rounded-full object-cover shrink-0" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{p.name}</h1>
                {p.rating && (
                  <span className="flex items-center gap-1 text-sm text-amber-500 font-medium">
                    ★ {Number(p.rating).toFixed(1)}
                  </span>
                )}
              </div>
              {location && <p className="text-sm text-muted-foreground mt-0.5">{location}</p>}
              {p.headline && <p className="text-sm text-muted-foreground mt-1">{p.headline}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <FavoriteButton caregiverId={profileId} initialFavorited={isFavorited} />
              <SendOfferModal
                caregiverId={profileId}
                activeRequests={activeRequests}
                alreadyOffered={alreadyOffered}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm text-muted-foreground">
            {(p.hourlyMin || p.hourlyMax) && (
              <span>${p.hourlyMin ?? '?'}–${p.hourlyMax ?? '?'}/hr</span>
            )}
            {p.experience && <span>{p.experience} experience</span>}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* About */}
        {p.about && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">About</h2>
            <p className="text-sm leading-relaxed">{p.about}</p>
          </section>
        )}

        <hr className="border-border" />

        {/* Care Types */}
        {careTypes.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Care Types</h2>
            <div className="flex flex-wrap gap-2">
              {careTypes.map((ct) => (
                <span key={ct.careType} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {CARE_TYPE_LABELS[ct.careType] ?? ct.careType}
                </span>
              ))}
            </div>
          </section>
        )}

        <hr className="border-border" />

        {/* Availability */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Availability</h2>
          {workTypes.length === 0 && availDays.length === 0 && availShifts.length === 0 && !startAvail ? (
            <p className="text-sm text-muted-foreground">Availability not specified.</p>
          ) : (
          <dl className="space-y-3">
            {workTypes.length > 0 && (
              <div className="flex gap-4">
                <dt className="text-sm text-muted-foreground w-36 shrink-0">Work Type</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {workTypes.map((w) => (
                    <span key={w} className="rounded bg-muted px-2 py-0.5 text-xs">{WORK_TYPE_LABELS[w] ?? w}</span>
                  ))}
                </dd>
              </div>
            )}
            {availDays.length > 0 && (
              <div className="flex gap-4">
                <dt className="text-sm text-muted-foreground w-36 shrink-0">Days</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {availDays.map((d) => (
                    <span key={d} className="rounded bg-muted px-2 py-0.5 text-xs">{DAY_LABELS[d] ?? d}</span>
                  ))}
                </dd>
              </div>
            )}
            {availShifts.length > 0 && (
              <div className="flex gap-4">
                <dt className="text-sm text-muted-foreground w-36 shrink-0">Shifts</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {availShifts.map((s) => (
                    <span key={s} className="rounded bg-muted px-2 py-0.5 text-xs">{SHIFT_LABELS[s] ?? s}</span>
                  ))}
                </dd>
              </div>
            )}
            {startAvail && (
              <div className="flex gap-4">
                <dt className="text-sm text-muted-foreground w-36 shrink-0">Start Date</dt>
                <dd className="text-sm font-medium">{START_LABELS[startAvail] ?? startAvail}</dd>
              </div>
            )}
            {travelDistances.length > 0 && (
              <div className="flex gap-4">
                <dt className="text-sm text-muted-foreground w-36 shrink-0">Travel Range</dt>
                <dd className="text-sm font-medium">
                  Up to {Math.max(...travelDistances)} miles
                </dd>
              </div>
            )}
            {p.relocatable && (
              <div className="flex gap-4">
                <dt className="text-sm text-muted-foreground w-36 shrink-0">Relocatable</dt>
                <dd className="text-sm font-medium">Yes</dd>
              </div>
            )}
          </dl>
          )}
        </section>

        <hr className="border-border" />

        {/* Background */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Background</h2>
          <dl className="space-y-4">
            {p.phone && (
              <div className="flex gap-4">
                <dt className="text-sm text-muted-foreground w-36 shrink-0">Phone</dt>
                <dd className="text-sm font-medium">{p.phone}</dd>
              </div>
            )}
            {p.experience && (
              <div className="flex gap-4">
                <dt className="text-sm text-muted-foreground w-36 shrink-0">Experience</dt>
                <dd className="text-sm font-medium">{p.experience}</dd>
              </div>
            )}
            {p.education && (
              <div className="flex gap-4">
                <dt className="text-sm text-muted-foreground w-36 shrink-0">Education</dt>
                <dd className="text-sm font-medium">{p.education}</dd>
              </div>
            )}
            {certs.length > 0 && (
              <div className="flex gap-4">
                <dt className="text-sm text-muted-foreground w-36 shrink-0">Certifications</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {certs.map((c) => (
                    <span key={c.certification} className="rounded bg-muted px-2 py-0.5 text-xs">
                      {CERT_LABELS[c.certification] ?? c.certification}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {langs.length > 0 && (
              <div className="flex gap-4">
                <dt className="text-sm text-muted-foreground w-36 shrink-0">Languages</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {langs.map((l) => (
                    <span key={l.language} className="rounded bg-muted px-2 py-0.5 text-xs">
                      {LANG_LABELS[l.language] ?? l.language}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </section>
      </div>
    </div>
  )
}
