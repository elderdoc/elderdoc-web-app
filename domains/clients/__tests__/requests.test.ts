import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

const { mockChain, mockDb } = vi.hoisted(() => {
  const mockChain = {
    values:   vi.fn(),
    returning: vi.fn(),
    where:    vi.fn(),
    set:      vi.fn(),
  }
  mockChain.values.mockReturnValue(mockChain)
  mockChain.returning.mockResolvedValue([{ id: 'new-id' }])
  mockChain.where.mockResolvedValue(undefined)
  mockChain.set.mockReturnValue(mockChain)

  const mockDb = {
    insert: vi.fn().mockReturnValue(mockChain),
  }
  return { mockChain, mockDb }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { auth } from '@/auth'
import { createCareRecipient, createCareRequest } from '../requests'

const mockAuth = vi.mocked(auth)
const SESSION = { user: { id: 'user-1', email: 'a@b.com', name: 'Test', role: 'client' } }

beforeEach(() => {
  vi.clearAllMocks()
  mockChain.values.mockReturnValue(mockChain)
  mockChain.returning.mockResolvedValue([{ id: 'new-id' }])
  mockChain.where.mockResolvedValue(undefined)
  mockChain.set.mockReturnValue(mockChain)
  mockDb.insert.mockReturnValue(mockChain)
})

describe('createCareRecipient', () => {
  it('throws Unauthorized with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(createCareRecipient({
      relationship: 'parent', name: 'Jane', conditions: [],
    })).rejects.toThrow('Unauthorized')
  })

  it('inserts to careRecipients with correct fields', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    await createCareRecipient({
      relationship: 'parent', name: 'Jane', dob: '01/01/1940',
      phone: '555-1234', gender: 'female', conditions: ['diabetes'],
      mobilityLevel: 'independent', notes: 'Likes cats',
    })
    expect(mockDb.insert).toHaveBeenCalledOnce()
    const insertCall = mockChain.values.mock.calls[0][0]
    expect(insertCall.clientId).toBe('user-1')
    expect(insertCall.name).toBe('Jane')
    expect(insertCall.relationship).toBe('parent')
    expect(insertCall.conditions).toEqual(['diabetes'])
  })

  it('returns the new record id', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    const result = await createCareRecipient({ relationship: 'parent', name: 'Jane', conditions: [] })
    expect(result).toEqual({ id: 'new-id' })
  })
})

describe('createCareRequest', () => {
  const BASE = {
    recipientId: 'rec-1', careType: 'personal-care',
    address: { address1: '123 Main St', city: 'Austin', state: 'Texas' },
    frequency: 'weekly', days: ['monday'], shifts: ['morning'],
    startDate: '2026-05-01', durationHours: 4,
    languagePref: ['english'], title: 'Help for Mom', description: 'Desc',
  }

  it('throws Unauthorized with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(createCareRequest(BASE)).rejects.toThrow('Unauthorized')
  })

  it('inserts to careRequests with status active', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    await createCareRequest(BASE)
    const firstInsertValues = mockChain.values.mock.calls[0][0]
    expect(firstInsertValues.status).toBe('active')
    expect(firstInsertValues.clientId).toBe('user-1')
    expect(firstInsertValues.title).toBe('Help for Mom')
  })

  it('inserts to careRequestLocations', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    await createCareRequest(BASE)
    expect(mockDb.insert).toHaveBeenCalledTimes(2)
  })

  it('returns the new request id', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    const result = await createCareRequest(BASE)
    expect(result).toEqual({ id: 'new-id' })
  })
})
