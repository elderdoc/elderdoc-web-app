export type ExperienceKey = 'less-than-1' | '1-2' | '3-5' | '5-10' | '10-plus'

export interface RateRange {
  min: number
  max: number
}

const RATE_MAP: Record<ExperienceKey, RateRange> = {
  'less-than-1': { min: 16, max: 20 },
  '1-2':         { min: 19, max: 24 },
  '3-5':         { min: 22, max: 30 },
  '5-10':        { min: 28, max: 40 },
  '10-plus':     { min: 35, max: 55 },
}

export function getRateDefaults(experience: ExperienceKey): RateRange {
  const result = RATE_MAP[experience]
  if (!result) throw new Error(`Unknown experience key: "${experience}"`)
  return result
}

export const EXPERIENCE_OPTIONS = [
  { key: 'less-than-1', label: 'Less than 1 year' },
  { key: '1-2',         label: '1–2 years' },
  { key: '3-5',         label: '3–5 years' },
  { key: '5-10',        label: '5–10 years' },
  { key: '10-plus',     label: '10+ years' },
] as const
