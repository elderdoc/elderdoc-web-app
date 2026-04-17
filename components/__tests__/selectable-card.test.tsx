import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SelectableCard } from '@/components/selectable-card'

describe('SelectableCard', () => {
  it('renders children', () => {
    render(
      <SelectableCard selected={false} onSelect={vi.fn()}>
        Personal Care
      </SelectableCard>
    )
    expect(screen.getByText('Personal Care')).toBeDefined()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(
      <SelectableCard selected={false} onSelect={onSelect}>
        Personal Care
      </SelectableCard>
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('shows checkmark when selected', () => {
    render(
      <SelectableCard selected={true} onSelect={vi.fn()}>
        Personal Care
      </SelectableCard>
    )
    expect(screen.getByTestId('check-icon')).toBeDefined()
  })

  it('does not show checkmark when not selected', () => {
    render(
      <SelectableCard selected={false} onSelect={vi.fn()}>
        Personal Care
      </SelectableCard>
    )
    expect(screen.queryByTestId('check-icon')).toBeNull()
  })

  it('does not call onSelect when disabled', () => {
    const onSelect = vi.fn()
    render(
      <SelectableCard selected={false} onSelect={onSelect} disabled>
        Personal Care
      </SelectableCard>
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
