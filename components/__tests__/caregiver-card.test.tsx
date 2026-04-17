import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CaregiverCard } from '@/components/caregiver-card'

const mockCaregiver = {
  id: 'cg-1',
  name: 'Maria Garcia',
  image: null,
  headline: 'Compassionate caregiver with 5 years experience.',
  careTypes: ['personal-care', 'companionship'],
  city: 'Austin',
  state: 'Texas',
  hourlyMin: '22',
  hourlyMax: '30',
}

describe('CaregiverCard', () => {
  it('renders caregiver name', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('Maria Garcia')).toBeDefined()
  })

  it('renders headline', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('Compassionate caregiver with 5 years experience.')).toBeDefined()
  })

  it('renders care type labels', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('Personal Care')).toBeDefined()
    expect(screen.getByText('Companionship')).toBeDefined()
  })

  it('renders location', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('Austin, Texas')).toBeDefined()
  })

  it('renders hourly rate', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('$22–$30/hr')).toBeDefined()
  })

  it('calls onSendOffer when button clicked', () => {
    const onSendOffer = vi.fn()
    render(<CaregiverCard caregiver={mockCaregiver} onSendOffer={onSendOffer} />)
    fireEvent.click(screen.getByRole('button', { name: /send offer/i }))
    expect(onSendOffer).toHaveBeenCalledOnce()
  })

  it('shows initials in avatar when no image', () => {
    render(<CaregiverCard caregiver={mockCaregiver} />)
    expect(screen.getByText('MG')).toBeDefined()
  })

  it('shows fallback name when name is null', () => {
    render(<CaregiverCard caregiver={{ ...mockCaregiver, name: null }} />)
    expect(screen.getByText('Anonymous Caregiver')).toBeDefined()
  })

  it('shows single initial for single-word name', () => {
    render(<CaregiverCard caregiver={{ ...mockCaregiver, name: 'Madonna' }} />)
    expect(screen.getByText('M')).toBeDefined()
  })
})
