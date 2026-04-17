import { describe, it, expect } from 'vitest'
import { getRateDefaults, EXPERIENCE_OPTIONS } from '@/lib/rate-defaults'

describe('getRateDefaults', () => {
  it('returns $16-20 for less than 1 year', () => {
    expect(getRateDefaults('less-than-1')).toEqual({ min: 16, max: 20 })
  })

  it('returns $19-24 for 1-2 years', () => {
    expect(getRateDefaults('1-2')).toEqual({ min: 19, max: 24 })
  })

  it('returns $22-30 for 3-5 years', () => {
    expect(getRateDefaults('3-5')).toEqual({ min: 22, max: 30 })
  })

  it('returns $28-40 for 5-10 years', () => {
    expect(getRateDefaults('5-10')).toEqual({ min: 28, max: 40 })
  })

  it('returns $35-55 for 10+ years', () => {
    expect(getRateDefaults('10-plus')).toEqual({ min: 35, max: 55 })
  })

  it('EXPERIENCE_OPTIONS contains all 5 options', () => {
    expect(EXPERIENCE_OPTIONS).toHaveLength(5)
  })
})
