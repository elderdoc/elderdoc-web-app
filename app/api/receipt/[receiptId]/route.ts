import { NextRequest, NextResponse } from 'next/server'
import { getInvoicePdfUrl, getPaymentIntentCharge } from '@/services/stripe'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  const { receiptId } = await params
  const download = req.nextUrl.searchParams.get('download') === '1'

  if (receiptId.startsWith('in_')) {
    const { pdfUrl, hostedUrl, receiptUrl } = await getInvoicePdfUrl(receiptId)
    if (download) {
      const target = pdfUrl ?? hostedUrl
      if (!target) return NextResponse.json({ error: 'Receipt not available' }, { status: 404 })
      return NextResponse.redirect(target)
    }
    // Use receipt URL (pay.stripe.com) for iframe — falls back to PDF inline
    const embedTarget = receiptUrl ?? pdfUrl
    if (!embedTarget) return NextResponse.json({ error: 'Receipt not available' }, { status: 404 })
    if (pdfUrl && !receiptUrl) {
      const res = await fetch(pdfUrl)
      const pdf = await res.arrayBuffer()
      return new NextResponse(pdf, {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline' },
      })
    }
    return NextResponse.redirect(embedTarget)
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
