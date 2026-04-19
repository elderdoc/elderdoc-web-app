'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { CARE_TYPES, CERTIFICATIONS, LANGUAGES, US_STATES } from '@/lib/constants'
import { SelectField } from '@/components/select-field'

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
  { value: '1 year', label: '1 year' },
  { value: '2 years', label: '2 years' },
  { value: '3 years', label: '3 years' },
  { value: '5 years', label: '5 years' },
  { value: '10+ years', label: '10+ years' },
]

const CARE_TYPE_OPTIONS = CARE_TYPES.map((ct) => ({ value: ct.key, label: ct.label }))
const STATE_OPTIONS = US_STATES.map((s) => ({ value: s, label: s }))

export function FilterForm({ activeRequests, currentFilters }: Props) {
  const router = useRouter()
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

  const requestOptions = activeRequests.map((r) => ({
    value: r.id,
    label: r.title ?? r.careType,
  }))

  return (
    <div className="space-y-8">
      {/* Your Matches — request selector */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Your Matches
        </h2>
        {activeRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a care request to see your matched caregivers.
          </p>
        ) : (
          <SelectField
            options={requestOptions}
            value={currentFilters.requestId ?? ''}
            onChange={(val) => handleRequestChange(val)}
            placeholder="Select a care request…"
            className="max-w-xs"
          />
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
            <SelectField
              options={[{ value: '', label: 'Any' }, ...CARE_TYPE_OPTIONS]}
              value={currentFilters.careType ?? ''}
              onChange={(val) => push({ careType: val || undefined })}
              placeholder="Any"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-medium mb-1">State</label>
            <SelectField
              options={[{ value: '', label: 'Any' }, ...STATE_OPTIONS]}
              value={currentFilters.state ?? ''}
              onChange={(val) => push({ state: val || undefined })}
              placeholder="Any"
            />
          </div>

          {/* Experience */}
          <div>
            <label className="block text-xs font-medium mb-1">Experience</label>
            <SelectField
              options={[{ value: '', label: 'Any' }, ...EXPERIENCE_OPTIONS]}
              value={currentFilters.experience ?? ''}
              onChange={(val) => push({ experience: val || undefined })}
              placeholder="Any"
            />
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
