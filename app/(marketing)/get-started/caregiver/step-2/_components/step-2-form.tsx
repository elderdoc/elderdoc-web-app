'use client'

import { useState, useTransition } from 'react'
import { SelectableCard } from '@/components/selectable-card'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { CERTIFICATIONS, LANGUAGES, EDUCATION_OPTIONS } from '@/lib/constants'
import { EXPERIENCE_OPTIONS } from '@/lib/rate-defaults'
import { saveCaregiverStep2 } from '@/domains/caregivers/onboarding'

const labelClass = 'block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-3'

interface Props {
  initialExperience: string
  initialCertifications: string[]
  initialLanguages: string[]
  initialEducation: string
}

export function Step2Form({
  initialExperience,
  initialCertifications,
  initialLanguages,
  initialEducation,
}: Props) {
  const [experience, setExperience] = useState(initialExperience)
  const [certifications, setCertifications] = useState<string[]>(initialCertifications)
  const [languages, setLanguages] = useState<string[]>(initialLanguages)
  const [education, setEducation] = useState(initialEducation)
  const [isPending, startTransition] = useTransition()

  function toggleCert(key: string) {
    setCertifications(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function toggleLang(key: string) {
    setLanguages(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const isValid = experience.length > 0 && education.length > 0

  function handleContinue() {
    if (!isValid) return
    startTransition(async () => {
      await saveCaregiverStep2({ experience, certifications, languages, education })
    })
  }

  return (
    <CaregiverStepShell
      currentStep={2}
      title="Tell us about your background"
      subtitle="This helps families find the right fit."
      backHref="/get-started/caregiver/step-1"
    >
      <div className="space-y-10">
        {/* Experience */}
        <section>
          <p className={labelClass}>Years of Experience</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EXPERIENCE_OPTIONS.map(({ key, label }) => (
              <SelectableCard
                key={key}
                selected={experience === key}
                onSelect={() => setExperience(key)}
              >
                <span className="text-[15px] font-medium text-foreground">{label}</span>
              </SelectableCard>
            ))}
          </div>
        </section>

        {/* Certifications */}
        <section>
          <p className={labelClass}>Certifications <span className="normal-case font-normal text-muted-foreground/60">(optional)</span></p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CERTIFICATIONS.map(({ key, label }) => (
              <SelectableCard
                key={key}
                selected={certifications.includes(key)}
                onSelect={() => toggleCert(key)}
              >
                <span className="text-[15px] font-medium text-foreground">{label}</span>
              </SelectableCard>
            ))}
          </div>
        </section>

        {/* Languages */}
        <section>
          <p className={labelClass}>Languages Spoken <span className="normal-case font-normal text-muted-foreground/60">(optional)</span></p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LANGUAGES.map(({ key, label }) => (
              <SelectableCard
                key={key}
                selected={languages.includes(key)}
                onSelect={() => toggleLang(key)}
              >
                <span className="text-[15px] font-medium text-foreground">{label}</span>
              </SelectableCard>
            ))}
          </div>
        </section>

        {/* Education */}
        <section>
          <p className={labelClass}>Highest Education</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EDUCATION_OPTIONS.map(({ key, label }) => (
              <SelectableCard
                key={key}
                selected={education === key}
                onSelect={() => setEducation(key)}
              >
                <span className="text-[15px] font-medium text-foreground">{label}</span>
              </SelectableCard>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          disabled={!isValid || isPending}
          onClick={handleContinue}
          className="h-12 rounded-full bg-primary px-6 text-[14px] font-medium text-primary-foreground transition-all hover:bg-[var(--forest-deep)] hover:shadow-[0_10px_24px_-8px_rgba(15,77,52,0.4)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving\u2026' : 'Continue'}
        </button>
      </div>
    </CaregiverStepShell>
  )
}
