/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only')

vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidateTag: vi.fn(),
}))

vi.mock('@/services/db', () => {
  const orderBy = vi.fn()
  const where = vi.fn(() => ({ orderBy }))
  const from = vi.fn(() => ({ where }))
  const select = vi.fn(() => ({ from }))
  return {
    db: { select },
    __mocks: { select, from, where, orderBy },
  }
})

import { getActiveCareTypes } from '../care-types'
import { careTypes } from '@/db/schema'
import * as dbModule from '@/services/db'

describe('getActiveCareTypes', () => {
  const mocks = (dbModule as any).__mocks

  beforeEach(() => {
    mocks.orderBy.mockReset()
    mocks.where.mockClear()
    mocks.from.mockClear()
    mocks.select.mockClear()
  })

  it('selects only active rows, ordered by createdAt asc', async () => {
    mocks.orderBy.mockResolvedValueOnce([
      { id: '1', key: 'personal-care', label: 'Personal Care', isActive: true, createdAt: new Date(0), updatedAt: new Date(0) },
    ])
    const result = await getActiveCareTypes()
    expect(mocks.select).toHaveBeenCalledWith()
    expect(mocks.from).toHaveBeenCalledWith(careTypes)
    expect(mocks.where).toHaveBeenCalledTimes(1)
    expect(mocks.orderBy).toHaveBeenCalledTimes(1)
    expect(result[0].key).toBe('personal-care')
  })
})
