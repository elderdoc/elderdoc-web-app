import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StepProgress } from '@/components/step-progress'

const steps = [
  { label: 'Who needs care' },
  { label: 'Type of care' },
  { label: 'Location' },
  { label: 'Preview' },
]

describe('StepProgress', () => {
  it('renders all step labels', () => {
    render(<StepProgress steps={steps} currentStep={1} />)
    steps.forEach(s => expect(screen.getByText(s.label)).toBeDefined())
  })

  it('marks completed steps', () => {
    render(<StepProgress steps={steps} currentStep={3} />)
    const completed = screen.getAllByTestId('step-completed')
    expect(completed).toHaveLength(2)
  })

  it('marks the current step as active', () => {
    render(<StepProgress steps={steps} currentStep={2} />)
    expect(screen.getByTestId('step-active')).toBeDefined()
  })
})
