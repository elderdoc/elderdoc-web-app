import type { CareTaskEntry } from '@/db/schema'

type ScheduleEntry = { day: string; startTime: string; endTime: string }
type OverlapCount = { requested: number; covered: number }
type SectionKey = 'activityMobilitySafety' | 'hygieneElimination' | 'homeManagement' | 'hydrationNutrition' | 'medicationReminders'

export function computeScheduleOverlap(
  requestSchedule: ScheduleEntry[] | null | undefined,
  caregiverAvailability: ScheduleEntry[] | null | undefined,
): OverlapCount | null {
  if (!requestSchedule || requestSchedule.length === 0) return null
  if (!caregiverAvailability || caregiverAvailability.length === 0) {
    return { requested: requestSchedule.length, covered: requestSchedule.length }
  }
  const cgDays = new Set(caregiverAvailability.map(a => a.day))
  const covered = requestSchedule.filter(s => cgDays.has(s.day)).length
  return { requested: requestSchedule.length, covered }
}

export function computeCarePlanOverlap(
  requestPlan: Record<SectionKey, CareTaskEntry[]> | null | undefined,
  capabilities: Record<SectionKey, string[]> | null | undefined,
): Record<SectionKey, OverlapCount> | null {
  if (!requestPlan) return null
  const sections: SectionKey[] = [
    'activityMobilitySafety', 'hygieneElimination', 'homeManagement',
    'hydrationNutrition', 'medicationReminders',
  ]
  const result = {} as Record<SectionKey, OverlapCount>
  for (const section of sections) {
    const requested = requestPlan[section]?.length ?? 0
    const cgKeys = new Set(capabilities?.[section] ?? [])
    const covered = (requestPlan[section] ?? []).filter(e => cgKeys.has(e.key)).length
    result[section] = { requested, covered }
  }
  return result
}

const SPECIAL_NEEDS_KEYS = ['hardOfHearing', 'visionProblem', 'amputee', 'overweightMobility'] as const
type SpecialNeedKey = typeof SPECIAL_NEEDS_KEYS[number]

export function computeSpecialNeedsMatch(
  clientStatus: Record<string, unknown> | null | undefined,
  specialNeedsHandling: Record<string, boolean> | null | undefined,
): { required: string[]; covered: string[] } | null {
  if (!clientStatus) return null
  const statusToNeedKey: Record<string, SpecialNeedKey> = {
    hardOfHearing: 'hardOfHearing',
    visionProblem: 'visionProblem',
    amputee:       'amputee',
  }
  const required = Object.keys(statusToNeedKey).filter(k => clientStatus[k])
  if (required.length === 0) return null
  const covered = required.filter(k => specialNeedsHandling?.[statusToNeedKey[k]])
  return { required, covered }
}

export function parseWeightLbs(text: string | null | undefined): number | null {
  if (!text) return null
  // Reject height-format strings like 5'6" before trying to parse weight
  if (/\d+'\d*"?/.test(text)) return null
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)?/i)
  if (!match) return null
  const n = parseFloat(match[1])
  if (!isFinite(n) || n <= 0 || n > 1000) return null
  return Math.round(n)
}
