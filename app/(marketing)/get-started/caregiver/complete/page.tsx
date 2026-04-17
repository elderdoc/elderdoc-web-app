import Link from 'next/link'

export default function CaregiverComplete() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        {/* Animated checkmark */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
            className="checkmark"
          >
            <style>{`
              .caregiver-complete-checkmark {
                stroke-dasharray: 50;
                stroke-dashoffset: 50;
                animation: draw 0.5s ease-out 0.2s forwards;
              }
              @keyframes draw {
                to { stroke-dashoffset: 0; }
              }
            `}</style>
            <path
              className="caregiver-complete-checkmark"
              d="M10 21l8 8 14-16"
              stroke="#1A6B4A"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-foreground">
          Welcome to ElderDoc.
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          Your profile is live. Families are looking for caregivers like you.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/caregiver/dashboard"
            className="inline-flex items-center justify-center rounded-[8px] bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Go to My Dashboard
          </Link>
          <Link
            href="/caregiver/dashboard"
            className="inline-flex items-center justify-center rounded-[8px] border border-border bg-card px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Complete My Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
