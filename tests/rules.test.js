import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canRenew, compactFilters, errorMessage, parseLocalTime } from '../src/lib/rules.js'

test('filters preserve zero states and exclude empty values', () => {
  assert.deepEqual(compactFilters({ res_status: 0, level: 0, stu_id: '001', zone: '', remark: null, email: undefined }), { res_status: 0, level: 0, stu_id: '001' })
})
test('backend wall time uses Shanghai rather than browser local timezone', () => {
  assert.equal(parseLocalTime('2026-10-19T00:00:00').toISOString(), '2026-10-18T16:00:00.000Z')
  assert.equal(parseLocalTime('2026-10-19T00:00:00+08:00').toISOString(), '2026-10-18T16:00:00.000Z')
  assert.equal(parseLocalTime(null), null)
})
test('normal renewal honors the full three-day window and cabinet minimum', () => {
  const item = { res_type: 0, end_time: '2026-10-19T00:00:00' }
  const end = parseLocalTime(item.end_time).getTime()
  assert.equal(canRenew(item, 1, 1, end - 1), false)
  assert.equal(canRenew(item, 1, 1, end), true)
  assert.equal(canRenew(item, 1, 1, end + 3 * 86400000), true)
  assert.equal(canRenew(item, 1, 1, end + 3 * 86400000 + 1), false)
  assert.equal(canRenew(item, 0, 1, end), false)
  assert.equal(canRenew({ ...item, res_type: 1 }, 1, 0, end), false)
  assert.equal(canRenew({ ...item, end_time: null }, 1, 0, end), false)
  assert.equal(canRenew(null, 1, 0, end), false)
})
test('error messages handle both business errors and FastAPI validation', () => {
  assert.equal(errorMessage({ message: '等级不足' }), '等级不足')
  assert.equal(errorMessage({ detail: 'Token expired' }), 'Token expired')
  assert.equal(errorMessage({ detail: [{ loc: ['body', 'remark'], msg: 'Field required' }] }), 'remark: Field required')
  assert.equal(errorMessage(null), '请求失败，请稍后重试')
})
