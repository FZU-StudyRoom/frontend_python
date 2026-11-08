<script setup>
import { reactive, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api, setSession } from '../lib/api'
import { notify } from '../lib/feedback'
import Icon from '../components/Icon.vue'
import CodeButton from '../components/CodeButton.vue'
const router = useRouter(), route = useRoute()
const form = reactive({ email: '', s_id: '', verify_code: '' }), busy = ref(false)
const needsStudentId = ref(false)
watch(() => form.email, () => { needsStudentId.value = false; form.s_id = ''; form.verify_code = '' })
async function login() {
  busy.value = true
  try {
    const data = await api.login({ email: form.email, verify_code: form.verify_code, ...(needsStudentId.value ? { s_id: form.s_id } : {}) })
    if (data.requires_student_id) {
      needsStudentId.value = true
      notify('首次登录，请补充图书馆借阅号完成注册')
      return
    }
    setSession(data); await router.replace('/cabinets'); notify('欢迎回来')
  }
  catch (error) { notify(error.message, 'error') }
  finally { busy.value = false }
}
</script>
<template><div class="login-page"><section class="login-story"><div class="brand light"><span class="brand-mark"><Icon name="box" :size="25" /></span><span>栖存<span class="brand-en">QICUN</span></span></div><div class="story-copy"><h1>自习室<br>储物柜预约</h1><div class="locker-art" aria-hidden="true"><div v-for="n in 6" :key="n" :class="{ open: n === 2 }"><span>{{ String(n).padStart(2, '0') }}</span><i></i></div></div></div></section><section class="login-panel"><div class="mobile-brand brand"><span class="brand-mark"><Icon name="box" /></span>栖存</div><div class="login-form"><h2>{{ needsStudentId ? '补充图书馆借阅号' : '登录' }}</h2><p v-if="needsStudentId" id="borrower-id-tip" class="inline-warning" role="note"><strong>请务必填写真实的图书馆借阅号</strong><br>该号码用于预约登记和身份核对，注册后如需修改请联系管理员。</p><p v-if="route.query.unavailable" class="inline-warning">暂时无法连接服务，请检查后端后重新登录。</p><form @submit.prevent="login"><label>邮箱地址<input v-model.trim="form.email" type="email" autocomplete="email" placeholder="请输入常用邮箱" :disabled="busy" required maxlength="255"></label><label v-if="needsStudentId">图书馆借阅号<input v-model.trim="form.s_id" autocomplete="off" placeholder="请输入真实图书馆借阅号" required maxlength="255" :disabled="busy" aria-describedby="borrower-id-tip"></label><label>邮箱验证码<div class="input-with-button"><input v-model.trim="form.verify_code" inputmode="numeric" autocomplete="one-time-code" placeholder="6 位验证码" required maxlength="255"><CodeButton :email="form.email" /></div></label><button class="primary full" :disabled="busy">{{ busy ? '处理中…' : needsStudentId ? '完成注册' : '登录' }}<Icon name="arrow" :size="18" /></button></form><p v-if="!needsStudentId" class="login-help">首次登录需补充图书馆借阅号</p></div></section></div></template>
