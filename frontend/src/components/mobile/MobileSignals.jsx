export default function MobileSignals({ signalState, signalLog }) {
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

  const row = (label, color = '#00d4aa') => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #0f2a4a' }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }}/>
      <span style={{ fontSize: '14px', color: '#e2e8f0' }}>{label}</span>
    </div>
  )

  const sectionCard = (title, children) => (
    <div style={{ background: '#0f1e35', borderRadius: '8px', border: '1px solid #1e293b', padding: '12px 14px', marginBottom: '10px' }}>
      <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{title}</div>
      {children}
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '12px', background: '#060b14' }}>

      {!s ? (
        <div style={{ color: '#475569', fontSize: '14px', padding: '20px 0', textAlign: 'center' }}>
          Waiting for signal data...
        </div>
      ) : (
        <>
          {/* Tier 1 */}
          {sectionCard('Tier 1 — Risk Gates', (
            <>
              {tier1Items.map(i => s[i.key] && row(i.label, '#00d4aa'))}
              {!tier1Items.some(i => s[i.key]) && <span style={{ fontSize: '13px', color: '#475569' }}>No gates passing</span>}
            </>
          ))}

          {/* Tier 2 */}
          {s.t2_bias !== 0 && sectionCard('Tier 2 — Directional Bias', (
            <>
              {s.t2_htfTrend && row('H4 trend aligned', '#3b82f6')}
              {s.t2_priceVsMA && row('Price vs key MAs', '#3b82f6')}
              <div style={{ marginTop: '8px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: '700', padding: '4px 10px', borderRadius: '4px',
                  background: s.t2_bias === 1 ? '#00d4aa18' : '#f43f5e18',
                  color: s.t2_bias === 1 ? '#00d4aa' : '#f43f5e',
                }}>{s.t2_bias === 1 ? 'BULLISH BIAS' : 'BEARISH BIAS'}</span>
              </div>
            </>
          ))}

          {/* Tier 3 */}
          {tier3Items.some(i => s[i.key]) && sectionCard('Tier 3 — Entry Signals', (
            <>
              {tier3Items.map(i => s[i.key] && row(i.label, '#f59e0b'))}
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1, height: '6px', background: '#1e293b', borderRadius: '3px' }}>
                  <div style={{ height: '100%', borderRadius: '3px', width: `${(s.t3_score / 4) * 100}%`, background: s.t3_score >= 2 ? '#00d4aa' : '#f59e0b', transition: 'width 0.3s ease' }}/>
                </div>
                <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '700' }}>{s.t3_score}/4</span>
              </div>
            </>
          ))}

          {/* Tier 4 */}
          {s.t4_zoneBonus && sectionCard('Tier 4 — Zone Bonus',
            row('Near liquidity zone', '#8b5cf6')
          )}

          {/* Final direction */}
          {s.finalDirection !== 0 && (
            <div style={{
              marginBottom: '10px', padding: '14px', borderRadius: '8px', textAlign: 'center',
              fontWeight: '700', fontSize: '16px',
              background: s.finalDirection === 1 ? '#00d4aa18' : '#f43f5e18',
              color: s.finalDirection === 1 ? '#00d4aa' : '#f43f5e',
              border: `1px solid ${s.finalDirection === 1 ? '#00d4aa44' : '#f43f5e44'}`,
              animation: 'pulseBanner 1s ease-in-out infinite',
            }}>
              {s.finalDirection === 1 ? 'BUY SIGNAL ACTIVE' : 'SELL SIGNAL ACTIVE'}
            </div>
          )}
        </>
      )}

      {/* Divider */}
      <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '12px 0 8px', borderBottom: '1px solid #1e293b', marginBottom: '8px' }}>
        Recent Evaluations
      </div>

      {/* Signal log */}
      {(!signalLog || signalLog.length === 0) ? (
        <div style={{ fontSize: '13px', color: '#475569', padding: '16px 0', textAlign: 'center' }}>
          Signal evaluations will appear here
        </div>
      ) : signalLog.map((entry, i) => (
        <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid #0f1e35', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '10px', color: '#475569', minWidth: '50px' }}>
            {entry.timestamp ? new Date(entry.timestamp).toTimeString().slice(0, 8) : '—'}
          </span>
          <span style={{ fontSize: '11px', fontWeight: '600', minWidth: '40px', color: entry.direction === 1 ? '#00d4aa' : entry.direction === -1 ? '#f43f5e' : '#475569' }}>
            {entry.direction === 1 ? '▲ BUY' : entry.direction === -1 ? '▼ SELL' : 'SCAN'}
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8', flex: 1 }}>{entry.reason ?? '—'}</span>
        </div>
      ))}

      <style>{`@keyframes pulseBanner { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
    </div>
  )
}
