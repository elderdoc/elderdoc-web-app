'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { CARE_TYPES, CERTIFICATIONS, US_STATES } from '@/lib/constants'
import { SelectField } from '@/components/select-field'
import { MapPin, DollarSign, Briefcase, ArrowUp, ArrowDown } from 'lucide-react'

interface Props {
  activeRequests: { id: string; title: string | null; careType: string }[]
  currentFilters: {
    careType?: string
    state?: string
    rateMin?: string
    rateMax?: string
    certification?: string
    experience?: string
    sort?: string
    page?: string
  }
}

const EXPERIENCE_OPTIONS = [
  { value: '1 year',   label: '1 year' },
  { value: '2 years',  label: '2 years' },
  { value: '3 years',  label: '3 years' },
  { value: '5 years',  label: '5 years' },
  { value: '10+ years', label: '10+ years' },
]

const CARE_TYPE_OPTIONS = CARE_TYPES.map((ct) => ({ value: ct.key, label: ct.label }))
const STATE_OPTIONS = US_STATES.map((s) => ({ value: s, label: s }))

// Distance cycles: '' → 'distance-asc' → 'distance-desc' → ''
function nextDistanceSort(cur?: string) {
  if (!cur || !cur.startsWith('distance')) return 'distance-asc'
  if (cur === 'distance-asc') return 'distance-desc'
  return undefined
}

// Price cycles: '' → 'price-asc' → 'price-desc' → ''
function nextPriceSort(cur?: string) {
  if (!cur || !cur.startsWith('price')) return 'price-asc'
  if (cur === 'price-asc') return 'price-desc'
  return undefined
}

// Jobs cycles: '' → 'jobs-desc' → 'jobs-asc' → ''
function nextJobsSort(cur?: string) {
  if (!cur || !cur.startsWith('jobs')) return 'jobs-desc'
  if (cur === 'jobs-desc') return 'jobs-asc'
  return undefined
}

export function FilterForm({ activeRequests, currentFilters }: Props) {
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showCertFilter, setShowCertFilter] = useState(
    !!currentFilters.certification && currentFilters.certification !== 'none'
  )

  const buildParams = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams()
      const merged = {
        careType:      currentFilters.careType,
        state:         currentFilters.state,
        rateMin:       currentFilters.rateMin,
        rateMax:       currentFilters.rateMax,
        certification: currentFilters.certification,
        experience:    currentFilters.experience,
        sort:          currentFilters.sort,
        page:          currentFilters.page,
        ...overrides,
      }
      if (merged.careType)     params.set('careType', merged.careType!)
      if (merged.state)        params.set('state', merged.state!)
      if (merged.rateMin)      params.set('rateMin', merged.rateMin!)
      if (merged.rateMax)      params.set('rateMax', merged.rateMax!)
      if (merged.experience)   params.set('experience', merged.experience!)
      if (merged.sort)         params.set('sort', merged.sort!)
      if (merged.page)         params.set('page', merged.page!)
      if (merged.certification && merged.certification !== 'none') {
        params.set('certification', merged.certification!)
      }
      return params.toString()
    },
    [currentFilters],
  )

  function push(overrides: Record<string, string | undefined>) {
    const qs = buildParams({ ...overrides, page: undefined })
    router.push(`/client/dashboard/find-caregivers${qs ? `?${qs}` : ''}`)
  }

  function pushDebounced(overrides: Record<string, string | undefined>) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => push(overrides), 300)
  }

  const sort = currentFilters.sort

  return (
    <div className="space-y-5">
      {/* Row 1: care type + state + experience */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">Care Type</label>
          <SelectField
            options={[{ value: '', label: 'Any' }, ...CARE_TYPE_OPTIONS]}
            value={currentFilters.careType ?? ''}
            onChange={(val) => push({ careType: val || undefined })}
            placeholder="Any"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">State</label>
          <SelectField
            options={[{ value: '', label: 'Any' }, ...STATE_OPTIONS]}
            value={currentFilters.state ?? ''}
            onChange={(val) => push({ state: val || undefined })}
            placeholder="Any"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Experience</label>
          <SelectField
            options={[{ value: '', label: 'Any' }, ...EXPERIENCE_OPTIONS]}
            value={currentFilters.experience ?? ''}
            onChange={(val) => push({ experience: val || undefined })}
            placeholder="Any"
          />
        </div>
      </div>

      {/* Row 2: sort toggle buttons + price inputs */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Distance toggle */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Distance</span>
          <button
            type="button"
            onClick={() => push({ sort: nextDistanceSort(sort) })}
            className={[
              'inline-flex h-9 items-center gap-1.5 rounded-[10px] border-2 px-3 text-[12.5px] font-medium transition-all',
              sort?.startsWith('distance')
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
            ].join(' ')}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {sort === 'distance-asc' ? (
              <><ArrowUp className="h-3 w-3" /> Nearest</>
            ) : sort === 'distance-desc' ? (
              <><ArrowDown className="h-3 w-3" /> Farthest</>
            ) : 'Distance'}
          </button>
        </div>

        {/* Price toggle + min/max inputs */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Price ($/hr)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => push({ sort: nextPriceSort(sort) })}
              className={[
                'inline-flex h-9 items-center gap-1.5 rounded-[10px] border-2 px-3 text-[12.5px] font-medium transition-all shrink-0',
                sort?.startsWith('price')
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
              ].join(' ')}
            >
              <DollarSign className="h-3.5 w-3.5 shrink-0" />
              {sort === 'price-asc' ? (
                <><ArrowUp className="h-3 w-3" /> Low</>
              ) : sort === 'price-desc' ? (
                <><ArrowDown className="h-3 w-3" /> High</>
              ) : 'Price'}
            </button>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
              <input
                type="number"
                min={0}
                defaultValue={currentFilters.rateMin ?? ''}
                onChange={(e) => pushDebounced({ rateMin: e.target.value || undefined })}
                placeholder="Min"
                className="h-9 w-20 rounded-[10px] border border-border bg-background pl-6 pr-2 text-[12.5px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <span className="text-xs text-muted-foreground">–</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
              <input
                type="number"
                min={0}
                defaultValue={currentFilters.rateMax ?? ''}
                onChange={(e) => pushDebounced({ rateMax: e.target.value || undefined })}
                placeholder="Max"
                className="h-9 w-20 rounded-[10px] border border-border bg-background pl-6 pr-2 text-[12.5px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>

        {/* Jobs done toggle */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Jobs done</span>
          <button
            type="button"
            onClick={() => push({ sort: nextJobsSort(sort) })}
            className={[
              'inline-flex h-9 items-center gap-1.5 rounded-[10px] border-2 px-3 text-[12.5px] font-medium transition-all',
              sort?.startsWith('jobs')
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
            ].join(' ')}
          >
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            {sort === 'jobs-desc' ? (
              <><ArrowDown className="h-3 w-3" /> Most</>
            ) : sort === 'jobs-asc' ? (
              <><ArrowUp className="h-3 w-3" /> Fewest</>
            ) : 'Jobs'}
          </button>
        </div>
      </div>

      {/* Certifications */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
          <input
            type="checkbox"
            checked={showCertFilter}
            onChange={e => {
              setShowCertFilter(e.target.checked)
              if (!e.target.checked) push({ certification: undefined })
            }}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          <span className="text-xs font-medium">Special certifications needed</span>
        </label>
        {showCertFilter && (
          <SelectField
            options={[
              { value: 'none', label: 'None' },
              ...CERTIFICATIONS.map(c => ({ value: c.key, label: c.label })),
            ]}
            value={currentFilters.certification ?? 'none'}
            onChange={val => push({ certification: val === 'none' ? undefined : val })}
            placeholder="None"
            className="max-w-xs"
          />
        )}
      </div>
    </div>
  )
}
