import { useState } from 'react'
import CandlestickChart from '../CandlestickChart'

const TIMEFRAMES = ['1M', '5M', '15M', '1H', '4H', '1D']
const INDICATORS = [
  { key: 'ema5',  label: 'EMA5',  color: '#00ffcc' },
  { key: 'ma20',  label: 'MA20',  color: '#3b82f6' },
  { key: 'ma50',  label: 'MA50',  color: '#f59e0b' },
  { key: 'ma200', label: 'MA200', color: '#8b5cf6' },
  { key: 'bb',    label: 'BB',    color: '#94a3b8' },
  { key: 'vol',   label: 'Vol',   color: '#475569' },
]

export default function MobileChart({ wsData, signalState, trades }) {
  const [activeTf, setActiveTf] = useState('1H')
  const [activeIndicators, setActiveIndicators] = useState({
    ema5: true, ma20: true, ma50: true, ma200: true, bb: true, vol: true,
  })

  const symbol = wsData?.trades?.[0]?.symbol ?? 'EURUSD'

  const toggleIndicator = (key) =>
    setActiveIndicators(prev => ({ ...prev, [key]: !prev[key] }))

  const s = signalState ?? {}
  const t1Pass = s.t1_allPass
  const t2Bias = s.t2_bias ?? 0
  const t3Score = s.t3_score ?? 0
  const hasFinal = s.finalDirection && s.finalDirection !== 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Timeframe pills — 36px */}
      <div style={{
        height: '36px', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        overflowX: 'auto', gap: '6px', padding: '0 10px',
        background: '#0a1628', borderBottom: '1px solid #1e293b',
        scrollbarWidth: 'none',
      }}>
        {TIMEFRAMES.map(tf => (
          <button key={tf} onClick={() => setActiveTf(tf)} style={{
            minWidth: '40px', height: '26px', flexShrink: 0,
            background: activeTf === tf ? '#1e3a5f' : 'transparent',
            color: activeTf === tf ? '#60a5fa' : '#475569',
            border: activeTf === tf ? '1px solid #2563eb' : '1px solid #1e293b',
            borderRadius: '4px', fontSize: '11px', fontWeight: '600',
            cursor: 'pointer', fontFamily: 'monospace',
          }}>{tf}</button>
        ))}
      </div>

      {/* Indicator pills — 32px */}
      <div style={{
        height: '32px', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        overflowX: 'auto', gap: '6px', padding: '0 10px',
        background: '#0a1628', borderBottom: '1px solid #1e293b',
        scrollbarWidth: 'none',
      }}>
        {INDICATORS.map(ind => {
          const on = activeIndicators[ind.key]
          return (
            <button key={ind.key} onClick={() => toggleIndicator(ind.key)} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              height: '22px', padding: '0 8px', flexShrink: 0,
              background: on ? '#0f1e35' : 'transparent',
              border: on ? `1px solid ${ind.color}44` : '1px solid #1e293b',
              borderRadius: '4px', fontSize: '10px', color: on ? '#e2e8f0' : '#475569',
              cursor: 'pointer', fontFamily: 'monospace',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: on ? ind.color : '#475569', flexShrink: 0 }}/>
              {ind.label}
            </button>
          )
        })}
      </div>

      {/* Chart area — fills remaining height, position relative for overlay */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <CandlestickChart symbol={symbol} wsData={wsData} />

        {/* Signal overlay bar — pinned to bottom of chart area */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '44px', background: 'rgba(10,22,40,0.92)',
          borderTop: '1px solid #1e293b',
          display: 'flex', alignItems: 'center',
          padding: '0 12px', gap: '8px',
          backdropFilter: 'blur(4px)',
        }}>
          {/* T1 badge */}
          <span style={{
            fontSize: '10px', fontWeight: '700', padding: '2px 7px',
            borderRadius: '4px',
            background: t1Pass ? '#00d4aa18' : '#f43f5e18',
            color: t1Pass ? '#00d4aa' : '#f43f5e',
            border: `1px solid ${t1Pass ? '#00d4aa44' : '#f43f5e44'}`,
          }}>T1</span>

          {/* T2 badge */}
          <span style={{
            fontSize: '10px', fontWeight: '700', padding: '2px 7px',
            borderRadius: '4px',
            background: t2Bias === 1 ? '#00d4aa18' : t2Bias === -1 ? '#f43f5e18' : '#1e293b',
            color: t2Bias === 1 ? '#00d4aa' : t2Bias === -1 ? '#f43f5e' : '#475569',
            border: '1px solid #1e293b',
          }}>{t2Bias === 1 ? 'BULL' : t2Bias === -1 ? 'BEAR' : '—'}</span>

          {/* T3 score */}
          <span style={{
            fontSize: '10px', fontWeight: '700', padding: '2px 7px',
            borderRadius: '4px', background: '#0f1e35', border: '1px solid #1e293b',
            color: t3Score >= 2 ? '#00d4aa' : t3Score === 1 ? '#f59e0b' : '#475569',
          }}>{t3Score}/4</span>

          {/* Final direction pill or scanning text */}
          <div style={{ marginLeft: 'auto' }}>
            {hasFinal ? (
              <span style={{
                fontSize: '12px', fontWeight: '700', padding: '4px 10px',
                borderRadius: '4px',
                animation: 'pulseBanner 1s ease-in-out infinite',
                background: s.finalDirection === 1 ? '#00d4aa18' : '#f43f5e18',
                color: s.finalDirection === 1 ? '#00d4aa' : '#f43f5e',
                border: `1px solid ${s.finalDirection === 1 ? '#00d4aa44' : '#f43f5e44'}`,
              }}>
                {s.finalDirection === 1 ? '▲ BUY' : '▼ SELL'}
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: '#475569' }}>Scanning...</span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulseBanner { 0%,100%{opacity:1} 50%{opacity:0.6} }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
