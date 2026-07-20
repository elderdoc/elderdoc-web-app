'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { applyToRequest } from '@/domains/caregivers/actions'
import {
  Sheet, SheetContent,
} from '@/components/ui/sheet'
import {
  X, MapPin, DollarSign, Calendar, Clock, Users, Globe, Sparkles,
  User, AlertCircle, Activity,
} from 'lucide-react'

export interface JobDetail {
  id: string
  title: string
  careType: string
  careTypeLabel: string
  description: string | null
  frequency: string | null
  schedule: Array<{ day: string; startTime: string; endTime: string }> | null
  startDate: string | null
  budgetType: string | null
  budgetMin: string | null
  genderPref: string | null
  languagesPreferred: string[] | null
  city: string | null
  state: string | null
  address1: string | null
  distanceMiles?: number | null
  clientName: string | null
  recipientName: string | null
  recipientConditions: string[] | null
  recipientMobilityLevel: string | null
  createdAt: Date | null
  score?: number | null
  reason?: string | null
}

interface Props {
  job: JobDetail
  trigger: React.ReactNode
  onApplied?: () => void
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--forest-soft)] text-[var(--forest-deep)]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-[12.5px] font-semibold text-foreground/70 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-muted/50 px-3.5 py-3 border border-border/50">
      <p className="text-[11px] text-muted-foreground mb-0.5 font-medium">{label}</p>
      <p className="text-[13.5px] font-semibold">{value}</p>
    </div>
  )
}

export function JobDetailDrawer({ job, trigger, onApplied }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const distanceLabel = job.distanceMiles != null
    ? `${job.distanceMiles} mi away`
    : [job.city, job.state].filter(Boolean).join(', ')

  const rateLabel = job.budgetMin
    ? `$${Number(job.budgetMin).toFixed(0)}${job.budgetType === 'hourly' ? '/hr' : job.budgetType === 'daily' ? '/day' : ''}`
    : null

  const scoreColor = job.score != null
    ? job.score >= 80 ? { ring: 'border-[var(--forest)]', bg: 'bg-[var(--forest-soft)]', text: 'text-[var(--forest-deep)]', label: 'Strong match' }
    : job.score >= 60 ? { ring: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-700', label: 'Good match' }
    : { ring: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Possible match' }
    : null

  function handleSubmit() {
    if (!coverNote.trim()) return
    setError(null)
    startTransition(async () => {
      try {
        await applyToRequest(job.id, coverNote.trim())
        setOpen(false)
        setCoverNote('')
        onApplied?.()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>

      <SheetContent side="right" className="sm:max-w-[520px] w-full flex flex-col overflow-hidden p-0 gap-0 border-l border-border">
        {/* Header banner */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a3d2b 0%, #2d6b48 50%, #163322 100%)' }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          {/* Close button */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative px-6 pt-10 pb-7">
            {/* Care type badge */}
            <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-medium text-white/90 mb-3">
              {job.careTypeLabel}
            </span>
            <h2 className="text-[22px] font-semibold text-white leading-snug tracking-[-0.02em]">{job.title}</h2>

            {/* Meta row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[12.5px] text-white/70">
              {distanceLabel && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {distanceLabel}
                </span>
              )}
              {job.frequency && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="capitalize">{job.frequency.replace(/-/g, ' ')}</span>
                </span>
              )}
              {rateLabel && (
                <span className="flex items-center gap-1.5 text-white/90 font-semibold">
                  <DollarSign className="h-3.5 w-3.5" />
                  {rateLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-7">

            {/* Match score */}
            {job.score != null && scoreColor && (
              <div className={`rounded-[14px] border-2 ${scoreColor.ring} ${scoreColor.bg} p-4 flex items-center gap-4`}>
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 ${scoreColor.ring} bg-white`}>
                  <span className={`text-[20px] font-black tabular-nums leading-none ${scoreColor.text}`}>
                    {job.score}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className={`text-[13px] font-semibold ${scoreColor.text}`}>{scoreColor.label}</p>
                  {job.reason && (
                    <p className={`text-[12.5px] mt-0.5 leading-relaxed ${scoreColor.text} opacity-80`}>
                      {job.reason}
                    </p>
                  )}
                </div>
                <Sparkles className={`h-5 w-5 shrink-0 ${scoreColor.text} opacity-50`} />
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div>
                <SectionLabel icon={AlertCircle} label="About this role" />
                <p className="text-[13.5px] text-foreground/80 leading-relaxed whitespace-pre-line">{job.description}</p>
              </div>
            )}

            {/* Key details grid */}
            <div>
              <SectionLabel icon={Calendar} label="Details" />
              <div className="grid grid-cols-2 gap-2.5">
                {rateLabel && <InfoTile label="Pay rate" value={rateLabel} />}
                {job.startDate && <InfoTile label="Start date" value={job.startDate} />}
                {job.frequency && <InfoTile label="Frequency" value={job.frequency.replace(/-/g, ' ')} />}
                {job.schedule && job.schedule.length > 0 && (
                  <InfoTile label="Sessions / week" value={String(job.schedule.length)} />
                )}
                {job.genderPref && job.genderPref !== 'no-preference' && (
                  <InfoTile
                    label="Caregiver gender pref."
                    value={job.genderPref.charAt(0).toUpperCase() + job.genderPref.slice(1)}
                  />
                )}
                {job.clientName && <InfoTile label="Posted by" value={job.clientName} />}
              </div>
            </div>

            {/* Schedule */}
            {job.schedule && job.schedule.length > 0 && (
              <div>
                <SectionLabel icon={Clock} label="Schedule" />
                <div className="space-y-1.5">
                  {job.schedule.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-[10px] bg-muted/40 px-3.5 py-2.5 border border-border/50">
                      <span className="w-20 text-[12.5px] font-semibold capitalize text-foreground">{entry.day}</span>
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                      <span className="text-[12.5px] text-muted-foreground tabular-nums">{entry.startTime} – {entry.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            {(job.address1 || job.city || job.state) && (
              <div>
                <SectionLabel icon={MapPin} label="Location" />
                <p className="text-[13.5px] text-foreground/80">
                  {[job.address1, job.city, job.state].filter(Boolean).join(', ')}
                </p>
              </div>
            )}

            {/* Languages */}
            {job.languagesPreferred && job.languagesPreferred.length > 0 && (
              <div>
                <SectionLabel icon={Globe} label="Language preference" />
                <div className="flex flex-wrap gap-1.5">
                  {job.languagesPreferred.map((l) => (
                    <span key={l} className="rounded-full bg-muted border border-border px-2.5 py-1 text-[12px] capitalize font-medium">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Care recipient */}
            {job.recipientName && (
              <div>
                <SectionLabel icon={Users} label="Care recipient" />
                <div className="rounded-[14px] border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--forest-soft)] text-[var(--forest-deep)]">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold">{job.recipientName}</p>
                      {job.recipientMobilityLevel && (
                        <p className="text-[12px] text-muted-foreground capitalize">
                          {job.recipientMobilityLevel.replace(/-/g, ' ')} mobility
                        </p>
                      )}
                    </div>
                  </div>
                  {job.recipientConditions && job.recipientConditions.length > 0 && (
                    <div>
                      <p className="text-[11.5px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1.5">
                        <Activity className="h-3 w-3" /> Conditions
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {job.recipientConditions.map((c) => (
                          <span key={c} className="rounded-full bg-background border border-border px-2.5 py-0.5 text-[11.5px] capitalize">
                            {c.replace(/-/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cover note */}
            <div>
              <SectionLabel icon={AlertCircle} label="Your cover note" />
              <textarea
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                maxLength={500}
                rows={5}
                className="w-full rounded-[12px] border border-border bg-card px-3.5 py-3 text-[13.5px] placeholder:text-muted-foreground/50 resize-none focus:border-[var(--forest)] focus:outline-none focus:ring-2 focus:ring-[var(--forest-soft)] transition-shadow leading-relaxed"
                placeholder="Introduce yourself and explain why you're a great fit for this role…"
              />
              <div className="flex items-center justify-between mt-1.5">
                {error
                  ? <p className="text-[12px] text-destructive">{error}</p>
                  : <p className="text-[12px] text-muted-foreground">Required to apply.</p>
                }
                <p className={`text-[12px] tabular-nums ${coverNote.length > 450 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {coverNote.length}/500
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-border bg-card">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !coverNote.trim()}
            className="w-full h-11 rounded-full bg-primary text-primary-foreground text-[14px] font-semibold disabled:opacity-40 disabled:pointer-events-none hover:bg-[var(--forest-deep)] hover:shadow-[0_8px_18px_-6px_rgba(15,77,52,0.4)] transition-all"
          >
            {isPending ? 'Submitting application…' : 'Submit application'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
