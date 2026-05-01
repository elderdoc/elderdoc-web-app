import { Mail, DollarSign, Star, Briefcase } from 'lucide-react'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import {
  users, caregiverProfiles, caregiverCareTypes, caregiverCertifications,
  caregiverLanguages, caregiverWorkPrefs, caregiverLocations,
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { CaregiverProfileForm } from './_components/caregiver-profile-form'

export default async function CaregiverProfilePage() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const [profileRow] = await db
    .select({
      id:          caregiverProfiles.id,
      headline:    caregiverProfiles.headline,
      about:       caregiverProfiles.about,
      photoUrl:    caregiverProfiles.photoUrl,
      hourlyMin:   caregiverProfiles.hourlyMin,
      hourlyMax:   caregiverProfiles.hourlyMax,
      experience:  caregiverProfiles.experience,
      education:   caregiverProfiles.education,
      relocatable: caregiverProfiles.relocatable,
      rating:      caregiverProfiles.rating,
      name:        users.name,
      email:       users.email,
      phone:       users.phone,
      image:       users.image,
    })
    .from(caregiverProfiles)
    .innerJoin(users, eq(caregiverProfiles.userId, users.id))
    .where(eq(caregiverProfiles.userId, userId))
    .limit(1)

  if (!profileRow) notFound()

  const [careTypes, certs, langs, workPrefs, location] = await Promise.all([
    db.select({ careType: caregiverCareTypes.careType }).from(caregiverCareTypes).where(eq(caregiverCareTypes.caregiverId, profileRow.id)),
    db.select({ certification: caregiverCertifications.certification }).from(caregiverCertifications).where(eq(caregiverCertifications.caregiverId, profileRow.id)),
    db.select({ language: caregiverLanguages.language }).from(caregiverLanguages).where(eq(caregiverLanguages.caregiverId, profileRow.id)),
    db.select().from(caregiverWorkPrefs).where(eq(caregiverWorkPrefs.caregiverId, profileRow.id)),
    db.select().from(caregiverLocations).where(eq(caregiverLocations.caregiverId, profileRow.id)).limit(1),
  ])

  const workTypes    = [...new Set(workPrefs.map(w => w.workType).filter(Boolean))] as string[]
  const travelDists  = [...new Set(workPrefs.map(w => w.travelDistanceMiles).filter(v => v != null))] as number[]
  const startAvail   = workPrefs.find(w => w.startAvailability)?.startAvailability ?? ''

  const initials = (profileRow.name ?? profileRow.email).split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="relative px-6 lg:px-10 py-8 lg:py-10 max-w-[1100px] mx-auto">
      {/* Soft glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-15%] top-[-10%] h-[400px] w-[400px] rounded-full bg-[var(--forest-soft)] blur-[100px] opacity-40" />
      </div>

      {/* Hero card */}
      <div className="rounded-[20px] border border-border bg-card overflow-hidden shadow-[0_4px_20px_-8px_rgba(15,20,16,0.08)]">
        <div className="relative">
          <div className="relative h-44 bg-[var(--forest)] overflow-hidden">
            <span aria-hidden className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 select-none text-[80px] font-bold tracking-tight text-white/10 leading-none">elderdoc</span>
          </div>
          <div className="px-6 sm:px-8 pb-6 -mt-14">
            <div className="flex items-end gap-4 flex-wrap">
              {(profileRow.photoUrl ?? profileRow.image) ? (
                <img
                  src={(profileRow.photoUrl ?? profileRow.image)!}
                  alt={profileRow.name ?? ''}
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
                    {profileRow.name ?? 'Your profile'}
                  </h1>
                  {profileRow.rating && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[13px] font-semibold text-amber-700">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {Number(profileRow.rating).toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-foreground/70">
                    <Mail className="h-3 w-3" />
                    {profileRow.email}
                  </span>
                  {(profileRow.hourlyMin || profileRow.hourlyMax) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--forest-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--forest-deep)]">
                      <DollarSign className="h-3 w-3" />
                      ${profileRow.hourlyMin ?? '?'}–${profileRow.hourlyMax ?? '?'}/hr
                    </span>
                  )}
                  {profileRow.experience && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-foreground/70">
                      <Briefcase className="h-3 w-3" />
                      {profileRow.experience}
                    </span>
                  )}
                </div>
                {profileRow.headline && (
                  <p className="mt-2 text-[14px] text-muted-foreground line-clamp-2 max-w-xl">
                    {profileRow.headline}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mt-5">
        <CaregiverProfileForm
          profile={{
            ...profileRow,
            careTypes:      careTypes.map(c => c.careType),
            certifications: certs.map(c => c.certification),
            languages:      langs.map(l => l.language),
            workTypes,
            startAvailability: startAvail,
            travelDistances: travelDists,
            address1: location[0]?.address1 ?? '',
            address2: location[0]?.address2 ?? '',
            city:     location[0]?.city ?? '',
            state:    location[0]?.state ?? '',
          }}
        />
      </div>
    </div>
  )
}
