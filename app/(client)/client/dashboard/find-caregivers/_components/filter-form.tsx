'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { CARE_TYPES, CERTIFICATIONS, LANGUAGES, US_STATES } from '@/lib/constants'

interface Props {
  activeRequests: { id: string; title: string | null; careType: string }[]
  currentFilters: {
    requestId?: string
    careType?: string
    state?: string
    rateMin?: string
    rateMax?: string
    language?: string[]
    certification?: string[]
    experience?: string
    page?: string
  }
}

const EXPERIENCE_OPTIONS = [
  '1 year', '2 years', '3 years', '5 years', '10+ years',
]

export function FilterForm({ activeRequests, currentFilters }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildParams = useCallback(
    (overrides: Record<string, string | string[] | undefined>) => {
      const params = new URLSearchParams()

      const merged = {
        requestId:     currentFilters.requestId,
        careType:      currentFilters.careType,
        state:         currentFilters.state,
        rateMin:       currentFilters.rateMin,
        rateMax:       currentFilters.rateMax,
        language:      currentFilters.language,
        certification: currentFilters.certification,
        experience:    currentFilters.experience,
        page:          currentFilters.page,
        ...overrides,
      }

      if (merged.requestId)    params.set('requestId', merged.requestId as string)
      if (merged.careType)     params.set('careType', merged.careType as string)
      if (merged.state)        params.set('state', merged.state as string)
      if (merged.rateMin)      params.set('rateMin', merged.rateMin as string)
      if (merged.rateMax)      params.set('rateMax', merged.rateMax as string)
      if (merged.experience)   params.set('experience', merged.experience as string)
      if (merged.page)         params.set('page', merged.page as string)
      for (const lang of (merged.language as string[] | undefined) ?? []) {
        params.append('language', lang)
      }
      for (const cert of (merged.certification as string[] | undefined) ?? []) {
        params.append('certification', cert)
      }
      return params.toString()
    },
    [currentFilters],
  )

  function push(overrides: Record<string, string | string[] | undefined>) {
    const qs = buildParams({ ...overrides, page: undefined })
    router.push(`/client/dashboard/find-caregivers${qs ? `?${qs}` : ''}`)
  }

  function pushDebounced(overrides: Record<string, string | string[] | undefined>) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => push(overrides), 300)
  }

  function handleRequestChange(id: string) {
    push({ requestId: id || undefined, page: undefined })
  }

  function handleCheckboxMulti(
    key: 'language' | 'certification',
    value: string,
    checked: boolean,
  ) {
    const current = currentFilters[key] ?? []
    const next = checked ? [...current, value] : current.filter((v) => v !== value)
    push({ [key]: next.length > 0 ? next : undefined })
  }

  return (
    <div className="space-y-8">
      {/* Your Matches — request selector */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Your Matches
        </h2>
        {activeRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a care request to see your AI matches.
          </p>
        ) : (
          <select
            value={currentFilters.requestId ?? ''}
            onChange={(e) => handleRequestChange(e.target.value)}
            className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select a care request…</option>
            {activeRequests.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title ?? r.careType}
              </option>
            ))}
          </select>
        )}
      </section>

      {/* Browse All Caregivers — filters */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Browse All Caregivers
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Care Type */}
          <div>
            <label className="block text-xs font-medium mb-1">Care Type</label>
            <select
              value={currentFilters.careType ?? ''}
              onChange={(e) => push({ careType: e.target.value || undefined })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {CARE_TYPES.map((ct) => (
                <option key={ct.key} value={ct.key}>{ct.label}</option>
              ))}
            </select>
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-medium mb-1">State</label>
            <select
              value={currentFilters.state ?? ''}
              onChange={(e) => push({ state: e.target.value || undefined })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {US_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-xs font-medium mb-1">Experience</label>
            <select
              value={currentFilters.experience ?? ''}
              onChange={(e) => push({ experience: e.target.value || undefined })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {EXPERIENCE_OPTIONS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          {/* Rate Min */}
          <div>
            <label className="block text-xs font-medium mb-1">Min Rate ($/hr)</label>
            <input
              type="number"
              min={0}
              defaultValue={currentFilters.rateMin ?? ''}
              onChange={(e) => pushDebounced({ rateMin: e.target.value || undefined })}
              placeholder="0"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Rate Max */}
          <div>
            <label className="block text-xs font-medium mb-1">Max Rate ($/hr)</label>
            <input
              type="number"
              min={0}
              defaultValue={currentFilters.rateMax ?? ''}
              onChange={(e) => pushDebounced({ rateMax: e.target.value || undefined })}
              placeholder="Any"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Languages */}
        <div className="mb-4">
          <p className="text-xs font-medium mb-2">Languages</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {LANGUAGES.map((lang) => (
              <label key={lang.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  value={lang.key}
                  checked={(currentFilters.language ?? []).includes(lang.key)}
                  onChange={(e) =>
                    handleCheckboxMulti('language', lang.key, e.target.checked)
                  }
                />
                {lang.label}
              </label>
            ))}
          </div>
        </div>

        {/* Certifications */}
        <div>
          <p className="text-xs font-medium mb-2">Certifications</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {CERTIFICATIONS.map((cert) => (
              <label key={cert.key} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  value={cert.key}
                  checked={(currentFilters.certification ?? []).includes(cert.key)}
                  onChange={(e) =>
                    handleCheckboxMulti('certification', cert.key, e.target.checked)
                  }
                />
                {cert.label}
              </label>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
