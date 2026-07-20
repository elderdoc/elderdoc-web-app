import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    environment:   process.env.VERCEL_ENV     ?? process.env.NODE_ENV ?? 'development',
    region:        process.env.VERCEL_REGION  ?? 'local',
    branch:        process.env.VERCEL_GIT_COMMIT_REF     ?? null,
    commitSha:     process.env.VERCEL_GIT_COMMIT_SHA     ?? null,
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
    url:           process.env.VERCEL_URL ?? null,
  })
}
