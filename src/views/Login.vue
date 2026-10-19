<script setup>
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api, setSession } from '../lib/api'
import { notify } from '../lib/feedback'
import Icon from '../components/Icon.vue'
import CodeButton from '../components/CodeButton.vue'
const router = useRouter(), route = useRoute()
const form = reactive({ email: '', s_id: '', verify_code: '' }), busy = ref(false)
async function login() {
  busy.value = true
  try { setSession(await api.login(form)); await router.replace('/cabinets'); notify('欢迎回来') }
  catch (error) { notify(error.message, 'error') }
  finally { busy.value = false }
}
</script>
<template><div class="login-page"><section class="login-story"><div class="brand light"><span class="brand-mark"><Icon name="box" :size="25" /></span><span>栖存<span class="brand-en">QICUN</span></span></div><div class="story-copy"><span class="eyebrow">A LITTLE SPACE. A LITTLE PEACE.</span><h1>让专注，<br>有处安放。</h1><p>一本书，一杯茶，一段属于自己的时间。<br>把日常妥帖收好，轻装走进每一次自习。</p><div class="locker-art" aria-hidden="true"><div v-for="n in 6" :key="n" :class="{ open: n === 2 }"><span>{{ String(n).padStart(2, '0') }}</span><i></i></div></div></div><p class="story-footer">自习室储物柜预约平台 <span>EST. 2026</span></p></section><section class="login-panel"><div class="mobile-brand brand"><span class="brand-mark"><Icon name="box" /></span>栖存</div><div class="login-form"><span class="eyebrow green">WELCOME TO QICUN</span><h2>欢迎来到栖存</h2><p class="muted">从一处安心存放，开始今天的专注。</p><p v-if="route.query.unavailable" class="inline-warning">暂时无法连接服务，请检查后端后重新登录。</p><form @submit.prevent="login"><label>邮箱地址<input v-model.trim="form.email" type="email" autocomplete="email" placeholder="请输入常用邮箱" required maxlength="255"></label><label>学号<input v-model.trim="form.s_id" autocomplete="username" placeholder="请输入你的学号" required maxlength="255"></label><label>邮箱验证码<div class="input-with-button"><input v-model.trim="form.verify_code" inputmode="numeric" autocomplete="one-time-code" placeholder="6 位验证码" required maxlength="255"><CodeButton :email="form.email" /></div></label><button class="primary full" :disabled="busy">{{ busy ? '正在登录…' : '登录 / 注册' }}<Icon name="arrow" :size="18" /></button></form><p class="login-help"><Icon name="shield" :size="15" />首次登录自动创建账户，无需设置密码</p><div class="login-divider"></div><p class="fine-print">验证码有效期 5 分钟，请勿向他人透露。<br>学生与管理员使用同一入口登录。</p></div><div class="login-copyright">栖存 QICUN <span>让空间服务于专注</span></div></section></div></template>
