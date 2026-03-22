import { formatPrice } from '../utils/formatters'

const HEIGHT = 260

export default function ZoneMap({ trades = [], symbol = 'EURUSD' }) {
  const symbolTrades = trades.filter(t => t.symbol === symbol)

  if (symbolTrades.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        No active positions for {symbol}
      </div>
    )
  }

  const allPrices = symbolTrades.flatMap(t =>
    [t.entryPrice, t.stopLoss, t.takeProfit, t.worstPrice].filter(Boolean)
  )
  const minPrice = allPrices.length ? Math.min(...allPrices) : 1
  const maxPrice = allPrices.length ? Math.max(...allPrices) : 2
  const range    = maxPrice - minPrice || 0.0001
  const padded   = range * 0.2
  const low  = minPrice - padded
  const high = maxPrice + padded

  const toY = price => HEIGHT - ((price - low) / (high - low)) * HEIGHT

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <svg width="100%" height={HEIGHT + 20} viewBox={`0 0 600 ${HEIGHT + 20}`}
           style={{ background: '#030712' }}>

        {/* Price axis labels — 5 ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(fraction => {
          const price = low + (high - low) * fraction
          const y = toY(price)
          return (
            <g key={fraction}>
              <line x1="50" y1={y} x2="570" y2={y} stroke="#1f2937" strokeDasharray="2 4" />
              <text x="45" y={y + 4} textAnchor="end" fill="#4b5563" fontSize="9">
                {formatPrice(price)}
              </text>
            </g>
          )
        })}

        {/* Trade lines */}
        {symbolTrades.map(t => {
          const isLong = t.direction === 1
          const entryY = toY(t.entryPrice)
          const slY    = toY(t.stopLoss)
          const tpY    = toY(t.takeProfit)
          const worstY = toY(t.worstPrice)
          const color  = isLong ? '#34d399' : '#f87171'
          const x1 = 60, x2 = 540
          return (
            <g key={t.ticket}>
              {/* Entry line */}
              <line x1={x1} y1={entryY} x2={x2} y2={entryY} stroke={color} strokeWidth="2" />
              <text x={x2 + 4} y={entryY + 4} fill={color} fontSize="9">
                {isLong ? 'BUY' : 'SELL'} {formatPrice(t.entryPrice)}
              </text>
              {/* Stop Loss */}
              <line x1={x1} y1={slY} x2={x2} y2={slY} stroke="#ef4444" strokeWidth="1"
                    strokeDasharray="4 3" opacity="0.6" />
              {/* Take Profit */}
              <line x1={x1} y1={tpY} x2={x2} y2={tpY} stroke="#34d399" strokeWidth="1"
                    strokeDasharray="4 3" opacity="0.6" />
              {/* Worst price (locked trade) */}
              {t.isLocked && (
                <line x1={x1} y1={worstY} x2={x2} y2={worstY} stroke="#f59e0b"
                      strokeWidth="1.5" strokeDasharray="6 3" />
              )}
              {/* Hedge marker */}
              {t.hedgeTicket > 0 && (
                <>
                  <line x1={x1} y1={worstY} x2={x2} y2={worstY} stroke="#fb923c"
                        strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x={x1} y={worstY - 4} fill="#fb923c" fontSize="8">HEDGE</text>
                </>
              )}
            </g>
          )
        })}

        {/* Vertical center axis */}
        <line x1="300" y1="0" x2="300" y2={HEIGHT} stroke="#374151" strokeWidth="1" opacity="0.3" />
      </svg>
    </div>
  )
}
