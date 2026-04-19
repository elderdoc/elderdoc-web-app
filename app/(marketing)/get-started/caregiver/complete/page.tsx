import Link from 'next/link'
import { requireRole } from '@/domains/auth/session'
import { db } from '@/services/db'
import { caregiverProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { matchJobsForCaregiver } from '@/domains/matching/match-jobs'
import { SuggestedJobCard } from './_components/suggested-job-card'

export default async function CaregiverComplete() {
  const session = await requireRole('caregiver')
  const userId = session.user.id!

  const profile = await db.query.caregiverProfiles.findFirst({
    where: eq(caregiverProfiles.userId, userId),
  })

  const matches = profile ? await matchJobsForCaregiver(profile.id) : []

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <style>{`
                .complete-check {
                  stroke-dasharray: 50;
                  stroke-dashoffset: 50;
                  animation: draw-check 0.5s ease-out 0.1s forwards;
                }
                @keyframes draw-check { to { stroke-dashoffset: 0; } }
              `}</style>
              <path
                className="complete-check"
                d="M10 21l8 8 14-16"
                stroke="#1A6B4A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold">Your profile is live.</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {matches.length > 0
                ? `We found ${matches.length} great match${matches.length > 1 ? 'es' : ''} based on your profile.`
                : 'Families are looking for caregivers like you.'}
            </p>
          </div>
        </div>

        {matches.length > 0 ? (
          <>
            <div className="space-y-3 mb-10">
              {matches.map((job, i) => (
                <SuggestedJobCard key={job.requestId} job={job} rank={i + 1} />
              ))}
            </div>

            <div className="border-t border-border pt-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">Not ready to apply yet? No worries.</p>
              <Link
                href="/caregiver/dashboard"
                className="inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                Apply Later — Go to Dashboard
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground mb-8">
              No open requests match your profile right now. Check back soon — new requests are posted daily.
            </p>
            <Link
              href="/caregiver/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go to My Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
