// Stub — full implementation in Task 8
export function CareRecipientModal({ onRecipientCreated, triggerLabel }: {
  onRecipientCreated?: (id: string, name: string) => void
  triggerLabel?: string
} = {}) {
  return (
    <button
      type="button"
      className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
    >
      {triggerLabel ?? '+ Add Recipient'}
    </button>
  )
}
