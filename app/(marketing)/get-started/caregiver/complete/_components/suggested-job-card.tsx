'use client'

import { useState } from 'react'
import { JobDetailDrawer, type JobDetail } from '@/app/(caregiver)/caregiver/dashboard/_components/job-detail-drawer'
import type { MatchedJob } from '@/domains/matching/match-jobs'
import { CARE_TYPES } from '@/lib/constants'

const CARE_TYPE_LABELS = Object.fromEntries(CARE_TYPES.map((c) => [c.key, c.label]))

interface Props {
  job: MatchedJob
  rank: number
}

export function SuggestedJobCard({ job, rank }: Props) {
  const [applied, setApplied] = useState(false)

  const title = job.title ?? `${CARE_TYPE_LABELS[job.careType] ?? job.careType} Request`
  const distance = job.distanceMiles != null ? `${job.distanceMiles} miles away` : [job.city, job.state].filter(Boolean).join(', ')
  const scoreColor = job.score >= 80 ? 'text-green-700 bg-green-50' : job.score >= 60 ? 'text-blue-700 bg-blue-50' : 'text-muted-foreground bg-muted'

  const jobDetail: JobDetail = {
    id:                     job.requestId,
    title,
    careType:               job.careType,
    careTypeLabel:          CARE_TYPE_LABELS[job.careType] ?? job.careType,
    description:            job.description,
    frequency:              job.frequency,
    schedule:               null,
    startDate:              null,
    budgetType:             job.budgetType,
    budgetAmount:           job.budgetAmount,
    genderPref:             null,
    languagePref:           null,
    city:                   job.city,
    state:                  job.state,
    address1:               null,
    distanceMiles:          job.distanceMiles,
    clientName:             job.clientName,
    recipientName:          null,
    recipientConditions:    null,
    recipientMobilityLevel: null,
    createdAt:              null,
    score:                  job.score,
    reason:                 job.reason,
  }

  return (
    <div className={`rounded-xl border bg-white p-5 transition-all ${applied ? 'border-green-200 bg-green-50/40 opacity-70' : 'border-border hover:border-primary/30 hover:shadow-sm'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {rank}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-semibold text-sm">{title}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreColor}`}>
                {job.score}% match
              </span>
            </div>
            {job.description && (
              <p className="text-xs text-muted-foreground mb-1.5 leading-relaxed line-clamp-2">{job.description}</p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{CARE_TYPE_LABELS[job.careType] ?? job.careType}</span>
              {distance && <span>{distance}</span>}
              {job.frequency && <span className="capitalize">{job.frequency.replace(/-/g, ' ')}</span>}
              {job.budgetAmount && (
                <span className="font-medium text-foreground">
                  ${job.budgetAmount}{job.budgetType === 'hourly' ? '/hr' : ''}
                </span>
              )}
            </div>
            {job.reason && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">&ldquo;{job.reason}&rdquo;</p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {applied ? (
            <span className="text-xs text-green-700 font-medium">Applied ✓</span>
          ) : (
            <JobDetailDrawer
              job={jobDetail}
              onApplied={() => setApplied(true)}
              trigger={
                <button
                  type="button"
                  className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap hover:bg-primary/90 transition-colors"
                >
                  Apply
                </button>
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
