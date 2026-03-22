import { useState, useEffect, useRef } from 'react'
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'
import useWebSocket from './hooks/useWebSocket'
import TradeTable from './components/TradeTable'
import SettingsPanel from './components/SettingsPanel'
import PnLChart from './components/PnLChart'
import DrawdownGauge from './components/DrawdownGauge'
import ZoneMap from './components/ZoneMap'
import {
  formatCurrency,
  formatTime,
} from './utils/formatters'

const WS_URL = 'ws://localhost:8765'

// ---------------------------------------------------------------------------
// Inline stat card — single-use, no separate file needed
// ---------------------------------------------------------------------------
function StatCard({ label, value, valueClass = '' }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 flex flex-col gap-1 border border-gray-700/50">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const { tradeData, isConnected, lastUpdate, error, sendMessage, reconnect } = useWebSocket(WS_URL)

  const [activeTab,       setActiveTab]       = useState('Positions')
  const [selectedSymbol,  setSelectedSymbol]  = useState('EURUSD')
  const [currentSettings, setCurrentSettings] = useState({})
  // Preserve last valid trade payload so settings_confirmed messages don't wipe the dashboard
  const lastValidDataRef = useRef(null)

  useEffect(() => {
    if (tradeData && tradeData.type !== 'settings_confirmed') {
      lastValidDataRef.current = tradeData
    }
    if (tradeData?.type === 'settings_confirmed') {
      setCurrentSettings(tradeData.payload ?? {})
    }
  }, [tradeData])

  const activeData = (tradeData?.type === 'settings_confirmed')
    ? lastValidDataRef.current
    : tradeData

  const balance = activeData?.meta?.accountBalance  ?? 0
  const equity  = activeData?.meta?.accountEquity   ?? 0
  const ddPct   = activeData?.meta?.dailyDrawdownPct ?? 0
  const trades  = activeData?.trades ?? []

  const showLoading = !activeData && !isConnected

  function handleSaveSettings(updatedSettings) {
    sendMessage({ type: 'settings_update', payload: updatedSettings })
    console.log('Settings sent to bridge')
  }

  // Symbol options: unique set of trade symbols + default list
  const symbolOptions = [...new Set([
    ...(activeData?.trades ?? []).map(t => t.symbol),
    'EURUSD', 'GBPUSD', 'XAUUSD', 'BTCUSD',
  ])]

  return (
    <div className="bg-gray-950 min-h-screen text-white flex flex-col">

      {/* ------------------------------------------------------------------ */}
      {/* Navbar                                                               */}
      {/* ------------------------------------------------------------------ */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        {/* Left — branding + connection status */}
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">TradingBot Pro</span>
          <div className="flex items-center gap-1.5 text-sm">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Right — last update time + symbol selector + error/connected indicator */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {lastUpdate && (
            <span>Updated {formatTime(lastUpdate)}</span>
          )}
          {!isConnected && error && (
            <div className="flex items-center gap-1.5 text-red-400">
              <WifiOff className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">{error}</span>
            </div>
          )}
          {isConnected && <Wifi className="w-4 h-4 text-emerald-400" />}
          <select
            value={selectedSymbol}
            onChange={e => setSelectedSymbol(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white"
          >
            {symbolOptions.map(sym => (
              <option key={sym} value={sym}>{sym}</option>
            ))}
          </select>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Main content                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main className="p-6 space-y-6 flex-1">

        {/* Loading state — shown before first connection */}
        {showLoading && (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span>Connecting to bridge...</span>
          </div>
        )}

        {/* Summary cards */}
        {!showLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Account Balance"
              value={formatCurrency(balance)}
              valueClass="text-white"
            />
            <StatCard
              label="Account Equity"
              value={formatCurrency(equity)}
              valueClass={equity >= balance ? 'text-emerald-400' : 'text-red-400'}
            />
            <DrawdownGauge
              currentPct={ddPct}
              limitPct={currentSettings.DailyDrawdownLimitPct ?? 3}
            />
            <StatCard
              label="Open Trades"
              value={
                <span>
                  {trades.length}
                  <span className="text-gray-500 text-base font-normal"> / 3</span>
                </span>
              }
              valueClass="text-white"
            />
          </div>
        )}

        {/* Tab navigation */}
        {!showLoading && (
          <div className="flex border-b border-gray-800">
            {['Positions', 'Chart', 'Zones', 'Settings'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-emerald-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        {!showLoading && (
          <div>
            {activeTab === 'Positions' && <TradeTable trades={trades} />}
            {activeTab === 'Chart' && (
              <PnLChart trades={trades} meta={activeData?.meta ?? null} />
            )}
            {activeTab === 'Zones' && (
              <ZoneMap trades={trades} symbol={selectedSymbol} />
            )}
            {activeTab === 'Settings' && (
              <SettingsPanel
                currentSettings={currentSettings}
                onSave={handleSaveSettings}
                isConnected={isConnected}
              />
            )}
          </div>
        )}

      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Error banner                                                         */}
      {/* ------------------------------------------------------------------ */}
      {error && (
        <div className="bg-amber-900/80 border-t border-amber-500/60 p-3 flex items-center gap-3">
          <AlertTriangle className="text-amber-400 w-5 h-5 shrink-0" />
          <span className="text-amber-200 text-sm">
            {error} — Make sure bridge.py is running in your backend/bridge/ folder
          </span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                               */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-gray-800 bg-gray-900 px-6 py-2 flex items-center justify-between text-xs text-gray-500">
        <span>TradingBot Pro — MT4/MT5 Edition</span>
        <span className="font-mono">ws://localhost:8765</span>
        {!isConnected && (
          <button
            onClick={reconnect}
            className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/40 rounded hover:bg-blue-600/40 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Reconnect
          </button>
        )}
        {isConnected && <span className="text-emerald-400/60">Connected</span>}
      </footer>

    </div>
  )
}
