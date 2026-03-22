import { useState, useEffect } from 'react'
import { RefreshCw, Check } from 'lucide-react'

// ---------------------------------------------------------------------------
// Tooltip — internal, not exported
// ---------------------------------------------------------------------------
function Tooltip({ text }) {
  const [visible, setVisible] = useState(false)
  return (
    <span className="relative inline-flex items-center ml-1">
      <span
        className="w-4 h-4 rounded-full bg-gray-600 text-gray-300 text-xs flex items-center justify-center cursor-help select-none"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >?</span>
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-2 py-1 bg-gray-700 text-gray-200 text-xs rounded shadow-lg z-10 text-left whitespace-normal">
          {text}
        </span>
      )}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Reusable field label
// ---------------------------------------------------------------------------
function FieldLabel({ children }) {
  return (
    <span className="text-xs text-gray-400 uppercase tracking-wide flex items-center">
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// SettingsPanel
// ---------------------------------------------------------------------------
export default function SettingsPanel({ currentSettings, onSave, isConnected }) {
  const [settings,    setSettings]    = useState({})
  const [isDirty,     setIsDirty]     = useState(false)
  const [isSaving,    setIsSaving]    = useState(false)
  const [saveStatus,  setSaveStatus]  = useState(null)   // "saved" | null
  const [savedAt,     setSavedAt]     = useState(null)   // Date

  // Sync whenever currentSettings prop updates (e.g. after settings_confirmed arrives)
  useEffect(() => {
    if (currentSettings && Object.keys(currentSettings).length > 0) {
      setSettings(currentSettings)
      setIsDirty(false)
    }
  }, [currentSettings])

  function update(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  function handleSave() {
    setIsSaving(true)
    onSave(settings)
    setTimeout(() => {
      setIsSaving(false)
      setSaveStatus('saved')
      setSavedAt(new Date())
      setIsDirty(false)
      setTimeout(() => setSaveStatus(null), 3000)
    }, 1500)
  }

  // ---------- derived values ----------
  const ddVal          = settings.DailyDrawdownLimitPct ?? 3
  const ddSliderColor  = ddVal > 5 ? 'text-red-400' : ddVal > 3 ? 'text-amber-400' : 'text-emerald-400'
  const newsPauseVal   = settings.NewsPauseMinutes ?? 30
  const maxTradesVal   = settings.MaxOpenTrades ?? 3

  const maPeriods = [
    settings.MA5, settings.MA9, settings.MA25, settings.MA50,
    settings.MA65, settings.MA100, settings.MA200, settings.MA245,
  ].filter(v => v !== undefined && v !== null && v !== '')
  const duplicateMAs = new Set(maPeriods).size !== maPeriods.length

  const saveDisabled = !isDirty || !isConnected || isSaving

  // ---------- saved-at display ----------
  const savedAtStr = savedAt
    ? `${String(savedAt.getHours()).padStart(2, '0')}:${String(savedAt.getMinutes()).padStart(2, '0')}:${String(savedAt.getSeconds()).padStart(2, '0')}`
    : null

  // ---------- shared input styles ----------
  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500'

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-6">

      {/* ------------------------------------------------------------------ */}
      {/* Section heading                                                      */}
      {/* ------------------------------------------------------------------ */}
      <h2 className="text-sm font-semibold text-gray-100 uppercase tracking-wide">
        Bot Settings
      </h2>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1 — Master Controls                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap gap-6 items-center">
        {/* Master Switch */}
        <div className="flex flex-col gap-2">
          <FieldLabel>Master Switch</FieldLabel>
          <button
            onClick={() => update('MasterSwitch', !settings.MasterSwitch)}
            className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-colors ${
              settings.MasterSwitch
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-red-700 hover:bg-red-600 text-white'
            }`}
          >
            {settings.MasterSwitch ? 'BOT ACTIVE' : 'BOT DISABLED'}
          </button>
        </div>

        {/* Trading Sessions */}
        <div className="flex flex-col gap-2">
          <FieldLabel>Trading Sessions</FieldLabel>
          <div className="flex gap-4">
            {['London', 'New York', 'Asian'].map(s => (
              <label
                key={s}
                className="flex items-center gap-1.5 text-sm text-gray-300 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={settings.sessions?.[s] ?? false}
                  onChange={e =>
                    update('sessions', { ...(settings.sessions ?? {}), [s]: e.target.checked })
                  }
                  className="accent-emerald-500 w-3.5 h-3.5"
                />
                {s}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2 — Risk Parameters                                         */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Risk Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Lot Size */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>
              Lot Size
              <Tooltip text="Base lot size per trade. Multiplied by the asset profile's lot multiplier." />
            </FieldLabel>
            <input
              type="number"
              value={settings.LotSize ?? ''}
              onChange={e => update('LotSize', parseFloat(e.target.value))}
              step="0.01" min="0.01" max="0.1"
              className={inputCls}
            />
          </div>

          {/* Max Open Trades */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Max Open Trades</FieldLabel>
            <div className="flex items-center gap-3">
              <input
                type="range"
                value={maxTradesVal}
                onChange={e => update('MaxOpenTrades', parseInt(e.target.value))}
                min="1" max="5" step="1"
                className="flex-1 accent-blue-500"
              />
              <span className="text-xl font-semibold text-white w-6 text-center">
                {maxTradesVal}
              </span>
            </div>
          </div>

          {/* Lock Threshold */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Lock Threshold (pips)</FieldLabel>
            <input
              type="number"
              value={settings.LockThresholdPips ?? ''}
              onChange={e => update('LockThresholdPips', parseInt(e.target.value))}
              min="20" max="200" step="5"
              className={inputCls}
            />
          </div>

          {/* Daily Drawdown Limit */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>Daily Drawdown Limit</FieldLabel>
            <div className="flex items-center gap-3">
              <input
                type="range"
                value={ddVal}
                onChange={e => update('DailyDrawdownLimitPct', parseFloat(e.target.value))}
                min="1" max="10" step="0.5"
                className="flex-1 accent-blue-500"
              />
              <span className={`text-lg font-semibold w-12 text-right ${ddSliderColor}`}>
                {ddVal}%
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3 — Indicator Parameters                                    */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">Indicator Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* BB Period */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>BB Period</FieldLabel>
            <input
              type="number"
              value={settings.BBPeriod ?? ''}
              onChange={e => update('BBPeriod', parseInt(e.target.value))}
              min="10" max="50"
              className={inputCls}
            />
          </div>

          {/* BB Deviation */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>BB Deviation</FieldLabel>
            <input
              type="number"
              value={settings.BBDeviation ?? ''}
              onChange={e => update('BBDeviation', parseFloat(e.target.value))}
              step="0.1" min="1.0" max="4.0"
              className={inputCls}
            />
          </div>

          {/* RSI Period */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>RSI Period</FieldLabel>
            <input
              type="number"
              value={settings.RSIPeriod ?? ''}
              onChange={e => update('RSIPeriod', parseInt(e.target.value))}
              min="7" max="28"
              className={inputCls}
            />
          </div>

          {/* Zone Lookback */}
          <div className="flex flex-col gap-1.5">
            <FieldLabel>
              Zone Lookback
              <Tooltip text="Number of candles to look back when detecting liquidity zones." />
            </FieldLabel>
            <input
              type="number"
              value={settings.ZoneLookback ?? ''}
              onChange={e => update('ZoneLookback', parseInt(e.target.value))}
              min="50" max="300" step="10"
              className={inputCls}
            />
          </div>

          {/* News Pause */}
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <FieldLabel>News Pause (minutes)</FieldLabel>
            <div className="flex items-center gap-3">
              <input
                type="range"
                value={newsPauseVal}
                onChange={e => update('NewsPauseMinutes', parseInt(e.target.value))}
                min="15" max="60" step="5"
                className="flex-1 accent-blue-500"
              />
              <span className="text-lg font-semibold text-white w-12 text-right">
                {newsPauseVal}m
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 4 — MA Periods                                              */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-3">MA Periods</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['MA5',   'MA5'],
            ['MA9',   'MA9'],
            ['MA25',  'MA25'],
            ['MA50',  'MA50'],
            ['MA65',  'MA65'],
            ['MA100', 'MA100'],
            ['MA200', 'MA200'],
            ['MA245', 'MA245'],
          ].map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-xs text-gray-500">{label}</span>
              <input
                type="number"
                value={settings[key] ?? ''}
                onChange={e => update(key, parseInt(e.target.value))}
                min="2" max="500"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>
        {duplicateMAs && (
          <p className="text-amber-400 text-xs mt-2">
            Warning — duplicate MA periods detected
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Save row                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-800">
        {/* Left — saved confirmation */}
        <div className="text-xs text-gray-500">
          {savedAt && saveStatus === 'saved' && `Saved at ${savedAtStr}`}
        </div>

        {/* Right — dirty indicator + save button */}
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saveDisabled}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white"
          >
            {isSaving ? (
              <><RefreshCw className="w-4 h-4 animate-spin" />Saving...</>
            ) : saveStatus === 'saved' ? (
              <><Check className="w-4 h-4" />Saved</>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>

    </div>
  )
}
