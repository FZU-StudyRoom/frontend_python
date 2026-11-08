import { reactive } from 'vue'
import { errorMessage } from './rules'
const TOKEN_KEY = 'rc_token'
export const session = reactive({ token: localStorage.getItem(TOKEN_KEY) || '', user: null, reservation: null, ready: false })
export function clearSession() {
  session.token = ''; session.user = null; session.reservation = null; localStorage.removeItem(TOKEN_KEY)
}
export function logout(router) { clearSession(); router?.replace('/login') }
export function setSession(data) {
  session.token = data.Token; session.user = data.userInfo; session.ready = true
  localStorage.setItem(TOKEN_KEY, data.Token)
}
const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export async function request(path, { method = 'GET', body, file, download = false } = {}) {
  const headers = {}
  if (session.token) headers.Authorization = `Bearer ${session.token}`
  let payload
  if (file) { payload = new FormData(); payload.append('file', file) }
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(`${base}/api${path}`, { method, headers, body: payload, signal: controller.signal })
    if (download && response.ok) return await response.blob()
    const data = await response.json().catch(() => null)
    if (!response.ok || (data?.code !== undefined && data.code !== 200)) {
      const error = new Error(errorMessage(data)); error.status = response.status
      const emailCodeError = path === '/users/update_email' && error.message.includes('验证码')
      if (response.status === 401 && !emailCodeError && path !== '/users/login') {
        clearSession(); window.dispatchEvent(new Event('rc-session-expired'))
      }
      throw error
    }
    return data?.data
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('请求超时，请检查网络后重试')
    if (error instanceof TypeError) throw new Error('无法连接服务，请检查后端是否已启动')
    throw error
  } finally { clearTimeout(timeout) }
}
export const api = {
  info: () => request('/users/info'),
  code: email => request(`/users/generate_verification_code?email=${encodeURIComponent(email)}`),
  login: body => request('/users/login', { method: 'POST', body }),
  updateEmail: body => request('/users/update_email', { method: 'PUT', body }),
  updateStudentId: body => request('/users/update_student_id', { method: 'PUT', body }),
  cabinets: () => request('/reservations/cab_status'),
  mine: () => request('/reservations/my_reservation'),
  reserve: id => request(`/reservations/reserve?cab_id=${encodeURIComponent(id)}`, { method: 'POST' }),
  renew: () => request('/reservations/renew', { method: 'POST' }),
  cancel: () => request('/reservations/cancel', { method: 'POST' }),
  history: page => request(`/reservations/my_history?page=${page}&page_size=10`),
  list: (kind, body) => request(`/${kind}/list`, { method: 'POST', body }),
  remark: (id, remark) => request(`/reservations/update/remark/${id}`, { method: 'PUT', body: { remark } }),
  updateReservationStuId: (id, stu_id) => request(`/reservations/update/stu_id/${encodeURIComponent(id)}`, { method: 'PUT', body: { stu_id } }),
  minimum: body => request('/reservations/update/min_level', { method: 'PUT', body }),
  addCabinet: body => request('/reservations/add', { method: 'POST', body }),
  removeCabinet: id => request(`/reservations/delete/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  clearCabinets: () => request('/reservations/delete_all', { method: 'DELETE' }),
  level: user => request('/users/update_level', { method: 'PUT', body: { email: user.email, level: user.level } }),
  addWhite: body => request('/whitelist/add', { method: 'POST', body }),
  whiteRemark: body => request('/whitelist/update_remark', { method: 'PUT', body }),
  removeWhite: id => request(`/whitelist/remove/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  clearWhite: () => request('/whitelist/remove_all', { method: 'DELETE' }),
  upload: (kind, file) => request(`/${kind}/upload`, { method: 'POST', file }),
  download: kind => request(`/${kind}/download`, { download: true }),
}
