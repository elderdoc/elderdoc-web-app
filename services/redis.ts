import Redis from 'ioredis'

let client: Redis | null = null

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    })
  }
  return client
}

export async function publish(channel: string, message: unknown): Promise<void> {
  const redis = getRedis()
  await redis.publish(channel, JSON.stringify(message))
}
