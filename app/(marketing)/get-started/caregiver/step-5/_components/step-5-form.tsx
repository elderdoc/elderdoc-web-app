'use client'

import { useState, useTransition, useRef } from 'react'
import { SelectableCard } from '@/components/selectable-card'
import { CaregiverStepShell } from '../../_components/caregiver-step-shell'
import { HEADLINE_TEMPLATES } from '@/lib/constants'
import { saveCaregiverStep5 } from '@/domains/caregivers/onboarding'
import { formatUSPhone } from '@/lib/phone'

const labelClass = 'block text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1.5'
const inputClass =
  'w-full rounded-[8px] border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20'

interface Props {
  initialName: string
  initialPhone: string
  initialHeadline: string
  initialAbout: string
  initialPhotoUrl: string | null
}

export function Step5Form({
  initialName, initialPhone, initialHeadline, initialAbout, initialPhotoUrl,
}: Props) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [headline, setHeadline] = useState(initialHeadline)
  const [about, setAbout] = useState(initialAbout)
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl)
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialPhotoUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()
      setPhotoUrl(url)
      setPhotoPreview(URL.createObjectURL(file))
    } catch {
      // photo is optional — silently fail
    } finally {
      setIsUploading(false)
    }
  }

  const isValid = name.trim().length > 0 && phone.trim().length > 0 && headline.trim().length > 0 && about.trim().length > 0

  function handleComplete() {
    if (!isValid) return
    startTransition(async () => {
      await saveCaregiverStep5({
        name,
        phone,
        headline,
        about,
        photoUrl: photoUrl ?? undefined,
      })
    })
  }

  return (
    <CaregiverStepShell
      currentStep={5}
      title="Build your profile"
      subtitle="This is what families will see when they find you."
      backHref="/get-started/caregiver/step-4"
    >
      <div className="mx-auto max-w-lg space-y-8">
        {/* Photo */}
        <section>
          <p className={labelClass}>
            Photo{' '}
            <span className="normal-case font-normal text-muted-foreground/60">(optional)</span>
          </p>
          <div className="flex items-center gap-4">
            <div
              className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border bg-muted transition-colors hover:border-primary/50"
              onClick={() => fileRef.current?.click()}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile preview"
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 16a4 4 0 100-8 4 4 0 000 8zM3 9a2 2 0 012-2h1.5L8 5h8l1.5 2H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"/>
                </svg>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
              >
                {isUploading ? 'Uploading…' : photoPreview ? 'Change photo' : 'Upload photo'}
              </button>
              <p className="mt-0.5 text-xs text-muted-foreground">JPG, PNG up to 5MB</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </section>

        {/* Name */}
        <section>
          <label className={labelClass}>Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Maria Garcia"
            className={inputClass}
          />
        </section>

        {/* Phone */}
        <section>
          <label className={labelClass}>Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(formatUSPhone(e.target.value))}
            placeholder="(555) 123-4567"
            className={inputClass}
          />
        </section>

        {/* Headline */}
        <section>
          <p className={labelClass}>Headline</p>
          <div className="space-y-2">
            {HEADLINE_TEMPLATES.map(template => (
              <SelectableCard
                key={template}
                selected={headline === template}
                onSelect={() => setHeadline(template)}
              >
                <span className="text-sm text-foreground">{template}</span>
              </SelectableCard>
            ))}
          </div>
          <div className="mt-3">
            <label className="mb-1.5 block text-xs text-muted-foreground">
              Edit or write your own (max 150 characters)
            </label>
            <input
              type="text"
              value={headline}
              maxLength={150}
              onChange={e => setHeadline(e.target.value)}
              placeholder="Describe yourself in one sentence…"
              className={inputClass}
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">
              {headline.length}/150
            </p>
          </div>
        </section>

        {/* About */}
        <section>
          <label className={labelClass}>About You</label>
          <textarea
            value={about}
            onChange={e => setAbout(e.target.value)}
            maxLength={500}
            rows={5}
            placeholder="Share your caregiving philosophy, experience, and what makes you a great caregiver…"
            className={`${inputClass} resize-none`}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {about.length}/500
          </p>
        </section>
      </div>

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          disabled={!isValid || isPending || isUploading}
          onClick={handleComplete}
          className="rounded-[8px] bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? 'Creating your profile…' : 'Complete Profile'}
        </button>
      </div>
    </CaregiverStepShell>
  )
}
