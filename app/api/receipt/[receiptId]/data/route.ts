import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_stub')

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  const { receiptId } = await params

  if (!receiptId.startsWith('in_')) {
    return NextResponse.json({ error: 'Invalid receipt ID' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ mock: true })
  }

  const invoice = await getStripe().invoices.retrieve(receiptId, {
    expand: ['charge', 'lines'],
  }) as Stripe.Invoice & { charge: Stripe.Charge | null }

  const card = invoice.charge?.payment_method_details?.card

  return NextResponse.json({
    invoiceNumber:     invoice.number ?? null,
    amountPaid:        invoice.amount_paid,
    paidAt:            invoice.status_transitions?.paid_at ?? null,
    receiptNumber:     invoice.charge?.receipt_number ?? null,
    paymentBrand:      card?.brand ?? null,
    paymentLast4:      card?.last4 ?? null,
    invoicePdfUrl:     invoice.invoice_pdf ?? null,
    hostedInvoiceUrl:  invoice.hosted_invoice_url ?? null,
    lines: (invoice.lines?.data ?? []).map((line) => ({
      description: line.description ?? null,
      amount:      line.amount,
      quantity:    (line as any).quantity ?? null,
    })),
    total:    invoice.total,
    subtotal: invoice.subtotal,
  })
}
