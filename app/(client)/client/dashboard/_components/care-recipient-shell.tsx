'use client'

const STEPS = ['Relationship', 'Basic Info', 'Health & Mobility', 'Notes']

interface Props {
  currentStep: number
  title: string
  children: React.ReactNode
  onBack: () => void
  onNext?: () => void
  onSave?: () => void
  isSaving?: boolean
  nextDisabled?: boolean
}

export function CareRecipientShell({
  currentStep, title, children, onBack, onNext, onSave, isSaving, nextDisabled,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={[
              'flex-1 h-1 rounded-full transition-colors',
              i + 1 <= currentStep ? 'bg-primary' : 'bg-muted',
            ].join(' ')}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-1">Step {currentStep} of {STEPS.length}</p>
      <h2 className="text-xl font-semibold mb-6">{title}</h2>

      <div className="flex-1 overflow-y-auto">{children}</div>

      {/* Buttons */}
      <div className="flex justify-between pt-6 border-t border-border mt-6">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Back
        </button>
        {currentStep < STEPS.length ? (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : 'Save Recipient'}
          </button>
        )}
      </div>
    </div>
  )
}
