import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))

const { mockSelectChain, mockMutateChain, mockDb, mockTx } = vi.hoisted(() => {
  const mockSelectChain = {
    from:      vi.fn(),
    where:     vi.fn(),
    innerJoin: vi.fn(),
  }
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockResolvedValue([])

  const mockMutateChain = {
    values:    vi.fn(),
    returning: vi.fn(),
    set:       vi.fn(),
    where:     vi.fn(),
  }
  mockMutateChain.values.mockReturnValue(mockMutateChain)
  mockMutateChain.returning.mockResolvedValue([{ id: 'new-id' }])
  mockMutateChain.set.mockReturnValue(mockMutateChain)
  mockMutateChain.where.mockResolvedValue(undefined)

  const mockTx = {
    insert: vi.fn().mockReturnValue(mockMutateChain),
    update: vi.fn().mockReturnValue(mockMutateChain),
    select: vi.fn().mockReturnValue(mockSelectChain),
  }

  const mockDb = {
    insert:      vi.fn().mockReturnValue(mockMutateChain),
    update:      vi.fn().mockReturnValue(mockMutateChain),
    select:      vi.fn().mockReturnValue(mockSelectChain),
    transaction: vi.fn().mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
    query: {
      caregiverProfiles: { findFirst: vi.fn() },
    },
  }
  return { mockSelectChain, mockMutateChain, mockDb, mockTx }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { auth } from '@/auth'
import { applyToRequest, acceptOffer, declineOffer } from '../actions'

const mockAuth = vi.mocked(auth)
const SESSION = { user: { id: 'user-1', email: 'a@b.com', name: 'Test', role: 'caregiver' } }
const PROFILE = { id: 'profile-1', userId: 'user-1' }

beforeEach(() => {
  vi.clearAllMocks()
  mockSelectChain.from.mockReturnValue(mockSelectChain)
  mockSelectChain.innerJoin.mockReturnValue(mockSelectChain)
  mockSelectChain.where.mockResolvedValue([])
  mockMutateChain.values.mockReturnValue(mockMutateChain)
  mockMutateChain.returning.mockResolvedValue([{ id: 'new-id' }])
  mockMutateChain.set.mockReturnValue(mockMutateChain)
  mockMutateChain.where.mockResolvedValue(undefined)
  mockDb.insert.mockReturnValue(mockMutateChain)
  mockDb.update.mockReturnValue(mockMutateChain)
  mockDb.select.mockReturnValue(mockSelectChain)
  mockTx.insert.mockReturnValue(mockMutateChain)
  mockTx.update.mockReturnValue(mockMutateChain)
  mockTx.select.mockReturnValue(mockSelectChain)
  mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx))
})

describe('applyToRequest', () => {
  it('throws Unauthorized with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(applyToRequest('req-1', 'note')).rejects.toThrow('Unauthorized')
  })

  it('throws if profile not found', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(null)
    await expect(applyToRequest('req-1', 'note')).rejects.toThrow('Profile not found')
  })

  it('inserts to jobApplications with correct fields', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
    mockSelectChain.where
      .mockResolvedValueOnce([])                     // no existing application
      .mockResolvedValueOnce([{ status: 'active' }]) // careRequest is active
    await applyToRequest('req-1', 'I am available weekends')
    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockMutateChain.values).toHaveBeenCalledWith(expect.objectContaining({
      requestId:   'req-1',
      caregiverId: 'profile-1',
      coverNote:   'I am available weekends',
      status:      'pending',
    }))
  })

  it('throws Already applied if application exists', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
    mockSelectChain.where.mockResolvedValueOnce([{ id: 'existing-app' }])
    await expect(applyToRequest('req-1', 'note')).rejects.toThrow('Already applied')
  })

  it('throws Request not available if careRequest is not active', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
    mockSelectChain.where
      .mockResolvedValueOnce([])                        // no existing application
      .mockResolvedValueOnce([{ status: 'cancelled' }]) // careRequest is not active
    await expect(applyToRequest('req-1', 'note')).rejects.toThrow('Request not available')
  })
})

describe('acceptOffer', () => {
  it('throws Unauthorized with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(acceptOffer('match-1')).rejects.toThrow('Unauthorized')
  })

  it('runs transaction: inserts job and updates match to accepted', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
    mockSelectChain.where
      .mockResolvedValueOnce([{ requestId: 'req-1', caregiverId: 'profile-1' }])
      .mockResolvedValueOnce([{ clientId: 'client-1' }])
    await acceptOffer('match-1')
    expect(mockTx.insert).toHaveBeenCalled()
    expect(mockMutateChain.values).toHaveBeenCalledWith(expect.objectContaining({
      matchId:     'match-1',
      requestId:   'req-1',
      caregiverId: 'profile-1',
      clientId:    'client-1',
      status:      'active',
    }))
    expect(mockTx.update).toHaveBeenCalled()
    expect(mockMutateChain.set).toHaveBeenCalledWith({ status: 'accepted' })
  })

  it('throws Unauthorized if match belongs to another caregiver', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
    mockSelectChain.where
      .mockResolvedValueOnce([{ requestId: 'req-1', caregiverId: 'other-profile' }])
    await expect(acceptOffer('match-1')).rejects.toThrow('Unauthorized')
  })

  it('throws Unauthorized if match is not found', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
    mockSelectChain.where.mockResolvedValueOnce([]) // no match found
    await expect(acceptOffer('match-1')).rejects.toThrow('Unauthorized')
  })
})

describe('declineOffer', () => {
  it('throws Unauthorized with no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(declineOffer('match-1')).rejects.toThrow('Unauthorized')
  })

  it('updates match status to declined', async () => {
    mockAuth.mockResolvedValue(SESSION as any)
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
    await declineOffer('match-1')
    expect(mockDb.update).toHaveBeenCalled()
    expect(mockMutateChain.set).toHaveBeenCalledWith({ status: 'declined' })
  })
})
