<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { session, logout as endSession } from './lib/api'
import { notice } from './lib/feedback'
import Icon from './components/Icon.vue'
const route = useRoute(), router = useRouter()
const content = ref(null)
watch(() => route.fullPath, () => content.value?.scrollTo({ top: 0 }), { flush: 'post' })
const admin = computed(() => route.meta.admin)
const links = [{ path: '/cabinets', title: '选柜', icon: 'grid' }, { path: '/reservation', title: '我的预约', icon: 'calendar' }, { path: '/history', title: '历史', icon: 'history' }, { path: '/profile', title: '我的', icon: 'user' }]
const admins = [{ path: '/admin/reservations', title: '柜子管理', icon: 'grid' }, { path: '/admin/whitelist', title: '白名单管理', icon: 'list' }, { path: '/admin/users', title: '用户管理', icon: 'users' }]
</script>
<template>
  <div v-if="route.path === '/login'"><RouterView /></div>
  <div v-else :class="['app-shell', { 'admin-shell': admin }]">
    <aside v-if="admin" class="sidebar"><RouterLink class="brand" to="/admin/reservations"><span class="brand-mark"><Icon name="box" :size="23" /></span><span>栖存<span class="brand-en">QICUN · ADMIN</span></span></RouterLink><nav><RouterLink v-for="link in admins" :key="link.path" :to="link.path"><Icon :name="link.icon" />{{ link.title }}<Icon name="right" :size="14" /></RouterLink></nav><div class="sidebar-bottom"><RouterLink to="/cabinets"><Icon name="back" />返回学生端</RouterLink><button @click="endSession(router)"><Icon name="logout" />退出登录</button></div></aside>
    <div class="main-shell"><header class="topbar"><h1 v-if="!admin" class="student-page-title">{{ { cabinets: '选择储物柜', reservation: '我的预约', history: '使用记录', profile: '个人中心' }[route.meta.tab] }}</h1><div v-else class="breadcrumb">工作空间 <span>/</span> {{ admins.find(x => x.path === route.path)?.title }}</div><div class="top-actions"><RouterLink v-if="!admin && route.meta.tab === 'cabinets' && session.reservation" to="/reservation" class="reserved-status" aria-label="查看已预约柜子"><Icon name="calendar" :size="14" />{{ session.reservation.cab_id }} 号柜已预约</RouterLink><span v-if="!admin && typeof session.user?.is_whitelisted === 'boolean'" :class="['whitelist-status', { listed: session.user.is_whitelisted }]" :title="session.user.is_whitelisted ? '当前学号在白名单中，长期预约仍需满足柜子最低等级' : '当前学号未在白名单中，预约类型仍会根据用户等级判断'"><Icon name="shield" :size="14" />{{ session.user.is_whitelisted ? '白名单' : '未在白名单' }}</span><RouterLink v-if="!admin && session.user?.level >= 3" to="/admin/reservations" class="admin-entry"><Icon name="shield" :size="16" />管理端</RouterLink><RouterLink v-if="admin" to="/cabinets" class="admin-back"><Icon name="back" :size="15" />返回学生端</RouterLink><span class="avatar">{{ session.user?.email?.[0]?.toUpperCase() || 'Q' }}</span><span class="top-user">{{ session.user?.s_id }}</span></div></header><main ref="content" :class="[admin ? 'admin-main' : 'student-main', { 'cabinet-page': route.meta.tab === 'cabinets' }]"><RouterView :key="route.fullPath" /></main></div>
    <nav v-if="!admin" class="bottom-nav" aria-label="学生端导航"><RouterLink v-for="link in links" :key="link.path" :to="link.path"><Icon :name="link.icon" /><span>{{ link.title }}</span></RouterLink></nav>
  </div>
  <Transition name="toast"><div v-if="notice" :class="['toast', notice.type]" role="status"><Icon :name="notice.type === 'error' ? 'close' : 'check'" :size="18" />{{ notice.text }}</div></Transition>
</template>

<style scoped>
.app-shell{height:100dvh;min-height:0;overflow:hidden}
.app-shell:not(.admin-shell){display:flex;flex-direction:column}
.main-shell{display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden}
.topbar{flex-shrink:0;position:relative;z-index:21;background:#f5f7f4}
.student-main,.admin-main{flex:1;min-height:0;overflow-y:auto;width:100%;margin:0 auto}
@media(max-width:760px){.admin-shell{display:flex;flex-direction:column}.sidebar{flex-shrink:0}.admin-shell .main-shell{height:auto;flex:1}}
.student-main.cabinet-page{padding-top:12px;padding-bottom:96px}
.student-page-title{font-size:22px;line-height:1.4;letter-spacing:0;white-space:nowrap;margin:0}
@media(max-width:760px){.student-page-title{font-size:19px}}
.reserved-status{display:inline-flex;align-items:center;gap:4px;padding:5px 8px;border-radius:6px;background:#eaf0e1;color:#526d41;font-size:11px;white-space:nowrap}
@media(max-width:760px){.reserved-status{font-size:10px;padding:5px 6px}}

.whitelist-status{display:inline-flex;align-items:center;gap:4px;padding:5px 8px;border-radius:6px;background:#edf0e8;color:#79866e;font-size:11px;white-space:nowrap}
.whitelist-status.listed{background:#eaf4ee;color:#176b55}
.admin-back{display:none;align-items:center;gap:4px;font-size:12px;color:var(--green);white-space:nowrap}
@media(max-width:760px){.admin-back{display:inline-flex}}
@media(max-width:760px){.topbar{height:auto;min-height:73px;flex-wrap:wrap;gap:10px;padding-top:12px;padding-bottom:12px}.top-actions{flex-wrap:wrap}.whitelist-status{font-size:10px;padding:5px 6px}}

.sidebar nav{margin-top:32px}
.admin-shell .topbar{height:56px}
.admin-main{padding-top:24px;min-height:0}
@media(max-width:760px){.sidebar{padding:14px 18px;gap:14px}.sidebar nav{margin-top:0}.admin-shell .topbar{height:48px}.admin-main{padding-top:20px;min-height:0}}
</style>
