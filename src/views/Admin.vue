<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api, session } from '../lib/api'
import { compactFilters, formatTime, levelLabel } from '../lib/rules'
import { notify } from '../lib/feedback'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
const route = useRoute(), kind = computed(() => route.params.kind)
const config = computed(() => ({ reservations: { title: '柜子管理', array: 'reservations', total: 'total_count' }, users: { title: '用户管理', array: 'users', total: 'total' }, whitelist: { title: '白名单管理', array: 'entries', total: 'total_count' } })[kind.value])
const filters = reactive({}), applied = ref({}), page = ref(1), pageSize = ref(10), rows = ref([]), total = ref(0), loading = ref(false), error = ref(''), busy = ref(false), fileInput = ref(null), modal = ref(null), transferBusy = ref(false)
const fields = computed(() => kind.value === 'reservations' ? [
  { key: 'cab_id', label: '柜号', type: 'number' }, { key: 'stu_id', label: '预约学号' }, { key: 'zone', label: '区域' }, { key: 'res_status', label: '占用状态', options: [[0, '空闲'], [1, '占用']] }, { key: 'res_type', label: '预约类型', options: [[0, '普通预约'], [1, '长期预约']] }, { key: 'min_level', label: '最低等级', type: 'number' }, { key: 'remark', label: '备注关键词' },
] : kind.value === 'users' ? [{ key: 'email', label: '邮箱' }, { key: 's_id', label: '学号' }, { key: 'level', label: '用户等级', type: 'number' }] : [{ key: 'stu_id', label: '学号' }, { key: 'remark', label: '备注关键词' }])
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const activeFilters = computed(() => Object.keys(applied.value).length)
let sequence = 0
async function load() {
  const id = ++sequence; loading.value = true; error.value = ''
  try {
    const data = await api.list(kind.value, { ...applied.value, page: page.value, page_size: pageSize.value })
    if (id !== sequence) return
    rows.value = data[config.value.array]; total.value = data[config.value.total]
  } catch (e) { if (id === sequence) error.value = e.message }
  finally { if (id === sequence) loading.value = false }
}
function query() { applied.value = compactFilters(filters); page.value = 1; load() }
function reset() { Object.keys(filters).forEach(k => delete filters[k]); query() }
function edit(type, item) { modal.value = { type, item: { ...item }, value: type === 'remark' ? item.remark || '' : type === 'minimum' ? item.min_level : type === 'studentId' ? item.s_id : item.level } }
async function save() {
  const m = modal.value; busy.value = true
  try {
    if (m.type === 'remark') await api.remark(m.item.cab_id, m.value || null)
    else if (m.type === 'minimum') await api.minimum({ cab_id: m.item.cab_id, min_level: m.value })
    else if (m.type === 'studentId') {
      const user = await api.updateStudentId({ email: m.item.email, s_id: m.value })
      if (user.id === session.user.id) session.user = user
    }
    else if (m.type === 'level') await api.level({ ...m.item, level: m.value })
    else if (m.type === 'whiteRemark') await api.whiteRemark({ stu_id: m.item.stu_id, remark: m.value || null })
    else if (m.type === 'whiteAdd') await api.addWhite({ stu_id: m.item.stu_id, name: m.item.name || null, remark: m.value || null })
    else if (m.type === 'remove') await api.removeWhite(m.item.stu_id)
    else if (m.type === 'clear') await api.clearWhite()
    notify('操作成功'); modal.value = null
    if (m.type === 'remove' && rows.value.length === 1 && page.value > 1) page.value--
    await load()
  } catch (e) { notify(e.message, 'error'); if (e.status === 409) await load() }
  finally { busy.value = false }
}
async function download() {
  transferBusy.value = true
  try {
    const blob = await api.download(kind.value), url = URL.createObjectURL(blob), link = document.createElement('a')
    link.href = url; link.download = kind.value === 'reservations' ? 'reservations.xlsx' : 'whitelist.xlsx'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify('导出文件已生成')
  } catch (e) { notify(e.message, 'error') }
  finally { transferBusy.value = false }
}
async function upload(event) {
  const file = event.target.files?.[0]; event.target.value = ''
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.xlsx')) return notify('请上传 .xlsx 格式的 Excel 文件', 'error')
  transferBusy.value = true
  try {
    const data = await api.upload(kind.value, file)
    modal.value = { type: 'result', added: kind.value === 'reservations' ? data.uploaded_reservations.length : data.success.length, skipped: kind.value === 'reservations' ? data.failed_reservations.map(item => `柜号 ${item.cab_id} 已存在，已跳过`) : data.errors }
    await load()
  } catch (e) { notify(e.message, 'error') }
  finally { transferBusy.value = false }
}
function changePage(value) { page.value = value; load() }
watch(kind, () => { reset(); modal.value = null })
onMounted(load)
</script>
<template>
  <section class="page-heading admin-heading"><div><h1>{{ config.title }}</h1></div><div class="button-row"><template v-if="kind !== 'users'"><input ref="fileInput" type="file" accept=".xlsx" hidden @change="upload"><button class="secondary" :disabled="transferBusy" @click="download"><Icon name="download" :size="17" />导出 Excel</button><button class="secondary" :disabled="transferBusy" @click="fileInput.click()"><Icon name="upload" :size="17" />{{ transferBusy ? '处理中…' : '导入 Excel' }}</button></template><button v-if="kind === 'whitelist'" class="primary" @click="modal = { type: 'whiteAdd', item: { stu_id: '' }, value: '' }"><Icon name="plus" :size="18" />添加白名单</button></div></section>
  <section class="filter-panel"><form @submit.prevent="query"><div class="filter-fields"><label v-for="field in fields" :key="field.key">{{ field.label }}<select v-if="field.options" v-model="filters[field.key]"><option :value="undefined">全部</option><option v-for="option in field.options" :key="option[0]" :value="option[0]">{{ option[1] }}</option></select><input v-else v-model="filters[field.key]" :type="field.type || 'text'" :min="field.type === 'number' ? 0 : undefined" :step="field.type === 'number' ? 1 : undefined" :placeholder="`请输入${field.label}`"></label></div><div class="filter-bottom"><span>{{ activeFilters ? `已应用 ${activeFilters} 个筛选条件` : '显示全部记录' }}</span><div class="button-row"><button type="button" class="secondary" :disabled="loading" @click="reset">重置</button><button class="primary" :disabled="loading"><Icon name="search" :size="16" />查询</button></div></div></form></section>
  <section class="table-panel"><div class="table-heading"><div><h2>{{ kind === 'reservations' ? '储物柜列表' : kind === 'users' ? '用户列表' : '白名单列表' }} <span class="count-pill">{{ total }}</span></h2></div><div class="button-row"><button v-if="kind === 'whitelist'" class="text-button danger-text" :disabled="loading || !total" @click="modal = { type: 'clear' }">清空全部</button></div></div>
    <div v-if="error" class="error-panel" role="alert"><p>{{ error }}</p><button class="secondary" @click="load">重新加载</button></div><div v-else-if="loading" class="loading-panel" role="status"><span class="spinner"></span>正在加载列表…</div>
    <template v-else><div class="table-scroll"><table v-if="kind === 'reservations'"><thead><tr><th>柜号 / 位置</th><th>使用状态</th><th>最低等级</th><th>预约学号</th><th>预约类型</th><th>起止时间</th><th>管理员备注</th><th class="sticky-action">操作</th></tr></thead><tbody><tr v-for="item in rows" :key="item.cab_id"><td><strong class="cab-id"><Icon name="box" :size="16" />{{ String(item.cab_id).padStart(2,'0') }} 号柜</strong><small class="cell-sub">{{ item.zone || '未分区' }} · {{ item.row ?? '—' }} 行 · {{ item.col ?? '—' }} 列</small></td><td><span :class="['status-pill', item.res_status === 1 ? 'amber' : 'green']"><i></i>{{ item.res_status === 1 ? '使用中' : '空闲' }}</span></td><td><span class="level-pill">{{ levelLabel(item.min_level) }}</span></td><td class="mono">{{ item.stu_id || '—' }}</td><td><span :class="['badge', item.res_type === 1 ? '' : 'neutral']">{{ item.res_status === 0 ? '—' : item.res_type === 1 ? '长期预约' : '普通预约' }}</span></td><td><small class="date-cell">{{ formatTime(item.start_time) }}</small><small class="date-cell muted">{{ item.res_status === 1 && item.res_type === 1 && !item.end_time ? '无截止时间' : formatTime(item.end_time) }}</small></td><td class="remark-cell" :title="item.remark || ''">{{ item.remark || '—' }}</td><td class="sticky-action"><button class="text-button" @click="edit('remark', item)">备注</button><button class="text-button" @click="edit('minimum', item)">等级</button></td></tr></tbody></table>
      <table v-else-if="kind === 'users'"><thead><tr><th>用户</th><th>学号</th><th>等级</th><th>最近登录</th><th>操作</th></tr></thead><tbody><tr v-for="item in rows" :key="item.id"><td><div class="user-cell"><span class="avatar">{{ item.email?.[0]?.toUpperCase() }}</span><strong>{{ item.email }}</strong></div></td><td class="mono">{{ item.s_id }}</td><td><span class="level-pill">{{ levelLabel(item.level) }}</span></td><td>{{ formatTime(item.last_login_time) }}</td><td><button class="text-button" @click="edit('studentId', item)">修改学号</button><button class="text-button" :disabled="item.level >= session.user.level" @click="edit('level', item)">{{ item.level >= session.user.level ? '不可修改' : '修改等级' }}</button></td></tr></tbody></table>
      <table v-else><thead><tr><th>学号</th><th>姓名</th><th>备注</th><th>操作</th></tr></thead><tbody><tr v-for="item in rows" :key="item.stu_id"><td class="mono"><strong>{{ item.stu_id }}</strong></td><td>{{ item.name || '—' }}</td><td class="remark-cell">{{ item.remark || '—' }}</td><td><button class="text-button" @click="modal = { type: 'whiteRemark', item: { ...item }, value: item.remark || '' }">修改备注</button><button class="text-button danger-text" @click="modal = { type: 'remove', item: { ...item } }">移除</button></td></tr></tbody></table></div>
      <div v-if="!rows.length" class="empty-panel"><Icon name="search" :size="34" /><h3>暂无符合条件的记录</h3><p>调整筛选条件，或稍后刷新查看。</p></div>
    </template><div class="pagination table-pagination"><span>共 {{ total }} 条记录</span><label>每页 <select v-model="pageSize" :disabled="loading" @change="changePage(1)"><option :value="10">10 条</option><option :value="20">20 条</option><option :value="50">50 条</option></select></label><button class="secondary" :disabled="loading || page === 1" @click="changePage(page - 1)">上一页</button><strong>{{ page }} / {{ pageCount }}</strong><button class="secondary" :disabled="loading || page >= pageCount" @click="changePage(page + 1)">下一页</button></div></section>
  <Modal v-if="modal" :title="{ remark: '修改柜子备注', minimum: '调整最低预约等级', level: '修改用户等级', studentId: '修改学号', whiteAdd: '添加白名单', whiteRemark: '修改白名单备注', remove: '移除白名单？', clear: '清空全部白名单？', result: '导入结果' }[modal.type]" :busy="busy" @close="modal = null">
    <div v-if="modal.type === 'result'"><div class="import-summary"><Icon name="check" :size="28" /><strong>新增 {{ modal.added }} 条</strong><span>已存在跳过 {{ modal.skipped.length }} 条</span></div><ul v-if="modal.skipped.length" class="import-errors"><li v-for="(line,index) in modal.skipped" :key="index">{{ line }}</li></ul><div class="modal-actions"><button class="primary" @click="modal = null">完成</button></div></div>
    <form v-else @submit.prevent="save"><p v-if="modal.item" class="edit-target">{{ modal.item.cab_id != null ? `${modal.item.cab_id} 号柜` : modal.item.email || modal.item.stu_id }}</p>
      <template v-if="modal.type === 'studentId'"><label>新学号<input v-model.trim="modal.value" required maxlength="255"></label><p class="fine-print">有效预约学号会同步更新，并重新判断白名单资格。</p></template>
      <label v-if="modal.type === 'whiteAdd'">学号<input v-model.trim="modal.item.stu_id" required maxlength="255" placeholder="请输入学号"></label>
      <label v-if="modal.type === 'whiteAdd'">姓名<input v-model.trim="modal.item.name" maxlength="255" placeholder="选填"></label>
      <label v-if="['remark','whiteRemark','whiteAdd'].includes(modal.type)">备注<textarea v-model="modal.value" :maxlength="modal.type === 'remark' ? 1000 : undefined" rows="4" placeholder="填写备注，留空则清空"></textarea><small v-if="modal.type === 'remark'" class="text-counter">{{ modal.value.length }} / 1000</small></label>
      <template v-if="modal.type === 'minimum' || modal.type === 'level'"><label>{{ modal.type === 'minimum' ? '最低预约等级' : '用户等级' }}<input v-model.number="modal.value" type="number" min="0" step="1" :max="modal.type === 'level' ? session.user.level - 1 : undefined" required><small>{{ levelLabel(modal.value) }}</small></label><p class="inline-warning">{{ modal.type === 'minimum' ? '提高门槛后，不符合要求的当前预约将转为普通预约并限制期限，系统会发送邮件。降低门槛不恢复已有预约期限。' : '等级变更可能改变当前预约类型和截止时间，系统会发送邮件通知用户。' }}</p></template>
      <p v-if="modal.type === 'remove'" class="inline-warning">移除 {{ modal.item.stu_id }} 的长期预约资格？如用户没有其他长期资格，符合规则的当前预约将转为普通预约。</p>
      <template v-if="modal.type === 'clear'"><p class="inline-warning">这会移除全部白名单，可能批量调整当前预约期限并发送邮件。操作不能直接撤销。</p><label>输入「清空白名单」确认<input v-model="modal.confirm" placeholder="清空白名单" required pattern="清空白名单"></label></template>
      <div class="modal-actions"><button type="button" class="secondary" :disabled="busy" @click="modal = null">取消</button><button :class="['remove','clear'].includes(modal.type) ? 'danger' : 'primary'" :disabled="busy">{{ busy ? '保存中…' : '确认保存' }}</button></div>
    </form>
  </Modal>
</template>

<style scoped>
.admin-heading{margin-bottom:18px;gap:14px}
.admin-heading h1{font-size:24px;margin:0}
.filter-panel{padding:16px 18px;margin-bottom:18px}
.filter-panel form{gap:14px}
.filter-fields{gap:12px 16px}
.filter-bottom{padding-top:12px}
.table-heading{padding:14px 18px}
td{height:auto;padding-top:14px;padding-bottom:14px}
.table-pagination{padding:12px 18px}
@media(max-width:760px){.admin-heading{gap:12px}.admin-heading h1{font-size:22px}.filter-panel{padding:14px}.filter-fields{gap:12px}.table-heading{padding:12px 14px}}
</style>
