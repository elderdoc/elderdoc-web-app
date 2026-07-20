import { auth } from '@/auth'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { getAppKnowledge, type AppKnowledge } from '@/lib/knowledge-cache'

function buildSystemPrompt(k: AppKnowledge | null): string {
  const sections = k
    ? [
        `## About Elderdoc\n${k.about}`,
        `## How It Works\n${k.howItWorks}`,
        `## Pricing & Billing\n${k.pricingAndBilling}`,
        `## For Caregivers\n${k.forCaregivers}`,
        `## For Clients\n${k.forClients}`,
        `## Frequently Asked Questions\n${k.faqs}`,
        `## Support\n${k.support}`,
      ].join('\n\n')
    : 'No knowledge base available at this time.'

  return `You are a helpful support assistant for Elderdoc, a home care platform that connects families with professional caregivers.

Answer ONLY questions related to Elderdoc — how the platform works, pricing, caregivers, clients, billing, scheduling, and support. If asked about anything unrelated to Elderdoc, politely explain that you can only help with Elderdoc-related questions and invite them to ask something about the platform.

Use the following information to answer questions accurately:

${sections}`
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { messages }: { messages: UIMessage[] } = await req.json()
  const knowledge = await getAppKnowledge()

  const result = streamText({
    model: openai('gpt-4o-mini'),
    system: buildSystemPrompt(knowledge),
    messages: await convertToModelMessages(messages),
  })

  return result.toTextStreamResponse()
}
