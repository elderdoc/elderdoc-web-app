import Stripe from 'stripe'

let client: Stripe | null = null

function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_stub')
  }
  return client
}

const MOCK_MODE = !process.env.STRIPE_SECRET_KEY

export async function createPaymentIntent(amount: number, jobId: string) {
  if (MOCK_MODE) return { id: `mock_pi_${jobId}`, clientSecret: 'mock_secret', status: 'requires_payment_method' }
  return getStripe().paymentIntents.create({ amount, currency: 'usd', metadata: { jobId } })
}

export async function capturePaymentIntent(intentId: string) {
  if (MOCK_MODE) return { id: intentId, status: 'succeeded' }
  return getStripe().paymentIntents.capture(intentId)
}

export async function createConnectAccount(caregiverId: string) {
  if (MOCK_MODE) return { id: `mock_acct_${caregiverId}` }
  return getStripe().accounts.create({ type: 'express', metadata: { caregiverId } })
}

export async function createConnectAccountLink(accountId: string, returnUrl: string) {
  if (MOCK_MODE) return { url: `${returnUrl}?mock=true` }
  return getStripe().accountLinks.create({ account: accountId, type: 'account_onboarding', return_url: returnUrl, refresh_url: returnUrl })
}

export async function transferPayout(amount: number, accountId: string, jobId: string) {
  if (MOCK_MODE) return { id: `mock_tr_${jobId}`, amount: Math.round(amount * 100) }
  return getStripe().transfers.create({ amount: Math.round(amount * 100), currency: 'usd', destination: accountId, metadata: { jobId } })
}
