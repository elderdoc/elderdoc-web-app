import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSingleSelect, useMultiSelect } from '@/hooks/use-selectable'

describe('useSingleSelect', () => {
  it('starts with no selection when no initial value', () => {
    const { result } = renderHook(() => useSingleSelect<string>())
    expect(result.current.selected).toBeUndefined()
  })

  it('starts with initial value when provided', () => {
    const { result } = renderHook(() => useSingleSelect('parent'))
    expect(result.current.selected).toBe('parent')
  })

  it('updates selected value on select', () => {
    const { result } = renderHook(() => useSingleSelect<string>())
    act(() => result.current.select('spouse'))
    expect(result.current.selected).toBe('spouse')
  })

  it('replaces previous selection', () => {
    const { result } = renderHook(() => useSingleSelect<string>())
    act(() => result.current.select('parent'))
    act(() => result.current.select('sibling'))
    expect(result.current.selected).toBe('sibling')
  })

  it('isSelected returns true for selected value', () => {
    const { result } = renderHook(() => useSingleSelect('parent'))
    expect(result.current.isSelected('parent')).toBe(true)
    expect(result.current.isSelected('sibling')).toBe(false)
  })
})

describe('useMultiSelect', () => {
  it('starts empty by default', () => {
    const { result } = renderHook(() => useMultiSelect<string>())
    expect(result.current.selected).toEqual([])
  })

  it('starts with initial values', () => {
    const { result } = renderHook(() => useMultiSelect(['a', 'b']))
    expect(result.current.selected).toEqual(['a', 'b'])
  })

  it('adds a value on toggle when not selected', () => {
    const { result } = renderHook(() => useMultiSelect<string>())
    act(() => result.current.toggle('personal-care'))
    expect(result.current.selected).toEqual(['personal-care'])
  })

  it('removes a value on toggle when already selected', () => {
    const { result } = renderHook(() => useMultiSelect(['personal-care']))
    act(() => result.current.toggle('personal-care'))
    expect(result.current.selected).toEqual([])
  })

  it('isSelected returns true only for selected values', () => {
    const { result } = renderHook(() => useMultiSelect(['a']))
    expect(result.current.isSelected('a')).toBe(true)
    expect(result.current.isSelected('b')).toBe(false)
  })
})
