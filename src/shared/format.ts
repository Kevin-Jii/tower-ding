export function formatMoney(value: unknown, digits = 2) {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount.toFixed(digits) : (0).toFixed(digits)
}

export function formatQuantity(value: unknown) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0'
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, '')
}
