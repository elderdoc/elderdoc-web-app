'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Heart, Users, Crown, UserPlus, UserCircle2, ArrowRight } from 'lucide-react'
import { SelectableCard } from '@/components/selectable-card'
import { StepShell } from '../_components/step-shell'
import { RELATIONSHIPS } from '@/lib/constants'

const RELATIONSHIP_META: Record<string, { icon: React.ReactNode; description: string }> = {
  'myself':       { icon: <User className="h-5 w-5" />,        description: 'I need care for myself' },
  'parent':       { icon: <Heart className="h-5 w-5" />,       description: 'Mom, dad, or stepparent' },
  'spouse':       { icon: <Users className="h-5 w-5" />,       description: 'Husband, wife, or partner' },
  'grandparent':  { icon: <Crown className="h-5 w-5" />,       description: 'Grandma or grandpa' },
  'sibling':      { icon: <UserPlus className="h-5 w-5" />,    description: 'Brother or sister' },
  'other-family': { icon: <UserCircle2 className="h-5 w-5" />, description: 'Aunt, uncle, in-law, or other' },
}

export default function ClientStep1() {
  const router = useRouter()
  const [selected, setSelected] = useState<string | undefined>()

  function handleContinue() {
    if (!selected) return
    router.push(`/get-started/client/step-2?relationship=${encodeURIComponent(selected)}`)
  }

  return (
    <StepShell
      currentStep={1}
      title="Who needs care?"
      subtitle="Select who you're finding care for."
      backHref="/get-started"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {RELATIONSHIPS.map(({ key, label }) => {
          const meta = RELATIONSHIP_META[key]
          return (
            <SelectableCard
              key={key}
              selected={selected === key}
              onSelect={() => setSelected(key)}
              icon={meta?.icon}
              description={meta?.description}
            >
              {label}
            </SelectableCard>
          )
        })}
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          disabled={!selected}
          onClick={handleContinue}
          className="group/cta inline-flex h-12 items-center gap-2 rounded-full bg-primary pl-6 pr-5 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          Continue
          <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
        </button>
      </div>
    </StepShell>
  )
}
