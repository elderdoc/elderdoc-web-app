import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))

const PROFILE = { id: 'profile-1', userId: 'user-1', completedStep: 0, status: 'pending' as const }

// Chainable Drizzle mock — must be hoisted so vi.mock factory can reference them
const { mockChain, mockDb } = vi.hoisted(() => {
  const mockChain = {
    values: vi.fn(),
    returning: vi.fn(),
    where: vi.fn(),
    set: vi.fn(),
    onConflictDoUpdate: vi.fn(),
  }
  mockChain.values.mockReturnValue(mockChain)
  mockChain.returning.mockResolvedValue([{ id: 'profile-1', userId: 'user-1', completedStep: 0, status: 'pending' }])
  mockChain.where.mockResolvedValue(undefined)
  mockChain.set.mockReturnValue(mockChain)
  mockChain.onConflictDoUpdate.mockResolvedValue(undefined)

  const mockDb = {
    query: { caregiverProfiles: { findFirst: vi.fn() } },
    insert: vi.fn().mockReturnValue(mockChain),
    update: vi.fn().mockReturnValue(mockChain),
    delete: vi.fn().mockReturnValue(mockChain),
  }
  return { mockChain, mockDb }
})

vi.mock('@/services/db', () => ({ db: mockDb }))

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import {
  saveCaregiverStep1,
  saveCaregiverStep2,
  saveCaregiverStep3,
  saveCaregiverStep4,
  saveCaregiverStep5,
} from '../onboarding'

const mockAuth = vi.mocked(auth)
const mockRedirect = vi.mocked(redirect)
const SESSION = { user: { id: 'user-1', email: 'test@example.com', name: 'Test' } }

beforeEach(() => {
  vi.clearAllMocks()
  mockChain.values.mockReturnValue(mockChain)
  mockChain.returning.mockResolvedValue([PROFILE])
  mockChain.where.mockResolvedValue(undefined)
  mockChain.set.mockReturnValue(mockChain)
  mockChain.onConflictDoUpdate.mockResolvedValue(undefined)
  mockDb.insert.mockReturnValue(mockChain)
  mockDb.update.mockReturnValue(mockChain)
  mockDb.delete.mockReturnValue(mockChain)
  mockAuth.mockResolvedValue(SESSION as any)
  mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(PROFILE)
})

// saveCaregiverStep1
describe('saveCaregiverStep1', () => {
  it('throws Unauthorized when no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(saveCaregiverStep1(['personal-care'])).rejects.toThrow('Unauthorized')
  })

  it('creates profile if none exists', async () => {
    mockDb.query.caregiverProfiles.findFirst.mockResolvedValue(undefined)
    await saveCaregiverStep1(['personal-care'])
    // insert is called (for the new profile + care types)
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('deletes existing care types before inserting', async () => {
    await saveCaregiverStep1(['companionship'])
    expect(mockDb.delete).toHaveBeenCalled()
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('redirects to step-2', async () => {
    await saveCaregiverStep1(['personal-care'])
    expect(mockRedirect).toHaveBeenCalledWith('/get-started/caregiver/step-2')
  })

  it('skips insert when care types array is empty', async () => {
    await saveCaregiverStep1([])
    expect(mockDb.delete).toHaveBeenCalled()
    // insert called for completedStep update only — not for care types
    const insertCalls = mockDb.insert.mock.calls.length
    // delete care types + update profile = 1 delete + 1 update (no insert for empty array)
    expect(insertCalls).toBe(0)
  })
})

// saveCaregiverStep2
describe('saveCaregiverStep2', () => {
  const DATA = {
    experience: '3-5',
    certifications: ['cna', 'hha'],
    languages: ['english', 'spanish'],
    education: 'bachelors',
  }

  it('throws Unauthorized when no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(saveCaregiverStep2(DATA)).rejects.toThrow('Unauthorized')
  })

  it('updates profile with experience and education', async () => {
    await saveCaregiverStep2(DATA)
    expect(mockDb.update).toHaveBeenCalled()
    expect(mockChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ experience: '3-5', education: 'bachelors', completedStep: 2 })
    )
  })

  it('replaces certifications', async () => {
    await saveCaregiverStep2(DATA)
    expect(mockDb.delete).toHaveBeenCalled()
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('redirects to step-3', async () => {
    await saveCaregiverStep2(DATA)
    expect(mockRedirect).toHaveBeenCalledWith('/get-started/caregiver/step-3')
  })
})

// saveCaregiverStep3
describe('saveCaregiverStep3', () => {
  const DATA = {
    workTypes: ['full-time', 'flexible'],
    availability: [{ day: 'monday', startTime: '09:00', endTime: '17:00' }],
    startAvailability: 'immediately',
  }

  it('throws Unauthorized when no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(saveCaregiverStep3(DATA)).rejects.toThrow('Unauthorized')
  })

  it('deletes and re-inserts work prefs', async () => {
    await saveCaregiverStep3(DATA)
    expect(mockDb.delete).toHaveBeenCalled()
    expect(mockDb.insert).toHaveBeenCalled()
  })

  it('redirects to step-4', async () => {
    await saveCaregiverStep3(DATA)
    expect(mockRedirect).toHaveBeenCalledWith('/get-started/caregiver/step-4')
  })
})

// saveCaregiverStep4
describe('saveCaregiverStep4', () => {
  const DATA = {
    address1: '123 Main St',
    address2: '',
    city: 'Austin',
    state: 'Texas',
    travelDistances: [10, 20],
    relocatable: false,
    hourlyMin: '22',
    hourlyMax: '30',
  }

  it('throws Unauthorized when no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(saveCaregiverStep4(DATA)).rejects.toThrow('Unauthorized')
  })

  it('upserts location and updates profile rate', async () => {
    await saveCaregiverStep4(DATA)
    expect(mockDb.insert).toHaveBeenCalled()
    expect(mockDb.update).toHaveBeenCalled()
  })

  it('redirects to step-5', async () => {
    await saveCaregiverStep4(DATA)
    expect(mockRedirect).toHaveBeenCalledWith('/get-started/caregiver/step-5')
  })
})

// saveCaregiverStep5
describe('saveCaregiverStep5', () => {
  const DATA = {
    name: 'Maria Garcia',
    phone: '5551234567',
    headline: 'Compassionate caregiver dedicated to improving quality of life for seniors.',
    about: 'I have 5 years of experience.',
    photoUrl: undefined,
  }

  it('throws Unauthorized when no session', async () => {
    mockAuth.mockResolvedValue(null as any)
    await expect(saveCaregiverStep5(DATA)).rejects.toThrow('Unauthorized')
  })

  it('sets profile status to active and completedStep to 5', async () => {
    await saveCaregiverStep5(DATA)
    expect(mockChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active', completedStep: 5 })
    )
  })

  it('sets users.role to caregiver', async () => {
    await saveCaregiverStep5(DATA)
    expect(mockChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'caregiver' })
    )
  })

  it('redirects to complete screen', async () => {
    await saveCaregiverStep5(DATA)
    expect(mockRedirect).toHaveBeenCalledWith('/get-started/caregiver/complete')
  })
})
