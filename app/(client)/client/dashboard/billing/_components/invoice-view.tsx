'use client'

import { useEffect, useState } from 'react'
import { Download, ExternalLink } from 'lucide-react'

interface InvoiceData {
  mock?: boolean
  invoiceNumber: string | null
  amountPaid: number
  paidAt: number | null
  receiptNumber: string | null
  paymentBrand: string | null
  paymentLast4: string | null
  invoicePdfUrl: string | null
  hostedInvoiceUrl: string | null
  lines: { description: string | null; amount: number; quantity: number | null }[]
  total: number
  subtotal: number
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function fmtDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function InvoiceView({ invoiceId }: { invoiceId: string }) {
  const [data, setData] = useState<InvoiceData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/receipt/${invoiceId}/data`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true))
  }, [invoiceId])

  if (error) return <p className="px-6 py-4 text-sm text-muted-foreground">Receipt unavailable.</p>

  if (!data) {
    return (
      <div className="px-6 py-6 space-y-3 animate-pulse">
        <div className="h-8 w-28 rounded bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-px bg-muted mt-4" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-3 w-full rounded bg-muted" />)}
        </div>
      </div>
    )
  }

  if (data.mock) {
    return <p className="px-6 py-4 text-sm text-muted-foreground">Receipt not available for test payments.</p>
  }

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Receipt from ElderDoc</p>
          <p className="text-3xl font-bold tracking-tight">{fmt(data.amountPaid)}</p>
          {data.paidAt && (
            <p className="text-sm text-muted-foreground mt-1">Paid {fmtDate(data.paidAt)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {data.hostedInvoiceUrl && (
            <a
              href={data.hostedInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md border border-border hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View on Stripe
            </a>
          )}
          {data.invoicePdfUrl && (
            <a
              href={data.invoicePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" /> Download PDF
            </a>
          )}
        </div>
      </div>

      <hr className="border-border" />

      {/* Meta */}
      <dl className="space-y-2">
        {data.receiptNumber && (
          <div className="flex justify-between text-sm">
            <dt className="text-muted-foreground">Receipt number</dt>
            <dd className="font-medium">{data.receiptNumber}</dd>
          </div>
        )}
        {data.invoiceNumber && (
          <div className="flex justify-between text-sm">
            <dt className="text-muted-foreground">Invoice number</dt>
            <dd className="font-medium">{data.invoiceNumber}</dd>
          </div>
        )}
        {data.paymentBrand && data.paymentLast4 && (
          <div className="flex justify-between text-sm">
            <dt className="text-muted-foreground">Payment method</dt>
            <dd className="font-medium">{capitalize(data.paymentBrand)} ···· {data.paymentLast4}</dd>
          </div>
        )}
      </dl>

      <hr className="border-border" />

      {/* Line items */}
      <div className="space-y-3">
        {data.lines.map((line, i) => (
          <div key={i} className="flex justify-between gap-4 text-sm">
            <div className="min-w-0">
              <p className="font-medium truncate">{line.description ?? 'Service'}</p>
              {line.quantity != null && line.quantity > 1 && (
                <p className="text-xs text-muted-foreground">Qty {line.quantity}</p>
              )}
            </div>
            <p className="shrink-0 font-medium">{fmt(line.amount)}</p>
          </div>
        ))}
      </div>

      <hr className="border-border" />

      {/* Totals */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium">{fmt(data.total)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span>Amount paid</span>
          <span>{fmt(data.amountPaid)}</span>
        </div>
      </div>
    </div>
  )
}
