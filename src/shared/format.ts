export function formatMoney(value: unknown, digits = 2) {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount.toFixed(digits) : (0).toFixed(digits)
}

export function formatQuantity(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0'
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, '')
}

export function parseDateTime(value?: string | number | Date | null) {
  if (value === undefined || value === null || value === '') return null

  // WeChat on iOS does not support `yyyy-MM-dd HH:mm:ss`. Convert API local
  // date-time values to the ISO-like form it supports before calling Date.
  const normalized = typeof value === 'string'
    ? value.trim().replace(/^(\d{4}-\d{2}-\d{2})\s+(?=\d{2}:\d{2}(?::\d{2})?)/, '$1T')
    : value
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value?: string | number | Date | null) {
  const date = parseDateTime(value)
  if (!date) return '-'

  const pad = (part: number) => String(part).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
