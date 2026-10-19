export function compactFilters(values) {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined))
}
export function parseLocalTime(value) {
  if (!value) return null
  // Backend returns Shanghai wall time without an offset.
  return new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}+08:00`)
}
export function canRenew(reservation, level, minimum = 0, now = Date.now()) {
  const end = parseLocalTime(reservation?.end_time)?.getTime()
  return !!reservation && reservation.res_type === 0 && Number.isFinite(end) && now >= end && now <= end + 3 * 86400000 && level >= minimum
}
export function formatTime(value) {
  const date = parseLocalTime(value)
  if (!date || Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
}
export function errorMessage(payload) {
  const detail = payload?.message ?? payload?.detail
  if (Array.isArray(detail)) return detail.map(item => `${(item.loc || []).filter(x => !['body', 'query'].includes(x)).join('.')}: ${item.msg}`).join('；')
  return typeof detail === 'string' ? detail : '请求失败，请稍后重试'
}
