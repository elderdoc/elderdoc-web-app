import { NextRequest, NextResponse } from 'next/server'
import { getInvoicePdfUrl, getPaymentIntentCharge } from '@/services/stripe'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  const { receiptId } = await params
  const download = req.nextUrl.searchParams.get('download') === '1'

  if (receiptId.startsWith('in_')) {
    const { hostedUrl } = await getInvoicePdfUrl(receiptId)
    if (!hostedUrl) {
      return NextResponse.json({ error: 'Receipt not available' }, { status: 404 })
    }
    if (download) {
      return NextResponse.redirect(hostedUrl)
    }
    return NextResponse.redirect(hostedUrl)
  }

  // Legacy: PaymentIntent-based receipt
  if (receiptId.startsWith('pi_')) {
    const charge = await getPaymentIntentCharge(receiptId)
    if (!charge?.receiptUrl) {
      return NextResponse.json({ error: 'Receipt not available' }, { status: 404 })
    }
    if (download) {
      return NextResponse.redirect(charge.receiptUrl)
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box}body,html{height:100%}iframe{width:100%;height:100%;border:none}</style></head><body><iframe src="${charge.receiptUrl}"></iframe></body></html>`
    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  return NextResponse.json({ error: 'Invalid receipt ID' }, { status: 400 })
}
