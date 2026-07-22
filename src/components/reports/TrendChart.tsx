import type { TrendPoint } from '../../hooks/useReportsData'

function compactCurrency(amount: number): string {
  if (amount >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `₱${(amount / 1_000).toFixed(0)}k`
  return `₱${Math.round(amount)}`
}

function periodLabel(period: string, granularity: 'weekly' | 'monthly'): string {
  if (granularity === 'monthly') {
    const [year, month] = period.split('-')
    const date = new Date(Number(year), Number(month) - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }
  // Weekly: period is the Monday starting that week.
  const [year, month, day] = period.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const WIDTH = 600
const HEIGHT = 220
const PADDING_LEFT = 48
const PADDING_BOTTOM = 28
const PADDING_TOP = 12
const PADDING_RIGHT = 12

export function TrendChart({
  points,
  granularity,
}: {
  points: TrendPoint[]
  granularity: 'weekly' | 'monthly'
}) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">No data in this date range.</p>
    )
  }

  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.income, p.expenses)))
  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM

  function x(index: number): number {
    if (points.length === 1) return PADDING_LEFT + plotWidth / 2
    return PADDING_LEFT + (index / (points.length - 1)) * plotWidth
  }

  function y(value: number): number {
    return PADDING_TOP + plotHeight - (value / maxValue) * plotHeight
  }

  function linePath(key: 'income' | 'expenses'): string {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p[key])}`).join(' ')
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
  // Show every label if there's room, otherwise thin them out so they don't
  // overlap on a narrow mobile screen.
  const labelStride = points.length <= 6 ? 1 : Math.ceil(points.length / 6)

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Expenses
        </span>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Income vs expenses trend">
        {gridLines.map((fraction) => {
          const gy = PADDING_TOP + plotHeight * (1 - fraction)
          return (
            <g key={fraction}>
              <line
                x1={PADDING_LEFT}
                x2={WIDTH - PADDING_RIGHT}
                y1={gy}
                y2={gy}
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth={1}
              />
              <text
                x={PADDING_LEFT - 6}
                y={gy}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-slate-400 text-[9px] dark:fill-slate-500"
              >
                {compactCurrency(maxValue * fraction)}
              </text>
            </g>
          )
        })}

        {points.map((p, i) =>
          i % labelStride === 0 ? (
            <text
              key={p.period}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-slate-400 text-[9px] dark:fill-slate-500"
            >
              {periodLabel(p.period, granularity)}
            </text>
          ) : null,
        )}

        <path
          d={linePath('income')}
          fill="none"
          className="stroke-emerald-500"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={linePath('expenses')}
          fill="none"
          className="stroke-red-500"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <g key={p.period}>
            <circle cx={x(i)} cy={y(p.income)} r={2.5} className="fill-emerald-500" />
            <circle cx={x(i)} cy={y(p.expenses)} r={2.5} className="fill-red-500" />
          </g>
        ))}
      </svg>
    </div>
  )
}
