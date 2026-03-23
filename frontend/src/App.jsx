import { useState, useEffect, useRef } from 'react'
import useWebSocket from './hooks/useWebSocket'
import CandlestickChart from './components/CandlestickChart'
import MarketDepth from './components/MarketDepth'
import TradeTicket from './components/TradeTicket'
import DrawdownGauge from './components/DrawdownGauge'
import SignalPanel from './components/SignalPanel'
import ZoneMap from './components/ZoneMap'
import SettingsPanel from './components/SettingsPanel'
import { formatCurrency, formatTime, getDirectionLabel, getDirectionColor } from './utils/formatters'
import { useWindowSize, isMobile, isTablet } from './hooks/useWindowSize'
import MobileApp from './components/mobile/MobileApp'
import { HistoryTable } from './components/TradeTable'

const WS_URL = window.location.hostname === 'localhost'
  ? 'ws://localhost:8765'
  : `ws://${window.location.hostname}/ws`

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'XAUUSD', 'BTCUSD']

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

// Simulated 24h price changes per symbol
const MOCK_CHANGES = {
  EURUSD: +0.12, GBPUSD: -0.34, USDJPY: +0.57, USDCHF: -0.09,
  AUDUSD: +0.22, XAUUSD: +0.81, BTCUSD: +2.43,
}

// Simulated current prices (live price would come from ws)
const MOCK_PRICES = {
  EURUSD: '1.08524', GBPUSD: '1.26371', USDJPY: '149.512',
  USDCHF: '0.89604', AUDUSD: '0.64518', XAUUSD: '2301.45', BTCUSD: '71245.00',
}

// ── Inline helpers ──────────────────────────────────────────────────────────

function Cell({ label, value, valueColor = '#e2e8f0' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #0f2a4a' }}>
      <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{label}</span>
      <span style={{ fontSize: 12, color: valueColor, fontFamily: 'monospace', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div style={{ fontSize: 10, color: '#475569', letterSpacing: '0.08em', fontFamily: 'monospace', marginTop: 10, marginBottom: 4, paddingBottom: 2, borderBottom: '1px solid #1e293b' }}>
      {title}
    </div>
  )
}

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const { tradeData, isConnected, lastUpdate, error, sendMessage, reconnect, signalLog } = useWebSocket(WS_URL)

  const { width } = useWindowSize()
  const [activeSymbol,      setActiveSymbol]      = useState('EURUSD')
  const [activeTab,         setActiveTab]         = useState('Positions')
  const [currentSettings,   setCurrentSettings]   = useState({})
  const [showSettings,      setShowSettings]      = useState(false)
  const [clock,             setClock]             = useState('')
  const [showStatsDrawer,   setShowStatsDrawer]   = useState(false)
  const [showDepthDrawer,   setShowDepthDrawer]   = useState(false)
  const lastValidDataRef = useRef(null)

  // Preserve last valid trade payload
  useEffect(() => {
    if (tradeData && tradeData.type !== 'settings_confirmed') {
      lastValidDataRef.current = tradeData
    }
    if (tradeData?.type === 'settings_confirmed') {
      setCurrentSettings(tradeData.payload ?? {})
    }
  }, [tradeData])

  const activeData = tradeData?.type === 'settings_confirmed' ? lastValidDataRef.current : tradeData
  const balance    = activeData?.meta?.accountBalance   ?? 0
  const equity     = activeData?.meta?.accountEquity    ?? 0
  const margin     = activeData?.meta?.margin           ?? 0
  const freeMargin = activeData?.meta?.freeMargin       ?? 0
  const ddPct      = activeData?.meta?.dailyDrawdownPct ?? 0
  const ddLimit    = currentSettings.DailyDrawdownLimitPct ?? 3
  const trades     = activeData?.trades ?? []
  const masterOn   = currentSettings.MasterSwitch ?? true

  // Live clock
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(now.toTimeString().slice(0, 8))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Symbol tabs — union of live trade symbols + defaults
  const symbolTabs = [...new Set([
    ...(activeData?.trades ?? []).map(t => t.symbol),
    ...SYMBOLS,
  ])]

  // P&L history from PnLChart logic (mini version)
  const pnlHistory = useRef([])
  useEffect(() => {
    if (equity && balance) {
      const pnl = equity - balance
      pnlHistory.current = [...pnlHistory.current.slice(-49), pnl]
    }
  }, [equity, balance])

  // Current price for market depth
  const currentPrice = parseFloat(MOCK_PRICES[activeSymbol] ?? '1.0')

  function handleSaveSettings(updated) {
    sendMessage({ type: 'settings_update', payload: updated })
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const panelBg   = '#0a1628'
  const cardBg    = '#0f1e35'
  const border    = '1px solid #1e293b'

  // ── Render ────────────────────────────────────────────────────────────────

  if (width < 768) {
    return (
      <MobileApp
        tradeData={activeData}
        isConnected={isConnected}
        sendMessage={sendMessage}
        signalLog={signalLog}
      />
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: isMobile(width) ? '48px 1fr auto' : '48px 1fr 48px',
      gridTemplateColumns: isMobile(width)
        ? '1fr'
        : isTablet(width)
          ? '1fr 200px'
          : '220px 1fr 240px',
      gridTemplateAreas: isMobile(width)
        ? `"navbar" "chart-main" "bottom"`
        : isTablet(width)
          ? `"navbar navbar" "chart-main sidebar-right" "bottom bottom"`
          : `"navbar navbar navbar" "sidebar-left chart-main sidebar-right" "bottom bottom bottom"`,
      height: '100vh',
      overflow: 'hidden',
      background: '#060b14',
    }}>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* NAVBAR                                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <nav style={{
        gridArea: 'navbar',
        background: panelBg,
        borderBottom: border,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        gap: 12,
        zIndex: 10,
      }}>
        {isMobile(width) ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: isConnected ? '#00d4aa' : '#f43f5e', fontSize: '8px' }}>●</span>
              <span style={{ fontWeight: '600', fontSize: '14px', color: '#e2e8f0' }}>TradingBot Pro</span>
            </div>
            <select
              value={activeSymbol}
              onChange={e => setActiveSymbol(e.target.value)}
              style={{ background: '#0f1e35', color: '#e2e8f0', border: '1px solid #1e293b', borderRadius: '4px', padding: '4px 8px', fontSize: '12px' }}
            >
              {symbolTabs.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>
              {formatCurrency(activeData?.meta?.accountBalance ?? 0)}
            </span>
          </div>
        ) : (
          <>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: isConnected ? '#00d4aa' : '#f43f5e',
                boxShadow: isConnected ? '0 0 6px #00d4aa' : 'none',
                animation: isConnected ? 'pulse 2s infinite' : 'none',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>TradingBot Pro</span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#60a5fa',
                background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(59,130,246,0.4)',
                borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace',
              }}>MT5</span>
            </div>

            {/* Symbol tabs */}
            <div style={{ display: 'flex', gap: 4, flex: 1, overflowX: 'auto' }}>
              {symbolTabs.slice(0, 8).map(sym => {
                const change = MOCK_CHANGES[sym] ?? 0
                const price  = MOCK_PRICES[sym]  ?? '—'
                const active = sym === activeSymbol
                return (
                  <button
                    key={sym}
                    onClick={() => setActiveSymbol(sym)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      padding: '3px 10px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
                      background: active ? 'rgba(37,99,235,0.25)' : 'transparent',
                      border: active ? '1px solid #2563eb' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                      minWidth: 72,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#e2e8f0' : '#94a3b8', fontFamily: 'monospace' }}>{sym}</span>
                    <span style={{ fontSize: 9, color: change >= 0 ? '#00d4aa' : '#f43f5e', fontFamily: 'monospace' }}>
                      {price} <span>{change >= 0 ? '+' : ''}{change}%</span>
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Right section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: isConnected ? '#00d4aa' : '#f43f5e' }}>
                {isConnected ? '● LIVE' : '○ OFF'}
              </div>
              <span style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace' }}>{clock} UTC</span>
              <div style={{
                background: cardBg, border, borderRadius: 4,
                padding: '3px 8px', fontSize: 12, fontFamily: 'monospace', color: '#e2e8f0',
              }}>
                {formatCurrency(balance)}
              </div>
              <div style={{
                background: cardBg, border, borderRadius: 4,
                padding: '3px 8px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
              }}>
                <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>TOTAL P&L</div>
                <div style={{
                  fontSize: 14, fontWeight: 700, fontFamily: 'monospace',
                  color: (activeData?.meta?.totalProfit ?? 0) >= 0 ? '#00d4aa' : '#f43f5e',
                }}>
                  {formatCurrency(activeData?.meta?.totalProfit ?? 0)}
                </div>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  background: cardBg, border, borderRadius: 4,
                  padding: '3px 8px', fontSize: 11, color: '#94a3b8', cursor: 'pointer',
                  fontFamily: 'monospace', transition: 'all 0.15s ease',
                }}
              >
                ⚙ SETTINGS
              </button>
              {!isConnected && (
                <button
                  onClick={reconnect}
                  style={{
                    background: 'rgba(37,99,235,0.2)', border: '1px solid #2563eb',
                    borderRadius: 4, padding: '3px 8px', fontSize: 11, color: '#60a5fa',
                    cursor: 'pointer', fontFamily: 'monospace',
                  }}
                >
                  ↺ Reconnect
                </button>
              )}
            </div>
          </>
        )}
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SIDEBAR LEFT                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <aside style={{
        gridArea: 'sidebar-left',
        background: panelBg,
        borderRight: border,
        overflowY: 'auto',
        padding: '10px 10px',
        display: isMobile(width) || isTablet(width) ? 'none' : 'flex',
        flexDirection: 'column',
        gap: 2,
        minHeight: 0,
      }}>

        {/* Account stats */}
        <SectionHeader title="ACCOUNT" />
        <Cell label="Balance"     value={formatCurrency(balance)} />
        <Cell label="Equity"      value={formatCurrency(equity)}  valueColor={equity >= balance ? '#00d4aa' : '#f43f5e'} />
        <Cell label="Margin"      value={formatCurrency(margin)} />
        <Cell label="Free Margin" value={formatCurrency(freeMargin)} valueColor={freeMargin < margin * 0.5 ? '#f59e0b' : '#e2e8f0'} />

        {/* Daily stats */}
        <SectionHeader title="TODAY" />
        <Cell label="Trades"   value={trades.length} />
        <Cell label="Win Rate" value={trades.length > 0 ? '—' : '—'} />
        <Cell label="Daily P&L" value={formatCurrency(equity - balance)} valueColor={(equity - balance) >= 0 ? '#00d4aa' : '#f43f5e'} />
        <Cell label="Total P&L" value={formatCurrency(activeData?.meta?.totalProfit ?? 0)} valueColor={(activeData?.meta?.totalProfit ?? 0) >= 0 ? '#00d4aa' : '#f43f5e'} />

        {/* Drawdown gauge */}
        <SectionHeader title="DRAWDOWN" />
        <div style={{ transform: 'scale(0.85)', transformOrigin: 'top left', width: '118%', marginBottom: -20 }}>
          <DrawdownGauge currentPct={ddPct} limitPct={ddLimit} />
        </div>

        {/* Signal status */}
        <SectionHeader title="LAST SIGNAL" />
        {activeData?.meta?.lastSignal ? (
          <div style={{ background: cardBg, border: '1px solid #0f2a4a', borderRadius: 4, padding: '6px 8px' }}>
            <div style={{ fontSize: 11, color: '#e2e8f0', fontFamily: 'monospace' }}>
              {activeData.meta.lastSignal.symbol ?? activeSymbol}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>
              {activeData.meta.lastSignal.direction === 1
                ? <span style={{ color: '#00d4aa' }}>▲ BUY</span>
                : activeData.meta.lastSignal.direction === -1
                  ? <span style={{ color: '#f43f5e' }}>▼ SELL</span>
                  : '—'}
              {' '}· Tier {activeData.meta.lastSignal.tier ?? '—'}
            </div>
            <div style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', marginTop: 2 }}>
              {activeData.meta.lastSignal.timestamp
                ? formatTime(activeData.meta.lastSignal.timestamp)
                : '—'}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', padding: '4px 0' }}>Scanning...</div>
        )}

        {/* Signal panel */}
        <SectionHeader title="SIGNAL MONITOR" />
        {console.log('[App] signalState being passed:', tradeData?.signalState)}
        <SignalPanel signalState={tradeData?.signalState} />

        {/* Bot status */}
        <SectionHeader title="BOT STATUS" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: masterOn ? '#00d4aa' : '#f43f5e',
            boxShadow: masterOn ? '0 0 5px #00d4aa' : 'none',
          }} />
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: masterOn ? '#00d4aa' : '#f43f5e', fontWeight: 700 }}>
            {masterOn ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>

        {error && (
          <div style={{
            marginTop: 8, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)',
            borderRadius: 4, padding: '6px 8px', fontSize: 10, color: '#f87171', fontFamily: 'monospace',
          }}>
            {error}
          </div>
        )}
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CHART MAIN                                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <main style={{
        gridArea: 'chart-main',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#060b14',
        minHeight: 0,
      }}>
        {/* Chart header */}
        <div style={{
          padding: '6px 12px',
          borderBottom: border,
          background: panelBg,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>{activeSymbol}</span>
          <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>· MT5</span>
          <span style={{
            marginLeft: 'auto', fontSize: 10, color: '#475569', fontFamily: 'monospace',
          }}>
            {lastUpdate ? `Updated ${lastUpdate.toTimeString().slice(0, 8)}` : 'Awaiting data...'}
          </span>
        </div>

        {/* Candlestick chart — scrollable only if content overflows */}
        <div style={{ flexShrink: 0 }}>
          <CandlestickChart symbol={activeSymbol} wsData={activeData} />
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex',
          borderBottom: border,
          borderTop: border,
          background: panelBg,
          flexShrink: 0,
        }}>
          {['Positions', 'History', 'Signals', 'Zones'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 16px',
                fontSize: 11,
                fontFamily: 'monospace',
                fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? '#e2e8f0' : '#475569',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#060b14' }}>

          {/* ── Positions ── */}
          {activeTab === 'Positions' && (
            <div>
              {trades.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>
                  No open positions
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', minWidth: isMobile(width) ? '600px' : '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'monospace' }}>
                  <thead>
                    <tr style={{ background: cardBg, color: '#475569' }}>
                      {['SYMBOL', 'DIR', 'LOT', 'ENTRY', 'SL', 'TP', 'P&L', 'STATUS'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, fontSize: 10, letterSpacing: '0.05em', borderBottom: '1px solid #0f2a4a' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade, i) => {
                      const pnl = trade.unrealizedPnl ?? trade.pnl ?? 0
                      const dir = trade.direction === 1 ? 'BUY' : 'SELL'
                      return (
                        <tr
                          key={trade.ticket ?? i}
                          style={{ borderBottom: '1px solid #0a1628', background: i % 2 === 0 ? '#060b14' : '#080e1a' }}
                        >
                          <td style={{ padding: '6px 10px', color: '#e2e8f0', fontWeight: 700 }}>{trade.symbol}</td>
                          <td style={{ padding: '6px 10px' }}>
                            <span style={{
                              padding: '2px 6px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                              background: dir === 'BUY' ? 'rgba(0,212,170,0.15)' : 'rgba(244,63,94,0.15)',
                              color: dir === 'BUY' ? '#00d4aa' : '#f43f5e',
                              border: `1px solid ${dir === 'BUY' ? '#00d4aa' : '#f43f5e'}`,
                            }}>{dir}</span>
                          </td>
                          <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{trade.lotSize ?? trade.lot ?? '—'}</td>
                          <td style={{ padding: '6px 10px', color: '#94a3b8' }}>{trade.entryPrice?.toFixed(5) ?? '—'}</td>
                          <td style={{ padding: '6px 10px', color: '#f43f5e' }}>{trade.stopLoss?.toFixed(5) ?? '—'}</td>
                          <td style={{ padding: '6px 10px', color: '#00d4aa' }}>{trade.takeProfit?.toFixed(5) ?? '—'}</td>
                          <td style={{ padding: '6px 10px', fontWeight: 700, color: pnl >= 0 ? '#00d4aa' : '#f43f5e' }}>
                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {trade.isLocked && (
                                <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 2, background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid #f59e0b' }}>LOCK</span>
                              )}
                              {trade.isHedged && (
                                <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 2, background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid #8b5cf6' }}>HEDGE</span>
                              )}
                              {!trade.isLocked && !trade.isHedged && (
                                <span style={{ fontSize: 9, color: '#475569' }}>—</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          )}

          {/* ── History ── */}
          {activeTab === 'History' && (
            <div style={{ padding: 8 }}>
              <HistoryTable history={activeData?.history ?? []} />
            </div>
          )}

          {/* ── Signals ── */}
          {activeTab === 'Signals' && (
            <div style={{ padding: 8 }}>
              {signalLog.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12, fontFamily: 'monospace' }}>
                  Awaiting signal evaluations...
                </div>
              ) : (
                signalLog.map((entry, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '6px 8px', borderBottom: '1px solid #0f2a4a',
                      fontSize: 11, fontFamily: 'monospace',
                    }}
                  >
                    <span style={{ color: '#475569', flexShrink: 0 }}>
                      {entry.timestamp ? new Date(entry.timestamp).toTimeString().slice(0, 8) : '—'}
                    </span>
                    <span style={{ color: '#94a3b8', flexShrink: 0 }}>{entry.symbol ?? '—'}</span>
                    <span style={{ color: entry.direction === 1 ? '#00d4aa' : '#f43f5e' }}>
                      {entry.direction === 1 ? '▲ BUY' : entry.direction === -1 ? '▼ SELL' : '—'}
                    </span>
                    {entry.tier && <span style={{ color: '#475569' }}>Tier {entry.tier}</span>}
                    {entry.reason && <span style={{ color: '#475569' }}>{entry.reason}</span>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Zones ── */}
          {activeTab === 'Zones' && (
            <div style={{ padding: 8 }}>
              <ZoneMap trades={trades} symbol={activeSymbol} />
            </div>
          )}
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SIDEBAR RIGHT                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <aside style={{
        gridArea: 'sidebar-right',
        display: isMobile(width) ? 'none' : 'flex',
        flexDirection: 'column',
        borderLeft: border,
        overflow: 'hidden',
        overflowY: 'auto',
        minHeight: 0,
      }}>
        {/* Market depth — top half */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <MarketDepth symbol={activeSymbol} currentPrice={currentPrice} />
        </div>

        {/* Trade ticket — bottom half */}
        <div style={{ flex: 1, borderTop: border, overflow: 'hidden' }}>
          <TradeTicket defaultSymbol={activeSymbol} />
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BOTTOM STRIP                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <footer style={{
        gridArea: 'bottom',
        height: isMobile(width) ? 'auto' : '48px',
        flexShrink: 0,
        background: panelBg,
        borderTop: border,
        display: 'flex',
        flexDirection: isMobile(width) ? 'column' : 'row',
        alignItems: isMobile(width) ? 'stretch' : 'center',
        overflow: isMobile(width) ? 'visible' : 'hidden',
      }}>

        {/* Mobile: Stats / Depth / Settings buttons */}
        {isMobile(width) && (
          <div style={{ display: 'flex', gap: '8px', padding: '6px 12px', background: '#0a1628', borderTop: '1px solid #1e293b' }}>
            <button onClick={() => setShowStatsDrawer(v => !v)}
              style={{ flex: 1, padding: '8px', background: '#0f1e35', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              Stats {showStatsDrawer ? '▼' : '▲'}
            </button>
            <button onClick={() => setShowDepthDrawer(v => !v)}
              style={{ flex: 1, padding: '8px', background: '#0f1e35', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              Depth {showDepthDrawer ? '▼' : '▲'}
            </button>
            <button onClick={() => setShowSettings(true)}
              style={{ flex: 1, padding: '8px', background: '#0f1e35', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
              Settings
            </button>
          </div>
        )}

        {/* Mobile: Stats drawer */}
        {isMobile(width) && showStatsDrawer && (
          <div style={{ background: '#0a1628', borderTop: '1px solid #1e293b', padding: '12px', maxHeight: '60vh', overflowY: 'auto', transition: 'all 0.3s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'Balance',   value: formatCurrency(activeData?.meta?.accountBalance ?? 0), color: '#e2e8f0' },
                { label: 'Equity',    value: formatCurrency(activeData?.meta?.accountEquity ?? 0),  color: '#00d4aa' },
                { label: 'Drawdown',  value: `${(activeData?.meta?.dailyDrawdownPct ?? 0).toFixed(2)}%`, color: '#f59e0b' },
                { label: 'Positions', value: `${activeData?.trades?.length ?? 0}/3`, color: '#e2e8f0' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#0f1e35', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '10px', color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color, fontFamily: 'monospace' }}>{value}</div>
                </div>
              ))}
            </div>
            <SignalPanel signalState={activeData?.signalState} />
          </div>
        )}

        {/* Mobile: Depth drawer */}
        {isMobile(width) && showDepthDrawer && (
          <div style={{ background: '#0a1628', borderTop: '1px solid #1e293b', padding: '12px', maxHeight: '50vh', overflowY: 'auto' }}>
            <MarketDepth symbol={activeSymbol} currentPrice={currentPrice} />
          </div>
        )}

        {/* News ticker */}
        <div style={{
          borderBottom: border,
          padding: '4px 0',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          height: isMobile(width) ? 36 : 28,
        }}>
          <span style={{
            fontSize: 10, fontFamily: 'monospace', color: '#f59e0b', fontWeight: 700,
            padding: '0 10px', flexShrink: 0, borderRight: '1px solid #1e293b',
          }}>NEWS</span>
          <div style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
            <div style={{
              display: 'flex', gap: 32, padding: '0 16px',
              animation: 'scroll-left 40s linear infinite',
              whiteSpace: 'nowrap',
              fontSize: 11, fontFamily: 'monospace', color: '#94a3b8',
            }}>
              {(activeData?.meta?.newsEvents ?? STATIC_NEWS).map((item, i) => (
                <span key={i} style={{ flexShrink: 0 }}>
                  <span style={{ color: '#475569' }}>{item.time}</span>
                  {' '}
                  <span style={{
                    color: item.impact === 'HIGH' ? '#f43f5e' : item.impact === 'MED' ? '#f59e0b' : '#475569',
                    fontWeight: item.impact === 'HIGH' ? 700 : 400,
                  }}>[{item.currency}]</span>
                  {' '}{item.event}
                </span>
              ))}
              {/* Duplicate for seamless loop */}
              {(activeData?.meta?.newsEvents ?? STATIC_NEWS).map((item, i) => (
                <span key={`dup-${i}`} style={{ flexShrink: 0 }}>
                  <span style={{ color: '#475569' }}>{item.time}</span>
                  {' '}
                  <span style={{ color: item.impact === 'HIGH' ? '#f43f5e' : item.impact === 'MED' ? '#f59e0b' : '#475569', fontWeight: item.impact === 'HIGH' ? 700 : 400 }}>
                    [{item.currency}]
                  </span>
                  {' '}{item.event}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Mini P&L chart + account summary */}
        {!isMobile(width) && <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 24 }}>

          {/* Mini P&L bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace', letterSpacing: '0.05em' }}>RECENT P&L</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
              {(pnlHistory.current.length > 0 ? pnlHistory.current.slice(-10) : [0, 5, -3, 8, -2, 12, 4, -1, 7, 9]).map((v, i) => {
                const maxAbs = Math.max(...[0, 5, -3, 8, -2, 12, 4, -1, 7, 9].map(Math.abs), 1)
                const h = Math.max(2, Math.abs(v) / maxAbs * 36)
                return (
                  <div key={i} style={{
                    width: 8, height: h,
                    background: v >= 0 ? '#00d4aa' : '#f43f5e',
                    borderRadius: 2, flexShrink: 0,
                    opacity: 0.7 + (i / 10) * 0.3,
                  }} />
                )
              })}
            </div>
          </div>

          {/* Stat row */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { label: 'BALANCE',   value: formatCurrency(balance) },
              { label: 'EQUITY',    value: formatCurrency(equity),   color: equity >= balance ? '#00d4aa' : '#f43f5e' },
              { label: 'DRAWDOWN',  value: `${ddPct.toFixed(2)}%`,  color: ddPct > ddLimit * 0.75 ? '#f43f5e' : '#94a3b8' },
              { label: 'POSITIONS', value: trades.length },
              { label: 'STATUS',    value: isConnected ? 'LIVE' : 'OFFLINE', color: isConnected ? '#00d4aa' : '#f43f5e' },
            ].map(({ label, value, color = '#e2e8f0' }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontSize: 14, color, fontFamily: 'monospace', fontWeight: 700, marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>}
      </footer>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SETTINGS MODAL                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showSettings && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(6,11,20,0.85)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
          zIndex: 50, padding: 16,
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false) }}
        >
          <div style={{
            background: panelBg,
            border,
            borderRadius: 6,
            width: 480,
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 0 40px rgba(0,0,0,0.8)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderBottom: border,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>SETTINGS</span>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: 'none', border: 'none', color: '#475569',
                  fontSize: 16, cursor: 'pointer', lineHeight: 1, padding: 4,
                }}
              >✕</button>
            </div>
            <div style={{ padding: 14 }}>
              <SettingsPanel
                currentSettings={currentSettings}
                onSave={handleSaveSettings}
                isConnected={isConnected}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes scroll-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

    </div>
  )
}
