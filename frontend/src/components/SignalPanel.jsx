import { useEffect, useRef } from 'react'

export default function SignalPanel({ signalState }) {

  if (!signalState) return (
    <div style={{ padding: '12px', color: '#475569', fontSize: '12px' }}>
      Waiting for signal data...
    </div>
  )

  const s = signalState

  const tier1Items = [
    { key: 't1_masterSwitch', label: 'Master switch ON' },
    { key: 't1_tradeCapOk',   label: 'Trade cap OK' },
    { key: 't1_noNews',       label: 'No high-impact news' },
    { key: 't1_spreadOk',     label: 'Spread acceptable' },
    { key: 't1_drawdownOk',   label: 'Drawdown within limit' },
  ]

  const tier3Items = [
    { key: 't3_candlestick', label: 'Candlestick pattern' },
    { key: 't3_bbMiddle',    label: 'BB middle cross' },
    { key: 't3_bbOuter',     label: 'BB outer rejection' },
    { key: 't3_ema5xMA20',   label: 'EMA5 × MA20 + MA50' },
  ]

  const tier1Active = tier1Items.filter(i => s[i.key])
  const tier2Active = s.t2_bias !== 0
  const tier3Active = tier3Items.filter(i => s[i.key])
  const tier4Active = s.t4_zoneBonus
  const tier1AllPass = tier1Active.length === 5

  const dot = (color) => (
    <span style={{
      display: 'inline-block', width: '6px', height: '6px',
      borderRadius: '50%', background: color, marginRight: '6px',
      animation: 'pulseDot 1.5s ease-in-out infinite',
      flexShrink: 0
    }}/>
  )

  const badge = (text, color, bg) => (
    <span style={{
      fontSize: '10px', fontWeight: '600', padding: '2px 8px',
      borderRadius: '4px', color, background: bg,
      display: 'inline-block', marginTop: '6px'
    }}>{text}</span>
  )

  const sectionStyle = {
    marginBottom: '10px',
    padding: '8px 10px',
    background: '#0f1e35',
    borderRadius: '6px',
    border: '1px solid #1e293b'
  }

  const labelStyle = {
    fontSize: '10px', fontWeight: '600',
    color: '#475569', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: '6px',
    display: 'block'
  }

  const rowStyle = {
    display: 'flex', alignItems: 'center',
    fontSize: '11px', color: '#94a3b8',
    marginBottom: '3px'
  }

  return (
    <div style={{ padding: '8px' }}>
      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes pulseBanner { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>

      {/* Tier 1 */}
      {tier1Active.length > 0 && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Tier 1 — Risk gates</span>
          {tier1Active.map(item => (
            <div key={item.key} style={rowStyle}>
              {dot('#00d4aa')}{item.label}
            </div>
          ))}
          {tier1AllPass && badge('ALL GATES PASS', '#00d4aa', '#00d4aa18')}
        </div>
      )}

      {/* Tier 2 */}
      {tier2Active && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Tier 2 — Directional bias</span>
          {s.t2_htfTrend && (
            <div style={rowStyle}>{dot('#3b82f6')}H4 trend aligned</div>
          )}
          {s.t2_priceVsMA && (
            <div style={rowStyle}>{dot('#3b82f6')}Price vs key MAs</div>
          )}
          <div style={{ marginTop: '6px' }}>
            {s.t2_bias === 1
              ? badge('BULLISH BIAS', '#00d4aa', '#00d4aa18')
              : badge('BEARISH BIAS', '#f43f5e', '#f43f5e18')
            }
          </div>
        </div>
      )}

      {/* Tier 3 */}
      {tier3Active.length > 0 && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Tier 3 — Entry signals</span>
          {tier3Active.map(item => (
            <div key={item.key} style={rowStyle}>
              {dot('#f59e0b')}{item.label}
            </div>
          ))}
          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, height: '4px', background: '#1e293b', borderRadius: '2px' }}>
              <div style={{
                height: '100%', borderRadius: '2px',
                width: `${(s.t3_score / 4) * 100}%`,
                background: s.t3_score >= 2 ? '#00d4aa' : '#f59e0b',
                transition: 'width 0.3s ease'
              }}/>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
              {s.t3_score}/4
            </span>
          </div>
          {s.t3_score >= 3 && badge('FLEX ENTRY', '#00ffcc', '#00ffcc15')}
        </div>
      )}

      {/* Tier 4 */}
      {tier4Active && (
        <div style={sectionStyle}>
          <span style={labelStyle}>Tier 4 — Zone bonus</span>
          <div style={rowStyle}>{dot('#8b5cf6')}Near liquidity zone</div>
          {badge('LOT SIZE BOOSTED', '#8b5cf6', '#8b5cf618')}
        </div>
      )}

      {/* Final direction banner */}
      {s.finalDirection !== 0 && (
        <div style={{
          marginTop: '8px', padding: '10px',
          borderRadius: '6px', textAlign: 'center',
          fontWeight: '700', fontSize: '13px',
          letterSpacing: '0.05em',
          animation: 'pulseBanner 1s ease-in-out infinite',
          background: s.finalDirection === 1 ? '#00d4aa18' : '#f43f5e18',
          color: s.finalDirection === 1 ? '#00d4aa' : '#f43f5e',
          border: `1px solid ${s.finalDirection === 1 ? '#00d4aa44' : '#f43f5e44'}`
        }}>
          {s.finalDirection === 1 ? 'BUY SIGNAL ACTIVE' : 'SELL SIGNAL ACTIVE'}
        </div>
      )}

      {/* No active conditions message */}
      {tier1Active.length === 0 && !tier2Active && tier3Active.length === 0 && !tier4Active && (
        <div style={{ color: '#475569', fontSize: '11px', padding: '8px 4px' }}>
          No conditions currently met
        </div>
      )}
    </div>
  )
}
