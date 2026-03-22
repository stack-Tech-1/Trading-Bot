export function formatPrice(price, digits = 5) {
  return Number(price).toFixed(digits)
}

export function formatPips(pips) {
  return `${Number(pips).toFixed(1)}p`
}

export function formatPct(pct) {
  return `${Number(pct).toFixed(2)}%`
}

export function formatLot(lot) {
  return Number(lot).toFixed(2)
}

/**
 * Converts an openTime value to a readable "HH:MM:SS DD/MM/YYYY" string.
 * Handles both:
 *   - Unix timestamps (number) from raw JS Date
 *   - MT5 TimeToString format: "2026.03.15 14:30:00" (dots in date part)
 */
export function formatTime(unixTimestamp) {
  let d
  if (typeof unixTimestamp === 'number') {
    d = new Date(unixTimestamp * 1000)
  } else {
    // MT5 format: "2026.03.15 14:30:00" — normalise dots to dashes in the date portion
    d = new Date(String(unixTimestamp).replace(/(\d{4})\.(\d{2})\.(\d{2})/, '$1-$2-$3'))
  }
  if (isNaN(d.getTime())) return String(unixTimestamp)
  const hh   = String(d.getHours()).padStart(2, '0')
  const mm   = String(d.getMinutes()).padStart(2, '0')
  const ss   = String(d.getSeconds()).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  const mo   = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${hh}:${mm}:${ss} ${dd}/${mo}/${yyyy}`
}

export function formatCurrency(amount) {
  return `$${Number(amount).toFixed(2)}`
}

/** Returns the Tailwind text-color class appropriate for a numeric P&L value. */
export function getPnLColor(value) {
  if (value > 0) return 'text-emerald-400'
  if (value < 0) return 'text-red-400'
  return 'text-gray-400'
}

/** Returns "BUY", "SELL", or "—" for a direction integer (1 / -1 / other). */
export function getDirectionLabel(direction) {
  if (direction === 1)  return 'BUY'
  if (direction === -1) return 'SELL'
  return '—'
}

/** Returns the Tailwind text-color class for a trade direction. */
export function getDirectionColor(direction) {
  if (direction === 1)  return 'text-emerald-400'
  if (direction === -1) return 'text-red-400'
  return 'text-gray-400'
}
