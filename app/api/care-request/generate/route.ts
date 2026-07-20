import { auth } from '@/auth'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

interface CareRequestGenerateInput {
  careType: string
  conditions: string[]
  mobilityLevel?: string
  height?: string
  weight?: string
  clientStatus?: Record<string, boolean | string>
  frequency: string
  days: string[]
  shifts: string[]
  languages: string[]
  budgetType?: string
  budgetAmount?: string
  suppliesNeeded?: string
  infectionControl?: Record<string, boolean>
  safetyMeasures?: Record<string, boolean>
  careRequestClientStatus?: Record<string, boolean | string>
}

function buildPrompt(data: CareRequestGenerateInput): string {
  const lines: string[] = [
    `Care type: ${data.careType}`,
    `Conditions: ${data.conditions.join(', ') || 'none listed'}`,
    `Mobility level: ${data.mobilityLevel || 'not specified'}`,
  ]

  if (data.height || data.weight) {
    lines.push(`Recipient: ${[data.height, data.weight].filter(Boolean).join(', ')}`)
  }

  const statusFlags: string[] = []
  const allStatus = { ...(data.clientStatus ?? {}), ...(data.careRequestClientStatus ?? {}) }
  if (allStatus.bedBound)        statusFlags.push('bed bound')
  if (allStatus.upAsTolerated)   statusFlags.push('up as tolerated')
  if (allStatus.livesAlone)      statusFlags.push('lives alone')
  if (allStatus.aloneDuringDay)  statusFlags.push('alone during the day')
  if (allStatus.hardOfHearing)   statusFlags.push('hard of hearing')
  if (allStatus.visionProblem)   statusFlags.push('vision impairment')
  if (allStatus.amputee)         statusFlags.push('amputee')
  if (allStatus.speechProblems)  statusFlags.push('speech problems')
  if (allStatus.diabetic)        statusFlags.push('diabetic')
  if (allStatus.urinaryCath)     statusFlags.push('urinary catheter')
  if (allStatus.feedingTube)     statusFlags.push('feeding tube')
  if (allStatus.confused)        statusFlags.push('confused')
  if (allStatus.forgetful)       statusFlags.push('forgetful')
  if (statusFlags.length > 0) lines.push(`Status: ${statusFlags.join(', ')}`)

  lines.push(`Schedule: ${data.frequency}, ${data.days.join('/')} ${data.shifts.join('/')}`)
  lines.push(`Language preference: ${data.languages.join(', ') || 'none'}`)
  lines.push(`Budget: ${data.budgetType ?? ''} ${data.budgetAmount ? `$${data.budgetAmount}` : ''}`)

  if (data.suppliesNeeded) {
    lines.push(`Supplies needed: ${data.suppliesNeeded}`)
  }

  const icFlags = Object.entries(data.infectionControl ?? {}).filter(([, v]) => v).map(([k]) => k)
  if (icFlags.length > 0) lines.push(`Infection control: ${icFlags.join(', ')}`)

  const smFlags = Object.entries(data.safetyMeasures ?? {}).filter(([, v]) => v).map(([k]) => k)
  if (smFlags.length > 0) lines.push(`Safety measures: ${smFlags.join(', ')}`)

  return lines.join('\n')
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body: CareRequestGenerateInput = await req.json()
  const prompt = buildPrompt(body)

  const result = streamText({
    model: openai('gpt-4o'),
    prompt,
    system: `You are writing a care request posting for a home care platform.
Output exactly two lines:
TITLE: <one sentence, max 100 characters>
DESCRIPTION: <2-3 sentences describing the care needed, incorporating the recipient's specific conditions, status, and any clinical needs, max 500 characters>
Be warm, specific, and professional. Reference concrete details from the input (conditions, status flags, supplies, infection control, safety needs) to make the posting informative and accurate.`,
  })

  return result.toTextStreamResponse()
}
