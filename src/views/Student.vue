<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, session, clearSession } from '../lib/api'
import { notify } from '../lib/feedback'
import { canRenew, formatTime } from '../lib/rules'
import Icon from '../components/Icon.vue'
import Modal from '../components/Modal.vue'
import CodeButton from '../components/CodeButton.vue'
const route = useRoute(), router = useRouter(), tab = computed(() => route.meta.tab)
const cabinets = ref([]), mine = ref(null), history = ref([]), total = ref(0), page = ref(1)
const loading = ref(true), error = ref(''), busy = ref(false), zone = ref('全部'), onlyFree = ref(false), search = ref(''), modal = ref(null)
const profile = reactive({ new_email: session.user?.email || '', new_s_id: session.user?.s_id || '', verify_code: '' })
const zones = computed(() => ['全部', ...new Set(cabinets.value.map(c => c.zone || '未分区'))])
const shown = computed(() => cabinets.value.filter(c => (zone.value === '全部' || (c.zone || '未分区') === zone.value) && (!onlyFree.value || c.res_status === 0 && session.user.level >= c.min_level) && String(c.cab_id).includes(search.value)))
const groups = computed(() => [...new Set(shown.value.map(c => c.zone || '未分区'))].map(name => ({ name, items: shown.value.filter(c => (c.zone || '未分区') === name).sort((a,b) => (a.row ?? Infinity) - (b.row ?? Infinity) || (a.col ?? Infinity) - (b.col ?? Infinity) || a.cab_id - b.cab_id) })))
const available = computed(() => cabinets.value.filter(c => c.res_status === 0 && session.user?.level >= c.min_level).length)
const minimum = computed(() => cabinets.value.find(c => c.cab_id === mine.value?.cab_id)?.min_level || 0)
const clock = ref(Date.now())
const renewalTimer = setInterval(() => { clock.value = Date.now() }, 1000)
onUnmounted(() => clearInterval(renewalTimer))
const renewable = computed(() => canRenew(mine.value, session.user?.level || 0, minimum.value, clock.value))
function position(c) { return [c.zone, c.row != null ? `${c.row} 行` : '', c.col != null ? `${c.col} 列` : ''].filter(Boolean).join(' · ') || '位置暂未标注' }
function state(c) { return c.res_status === 1 ? 'occupied' : session.user.level < c.min_level ? 'locked' : 'free' }
async function load() {
  loading.value = true; error.value = ''
  try {
    if (tab.value === 'history') { const result = await api.history(page.value); history.value = result.reservations; total.value = result.total_count }
    else if (tab.value === 'profile') { session.user = await api.info(); Object.assign(profile, { new_email: session.user.email, new_s_id: session.user.s_id }) }
    else { const [all, current] = await Promise.all([api.cabinets(), api.mine()]); cabinets.value = all; mine.value = current }
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
async function saveProfile() {
  busy.value = true
  const changedEmail = profile.new_email !== session.user.email
  try { session.user = await api.profile(profile); profile.verify_code = ''; notify(changedEmail ? '邮箱已更新，请使用新邮箱重新登录' : '个人信息已更新'); if (changedEmail) logout(); }
  catch (e) { notify(e.message, 'error') }
  finally { busy.value = false }
}
function logout() { clearSession(); router.replace('/login') }
async function flip(delta) { page.value += delta; await load() }
onMounted(load)
</script>
<template>
  <section class="page-heading"><div><span class="eyebrow green">{{ tab === 'cabinets' ? 'YOUR LITTLE SPACE' : 'MY QICUN' }}</span><h1>{{ { cabinets: '找一处，安心存放', reservation: '我的预约', history: '留下的使用足迹', profile: '个人中心' }[tab] }}</h1><p>{{ { cabinets: '轻装上阵，把更多心思留给学习。', reservation: '你的专属空间，随时查看。', history: '每一段专注，都有迹可循。', profile: '管理你的账户与联系信息。' }[tab] }}</p></div><button class="icon-button" aria-label="刷新页面" :disabled="loading" @click="load"><Icon name="refresh" /></button></section>
  <div v-if="error" class="error-panel" role="alert"><Icon name="lock" /><p>{{ error }}</p><button class="secondary" @click="load">重新加载</button></div>
  <div v-else-if="loading" class="loading-panel" role="status"><span class="spinner"></span>正在加载你的空间…</div>
  <template v-else>
    <template v-if="tab === 'cabinets'">
      <section class="student-hero"><div><span class="hero-label"><span class="dot"></span>为下一次专注，留一点空间</span><h2>书本有归处，<br>学习更从容。</h2><p>选一个柜子，安放你的学习日常。</p><span class="hero-count">{{ available }} <small>个柜子可预约</small></span></div><div class="mini-lockers" aria-hidden="true"><span v-for="n in 6" :key="n"><i></i>{{ String(n).padStart(2,'0') }}</span></div><Icon class="hero-leaf" name="leaf" :size="110" /></section>
      <RouterLink to="/reservation" class="current-strip"><span class="strip-icon"><Icon name="calendar" /></span><div><strong>{{ mine ? `${mine.cab_id} 号柜正在为你保留` : '还没有自己的柜子？' }}</strong><small>{{ mine ? mine.res_type === 1 ? '长期预约 · 无截止时间' : `到期时间 ${formatTime(mine.end_time)}` : '选择下方空闲柜，开启轻装自习' }}</small></div><Icon name="right" :size="18" /></RouterLink>
      <div class="section-title"><h2>选择储物柜 <span>{{ cabinets.length }}</span></h2><label class="free-toggle"><input v-model="onlyFree" type="checkbox">只看可预约</label></div>
      <div class="zone-tabs"><button v-for="name in zones" :key="name" :class="{ active: zone === name }" @click="zone = name">{{ name === '全部' ? '全部区域' : name }}</button></div>
      <div class="cabinet-tools"><label class="search-field"><Icon name="search" :size="16" /><input v-model.trim="search" aria-label="按柜号查找" placeholder="查找柜号"></label><div class="legend"><span><i class="free"></i>空闲</span><span><i class="occupied"></i>占用</span><span><i class="locked"></i>等级不足</span></div></div>
      <div v-if="!shown.length" class="empty-panel"><Icon name="box" :size="36" /><h3>暂无符合条件的柜子</h3><p>试试其他区域或调整筛选条件。</p></div>
      <section v-for="group in groups" :key="group.name" class="cabinet-group"><div class="group-heading"><span>{{ group.name }}</span><small>{{ group.items.length }} 个柜子</small></div><div class="cabinet-grid"><button v-for="cabinet in group.items" :key="cabinet.cab_id" :class="['cabinet', state(cabinet)]" :disabled="state(cabinet) !== 'free' || !!mine" :aria-label="`${cabinet.cab_id}号柜，${position(cabinet)}，${state(cabinet) === 'free' ? '空闲' : state(cabinet) === 'locked' ? '等级不足' : '已占用'}`" @click="modal = { type: 'reserve', cabinet }"><div class="cabinet-top"><span>{{ String(cabinet.cab_id).padStart(2,'0') }}</span><Icon :name="state(cabinet) === 'locked' ? 'lock' : 'box'" :size="15" /></div><small>{{ cabinet.row != null && cabinet.col != null ? `${cabinet.row} 行 · ${cabinet.col} 列` : '位置未标注' }}</small><span class="cabinet-state">{{ state(cabinet) === 'free' ? '可预约' : state(cabinet) === 'locked' ? `需 Lv.${cabinet.min_level}` : '已占用' }}</span><span v-if="state(cabinet) === 'free'" class="cabinet-min">Lv.{{ cabinet.min_level }} 起</span></button></div></section>
      <p class="page-note"><Icon name="shield" :size="15" />{{ mine ? '你已有有效预约，请先取消当前预约再选柜。' : '每人同一时间可预约一个柜子，预约资格以系统校验为准。' }}</p>
    </template>
    <template v-if="tab === 'reservation'">
      <div v-if="!mine" class="empty-panel big"><Icon name="calendar" :size="44" /><h2>为你的日常留个位置</h2><p>目前没有有效预约，去选一个合适的柜子吧。</p><RouterLink class="primary" to="/cabinets">去选柜<Icon name="arrow" :size="17" /></RouterLink></div>
      <section v-else class="reservation-card"><div class="reservation-card-top"><span class="eyebrow">YOUR RESERVED SPACE</span><span class="badge">{{ mine.res_type === 1 ? '长期预约' : '普通预约' }}</span></div><span class="big-cabinet">{{ String(mine.cab_id).padStart(2,'0') }}<small>号柜</small></span><p>{{ position(mine) }}</p><dl><div><dt>开始时间</dt><dd>{{ formatTime(mine.start_time) }}</dd></div><div><dt>{{ mine.res_type === 1 ? '预约期限' : '到期时间' }}</dt><dd>{{ mine.res_type === 1 && !mine.end_time ? '长期使用 · 无截止时间' : formatTime(mine.end_time) }}</dd></div></dl><p class="inline-info">{{ mine.res_type === 1 ? '长期预约无需续约，请保持柜内整洁。' : session.user.level < minimum ? '当前等级不满足柜子要求，请在截止时间前清空并取消预约。' : '普通预约在到期后 3 天内可续约，每次延长 60 天。' }}</p><div class="button-row"><button class="secondary danger-text" @click="modal = { type: 'cancel' }">取消预约</button><button v-if="mine.res_type === 0" class="primary" :disabled="!renewable" @click="modal = { type: 'renew' }">{{ renewable ? '续约 60 天' : '暂不可续约' }}</button></div></section>
    </template>
    <template v-if="tab === 'history'"><div v-if="!history.length" class="empty-panel big"><Icon name="history" :size="40" /><h3>还没有历史记录</h3><p>结束后的预约会记录在这里。</p></div><article v-for="(item,index) in history" :key="index" class="history-card"><span class="history-icon"><Icon name="box" :size="24" /></span><div><h3>{{ item.cab_id }} 号柜 <span class="badge neutral">{{ item.res_type === 1 ? '长期' : '普通' }}</span></h3><p>开始 {{ formatTime(item.start_time) }}</p><p>结束 {{ formatTime(item.end_time) }}</p></div><span class="history-ended">已结束</span></article><div v-if="total > 0" class="pagination"><span>共 {{ total }} 条</span><button class="secondary" :disabled="page === 1" @click="flip(-1)">上一页</button><strong>{{ page }}</strong><button class="secondary" :disabled="page * 10 >= total" @click="flip(1)">下一页</button></div></template>
    <template v-if="tab === 'profile'"><section class="profile-banner"><span class="avatar large">{{ session.user.email?.[0]?.toUpperCase() }}</span><div><h2>{{ session.user.s_id }}</h2><p>{{ session.user.email }}</p><span class="badge">Lv.{{ session.user.level }} · {{ session.user.level >= 3 ? '管理员' : '学生用户' }}</span></div></section><section class="white-card"><h2>个人信息</h2><p class="muted">通过邮箱验证码更新你的联系信息。</p><form class="profile-form" @submit.prevent="saveProfile"><label>邮箱地址<input v-model.trim="profile.new_email" type="email" autocomplete="email" required maxlength="255"></label><label>学号<input v-model.trim="profile.new_s_id" required maxlength="255"></label><label>邮箱验证码<div class="input-with-button"><input v-model.trim="profile.verify_code" autocomplete="one-time-code" inputmode="numeric" required placeholder="请输入验证码"><CodeButton :email="profile.new_email" /></div></label><p class="fine-print">修改邮箱时请获取新邮箱验证码，保存后需重新登录。只改学号时使用当前邮箱验证码。</p><button class="primary full" :disabled="busy">{{ busy ? '保存中…' : '保存修改' }}</button></form></section><button class="secondary full logout-button" @click="logout"><Icon name="logout" :size="17" />退出登录</button></template>
  </template>
  <Modal v-if="modal" :title="modal.type === 'reserve' ? '确认预约' : modal.type === 'cancel' ? '取消当前预约？' : '确认续约'" :busy="busy" @close="modal = null"><template v-if="modal.type === 'reserve'"><div class="confirm-cabinet"><Icon name="box" :size="35" /><strong>{{ modal.cabinet.cab_id }} 号柜</strong><p>{{ position(modal.cabinet) }}</p></div><p class="muted">预约类型和截止时间由系统根据你的资格确定。预约成功后，可在「我的预约」中查看。</p></template><p v-else class="muted">{{ modal.type === 'cancel' ? '请先取走柜内所有物品。取消后柜子将立即释放，其他同学可以预约。' : '确认后在原截止时间基础上延长 60 天。' }}</p><div class="modal-actions"><button class="secondary" :disabled="busy" @click="modal = null">再想想</button><button :class="modal.type === 'cancel' ? 'danger' : 'primary'" :disabled="busy" @click="action">{{ busy ? '处理中…' : '确认' }}</button></div></Modal>
</template>
