import { useState } from 'react'

const DEFAULTS = {
  MasterSwitch: true, LotSize: 0.01, MaxOpenTrades: 3, LockThresholdPips: 50,
  DailyDrawdownLimitPct: 3.0, BBPeriod: 20, BBDeviation: 2.0, RSIPeriod: 14,
  ZoneLookback: 100, NewsPauseMinutes: 30,
  MA5: 5, MA9: 9, MA25: 25, MA50: 50, MA65: 65, MA100: 100, MA200: 200, MA245: 245,
}

export default function MobileSettings({ currentSettings, onSave, isConnected }) {
  const [settings, setSettings] = useState({ ...DEFAULTS, ...currentSettings })
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const update = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleSave = () => {
    if (!isDirty || !isConnected || isSaving) return
    setIsSaving(true)
    onSave(settings)
    setTimeout(() => { setIsSaving(false); setIsDirty(false) }, 1500)
  }

  const fieldLabel = (text, sub) => (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>{text}</div>
      {sub && <div style={{ fontSize: '10px', color: '#475569', marginTop: '1px' }}>{sub}</div>}
    </div>
  )

  const inputStyle = {
    width: '100%', background: '#0f1e35', color: '#e2e8f0',
    border: '1px solid #1e293b', borderRadius: '6px',
    padding: '10px 12px', fontSize: '16px', fontFamily: 'monospace', boxSizing: 'border-box',
  }

  const sectionTitle = (t) => (
    <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '16px 0 8px', borderBottom: '1px solid #1e293b', marginBottom: '12px' }}>{t}</div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px', paddingBottom: '80px', background: '#060b14' }}>

      {/* Master toggle */}
      <button onClick={() => update('MasterSwitch', !settings.MasterSwitch)} style={{
        width: '100%', height: '60px', borderRadius: '8px', cursor: 'pointer',
        background: settings.MasterSwitch ? '#00d4aa20' : '#f43f5e20',
        borderColor: settings.MasterSwitch ? '#00d4aa' : '#f43f5e',
        borderWidth: '1px', borderStyle: 'solid', marginBottom: '20px',
        color: settings.MasterSwitch ? '#00d4aa' : '#f43f5e',
        fontSize: '16px', fontWeight: '700', fontFamily: 'monospace',
      }}>
        {settings.MasterSwitch ? '● MASTER SWITCH — ON' : '○ MASTER SWITCH — OFF'}
      </button>

      {sectionTitle('Quick Settings')}

      {/* Lot Size */}
      <div style={{ marginBottom: '16px' }}>
        {fieldLabel('Lot Size')}
        <input type="number" step="0.01" min="0.01" value={settings.LotSize}
          onChange={e => update('LotSize', parseFloat(e.target.value) || 0.01)}
          style={inputStyle} />
      </div>

      {/* Max Open Trades */}
      <div style={{ marginBottom: '16px' }}>
        {fieldLabel('Max Open Trades', `Current: ${settings.MaxOpenTrades}`)}
        <input type="range" min="1" max="10" step="1" value={settings.MaxOpenTrades}
          onChange={e => update('MaxOpenTrades', parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#00d4aa', height: '8px', marginBottom: '4px' }} />
        <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: '700', color: '#e2e8f0', fontFamily: 'monospace' }}>{settings.MaxOpenTrades}</div>
      </div>

      {/* Daily Drawdown Limit */}
      <div style={{ marginBottom: '16px' }}>
        {fieldLabel('Daily Drawdown Limit', `Current: ${settings.DailyDrawdownLimitPct}%`)}
        <input type="range" min="0.5" max="10" step="0.5" value={settings.DailyDrawdownLimitPct}
          onChange={e => update('DailyDrawdownLimitPct', parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: '#f59e0b', height: '8px', marginBottom: '4px' }} />
        <div style={{ textAlign: 'center', fontSize: '24px', fontWeight: '700', color: '#f59e0b', fontFamily: 'monospace' }}>{settings.DailyDrawdownLimitPct}%</div>
      </div>

      {/* Advanced toggle */}
      <button onClick={() => setShowAdvanced(v => !v)} style={{
        width: '100%', padding: '10px', background: '#0f1e35', color: '#94a3b8',
        border: '1px solid #1e293b', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
        marginBottom: '12px', fontFamily: 'monospace',
      }}>
        Advanced Settings {showAdvanced ? '▲' : '▼'}
      </button>

      {showAdvanced && (
        <>
          {sectionTitle('Indicator Parameters')}
          {[
            { key: 'BBPeriod',        label: 'BB Period',         step: 1,   min: 5   },
            { key: 'BBDeviation',     label: 'BB Deviation',      step: 0.1, min: 0.5 },
            { key: 'RSIPeriod',       label: 'RSI Period',        step: 1,   min: 5   },
            { key: 'ZoneLookback',    label: 'Zone Lookback',     step: 10,  min: 10  },
            { key: 'NewsPauseMinutes',label: 'News Pause (min)',  step: 5,   min: 0   },
          ].map(({ key, label, step, min }) => (
            <div key={key} style={{ marginBottom: '12px' }}>
              {fieldLabel(label)}
              <input type="number" step={step} min={min} value={settings[key]}
                onChange={e => update(key, parseFloat(e.target.value))}
                style={inputStyle} />
            </div>
          ))}

          {sectionTitle('MA Periods')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {['MA5','MA9','MA25','MA50','MA65','MA100','MA200','MA245'].map(key => (
              <div key={key}>
                {fieldLabel(key)}
                <input type="number" step="1" min="1" value={settings[key]}
                  onChange={e => update(key, parseInt(e.target.value))}
                  style={{ ...inputStyle, fontSize: '14px' }} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Fixed save button */}
      <div style={{ position: 'fixed', bottom: '56px', left: 0, right: 0, padding: '12px 16px', background: '#0a1628', borderTop: '1px solid #1e293b' }}>
        <button onClick={handleSave} style={{
          width: '100%', height: '48px',
          background: isDirty && isConnected ? '#00d4aa' : '#1e293b',
          color: isDirty && isConnected ? '#060b14' : '#475569',
          border: 'none', borderRadius: '8px',
          fontSize: '15px', fontWeight: '700',
          cursor: isDirty && isConnected ? 'pointer' : 'default',
          fontFamily: 'monospace',
        }}>
          {isSaving ? 'Saving...' : isDirty ? 'Save Settings' : 'No Changes'}
        </button>
      </div>
    </div>
  )
}
