import { createRouter, createWebHashHistory } from 'vue-router'
import { api, session, clearSession } from './lib/api'
export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: () => import('./views/Login.vue'), meta: { public: true } },
    { path: '/', redirect: '/cabinets' },
    { path: '/cabinets', component: () => import('./views/Student.vue'), meta: { tab: 'cabinets' } },
    { path: '/reservation', component: () => import('./views/Student.vue'), meta: { tab: 'reservation' } },
    { path: '/history', component: () => import('./views/Student.vue'), meta: { tab: 'history' } },
    { path: '/profile', component: () => import('./views/Student.vue'), meta: { tab: 'profile' } },
    { path: '/admin/:kind(reservations|users|whitelist)', component: () => import('./views/Admin.vue'), meta: { admin: true } },
    { path: '/:pathMatch(.*)*', redirect: '/cabinets' },
  ],
})
router.beforeEach(async to => {
  if (session.token && !session.user) {
    try { session.user = await api.info() }
    catch (error) { if (error.status === 401 || error.status === 403) clearSession(); else if (!to.meta.public) return { path: '/login', query: { unavailable: '1' } } }
  }
  session.ready = true
  if (!to.meta.public && !session.token) return '/login'
  if (to.meta.admin && (session.user?.level || 0) < 3) return '/cabinets'
  if (to.path === '/login' && session.user) return '/cabinets'
})
window.addEventListener('rc-session-expired', () => router.replace('/login'))
