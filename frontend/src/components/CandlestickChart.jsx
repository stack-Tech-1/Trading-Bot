import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts'
import { isMobile } from '../hooks/useWindowSize'

const TIMEFRAMES = [
  { label: '1M',  seconds: 60,    candles: 200 },
  { label: '5M',  seconds: 300,   candles: 200 },
  { label: '15M', seconds: 900,   candles: 200 },
  { label: '1H',  seconds: 3600,  candles: 200 },
  { label: '4H',  seconds: 14400, candles: 200 },
  { label: '1D',  seconds: 86400, candles: 200 },
]

const BASE_PRICES = {
  EURUSD: 1.08, GBPUSD: 1.26, USDJPY: 149.5, USDCHF: 0.896,
  AUDUSD: 0.645, NZDUSD: 0.598, USDCAD: 1.362,
  BTCUSD: 71000, ETHUSD: 3500, XAUUSD: 2300, XAGUSD: 27.5,
}

const VOLATILITY = {
  EURUSD: 0.0008, GBPUSD: 0.001, USDJPY: 0.07, USDCHF: 0.0008,
  AUDUSD: 0.0009, NZDUSD: 0.0009, USDCAD: 0.0008,
  BTCUSD: 0.018, ETHUSD: 0.022, XAUUSD: 0.006, XAGUSD: 0.012,
}

function getBasePrice(symbol) {
  if (BASE_PRICES[symbol]) return BASE_PRICES[symbol]
  if (symbol?.includes('JPY')) return 149.5
  if (symbol?.includes('BTC') || symbol?.includes('ETH')) return 50000
  if (symbol?.includes('XAU')) return 2300
  return 1.1
}

function getVolatility(symbol) {
  if (VOLATILITY[symbol]) return VOLATILITY[symbol]
  if (symbol?.includes('JPY')) return 0.07
  if (symbol?.includes('BTC')) return 0.018
  if (symbol?.includes('XAU')) return 0.006
  return 0.001
}

function getDecimals(symbol) {
  if (symbol?.includes('JPY') || symbol?.includes('XAG')) return 2
  if (symbol?.includes('XAU') || symbol?.includes('BTC') || symbol?.includes('ETH')) return 2
  return 5
}

function generateSyntheticData(symbol) {
  const basePrice = getBasePrice(symbol)
  const vol = getVolatility(symbol)
  const intervalSeconds = 900 // 15M
  const count = 200
  const now = Math.floor(Date.now() / 1000)
  const startTime = now - intervalSeconds * count

  const candles = []
  let price = basePrice

  for (let i = 0; i < count; i++) {
    const time = startTime + i * intervalSeconds
    const open = price
    const change = (Math.random() - 0.5) * vol
    const close = open * (1 + change)
    const high = Math.max(open, close) * (1 + Math.random() * vol * 0.5)
    const low = Math.min(open, close) * (1 - Math.random() * vol * 0.5)
    const volume = Math.floor(Math.random() * 1000 + 200)
    candles.push({ time, open, high, low, close, volume })
    price = close
  }

  return candles
}

function calculateEMA(candles, period) {
  const k = 2 / (period + 1)
  const result = []
  let ema = null

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    ema = ema === null ? c.close : c.close * k + ema * (1 - k)
    if (i >= period - 1) result.push({ time: c.time, value: ema })
  }
  return result
}

function calculateEMA5(candles) {
  const k = 2 / (5 + 1)
  const result = []
  if (candles.length === 0) return result
  let ema = candles[0].close
  for (let i = 0; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k)
    result.push({ time: candles[i].time, value: parseFloat(ema.toFixed(5)) })
  }
  return result
}

function calculateBollingerBands(candles, period = 20, multiplier = 2) {
  const result = { upper: [], middle: [], lower: [] }
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1)
    const mean = slice.reduce((s, c) => s + c.close, 0) / period
    const variance = slice.reduce((s, c) => s + Math.pow(c.close - mean, 2), 0) / period
    const stdDev = Math.sqrt(variance)
    result.upper.push({ time: candles[i].time, value: mean + multiplier * stdDev })
    result.middle.push({ time: candles[i].time, value: mean })
    result.lower.push({ time: candles[i].time, value: mean - multiplier * stdDev })
  }
  return result
}

function calculateRSI(candles, period = 14) {
  const result = []
  if (candles.length < period + 1) return result
  for (let i = period; i < candles.length; i++) {
    let gains = 0, losses = 0
    for (let j = i - period + 1; j <= i; j++) {
      const change = candles[j].close - candles[j - 1].close
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }
    const avgGain = gains / period
    const avgLoss = losses / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    result.push({ time: candles[i].time, value: parseFloat((100 - 100 / (1 + rs)).toFixed(2)) })
  }
  return result
}

export default function CandlestickChart({ symbol = 'EURUSD', wsData }) {
  const containerRef = useRef(null)
  const chartRef     = useRef(null)
  const candleSeriesRef = useRef(null)
  const volumeSeriesRef = useRef(null)
  const ma20Ref  = useRef(null)
  const ma50Ref  = useRef(null)
  const ma200Ref = useRef(null)

  const prevCandleCountRef = useRef(0)

  const bbUpperRef   = useRef(null)
  const bbMiddleRef  = useRef(null)
  const bbLowerRef   = useRef(null)
  const rsiSeriesRef = useRef(null)
  const ema5Ref = useRef(null)

  const [activeTimeframe, setActiveTimeframe] = useState(TIMEFRAMES[2])
  const [ohlcv, setOhlcv] = useState({ open: 0, high: 0, low: 0, close: 0, volume: 0 })
  const [indicators, setIndicators] = useState({
    ema5: true, ma20: true, ma50: true, ma200: true, bb: true, volume: true, rsi: false,
  })

  const decimals = getDecimals(symbol)

  // ── Effect 1: Create chart — runs ONCE on mount ───────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      width:  containerRef.current.clientWidth,
      height: isMobile(window.innerWidth) ? 300 : 500,
      layout: { background: { color: '#060b14' }, textColor: '#94a3b8' },
      grid:   { vertLines: { color: '#0f1e35' }, horzLines: { color: '#0f1e35' } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#1e293b', textColor: '#94a3b8' },
      timeScale: { borderColor: '#1e293b', timeVisible: true, secondsVisible: false },
      watermark: {
        visible: true, fontSize: 48,
        horzAlign: 'center', vertAlign: 'center',
        color: 'rgba(30,58,95,0.3)', text: symbol,
      },
    })

    candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#00d4aa', downColor: '#f43f5e',
      borderUpColor: '#00d4aa', borderDownColor: '#f43f5e',
      wickUpColor: '#00d4aa', wickDownColor: '#f43f5e',
    })

    volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
    })
    volumeSeriesRef.current.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    ma20Ref.current  = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
    ma50Ref.current  = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
    ma200Ref.current = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false })

    bbUpperRef.current  = chart.addSeries(LineSeries, { color: '#4a90d9', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false })
    bbMiddleRef.current = chart.addSeries(LineSeries, { color: '#4a90d9', lineWidth: 1, lineStyle: 1, priceLineVisible: false, lastValueVisible: false })
    bbLowerRef.current  = chart.addSeries(LineSeries, { color: '#4a90d9', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false })
    rsiSeriesRef.current = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, priceScaleId: 'rsi', priceLineVisible: false, lastValueVisible: false })
    rsiSeriesRef.current.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })
    ema5Ref.current = chart.addSeries(LineSeries, {
      color: '#00ffcc', lineWidth: 2, priceLineVisible: false, lastValueVisible: false,
    })

    chartRef.current = chart

    chart.subscribeCrosshairMove((param) => {
      if (!param?.time || !param?.seriesData) return
      const bar = param.seriesData.get(candleSeriesRef.current)
      if (bar) setOhlcv({ open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: 0 })
    })

    const handleResize = () => {
      if (containerRef.current)
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: isMobile(window.innerWidth) ? 300 : 500,
        })
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current     = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      ma20Ref.current  = null
      ma50Ref.current  = null
      ma200Ref.current = null
      bbUpperRef.current  = null
      bbMiddleRef.current = null
      bbLowerRef.current  = null
      rsiSeriesRef.current = null
      ema5Ref.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: Symbol or timeframe changed — reset state, load synthetic ───
  useEffect(() => {
    prevCandleCountRef.current = 0

    if (!candleSeriesRef.current) return

    // Update watermark
    if (chartRef.current) {
      chartRef.current.applyOptions({
        watermark: {
          visible: true, fontSize: 48,
          horzAlign: 'center', vertAlign: 'center',
          color: 'rgba(30,58,95,0.3)', text: symbol,
        },
      })
    }

    // Load synthetic placeholder until real data arrives
    const synthetic = generateSyntheticData(symbol)
    candleSeriesRef.current.setData(synthetic)
    if (volumeSeriesRef.current) volumeSeriesRef.current.setData(
      synthetic.map(c => ({ time: c.time, value: 200, color: '#00d4aa33' }))
    )
    if (ma20Ref.current)  ma20Ref.current.setData(calculateEMA(synthetic, 20))
    if (ma50Ref.current)  ma50Ref.current.setData(calculateEMA(synthetic, 50))
    if (ma200Ref.current) ma200Ref.current.setData(calculateEMA(synthetic, 200))
    const syntheticBB = calculateBollingerBands(synthetic, 20, 2)
    if (bbUpperRef.current)  bbUpperRef.current.setData(syntheticBB.upper)
    if (bbMiddleRef.current) bbMiddleRef.current.setData(syntheticBB.middle)
    if (bbLowerRef.current)  bbLowerRef.current.setData(syntheticBB.lower)
    if (rsiSeriesRef.current) rsiSeriesRef.current.setData(calculateRSI(synthetic, 14))
    if (ema5Ref.current) ema5Ref.current.setData(calculateEMA5(synthetic))
    if (chartRef.current) chartRef.current.timeScale().fitContent()
  }, [symbol, activeTimeframe]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 3: Live data updates — fires on every wsData tick ─────────────
  useEffect(() => {
    if (!candleSeriesRef.current) return
    const candles = wsData?.candles
    if (!candles || candles.length === 0) return

    const chartCandles = candles
      .map(c => ({
        time:  Number(c.t  ?? c.time),
        open:  parseFloat(c.o  ?? c.open),
        high:  parseFloat(c.h  ?? c.high),
        low:   parseFloat(c.l  ?? c.low),
        close: parseFloat(c.c  ?? c.close),
      }))
      .filter(c => c.time > 0 && c.open > 0 && c.close > 0)
      .sort((a, b) => a.time - b.time)

    if (chartCandles.length === 0) return

    const latest = chartCandles[chartCandles.length - 1]
    const latestVol = {
      time:  latest.time,
      value: parseFloat(candles[candles.length - 1]?.v ?? 100),
      color: latest.close >= latest.open ? '#00d4aa33' : '#f43f5e33',
    }

    // Full reload only when candle count changes (new candle formed) or first load
    if (chartCandles.length !== prevCandleCountRef.current) {
      prevCandleCountRef.current = chartCandles.length
      const volumes = chartCandles.map((c, i) => ({
        time:  c.time,
        value: parseFloat(candles[i]?.v ?? 100),
        color: c.close >= c.open ? '#00d4aa33' : '#f43f5e33',
      }))
      candleSeriesRef.current.setData(chartCandles)
      if (volumeSeriesRef.current) volumeSeriesRef.current.setData(volumes)
      const ma20Data = calculateEMA(chartCandles, 20)
      if (ma20Ref.current)  ma20Ref.current.setData(ma20Data)
      if (ma50Ref.current)  ma50Ref.current.setData(calculateEMA(chartCandles, 50))
      if (ma200Ref.current) ma200Ref.current.setData(calculateEMA(chartCandles, 200))
      const bb = calculateBollingerBands(chartCandles, 20, 2)
      if (bbUpperRef.current)  bbUpperRef.current.setData(bb.upper)
      if (bbMiddleRef.current) bbMiddleRef.current.setData(bb.middle)
      if (bbLowerRef.current)  bbLowerRef.current.setData(bb.lower)
      if (rsiSeriesRef.current) rsiSeriesRef.current.setData(calculateRSI(chartCandles, 14))
      const ema5Data = calculateEMA5(chartCandles)
      if (ema5Ref.current) ema5Ref.current.setData(ema5Data)
      if (ema5Data.length >= 2 && ma20Data.length >= 2) {
        const lastEMA5 = ema5Data[ema5Data.length - 1].value
        const prevEMA5 = ema5Data[ema5Data.length - 2].value
        const lastMA20 = ma20Data[ma20Data.length - 1].value
        const prevMA20 = ma20Data[ma20Data.length - 2].value
        if (prevEMA5 <= prevMA20 && lastEMA5 > lastMA20) {
          console.log('[Signal] EMA5 crossed ABOVE MA20 — potential BUY signal')
        } else if (prevEMA5 >= prevMA20 && lastEMA5 < lastMA20) {
          console.log('[Signal] EMA5 crossed BELOW MA20 — potential SELL signal')
        }
      }
      if (chartRef.current) chartRef.current.timeScale().fitContent()
    } else {
      // Same candle count — just update the last candle's price
      candleSeriesRef.current.update(latest)
      if (volumeSeriesRef.current) volumeSeriesRef.current.update(latestVol)
    }

    setOhlcv({
      open: latest.open, high: latest.high, low: latest.low, close: latest.close,
      volume: latestVol.value,
    })
  }, [wsData?._tick])

  // ── Effect: RSI reference lines ───────────────────────────────────────────
  useEffect(() => {
    if (!rsiSeriesRef.current || !indicators.rsi) return
    rsiSeriesRef.current.createPriceLine({ price: 70, color: '#f43f5e', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: 'OB' })
    rsiSeriesRef.current.createPriceLine({ price: 30, color: '#00d4aa', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: 'OS' })
    rsiSeriesRef.current.createPriceLine({ price: 50, color: '#475569', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' })
  }, [indicators.rsi])

  // ── Effect: Indicator visibility toggles ──────────────────────────────────
  useEffect(() => {
    if (ma20Ref.current)  ma20Ref.current.applyOptions({ visible: indicators.ma20 })
    if (ma50Ref.current)  ma50Ref.current.applyOptions({ visible: indicators.ma50 })
    if (ma200Ref.current) ma200Ref.current.applyOptions({ visible: indicators.ma200 })
    if (bbUpperRef.current)  bbUpperRef.current.applyOptions({ visible: indicators.bb })
    if (bbMiddleRef.current) bbMiddleRef.current.applyOptions({ visible: indicators.bb })
    if (bbLowerRef.current)  bbLowerRef.current.applyOptions({ visible: indicators.bb })
    if (volumeSeriesRef.current) volumeSeriesRef.current.applyOptions({ visible: indicators.volume })
    if (rsiSeriesRef.current) rsiSeriesRef.current.applyOptions({ visible: indicators.rsi })
    if (ema5Ref.current) ema5Ref.current.applyOptions({ visible: indicators.ema5 })
  }, [indicators])

  // ── Trade entry price lines ───────────────────────────────────────────────
  useEffect(() => {
    if (!candleSeriesRef.current) return
    const trades = wsData?.trades?.filter(t => t.symbol === symbol) ?? []
    trades.forEach(trade => {
      if (trade.entryPrice) {
        try {
          candleSeriesRef.current.createPriceLine({
            price: trade.entryPrice,
            color: trade.direction === 1 ? '#00d4aa' : '#f43f5e',
            lineWidth: 1, lineStyle: 2, axisLabelVisible: true,
            title: trade.direction === 1 ? 'BUY' : 'SELL',
          })
        } catch (_) {}
      }
    })
  }, [wsData, symbol])

  const fmt = (n) => Number(n).toFixed(decimals)

  return (
    <div style={{ background: '#060b14' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px', borderBottom: '1px solid #1e293b' }}>
        <span style={{ color: '#475569', fontSize: 11, marginRight: 4, fontFamily: 'monospace' }}>TF:</span>
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.label}
            onClick={() => setActiveTimeframe(tf)}
            style={{
              padding: '2px 8px',
              fontSize: 11,
              fontFamily: 'monospace',
              background:   activeTimeframe.label === tf.label ? '#2563eb' : '#0f1e35',
              color:        activeTimeframe.label === tf.label ? '#fff'    : '#94a3b8',
              border: '1px solid',
              borderColor:  activeTimeframe.label === tf.label ? '#3b82f6' : '#1e293b',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tf.label}
          </button>
        ))}

        {/* OHLCV bar */}
        <div style={{ marginLeft: 12, display: 'flex', gap: 10, fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>
          <span>O: <span style={{ color: '#e2e8f0' }}>{fmt(ohlcv.open)}</span></span>
          <span>H: <span style={{ color: '#00d4aa' }}>{fmt(ohlcv.high)}</span></span>
          <span>L: <span style={{ color: '#f43f5e' }}>{fmt(ohlcv.low)}</span></span>
          <span>C: <span style={{ color: ohlcv.close >= ohlcv.open ? '#00d4aa' : '#f43f5e' }}>{fmt(ohlcv.close)}</span></span>
          {ohlcv.volume > 0 && <span>Vol: <span style={{ color: '#e2e8f0' }}>{ohlcv.volume}</span></span>}
        </div>

      </div>

      {/* Indicator toggles */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '4px 12px', background: '#0a1628', borderBottom: '1px solid #1e293b', flexWrap: 'wrap' }}>
        {[
          { key: 'ema5',   label: 'EMA5',     color: '#00ffcc' },
          { key: 'ma20',   label: 'MA20',     color: '#3b82f6' },
          { key: 'ma50',   label: 'MA50',     color: '#f59e0b' },
          { key: 'ma200',  label: 'MA200',    color: '#8b5cf6' },
          { key: 'bb',     label: 'BB(20,2)', color: '#4a90d9' },
          { key: 'volume', label: 'Volume',   color: '#6b7280' },
          { key: 'rsi',    label: 'RSI(14)',  color: '#f59e0b' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setIndicators(prev => ({ ...prev, [key]: !prev[key] }))}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '3px 8px', borderRadius: '4px', border: 'none',
              cursor: 'pointer', fontSize: '11px', fontWeight: '500',
              background: indicators[key] ? `${color}22` : '#1e293b',
              color: indicators[key] ? color : '#475569',
              transition: 'all 0.15s ease',
              outline: indicators[key] ? `1px solid ${color}66` : '1px solid transparent',
            }}
          >
            <span style={{ width: '8px', height: '2px', borderRadius: '1px', background: indicators[key] ? color : '#475569', display: 'inline-block' }}/>
            {label}
          </button>
        ))}
      </div>

      {/* Chart container */}
      <div ref={containerRef} style={{ width: '100%', height: isMobile(window.innerWidth) ? 300 : 500 }} />
    </div>
  )
}
