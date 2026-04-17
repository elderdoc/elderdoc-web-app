// Stub — full implementation in Task 9
interface RecipientOption {
  id: string
  name: string
  relationship: string | null
  photoUrl: string | null
}

export function CareRequestModal({ recipients }: { recipients: RecipientOption[] }) {
  return (
    <button
      type="button"
      className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
    >
      + Care Request
    </button>
  )
}
