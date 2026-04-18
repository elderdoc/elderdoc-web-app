import { auth } from '@/auth'
import { matchCaregivers } from '@/domains/matching/match-caregivers'

export async function POST(req: Request): Promise<Response> {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json([], { status: 401 })
  }

  try {
    const { requestId } = await req.json() as { requestId: string }
    const candidates = await matchCaregivers(requestId)
    return Response.json(candidates)
  } catch (err) {
    console.error('[match] error:', err)
    return Response.json([])
  }
}
