import {
  formatPrice,
  formatLot,
  formatTime,
  getDirectionLabel,
  getDirectionColor,
} from '../utils/formatters'

const HEADERS = [
  'Symbol', 'Direction', 'Lot', 'Entry Price',
  'Stop Loss', 'Take Profit', 'Worst Price', 'Lock Status', 'Open Time',
]

/**
 * TradeTable
 *
 * Renders a dark-themed scrollable table of open trade records.
 *
 * Props:
 *   trades   {array}    Array of trade objects from trades.json (default [])
 *   onClose  {function} Optional — called with trade.ticket when Close is clicked
 */
export default function TradeTable({ trades = [], onClose }) {
  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No open trades
      </div>
    )
  }

  const showActions = typeof onClose === 'function'

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm text-left text-gray-300">
        <thead className="bg-gray-800 sticky top-0 text-xs text-gray-400 uppercase tracking-wide">
          <tr>
            {HEADERS.map((h) => (
              <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>
            ))}
            {showActions && <th className="px-4 py-3">Actions</th>}
          </tr>
        </thead>

        <tbody>
          {trades.map((trade, idx) => (
            <tr
              key={trade.ticket}
              className={`
                border-t border-gray-800 transition-colors hover:bg-gray-700
                ${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'}
              `}
            >
              {/* Symbol */}
              <td className="px-4 py-3 font-medium text-white whitespace-nowrap">
                {trade.symbol}
              </td>

              {/* Direction */}
              <td className={`px-4 py-3 font-semibold ${getDirectionColor(trade.direction)}`}>
                {getDirectionLabel(trade.direction)}
              </td>

              {/* Lot */}
              <td className="px-4 py-3">{formatLot(trade.lotSize)}</td>

              {/* Entry Price */}
              <td className="px-4 py-3 font-mono">{formatPrice(trade.entryPrice)}</td>

              {/* Stop Loss */}
              <td className="px-4 py-3 font-mono text-red-400">
                {formatPrice(trade.stopLoss)}
              </td>

              {/* Take Profit */}
              <td className="px-4 py-3 font-mono text-emerald-400">
                {formatPrice(trade.takeProfit)}
              </td>

              {/* Worst Price */}
              <td className="px-4 py-3 font-mono text-gray-400">
                {formatPrice(trade.worstPrice)}
              </td>

              {/* Lock Status */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {trade.isLocked ? (
                    <span className="text-amber-400 text-base" title="Position locked">🔒</span>
                  ) : (
                    <span className="text-emerald-400 text-lg leading-none" title="Not locked">●</span>
                  )}
                  {trade.hedgeTicket > 0 && (
                    <span className="bg-orange-500/20 text-orange-400 text-xs px-1.5 py-0.5 rounded font-medium">
                      HEDGED
                    </span>
                  )}
                </div>
              </td>

              {/* Open Time */}
              <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                {formatTime(trade.openTime)}
              </td>

              {/* Actions */}
              {showActions && (
                <td className="px-4 py-3">
                  <button
                    onClick={() => onClose(trade.ticket)}
                    className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-600/40 rounded text-xs hover:bg-red-600/40 transition-colors"
                  >
                    Close
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
