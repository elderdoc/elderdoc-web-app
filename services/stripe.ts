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

export async function createStripeCustomer(email: string, name: string) {
  if (MOCK_MODE) return { id: `mock_cus_${email.replace(/\W/g, '')}` }
  return getStripe().customers.create({ email, name })
}

export async function createSetupIntent(customerId: string) {
  if (MOCK_MODE) return { client_secret: 'mock_seti_secret' }
  return getStripe().setupIntents.create({
    customer: customerId,
    usage: 'off_session',
  })
}

export async function savePaymentMethodToCustomer(customerId: string, paymentMethodId: string) {
  if (MOCK_MODE) return
  await getStripe().paymentMethods.attach(paymentMethodId, { customer: customerId })
  await getStripe().customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  })
}

export interface SavedCard {
  brand: string
  last4: string
}

export async function getDefaultPaymentMethod(customerId: string): Promise<SavedCard | null> {
  if (MOCK_MODE) return { brand: 'visa', last4: '4242' }
  const customer = await getStripe().customers.retrieve(customerId, {
    expand: ['invoice_settings.default_payment_method'],
  }) as import('stripe').Stripe.Customer
  const pm = customer.invoice_settings?.default_payment_method
  if (!pm || typeof pm === 'string') return null
  const card = (pm as import('stripe').Stripe.PaymentMethod).card
  if (!card) return null
  return { brand: card.brand, last4: card.last4 }
}

export interface InvoiceResult {
  invoiceId: string
  invoicePdfUrl: string | null
  hostedInvoiceUrl: string | null
  paymentIntentId: string | null
}

export async function createAndPayInvoice(
  customerId: string,
  jobId: string,
  subtotalCents: number,
  feeCents: number,
): Promise<InvoiceResult> {
  if (MOCK_MODE) {
    return {
      invoiceId: `mock_in_${jobId}`,
      invoicePdfUrl: null,
      hostedInvoiceUrl: null,
      paymentIntentId: `mock_pi_inv_${jobId}`,
    }
  }
  await getStripe().invoiceItems.create({
    customer: customerId,
    amount: subtotalCents,
    currency: 'usd',
    description: 'Care service',
    metadata: { jobId },
  })
  await getStripe().invoiceItems.create({
    customer: customerId,
    amount: feeCents,
    currency: 'usd',
    description: 'Trust & Support fee (1%)',
    metadata: { jobId },
  })
  const invoice = await getStripe().invoices.create({
    customer: customerId,
    auto_advance: false,
    metadata: { jobId },
  })
  const finalized = await getStripe().invoices.finalizeInvoice(invoice.id)
  const paid = await getStripe().invoices.pay(finalized.id)

  // Retrieve the invoice with expansion to access the payment intent
  const expandedInvoice = await getStripe().invoices.retrieve(paid.id, {
    expand: ['payment_intent'],
  }) as any

  let paymentIntentId: string | null = null
  const paymentIntent = expandedInvoice.payment_intent
  if (paymentIntent) {
    paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id
  }

  return {
    invoiceId: paid.id,
    invoicePdfUrl: paid.invoice_pdf ?? null,
    hostedInvoiceUrl: paid.hosted_invoice_url ?? null,
    paymentIntentId,
  }
}

export async function getInvoicePdfUrl(invoiceId: string): Promise<{ pdfUrl: string | null; hostedUrl: string | null }> {
  if (MOCK_MODE || invoiceId.startsWith('mock_in_')) return { pdfUrl: null, hostedUrl: null }
  const invoice = await getStripe().invoices.retrieve(invoiceId)
  return {
    pdfUrl: invoice.invoice_pdf ?? null,
    hostedUrl: invoice.hosted_invoice_url ?? null,
  }
}
