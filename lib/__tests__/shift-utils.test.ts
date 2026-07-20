import { describe, it, expect } from 'vitest'
import { calculateShiftHours } from '../shift-utils'

describe('calculateShiftHours', () => {
  it('returns exact hours for round times (09:00–12:00 = 3h)', () => {
    expect(calculateShiftHours('09:00', '12:00')).toBe(3)
  })

  it('ceils 10 minutes to 0.25h (1st quarter-hour)', () => {
    expect(calculateShiftHours('09:00', '09:10')).toBe(0.25)
  })

  it('ceils 15 minutes to 0.25h (exactly 1 quarter-hour)', () => {
    expect(calculateShiftHours('09:00', '09:15')).toBe(0.25)
  })

  it('ceils 20 minutes to 0.5h (2nd quarter-hour)', () => {
    expect(calculateShiftHours('09:00', '09:20')).toBe(0.5)
  })

  it('ceils 30 minutes to 0.5h (exactly 2 quarter-hours)', () => {
    expect(calculateShiftHours('09:00', '09:30')).toBe(0.5)
  })

  it('ceils 45 minutes to 0.75h (exactly 3 quarter-hours)', () => {
    expect(calculateShiftHours('09:00', '09:45')).toBe(0.75)
  })

  it('ceils 50 minutes to 1h (4th quarter-hour = full extra hour)', () => {
    expect(calculateShiftHours('09:00', '09:50')).toBe(1)
  })

  it('ceils 2h 10min to 2.25h', () => {
    expect(calculateShiftHours('09:00', '11:10')).toBe(2.25)
  })

  it('returns 8 hours for 08:00–16:00', () => {
    expect(calculateShiftHours('08:00', '16:00')).toBe(8)
  })
})
