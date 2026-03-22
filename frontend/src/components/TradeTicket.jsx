import { useState, useEffect } from 'react'

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'XAUUSD', 'BTCUSD']
const PIP_VALUE_PER_LOT = { EURUSD: 10, GBPUSD: 10, USDJPY: 6.7, USDCHF: 11.2, AUDUSD: 10, XAUUSD: 1, BTCUSD: 10 }

function getPipValue(symbol) {
  return PIP_VALUE_PER_LOT[symbol] ?? 10
}

export default function TradeTicket({ onTrade, defaultSymbol = 'EURUSD' }) {
  const [symbol, setSymbol] = useState(defaultSymbol)
  const [direction, setDirection] = useState('BUY')
  const [lotSize, setLotSize] = useState('0.01')
  const [slPips, setSlPips] = useState('20')
  const [tpPips, setTpPips] = useState('40')
  const [toast, setToast] = useState(false)

  useEffect(() => {
    setSymbol(defaultSymbol)
  }, [defaultSymbol])

  const pipVal = getPipValue(symbol)
  const lot = parseFloat(lotSize) || 0
  const sl = parseFloat(slPips) || 0
  const tp = parseFloat(tpPips) || 0
  const risk = (lot * sl * pipVal).toFixed(2)
  const reward = (lot * tp * pipVal).toFixed(2)
  const rrRatio = sl > 0 ? (tp / sl).toFixed(1) : '—'

  const handleOrder = (dir) => {
    setToast(true)
    setTimeout(() => setToast(false), 2000)
    if (onTrade) onTrade({ symbol, direction: dir === 'BUY' ? 1 : -1, lotSize: lot, sl, tp })
  }

  const inputStyle = {
    width: '100%',
    padding: '5px 8px',
    background: '#0f1e35',
    border: '1px solid #1e293b',
    borderRadius: 4,
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: 'monospace',
    outline: 'none',
  }

  const labelStyle = {
    fontSize: 10,
    color: '#475569',
    marginBottom: 3,
    display: 'block',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
  }

  return (
    <div style={{
      background: '#0a1628',
      padding: 10,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #1e293b',
        paddingBottom: 6,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em' }}>TRADE TICKET</span>
        <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>UI ONLY</span>
      </div>

      {/* Symbol selector */}
      <div>
        <label style={labelStyle}>SYMBOL</label>
        <select
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Direction toggle */}
      <div>
        <label style={labelStyle}>DIRECTION</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          <button
            onClick={() => setDirection('BUY')}
            style={{
              padding: '5px 0',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'monospace',
              border: '1px solid',
              borderColor: direction === 'BUY' ? '#00d4aa' : '#1e293b',
              borderRadius: 4,
              background: direction === 'BUY' ? 'rgba(0,212,170,0.15)' : '#0f1e35',
              color: direction === 'BUY' ? '#00d4aa' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >BUY</button>
          <button
            onClick={() => setDirection('SELL')}
            style={{
              padding: '5px 0',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'monospace',
              border: '1px solid',
              borderColor: direction === 'SELL' ? '#f43f5e' : '#1e293b',
              borderRadius: 4,
              background: direction === 'SELL' ? 'rgba(244,63,94,0.15)' : '#0f1e35',
              color: direction === 'SELL' ? '#f43f5e' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >SELL</button>
        </div>
      </div>

      {/* Lot / SL / TP row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <div>
          <label style={labelStyle}>LOT SIZE</label>
          <input type="number" step="0.01" min="0.01" value={lotSize} onChange={e => setLotSize(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>SL (PIPS)</label>
          <input type="number" step="1" min="0" value={slPips} onChange={e => setSlPips(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>TP (PIPS)</label>
          <input type="number" step="1" min="0" value={tpPips} onChange={e => setTpPips(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Risk / Reward */}
      <div style={{
        background: '#0f1e35',
        border: '1px solid #0f2a4a',
        borderRadius: 4,
        padding: '6px 10px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 4,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569', marginBottom: 2, fontFamily: 'monospace' }}>RISK</div>
          <div style={{ fontSize: 13, color: '#f43f5e', fontFamily: 'monospace', fontWeight: 700 }}>${risk}</div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid #1e293b', borderRight: '1px solid #1e293b' }}>
          <div style={{ fontSize: 9, color: '#475569', marginBottom: 2, fontFamily: 'monospace' }}>R:R</div>
          <div style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'monospace', fontWeight: 700 }}>1:{rrRatio}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#475569', marginBottom: 2, fontFamily: 'monospace' }}>REWARD</div>
          <div style={{ fontSize: 13, color: '#00d4aa', fontFamily: 'monospace', fontWeight: 700 }}>${reward}</div>
        </div>
      </div>

      {/* Order buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 'auto' }}>
        <button
          onClick={() => handleOrder('BUY')}
          style={{
            padding: '10px 0',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'monospace',
            background: 'rgba(0,212,170,0.2)',
            border: '1px solid #00d4aa',
            borderRadius: 4,
            color: '#00d4aa',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,0.35)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,212,170,0.2)'}
        >
          ▲ BUY
        </button>
        <button
          onClick={() => handleOrder('SELL')}
          style={{
            padding: '10px 0',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: 'monospace',
            background: 'rgba(244,63,94,0.2)',
            border: '1px solid #f43f5e',
            borderRadius: 4,
            color: '#f43f5e',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.35)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.2)'}
        >
          ▼ SELL
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: 8,
          right: 8,
          background: '#0f2a4a',
          border: '1px solid #2563eb',
          borderRadius: 4,
          padding: '8px 10px',
          fontSize: 11,
          color: '#94a3b8',
          fontFamily: 'monospace',
          textAlign: 'center',
          zIndex: 10,
        }}>
          Order sent to EA via settings.json
        </div>
      )}
    </div>
  )
}
