'use client'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  fillColor?: string
  className?: string
}

export function Sparkline({
  data, width = 280, height = 60,
  color = 'var(--forest)',
  fillColor = 'var(--forest-soft)',
  className,
}: SparklineProps) {
  if (data.length === 0) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const padding = 4
  const w = width - padding * 2
  const h = height - padding * 2
  const points = data.map((v, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * w
    const y = padding + h - ((v - min) / range) * h
    return [x, y] as const
  })

  const linePath = points
    .map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`))
    .join(' ')

  const areaPath = `${linePath} L ${points[points.length - 1][0]} ${height - padding} L ${points[0][0]} ${height - padding} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="1" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-grad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3.5" fill={color} />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="6" fill={color} fillOpacity="0.2" />
    </svg>
  )
}

interface BarChartProps {
  data: { label: string; value: number; sublabel?: string }[]
  height?: number
  color?: string
  className?: string
}

export function BarChart({ data, height = 140, color = 'var(--forest)', className }: BarChartProps) {
  if (data.length === 0) return null
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-2" style={{ height }}>
        {data.map((d, i) => {
          const pct = max > 0 ? (d.value / max) * 100 : 0
          const isEmpty = d.value === 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              {/* value label above bar */}
              <span className={[
                'text-[11px] font-semibold tabular-nums leading-none',
                isEmpty ? 'text-muted-foreground/50' : 'text-foreground/80',
              ].join(' ')}>
                {d.value > 0 ? d.value : '—'}
              </span>
              <div className="w-full flex items-end" style={{ height: height - 32 }}>
                <div
                  className={[
                    'w-full rounded-t-lg transition-all',
                    isEmpty
                      ? 'bg-muted/60'
                      : 'bg-gradient-to-t from-[var(--forest)] to-[var(--forest)]/70',
                  ].join(' ')}
                  style={{ height: `${Math.max(isEmpty ? 8 : pct, 4)}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">{d.label}</span>
              {d.sublabel && <span className="text-[9px] text-muted-foreground/60">{d.sublabel}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface DonutProps {
  segments: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerValue?: string
  className?: string
}

export function Donut({ segments, size = 180, thickness = 22, centerLabel, centerValue, className }: DonutProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className={className}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={thickness} />
          {segments.map((s, i) => {
            const len = (s.value / total) * circumference
            const dasharray = `${len} ${circumference - len}`
            const dashoffset = -offset
            offset += len
            return (
              <circle
                key={i}
                cx={size / 2} cy={size / 2} r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={thickness}
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
              />
            )
          })}
        </svg>
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && <div className="text-[28px] font-semibold tabular-nums tracking-tight">{centerValue}</div>}
            {centerLabel && <div className="text-[11px] text-muted-foreground mt-0.5">{centerLabel}</div>}
          </div>
        )}
      </div>
    </div>
  )
}
