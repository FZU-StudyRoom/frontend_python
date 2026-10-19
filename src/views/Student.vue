<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, session, clearSession, setSession } from '../lib/api'
import { notify } from '../lib/feedback'
import { canRenew, formatTime } from '../lib/rules'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import CodeButton from '../components/CodeButton.vue'
import CabinetCarousel from '../components/CabinetCarousel.vue'
import ZoneMap from '../components/ZoneMap.vue'
const showMap = ref(false)
const route = useRoute(), router = useRouter(), tab = computed(() => route.meta.tab)
const cabinets = ref([]), mine = ref(null), history = ref([]), total = ref(0), page = ref(1)
const loading = ref(true), error = ref(''), busy = ref(false), zone = ref(''), onlyFree = ref(false), search = ref(''), modal = ref(null)
const emailForm = reactive({ email: session.user?.email || '', verify_code: '' })
const studentForm = reactive({ s_id: session.user?.s_id || '' })
const zones = computed(() => [...new Set(cabinets.value.map(c => c.zone || '未分区'))])
const shown = computed(() => cabinets.value.filter(c => (c.zone || '未分区') === zone.value && (!onlyFree.value || c.res_status === 0 && session.user.level >= c.min_level) && String(c.cab_id).includes(search.value)))
const groups = computed(() => [...new Set(shown.value.map(c => c.zone || '未分区'))].map(name => ({ name, items: shown.value.filter(c => (c.zone || '未分区') === name).sort((a,b) => (a.row ?? Infinity) - (b.row ?? Infinity) || (a.col ?? Infinity) - (b.col ?? Infinity) || a.cab_id - b.cab_id) })))
const minimum = computed(() => cabinets.value.find(c => c.cab_id === mine.value?.cab_id)?.min_level || 0)
const clock = ref(Date.now())
const renewalTimer = setInterval(() => { clock.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(renewalTimer))
const renewable = computed(() => canRenew(mine.value, session.user?.level || 0, minimum.value, clock.value))
function position(c) { return [c.zone, c.row != null ? `${c.row} 行` : '', c.col != null ? `${c.col} 列` : ''].filter(Boolean).join(' · ') || '位置暂未标注' }
async function load() {
  loading.value = true; error.value = ''
  try {
    if (tab.value === 'history') { const result = await api.history(page.value); history.value = result.reservations; total.value = result.total_count }
    else if (tab.value === 'profile') {
      session.user = await api.info()
      emailForm.email = session.user.email; emailForm.verify_code = ''
      studentForm.s_id = session.user.s_id
    }
    else {
      const [all, current, user] = await Promise.all([api.cabinets(), api.mine(), api.info()])
      session.user = user
      cabinets.value = all; mine.value = current; session.reservation = current
      if (!zones.value.includes(zone.value)) zone.value = zones.value[0] || ''
    }
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
async function action() {
  busy.value = true
  try {
    if (modal.value.type === 'reserve') await api.reserve(modal.value.cabinet.cab_id)
    else if (modal.value.type === 'cancel') await api.cancel()
    else await api.renew()
    modal.value = null; notify('操作成功'); await load()
  } catch (e) { notify(e.message, 'error'); if (e.status === 409) { modal.value = null; await load() } }
  finally { busy.value = false }
}
async function saveEmail() {
  busy.value = true
  try {
    setSession(await api.updateEmail({ ...emailForm }))
    emailForm.email = session.user.email; emailForm.verify_code = ''
    notify('邮箱已更新，登录状态已同步')
  }
  catch (e) { notify(e.message, 'error') }
  finally { busy.value = false }
}
async function saveStudentId() {
  busy.value = true
  try {
    session.user = await api.updateStudentId({ ...studentForm })
    studentForm.s_id = session.user.s_id
    notify('学号已更新，预约资格已同步')
  }
  catch (e) { notify(e.message, 'error') }
  finally { busy.value = false }
}
function logout() { clearSession(); router.replace('/login') }
async function flip(delta) { page.value += delta; await load() }
onMounted(load)
</script>
<template>
  <section class="page-heading compact-heading"><h1>{{ { cabinets: '选择储物柜', reservation: '我的预约', history: '使用记录', profile: '个人中心' }[tab] }}</h1><button class="icon-button" aria-label="刷新页面" :disabled="loading" @click="load"><Icon name="refresh" /></button></section>
  <div v-if="error" class="error-panel" role="alert"><Icon name="lock" /><p>{{ error }}</p><button class="secondary" @click="load">重新加载</button></div>
  <div v-else-if="loading" class="loading-panel" role="status"><span class="spinner"></span>正在加载你的空间…</div>
  <template v-else>
    <template v-if="tab === 'cabinets'">
      <div class="cabinet-selectors">
        <label class="zone-select"><span class="sr-only">选择储物柜区域</span><select v-model="zone" :disabled="!zones.length"><option v-if="!zones.length" value="">暂无区域</option><option v-for="name in zones" :key="name" :value="name">{{ name }}</option></select></label>
        <button class="zone-map-button" @click="showMap = true"><Icon name="grid" :size="16" />分区图</button>
        <details class="cabinet-filter-menu">
          <summary><Icon name="filters" :size="16" />筛选<span v-if="onlyFree || search" class="filter-active-dot" aria-label="已启用筛选"></span></summary>
          <div class="cabinet-filter-options"><label>查找柜号<input v-model.trim="search" aria-label="按柜号查找" placeholder="输入柜号" type="search"></label><label class="free-toggle"><input v-model="onlyFree" type="checkbox">只看可预约</label><button v-if="search || onlyFree" class="text-button" @click="search = ''; onlyFree = false">清除筛选</button></div>
        </details>
      </div>
      <div v-if="!shown.length" class="empty-panel"><Icon name="box" :size="36" /><h3>暂无符合条件的柜子</h3><p>试试其他区域或调整筛选条件。</p></div>
      <section v-for="group in groups" :key="group.name" class="cabinet-group"><div class="group-heading"><span>{{ group.name }}</span><small>{{ group.items.length }} 个柜子</small></div><CabinetCarousel :items="group.items" :name="group.name" :level="session.user?.level || 0" :reserved="!!mine" @reserve="cabinet => modal = { type: 'reserve', cabinet }" /></section>
      <p class="page-note"><Icon name="shield" :size="15" />{{ mine ? '你已有有效预约，请先取消当前预约再选柜。' : '每人同一时间可预约一个柜子，预约资格以系统校验为准。' }}</p>
    </template>
    <template v-if="tab === 'reservation'">
      <div v-if="!mine" class="empty-panel big"><Icon name="calendar" :size="44" /><h2>为你的日常留个位置</h2><p>目前没有有效预约，去选一个合适的柜子吧。</p><RouterLink class="primary" to="/cabinets">去选柜<Icon name="arrow" :size="17" /></RouterLink></div>
      <section v-else class="reservation-card"><div class="reservation-card-top"><span class="eyebrow">YOUR RESERVED SPACE</span><span class="badge">{{ mine.res_type === 1 ? '长期预约' : '普通预约' }}</span></div><span class="big-cabinet">{{ String(mine.cab_id).padStart(2,'0') }}<small>号柜</small></span><p>{{ position(mine) }}</p><dl><div><dt>开始时间</dt><dd>{{ formatTime(mine.start_time) }}</dd></div><div><dt>{{ mine.res_type === 1 ? '预约期限' : '到期时间' }}</dt><dd>{{ mine.res_type === 1 && !mine.end_time ? '长期使用 · 无截止时间' : formatTime(mine.end_time) }}</dd></div></dl><p class="inline-info">{{ mine.res_type === 1 ? '长期预约无需续约，请保持柜内整洁。' : session.user.level < minimum ? '当前等级不满足柜子要求，请在截止时间前清空并取消预约。' : '普通预约在到期后 3 天内可续约，每次延长 60 天。' }}</p><div class="button-row"><button class="secondary danger-text" @click="modal = { type: 'cancel' }">取消预约</button><button v-if="mine.res_type === 0" class="primary" :disabled="!renewable" @click="modal = { type: 'renew' }">{{ renewable ? '续约 60 天' : '暂不可续约' }}</button></div></section>
    </template>
    <template v-if="tab === 'history'"><div v-if="!history.length" class="empty-panel big"><Icon name="history" :size="40" /><h3>还没有历史记录</h3><p>结束后的预约会记录在这里。</p></div><article v-for="(item,index) in history" :key="index" class="history-card"><span class="history-icon"><Icon name="box" :size="24" /></span><div><h3>{{ item.cab_id }} 号柜 <span class="badge neutral">{{ item.res_type === 1 ? '长期' : '普通' }}</span></h3><p>开始 {{ formatTime(item.start_time) }}</p><p>结束 {{ formatTime(item.end_time) }}</p></div><span class="history-ended">已结束</span></article><div v-if="total > 0" class="pagination"><span>共 {{ total }} 条</span><button class="secondary" :disabled="page === 1" @click="flip(-1)">上一页</button><strong>{{ page }}</strong><button class="secondary" :disabled="page * 10 >= total" @click="flip(1)">下一页</button></div></template>
    <template v-if="tab === 'profile'">
      <section class="profile-banner"><span class="avatar large">{{ session.user.email?.[0]?.toUpperCase() }}</span><div><h2>{{ session.user.s_id }}</h2><p>{{ session.user.email }}</p><span class="badge">Lv.{{ session.user.level }} · {{ session.user.level >= 3 ? '管理员' : '学生用户' }}</span></div></section>
      <section class="white-card profile-edit-card"><h2>修改学号</h2><form class="profile-form" @submit.prevent="saveStudentId"><label>新学号<input v-model.trim="studentForm.s_id" required maxlength="255" :disabled="busy"></label><p class="fine-print">有效预约随学号更新，白名单资格将重新判断。</p><button class="primary full" :disabled="busy || !studentForm.s_id || studentForm.s_id === session.user.s_id">保存学号</button></form></section>
      <section class="white-card profile-edit-card"><h2>修改邮箱</h2><form class="profile-form" @submit.prevent="saveEmail"><label>新邮箱<input v-model.trim="emailForm.email" type="email" autocomplete="email" required maxlength="255" :disabled="busy"></label><label>新邮箱验证码<div class="input-with-button"><input v-model.trim="emailForm.verify_code" autocomplete="one-time-code" inputmode="numeric" required maxlength="255" :disabled="busy" placeholder="请输入验证码"><CodeButton :email="emailForm.email" /></div></label><p class="fine-print">请获取新邮箱的验证码。保存后自动更新登录状态，无需重新登录。</p><button class="primary full" :disabled="busy || emailForm.email === session.user.email">保存邮箱</button></form></section>
      <button class="secondary full logout-button" :disabled="busy" @click="logout"><Icon name="logout" :size="17" />退出登录</button>
    </template>
  </template>
  <ZoneMap v-if="showMap" @close="showMap = false" />
  <Modal v-if="modal" :title="modal.type === 'reserve' ? '确认预约' : modal.type === 'cancel' ? '取消当前预约？' : '确认续约'" :busy="busy" @close="modal = null"><template v-if="modal.type === 'reserve'"><div class="confirm-cabinet"><Icon name="box" :size="35" /><strong>{{ modal.cabinet.cab_id }} 号柜</strong><p>{{ position(modal.cabinet) }}</p></div><p class="muted">预约类型和截止时间由系统根据你的资格确定。预约成功后，可在「我的预约」中查看。</p></template><p v-else class="muted">{{ modal.type === 'cancel' ? '请先取走柜内所有物品。取消后柜子将立即释放，其他同学可以预约。' : '确认后在原截止时间基础上延长 60 天。' }}</p><div class="modal-actions"><button class="secondary" :disabled="busy" @click="modal = null">再想想</button><button :class="modal.type === 'cancel' ? 'danger' : 'primary'" :disabled="busy" @click="action">{{ busy ? '处理中…' : '确认' }}</button></div></Modal>
</template>

<style scoped>
.profile-edit-card{margin-bottom:16px}
.compact-heading{margin-bottom:16px}
.compact-heading h1{font-size:22px;margin:0}
.cabinet-selectors{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.zone-map-button{display:flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;min-height:44px;padding:10px 12px;border:1px solid #dfe6df;border-radius:8px;background:#fff;color:#536354;font-size:13px}
.zone-map-button:hover{background:#edf4e8}
.zone-select{flex:1;min-width:0}
.zone-select select{font-size:14px;height:44px;padding:9px 12px;background:#fff}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.cabinet-filter-menu{position:relative;flex-shrink:0}
.cabinet-filter-menu summary{display:flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:10px 14px;border:1px solid #dfe6df;border-radius:8px;background:#fff;color:#536354;font-size:13px;cursor:pointer;list-style:none}
.cabinet-filter-menu summary::-webkit-details-marker{display:none}
.cabinet-filter-menu summary:focus-visible{outline:3px solid #8ac5a9;outline-offset:3px}
.cabinet-filter-menu[open] summary{background:#edf4e8;border-color:#b7c9a7}
.filter-active-dot{height:6px;width:6px;border-radius:50%;background:var(--green)}
.cabinet-filter-options{position:absolute;right:0;top:calc(100% + 8px);z-index:5;width:240px;max-width:calc(100vw - 44px);padding:16px;display:flex;flex-direction:column;gap:16px;background:#fff;border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px #203a311a}
.cabinet-filter-options label{font-size:12px}
.cabinet-filter-options input[type=search]{font-size:16px}
.cabinet-filter-options .free-toggle{font-size:12px;white-space:nowrap}
.cabinet-filter-options .text-button{align-self:flex-start;padding:0;min-height:32px}
.cabinet-group{margin-top:14px}
.group-heading{margin-bottom:4px}
.page-note{margin-top:16px;font-size:11px}
</style>
