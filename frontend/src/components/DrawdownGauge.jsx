import { formatPct } from '../utils/formatters'

const RADIUS = 80
const CX = 100
const CY = 100
const circumference = 2 * Math.PI * RADIUS
const halfCirc = circumference / 2

export default function DrawdownGauge({ currentPct = 0, limitPct = 3 }) {
  const ratio      = Math.min(Math.max(currentPct / (limitPct || 1), 0), 1)
  const fillLength = halfCirc * ratio
  const arcColor   = ratio >= 0.8 ? '#ef4444' : ratio >= 0.5 ? '#f59e0b' : '#34d399'

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col items-center border border-gray-700/50">
      <span className="text-xs text-gray-400 uppercase tracking-wide self-start mb-1">
        Daily Drawdown
      </span>

      <svg viewBox="0 0 200 120" className="w-full">
        {/* Background arc — full 180° */}
        <circle
          cx={CX} cy={CY} r={RADIUS}
          fill="none" stroke="#1f2937" strokeWidth="14"
          strokeDasharray={`${halfCirc} ${circumference}`}
          transform="rotate(-180 100 100)"
          strokeLinecap="round"
        />
        {/* Foreground arc — proportional fill */}
        <circle
          cx={CX} cy={CY} r={RADIUS}
          fill="none" stroke={arcColor} strokeWidth="14"
          strokeDasharray={`${fillLength} ${circumference}`}
          strokeDashoffset={0}
          transform="rotate(-180 100 100)"
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.5s ease' }}
        />
        {/* Current pct text */}
        <text x="100" y="93" textAnchor="middle"
          fill="white" fontSize="22" fontWeight="600" fontFamily="system-ui">
          {formatPct(currentPct)}
        </text>
        {/* Label */}
        <text x="100" y="110" textAnchor="middle"
          fill="#6b7280" fontSize="9" fontFamily="system-ui">
          {`of ${limitPct}% daily limit`}
        </text>
      </svg>

      {currentPct >= limitPct && (
        <div className="text-center mt-1">
          <span className="inline-block px-2 py-0.5 bg-red-900/40 border border-red-500/60
                           text-red-400 text-xs font-semibold rounded animate-pulse">
            TRADING HALTED
          </span>
        </div>
      )}
    </div>
  )
}
