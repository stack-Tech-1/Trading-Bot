import { useState } from 'react'
import CandlestickChart from '../CandlestickChart'

export default function MobileChart({ wsData, signalState, trades, signalLog, activeSymbol, setActiveSymbol, symbolList }) {
  const [chartSubTab, setChartSubTab] = useState('Positions')

  const chartHeight = window.innerHeight < 700 ? 308 : 358

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', minHeight: 0 }}>

      {/* Row 1: Symbol strip */}
      <div style={{
        height: '32px', flexShrink: 0,
        display: 'flex', overflowX: 'auto', overflowY: 'hidden',
        background: '#0a1628', borderBottom: '1px solid #1e293b',
        WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
      }}>
        {(symbolList ?? []).map(sym => (
          <button key={sym} onClick={() => setActiveSymbol(sym)} style={{
            flexShrink: 0, border: 'none', background: 'transparent',
            padding: '0 12px', height: '100%',
            fontSize: '11px', fontWeight: '700', cursor: 'pointer',
            color: activeSymbol === sym ? '#00d4aa' : '#475569',
            borderBottom: activeSymbol === sym ? '2px solid #00d4aa' : '2px solid transparent',
            whiteSpace: 'nowrap',
          }}>{sym}</button>
        ))}
      </div>

      {/* Row 2: Chart — fixed height, completely self-contained */}
      <div style={{ height: `${chartHeight}px`, flexShrink: 0, position: 'relative', background: '#060b14' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
          <CandlestickChart symbol={activeSymbol ?? 'EURUSD'} wsData={wsData} />
        </div>

        {/* Signal overlay — absolute inside chart */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: '36px', background: 'rgba(10,22,40,0.92)',
          borderTop: '1px solid #1e293b',
          display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: '6px', zIndex: 5
        }}>
          <span style={{
            fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '3px',
            background: signalState?.t1_allPass ? '#00d4aa22' : '#f43f5e22',
            color: signalState?.t1_allPass ? '#00d4aa' : '#f43f5e'
          }}>T1 {signalState?.t1_allPass ? '✓' : '✗'}</span>

          <span style={{
            fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '3px',
            background: signalState?.t2_bias !== 0 ? '#3b82f622' : '#1e293b',
            color: signalState?.t2_bias === 1 ? '#00d4aa' : signalState?.t2_bias === -1 ? '#f43f5e' : '#475569'
          }}>
            {signalState?.t2_bias === 1 ? 'BULL' : signalState?.t2_bias === -1 ? 'BEAR' : 'T2 —'}
          </span>

          <span style={{
            fontSize: '10px', fontWeight: '700', padding: '2px 6px', borderRadius: '3px',
            background: (signalState?.t3_score ?? 0) >= 2 ? '#00d4aa22' : '#1e293b',
            color: (signalState?.t3_score ?? 0) >= 2 ? '#00d4aa' : (signalState?.t3_score ?? 0) === 1 ? '#f59e0b' : '#475569'
          }}>{signalState?.t3_score ?? 0}/4</span>

          {signalState?.finalDirection !== 0 && signalState?.finalDirection != null ? (
            <span style={{
              marginLeft: 'auto', fontSize: '11px', fontWeight: '700',
              padding: '3px 10px', borderRadius: '4px',
              background: signalState.finalDirection === 1 ? '#00d4aa' : '#f43f5e',
              color: '#060b14', animation: 'pulse 1s infinite'
            }}>
              {signalState.finalDirection === 1 ? '▲ BUY' : '▼ SELL'}
            </span>
          ) : (
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#475569' }}>Scanning...</span>
          )}
        </div>
      </div>

      {/* Row 2: Sub-tab bar — strictly AFTER chart div closes */}
      <div style={{ height: '36px', flexShrink: 0, display: 'flex', background: '#0a1628', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
        {['Positions', 'History', 'Signals', 'Zones'].map(tab => (
          <button key={tab} onClick={() => setChartSubTab(tab)} style={{
            flex: 1, border: 'none', background: 'transparent',
            borderBottom: chartSubTab === tab ? '2px solid #00d4aa' : '2px solid transparent',
            color: chartSubTab === tab ? '#00d4aa' : '#475569',
            fontSize: '11px', fontWeight: '600', cursor: 'pointer'
          }}>{tab}</button>
        ))}
      </div>

      {/* Row 3: Scrollable content — takes ALL remaining space */}
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, background: '#060b14' }}>

        {chartSubTab === 'Positions' && (
          <div style={{ padding: '12px' }}>
            {(trades ?? []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#475569' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>—</div>
                <div style={{ fontSize: '13px', marginBottom: '4px', color: '#94a3b8' }}>No open positions</div>
                <div style={{ fontSize: '11px' }}>Bot is scanning for signals</div>
              </div>
            ) : (
              trades.map(trade => (
                <div key={trade.ticket} style={{
                  background: '#0f1e35', borderRadius: '8px',
                  padding: '12px', marginBottom: '8px', border: '1px solid #1e293b'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px' }}>{trade.symbol}</span>
                    <span style={{
                      fontSize: '12px', fontWeight: '700', padding: '2px 8px', borderRadius: '4px',
                      background: trade.direction === 1 ? '#00d4aa22' : '#f43f5e22',
                      color: trade.direction === 1 ? '#00d4aa' : '#f43f5e'
                    }}>{trade.direction === 1 ? '▲ BUY' : '▼ SELL'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px', color: '#94a3b8' }}>
                    <span>Entry: <b style={{ color: '#e2e8f0' }}>{trade.entryPrice?.toFixed(2)}</b></span>
                    <span>Lot: <b style={{ color: '#e2e8f0' }}>{trade.lotSize}</b></span>
                    <span>SL: <b style={{ color: '#f43f5e' }}>{trade.stopLoss?.toFixed(2)}</b></span>
                    <span>TP: <b style={{ color: '#00d4aa' }}>{trade.takeProfit?.toFixed(2)}</b></span>
                  </div>
                  {trade.isLocked && (
                    <div style={{ marginTop: '6px', fontSize: '10px', color: '#f59e0b' }}>🔒 LOCKED — hedge active</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {chartSubTab === 'History' && (
          <div>
            {(wsData?.history ?? []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#475569', fontSize: '13px' }}>
                No closed trades in the last 7 days
              </div>
            ) : (() => {
              const positions = {}
              ;(wsData?.history ?? []).forEach(deal => {
                const id = deal.positionId ?? deal.ticket
                if (!positions[id]) positions[id] = { entry: null, exit: null }
                if (deal.entry === 0) positions[id].entry = deal
                if (deal.entry === 1) positions[id].exit = deal
              })
              const positionList = Object.values(positions)
              return (
                <>
                  {positionList.map((pos, i) => (
                    <div key={i} style={{
                      padding: '10px 14px', borderBottom: '1px solid #0f1e35',
                      display: 'flex', alignItems: 'center', gap: '10px'
                    }}>
                      <span style={{
                        fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '3px',
                        background: pos.entry?.type === 0 ? '#00d4aa22' : '#f43f5e22',
                        color: pos.entry?.type === 0 ? '#00d4aa' : '#f43f5e', minWidth: '18px', textAlign: 'center'
                      }}>{pos.entry?.type === 0 ? 'B' : 'S'}</span>
                      <div style={{ flex: 1, fontSize: '11px' }}>
                        <div style={{ color: '#94a3b8' }}>
                          {pos.entry ? new Date(pos.entry.time * 1000).toLocaleTimeString() : '—'}
                        </div>
                        <div style={{ color: '#475569', fontSize: '10px' }}>
                          Entry: {pos.entry?.price?.toFixed(2)} → Exit: {pos.exit?.price?.toFixed(2) ?? 'open'}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '13px', fontWeight: '700',
                        color: (pos.exit?.profit ?? 0) >= 0 ? '#00d4aa' : '#f43f5e'
                      }}>
                        {(pos.exit?.profit ?? 0) >= 0 ? '+' : ''}{(pos.exit?.profit ?? 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  <div style={{
                    padding: '12px 14px', textAlign: 'right',
                    fontSize: '13px', fontWeight: '700',
                    color: (wsData?.totalProfit ?? 0) >= 0 ? '#00d4aa' : '#f43f5e',
                    borderTop: '1px solid #1e293b'
                  }}>
                    Total: {(wsData?.totalProfit ?? 0) >= 0 ? '+' : ''}{(wsData?.totalProfit ?? 0).toFixed(2)}
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {chartSubTab === 'Signals' && (
          <div style={{ padding: '12px' }}>
            {(signalLog ?? []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#475569', fontSize: '12px' }}>
                Signal evaluations will appear here
              </div>
            ) : (
              [...(signalLog ?? [])].reverse().map((entry, i) => (
                <div key={i} style={{
                  padding: '8px 0', borderBottom: '1px solid #0f1e35',
                  display: 'flex', gap: '8px', alignItems: 'center'
                }}>
                  <span style={{ fontSize: '10px', color: '#475569', minWidth: '48px' }}>{entry.time}</span>
                  <span style={{
                    fontSize: '11px', fontWeight: '600', minWidth: '36px',
                    color: entry.direction === 1 ? '#00d4aa' : entry.direction === -1 ? '#f43f5e' : '#475569'
                  }}>{entry.direction === 1 ? '▲ BUY' : entry.direction === -1 ? '▼ SELL' : '—'}</span>
                  <span style={{ fontSize: '11px', color: '#94a3b8', flex: 1 }}>{entry.reason}</span>
                </div>
              ))
            )}
          </div>
        )}

        {chartSubTab === 'Zones' && (
          <div style={{ padding: '12px', textAlign: 'center', color: '#475569', fontSize: '12px', paddingTop: '32px' }}>
            Zone map available on desktop view
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
