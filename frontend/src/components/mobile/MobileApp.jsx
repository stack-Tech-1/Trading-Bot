import { useState } from 'react'
import MobileChart from './MobileChart'
import MobileSignals from './MobileSignals'
import MobileSettings from './MobileSettings'
import MobileNews from './MobileNews'

export default function MobileApp({ tradeData, isConnected, sendMessage, signalLog }) {
  const [activeTab, setActiveTab] = useState('chart')

  const tabs = [
    { id: 'chart',    label: 'Chart',    icon: '📈' },
    { id: 'signals',  label: 'Signals',  icon: '🎯' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'news',     label: 'News',     icon: '📰' },
  ]

  const meta = tradeData?.meta ?? {}
  const trades = tradeData?.trades ?? []
  const signalState = tradeData?.signalState ?? null

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', width: '100vw',
      background: '#060b14', color: '#e2e8f0',
      overflow: 'hidden', fontFamily: 'monospace',
    }}>

      {/* Top navbar — 44px */}
      <div style={{
        height: '44px', flexShrink: 0,
        background: '#0a1628',
        borderBottom: '1px solid #1e293b',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: isConnected ? '#00d4aa' : '#f43f5e',
            animation: isConnected ? 'pulse 2s infinite' : 'none',
          }}/>
          <span style={{ fontWeight: '700', fontSize: '14px', color: '#e2e8f0' }}>
            TradingBot Pro
          </span>
          <span style={{
            fontSize: '10px', background: '#1e3a5f',
            color: '#60a5fa', padding: '1px 5px', borderRadius: '3px',
          }}>MT5</span>
        </div>
        <span style={{ fontSize: '15px', fontWeight: '700', color: '#e2e8f0' }}>
          ${(meta.accountBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Persistent stats strip — 52px */}
      <div style={{
        height: '52px', flexShrink: 0,
        background: '#0f1e35',
        borderBottom: '1px solid #1e293b',
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
        alignItems: 'center', padding: '0 10px', gap: '4px',
      }}>
        {[
          { label: 'Equity',    value: `$${(meta.accountEquity ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`, color: '#00d4aa' },
          { label: 'Drawdown',  value: `${(meta.dailyDrawdownPct ?? 0).toFixed(2)}%`, color: (meta.dailyDrawdownPct ?? 0) > 2 ? '#f43f5e' : '#00d4aa' },
          { label: 'Positions', value: `${trades.length}/3`, color: '#e2e8f0' },
          { label: 'P&L',       value: `$${trades.reduce((s, t) => s + (t.pnl ?? 0), 0).toFixed(2)}`, color: '#00d4aa' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Main content area — fills remaining space */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        {activeTab === 'chart' && (
          <MobileChart
            wsData={tradeData}
            signalState={signalState}
            trades={trades}
          />
        )}
        {activeTab === 'signals' && (
          <MobileSignals
            signalState={signalState}
            signalLog={signalLog}
          />
        )}
        {activeTab === 'settings' && (
          <MobileSettings
            currentSettings={meta.settings ?? {}}
            onSave={(s) => sendMessage({ type: 'settings_update', payload: s })}
            isConnected={isConnected}
          />
        )}
        {activeTab === 'news' && (
          <MobileNews wsData={tradeData} />
        )}
      </div>

      {/* Bottom tab bar — 56px */}
      <div style={{
        height: '56px', flexShrink: 0,
        background: '#0a1628',
        borderTop: '1px solid #1e293b',
        display: 'flex',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '3px', cursor: 'pointer',
              borderTop: activeTab === tab.id ? '2px solid #00d4aa' : '2px solid transparent',
              color: activeTab === tab.id ? '#00d4aa' : '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ fontSize: '18px', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.03em' }}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  )
}
