const STATIC_NEWS = [
  { time: '08:30', currency: 'USD', event: 'Non-Farm Payrolls', impact: 'HIGH' },
  { time: '10:00', currency: 'EUR', event: 'ECB Interest Rate Decision', impact: 'HIGH' },
  { time: '13:30', currency: 'GBP', event: 'CPI y/y', impact: 'MED' },
  { time: '15:00', currency: 'USD', event: 'ISM Manufacturing PMI', impact: 'MED' },
  { time: '18:00', currency: 'CAD', event: 'BOC Rate Statement', impact: 'HIGH' },
  { time: '02:00', currency: 'CNY', event: 'CPI m/m', impact: 'MED' },
  { time: '07:45', currency: 'EUR', event: 'French Industrial Production', impact: 'LOW' },
  { time: '12:30', currency: 'USD', event: 'Jobless Claims', impact: 'MED' },
]

export default function MobileNews({ wsData }) {
  const events = wsData?.meta?.newsEvents ?? STATIC_NEWS
  const isLive = !!(wsData?.meta?.newsEvents)

  const impactColor = (impact) =>
    impact === 'HIGH' ? '#f43f5e' : impact === 'MED' ? '#f59e0b' : '#475569'

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#060b14' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#e2e8f0' }}>Upcoming News Events</span>
        <span style={{ fontSize: '11px', background: '#0f1e35', color: '#94a3b8', padding: '1px 8px', borderRadius: '10px', border: '1px solid #1e293b' }}>
          {events.length}
        </span>
        {!isLive && <span style={{ fontSize: '10px', color: '#475569', marginLeft: 'auto' }}>static</span>}
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '13px', color: '#475569' }}>
          No news events loaded. Bridge fetches ForexFactory data every 6 hours.
        </div>
      ) : events.map((item, i) => (
        <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #0f1e35', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ minWidth: '44px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#475569' }}>{item.time}</div>
            <div style={{ fontSize: '10px', fontWeight: '700', marginTop: '2px', color: impactColor(item.impact) }}>
              {item.currency}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '4px' }}>{item.event}</div>
            <div style={{
              fontSize: '10px', display: 'inline-block', padding: '1px 6px', borderRadius: '3px',
              background: item.impact === 'HIGH' ? '#f43f5e22' : '#f59e0b22',
              color: impactColor(item.impact),
            }}>{item.impact} impact</div>
          </div>
        </div>
      ))}
    </div>
  )
}
