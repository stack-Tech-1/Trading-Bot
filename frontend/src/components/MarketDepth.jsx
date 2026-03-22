import { useMemo } from 'react'

function isForex(symbol) {
  const cryptos = ['BTC', 'ETH', 'LTC', 'XRP']
  const metals = ['XAU', 'XAG']
  if (!symbol) return true
  for (const c of [...cryptos, ...metals]) {
    if (symbol.includes(c)) return false
  }
  return true
}

function getDecimals(symbol) {
  if (!symbol) return 5
  if (symbol.includes('JPY')) return 3
  if (symbol.includes('XAU') || symbol.includes('BTC') || symbol.includes('ETH')) return 2
  if (symbol.includes('XAG')) return 3
  return 5
}

function getPipSize(symbol) {
  if (!symbol) return 0.00001
  if (symbol.includes('JPY')) return 0.001
  if (symbol.includes('XAU')) return 0.1
  if (symbol.includes('BTC')) return 5
  if (symbol.includes('ETH')) return 0.5
  return 0.00001
}

function generateLevels(basePrice, symbol, side, count = 8) {
  const pip = getPipSize(symbol)
  const levels = []
  for (let i = 0; i < count; i++) {
    const offset = (i + 1) * pip * (2 + Math.random() * 3)
    const price = side === 'ask' ? basePrice + offset : basePrice - offset
    const size = Math.floor(Math.random() * 4000 + 200)
    levels.push({ price, size })
  }
  return levels
}

export default function MarketDepth({ symbol = 'EURUSD', currentPrice = 0 }) {
  const decimals = getDecimals(symbol)

  const { asks, bids, maxSize } = useMemo(() => {
    const base = currentPrice > 0 ? currentPrice : 1.08
    const asksRaw = generateLevels(base, symbol, 'ask').sort((a, b) => a.price - b.price)
    const bidsRaw = generateLevels(base, symbol, 'bid').sort((a, b) => b.price - a.price)
    const allSizes = [...asksRaw, ...bidsRaw].map(l => l.size)
    const max = Math.max(...allSizes)
    return { asks: asksRaw, bids: bidsRaw, maxSize: max }
  }, [symbol, currentPrice]) // eslint-disable-line react-hooks/exhaustive-deps

  const spread = asks.length && bids.length
    ? (asks[0].price - bids[0].price).toFixed(decimals)
    : '—'

  const fmtPrice = (p) => Number(p).toFixed(decimals)
  const fmtSize = (s) => s.toLocaleString()

  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '80px 60px 1fr',
    alignItems: 'center',
    height: 28,
    padding: '0 8px',
    fontSize: 11,
    fontFamily: 'monospace',
    gap: 4,
  }

  return (
    <div style={{ background: '#0a1628', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '6px 8px',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>MARKET DEPTH</span>
        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>{symbol}</span>
      </div>

      {/* Column headers */}
      <div style={{ ...rowStyle, color: '#475569', borderBottom: '1px solid #0f2a4a', fontSize: 10 }}>
        <span>PRICE</span>
        <span style={{ textAlign: 'right' }}>SIZE</span>
        <span />
      </div>

      {/* Asks — reversed so highest ask is at top */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {[...asks].reverse().map((level, i) => (
          <div key={`ask-${i}`} style={{ ...rowStyle, color: '#f43f5e', position: 'relative' }}>
            <span>{fmtPrice(level.price)}</span>
            <span style={{ textAlign: 'right', color: '#94a3b8' }}>{fmtSize(level.size)}</span>
            <div style={{ position: 'relative', height: 12 }}>
              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                height: '100%',
                width: `${(level.size / maxSize) * 100}%`,
                background: 'rgba(244,63,94,0.2)',
                borderRadius: 1,
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Spread */}
      <div style={{
        padding: '4px 8px',
        background: '#0f1e35',
        borderTop: '1px solid #0f2a4a',
        borderBottom: '1px solid #0f2a4a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 10,
        fontFamily: 'monospace',
      }}>
        <span style={{ color: '#475569' }}>SPREAD</span>
        <span style={{ color: '#e2e8f0' }}>{spread}</span>
        <span style={{ color: '#475569' }}>BID/ASK</span>
      </div>

      {/* Bids */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {bids.map((level, i) => (
          <div key={`bid-${i}`} style={{ ...rowStyle, color: '#00d4aa', position: 'relative' }}>
            <span>{fmtPrice(level.price)}</span>
            <span style={{ textAlign: 'right', color: '#94a3b8' }}>{fmtSize(level.size)}</span>
            <div style={{ position: 'relative', height: 12 }}>
              <div style={{
                position: 'absolute',
                right: 0,
                top: 0,
                height: '100%',
                width: `${(level.size / maxSize) * 100}%`,
                background: 'rgba(0,212,170,0.2)',
                borderRadius: 1,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
