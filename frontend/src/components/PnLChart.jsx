import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Area,
  Line,
} from 'recharts'
import { formatCurrency, formatPct, formatTime } from '../utils/formatters'

// ---------------------------------------------------------------------------
// Internal mini stat card
// ---------------------------------------------------------------------------
function MiniStat({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="bg-gray-800 rounded-lg p-3 flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-base font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PnLChart
// ---------------------------------------------------------------------------
export default function PnLChart({ trades = [], meta = null }) {
  const [history, setHistory] = useState([])

  // Append a data point every time a new meta object arrives
  useEffect(() => {
    if (!meta) return
    setHistory(prev => {
      const point = {
        time:    formatTime(Date.now() / 1000),
        equity:  meta.accountEquity  ?? 0,
        balance: meta.accountBalance ?? 0,
      }
      const next = [...prev, point]
      return next.length > 200 ? next.slice(next.length - 200) : next
    })
  }, [meta])

  // Derived stats
  const equities        = history.map(p => p.equity)
  const peakEquity      = equities.length ? Math.max(...equities) : (meta?.accountEquity  ?? 0)
  const lowestEquity    = equities.length ? Math.min(...equities) : (meta?.accountEquity  ?? 0)
  const maxDrawdown     = peakEquity > 0 ? ((peakEquity - lowestEquity) / peakEquity) * 100 : 0
  const startingBalance = history.length ? history[0].balance : (meta?.accountBalance ?? 0)

  const ddClass = maxDrawdown > 2
    ? 'text-red-400'
    : maxDrawdown > 1
      ? 'text-amber-400'
      : 'text-emerald-400'

  // Empty state
  if (history.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-center h-[280px] text-gray-500 text-sm">
          No data yet — waiting for connection...
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={history} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="time"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={(_, i) => (i % 10 === 0 ? (history[i]?.time ?? '') : '')}
            interval={0}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 10 }}
            tickFormatter={v => formatCurrency(v)}
            domain={['auto', 'auto']}
            width={75}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              fontSize: '12px',
            }}
            formatter={(value, name) => [
              formatCurrency(value),
              name === 'equity' ? 'Equity' : 'Balance',
            ]}
          />
          <Legend verticalAlign="top" iconSize={10} />
          <Area
            type="monotone"
            dataKey="equity"
            name="Equity"
            stroke="#34d399"
            fill="#34d39920"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="balance"
            name="Balance"
            stroke="#6b7280"
            dot={false}
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <MiniStat label="Starting Balance" value={formatCurrency(startingBalance)} />
        <MiniStat label="Peak Equity"      value={formatCurrency(peakEquity)} />
        <MiniStat label="Max Drawdown"     value={formatPct(maxDrawdown)} valueClass={ddClass} />
      </div>
    </div>
  )
}
