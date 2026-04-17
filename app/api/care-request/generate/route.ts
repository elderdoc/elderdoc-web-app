import { auth } from '@/auth'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

interface CareRequestGenerateInput {
  careType: string
  recipientName: string
  conditions: string[]
  mobility?: string
  frequency: string
  days: string[]
  shifts: string[]
  duration: string
  languages: string[]
  budgetType?: string
  budgetAmount?: string
}

function buildPrompt(data: CareRequestGenerateInput): string {
  return `Care type: ${data.careType}
Recipient: ${data.recipientName}
Conditions: ${data.conditions.join(', ') || 'none listed'}
Mobility: ${data.mobility || 'not specified'}
Schedule: ${data.frequency}, ${data.days.join('/')} ${data.shifts.join('/')}
Duration: ${data.duration} hours
Language preference: ${data.languages.join(', ') || 'none'}
Budget: ${data.budgetType ?? ''} ${data.budgetAmount ? `$${data.budgetAmount}` : ''}`
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
DESCRIPTION: <2-3 sentences describing the care needed, max 500 characters>
Be warm, specific, and professional.`,
  })

  return result.toTextStreamResponse()
}
