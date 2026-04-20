import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockInsert,
  mockUpdate,
  mockSelect,
  mockFindFirst,
  mockCalculateShiftHours,
} = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockSelect: vi.fn(),
  mockFindFirst: vi.fn(),
  mockCalculateShiftHours: vi.fn().mockReturnValue(3),
}))

vi.mock('@/services/db', () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
    query: {
      caregiverProfiles: { findFirst: mockFindFirst },
    },
  },
}))

vi.mock('@/db/schema', () => ({
  shifts:            { id: 'shifts.id', jobId: 'shifts.jobId', status: 'shifts.status', date: 'shifts.date', startTime: 'shifts.startTime', endTime: 'shifts.endTime' },
  jobs:              { id: 'jobs.id', caregiverId: 'jobs.caregiverId', clientId: 'jobs.clientId' },
  users:             { id: 'users.id', name: 'users.name' },
  caregiverProfiles: { id: 'cg.id', userId: 'cg.userId' },
  notifications:     { userId: 'notif.userId', type: 'notif.type', payload: 'notif.payload' },
  payments:          {},
  disputes:          {},
}))

vi.mock('drizzle-orm', () => ({
  eq:  vi.fn((a, b) => ({ eq: [a, b] })),
  and: vi.fn((...args) => ({ and: args })),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/auth', () => ({ auth: vi.fn() }))

vi.mock('@/lib/shift-utils', () => ({
  calculateShiftHours: mockCalculateShiftHours,
}))

vi.mock('@/services/stripe', () => ({
  createPaymentIntent:         vi.fn(),
  createConnectAccount:        vi.fn(),
  createConnectAccountLink:    vi.fn(),
  getPaymentIntentCharge:      vi.fn(),
  createStripeCustomer:        vi.fn(),
  createSetupIntent:           vi.fn(),
  savePaymentMethodToCustomer: vi.fn(),
  getDefaultPaymentMethod:     vi.fn(),
  createAndPayInvoice:         vi.fn(),
  transferPayout:              vi.fn(),
}))

import { auth } from '@/auth'
import { completeShift } from '../actions'

const mockAuth = vi.mocked(auth)

describe('completeShift', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null as any)
    const result = await completeShift('shift-1')
    expect(result).toEqual({ error: 'Not authenticated' })
  })

  it('returns error when caregiver profile not found', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } } as any)
    mockFindFirst.mockResolvedValueOnce(null)
    const result = await completeShift('shift-1')
    expect(result).toEqual({ error: 'Caregiver profile not found' })
  })

  it('returns error when shift not found or not owned', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } } as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'profile-1', userId: 'user-1' })

    const mockOffset = vi.fn().mockResolvedValueOnce([])
    const mockLimit  = vi.fn().mockReturnValue({ offset: mockOffset })
    const mockWhere  = vi.fn().mockReturnValue({ limit: mockLimit })
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
    const mockFrom   = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
    mockSelect.mockReturnValueOnce({ from: mockFrom })

    const result = await completeShift('shift-1')
    expect(result).toEqual({ error: 'Not found' })
  })

  it('updates shift status to completed and inserts notification', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } } as any)
    mockFindFirst.mockResolvedValueOnce({ id: 'profile-1', userId: 'user-1' })
    mockCalculateShiftHours.mockReturnValue(3)

    // First select: shift found with clientId
    const mockOffset1 = vi.fn().mockResolvedValueOnce([
      { id: 'shift-1', date: '2026-04-21', startTime: '09:00', endTime: '12:00', clientId: 'client-1' },
    ])
    const mockLimit1 = vi.fn().mockReturnValue({ offset: mockOffset1 })
    const mockWhere1 = vi.fn().mockReturnValue({ limit: mockLimit1 })
    const mockInnerJoin1 = vi.fn().mockReturnValue({ where: mockWhere1 })
    const mockFrom1 = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin1 })

    // Second select: caregiver name
    const mockOffset2 = vi.fn().mockResolvedValueOnce([{ name: 'Margaret Collins' }])
    const mockLimit2 = vi.fn().mockReturnValue({ offset: mockOffset2 })
    const mockWhere2 = vi.fn().mockReturnValue({ limit: mockLimit2 })
    const mockFrom2 = vi.fn().mockReturnValue({ where: mockWhere2 })

    mockSelect
      .mockReturnValueOnce({ from: mockFrom1 })
      .mockReturnValueOnce({ from: mockFrom2 })

    const mockValues = vi.fn().mockResolvedValue(undefined)
    mockInsert.mockReturnValue({ values: mockValues })
    const mockWhereUpdate = vi.fn().mockResolvedValue(undefined)
    const mockSet = vi.fn().mockReturnValue({ where: mockWhereUpdate })
    mockUpdate.mockReturnValue({ set: mockSet })

    const result = await completeShift('shift-1')

    expect(mockUpdate).toHaveBeenCalledOnce()
    expect(mockInsert).toHaveBeenCalledOnce()
    const notifArg = mockValues.mock.calls[0][0]
    expect(notifArg.userId).toBe('client-1')
    expect(notifArg.type).toBe('shift_completed')
    expect(notifArg.payload.caregiverName).toBe('Margaret Collins')
    expect(notifArg.payload.hours).toBe(3)
    expect(notifArg.payload.date).toBe('2026-04-21')
    expect(result).toEqual({})
  })
})
