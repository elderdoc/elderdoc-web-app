import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, MapPin, DollarSign, Phone, GraduationCap, Briefcase, Languages, Award, Clock, CheckCircle2, Plane, Calendar } from 'lucide-react'
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
  WORK_TYPES, START_AVAILABILITY,
} from '@/lib/constants'
import { SendOfferModal } from '../_components/send-offer-modal'
import { FavoriteButton } from '../_components/favorite-button'

const CARE_TYPE_LABELS  = Object.fromEntries(CARE_TYPES.map((c) => [c.key, c.label]))
const CERT_LABELS       = Object.fromEntries(CERTIFICATIONS.map((c) => [c.key, c.label]))
const LANG_LABELS       = Object.fromEntries(LANGUAGES.map((l) => [l.key, l.label]))
const WORK_TYPE_LABELS  = Object.fromEntries(WORK_TYPES.map((w) => [w.key, w.label]))
const START_LABELS      = Object.fromEntries(START_AVAILABILITY.map((s) => [s.key, s.label]))

interface PageProps {
  params: Promise<{ profileId: string }>
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

  if (!profile.length) notFound()

  const isFavorited = favoriteRow.length > 0
  const p = profile[0]
  const loc = locations[0]
  const location = loc ? [loc.city, loc.state].filter(Boolean).join(', ') : null
  const initials = (p.name ?? '?').split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase()
  const alreadyOffered = existingMatch.length > 0

  // Deduplicate work prefs
  const workTypes = [...new Set(workPrefs.map((w) => w.workType).filter(Boolean))] as string[]
  const travelDistances = [...new Set(workPrefs.map((w) => w.travelDistanceMiles).filter((v) => v != null))] as number[]
  const startAvail = workPrefs.find((w) => w.startAvailability)?.startAvailability ?? null

  return (
    <div className="relative px-6 lg:px-10 py-8 lg:py-10 max-w-[1100px] mx-auto">
      {/* Soft glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-15%] top-[-10%] h-[400px] w-[400px] rounded-full bg-[var(--forest-soft)] blur-[100px] opacity-40" />
      </div>

      <Link
        href="/client/dashboard/find-caregivers"
        className="inline-flex items-center gap-1.5 text-[14px] text-foreground/70 hover:text-foreground mb-6 group/back"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover/back:-translate-x-0.5" />
        Back to Find Caregivers
      </Link>

      {/* Hero card */}
      <div className="rounded-[20px] border border-border bg-card overflow-hidden shadow-[0_4px_20px_-8px_rgba(15,20,16,0.08)]">
        <div className="relative">
          {/* Banner gradient */}
          <div className="h-32 bg-gradient-to-br from-[var(--forest-soft)] via-[var(--cream-deep)] to-[var(--forest-soft)]" />
          <div className="px-6 sm:px-8 pb-6 -mt-12">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div className="flex items-end gap-4">
                {(p.photoUrl ?? p.image) ? (
                  <img
                    src={p.photoUrl ?? p.image!}
                    alt={p.name ?? ''}
                    className="h-24 w-24 rounded-2xl object-cover ring-4 ring-card shadow-[0_8px_24px_-8px_rgba(15,20,16,0.2)]"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary text-[24px] font-bold text-primary-foreground ring-4 ring-card shadow-[0_8px_24px_-8px_rgba(15,77,52,0.4)]">
                    {initials}
                  </div>
                )}
                <div className="pb-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-tight">
                      {p.name}
                    </h1>
                    {p.rating && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[13px] font-semibold text-amber-700">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {Number(p.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {location && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-foreground/70">
                        <MapPin className="h-3 w-3" />
                        {location}
                      </span>
                    )}
                    {(p.hourlyMin || p.hourlyMax) && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--forest-deep)]">
                        <DollarSign className="h-3 w-3" />
                        ${p.hourlyMin ?? '?'}–${p.hourlyMax ?? '?'}/hr
                      </span>
                    )}
                    {p.experience && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-foreground/70">
                        <Clock className="h-3 w-3" />
                        {p.experience}
                      </span>
                    )}
                  </div>
                  {p.headline && (
                    <p className="mt-2 text-[14px] text-muted-foreground line-clamp-2 max-w-xl">
                      {p.headline}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pb-1">
                <FavoriteButton caregiverId={profileId} initialFavorited={isFavorited} />
                <SendOfferModal
                  caregiverId={profileId}
                  activeRequests={activeRequests}
                  alreadyOffered={alreadyOffered}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      {p.about && (
        <div className="mt-5 rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-2.5">About</h2>
          <p className="text-[14.5px] leading-[1.6] whitespace-pre-line text-foreground/85">{p.about}</p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Care Types */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
            Care types
            {careTypes.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {careTypes.length}
              </span>
            )}
          </h2>
          {careTypes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {careTypes.map((ct) => (
                <span
                  key={ct.careType}
                  className="inline-flex rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--forest-deep)]"
                >
                  {CARE_TYPE_LABELS[ct.careType] ?? ct.careType}
                </span>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/40 p-6 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-[13px] text-muted-foreground">None specified.</p>
            </div>
          )}
        </div>

        {/* Background */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3">Background</h2>
          <div>
            {p.experience && <InfoRow icon={Briefcase} label="Experience" value={p.experience} />}
            {p.education && <InfoRow icon={GraduationCap} label="Education" value={p.education} />}
            {p.phone && <InfoRow icon={Phone} label="Phone" value={p.phone} />}
            {!p.experience && !p.education && !p.phone && (
              <div className="rounded-lg bg-muted/40 p-6 text-center">
                <Briefcase className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
                <p className="text-[13px] text-muted-foreground">No background info.</p>
              </div>
            )}
          </div>
        </div>

        {/* Availability */}
        <div className="rounded-[18px] border border-border bg-card p-5">
          <h2 className="text-[15px] font-semibold mb-3">Availability</h2>
          {(workTypes.length === 0 && !startAvail && travelDistances.length === 0 && !p.relocatable) ? (
            <div className="rounded-lg bg-muted/40 p-6 text-center">
              <Calendar className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-[13px] text-muted-foreground">Not specified.</p>
            </div>
          ) : (
            <div>
              {startAvail && (
                <InfoRow icon={Calendar} label="Start date" value={START_LABELS[startAvail] ?? startAvail} />
              )}
              {travelDistances.length > 0 && (
                <InfoRow icon={MapPin} label="Travel range" value={`Up to ${Math.max(...travelDistances)} miles`} />
              )}
              {p.relocatable && (
                <InfoRow icon={Plane} label="Relocatable" value="Yes" />
              )}
              {workTypes.length > 0 && (
                <div className="pt-3">
                  <p className="text-[12px] text-muted-foreground mb-1.5">Work type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {workTypes.map((w) => (
                      <span key={w} className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground/80">
                        {WORK_TYPE_LABELS[w] ?? w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Certifications & Languages */}
      {(certs.length > 0 || langs.length > 0) && (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {certs.length > 0 && (
            <div className="rounded-[18px] border border-border bg-card p-5">
              <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-muted-foreground" />
                Certifications
                <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {certs.length}
                </span>
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {certs.map((c) => (
                  <span
                    key={c.certification}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--forest-deep)]"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {CERT_LABELS[c.certification] ?? c.certification}
                  </span>
                ))}
              </div>
            </div>
          )}
          {langs.length > 0 && (
            <div className="rounded-[18px] border border-border bg-card p-5">
              <h2 className="text-[15px] font-semibold mb-3 flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                Languages
                <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {langs.length}
                </span>
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {langs.map((l) => (
                  <span key={l.language} className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground/80">
                    {LANG_LABELS[l.language] ?? l.language}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
