import {
  computeScheduleOverlap,
  computeCarePlanOverlap,
  computeSpecialNeedsMatch,
  parseWeightLbs,
} from '../helpers'

describe('computeScheduleOverlap', () => {
  it('returns null when request has no schedule', () => {
    expect(computeScheduleOverlap(null, [])).toBeNull()
  })

  it('returns null when request schedule is empty', () => {
    expect(computeScheduleOverlap([], [])).toBeNull()
  })

  it('counts covered days when caregiver has availability', () => {
    const requestSchedule = [
      { day: 'monday', startTime: '09:00', endTime: '13:00' },
      { day: 'wednesday', startTime: '09:00', endTime: '13:00' },
    ]
    const caregiverAvailability = [
      { day: 'monday', startTime: '08:00', endTime: '17:00' },
    ]
    expect(computeScheduleOverlap(requestSchedule, caregiverAvailability)).toEqual({ requested: 2, covered: 1 })
  })

  it('returns full coverage when all days match', () => {
    const days = [{ day: 'monday', startTime: '09:00', endTime: '13:00' }]
    expect(computeScheduleOverlap(days, days)).toEqual({ requested: 1, covered: 1 })
  })

  it('returns full coverage when caregiver has no availability (pass-through)', () => {
    const request = [{ day: 'monday', startTime: '09:00', endTime: '13:00' }]
    expect(computeScheduleOverlap(request, null)).toEqual({ requested: 1, covered: 1 })
  })
})

describe('computeCarePlanOverlap', () => {
  it('returns null when requestPlan is null', () => {
    expect(computeCarePlanOverlap(null, null)).toBeNull()
  })

  it('computes per-section overlap', () => {
    const requestPlan = {
      activityMobilitySafety: [{ key: 'companionship', frequency: 'every-visit' as const }],
      hygieneElimination:     [{ key: 'bathShower', frequency: 'every-visit' as const }, { key: 'oralHygiene', frequency: 'as-needed' as const }],
      homeManagement:         [],
      hydrationNutrition:     [],
      medicationReminders:    [],
    }
    const capabilities = {
      activityMobilitySafety: ['companionship', 'rom'],
      hygieneElimination:     ['bathShower'],
      homeManagement:         [],
      hydrationNutrition:     [],
      medicationReminders:    [],
    }
    const result = computeCarePlanOverlap(requestPlan, capabilities)
    expect(result!.activityMobilitySafety).toEqual({ requested: 1, covered: 1 })
    expect(result!.hygieneElimination).toEqual({ requested: 2, covered: 1 })
    expect(result!.homeManagement).toEqual({ requested: 0, covered: 0 })
  })
})

describe('computeSpecialNeedsMatch', () => {
  it('returns null when client status has no relevant special needs', () => {
    expect(computeSpecialNeedsMatch({ livesAlone: true }, {})).toBeNull()
  })

  it('identifies hard of hearing need and coverage', () => {
    const result = computeSpecialNeedsMatch(
      { hardOfHearing: true },
      { hardOfHearing: true }
    )
    expect(result).toEqual({ required: ['hardOfHearing'], covered: ['hardOfHearing'] })
  })

  it('identifies uncovered needs', () => {
    const result = computeSpecialNeedsMatch(
      { hardOfHearing: true, amputee: true },
      { hardOfHearing: true }
    )
    expect(result).toEqual({ required: ['hardOfHearing', 'amputee'], covered: ['hardOfHearing'] })
  })
})

describe('parseWeightLbs', () => {
  it('parses "185 lbs"', () => {
    expect(parseWeightLbs('185 lbs')).toBe(185)
  })

  it('parses "185"', () => {
    expect(parseWeightLbs('185')).toBe(185)
  })

  it('parses "5\'6\""', () => {
    expect(parseWeightLbs("5'6\"")).toBeNull()
  })

  it('returns null for non-numeric strings', () => {
    expect(parseWeightLbs('unknown')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseWeightLbs('')).toBeNull()
  })
})
