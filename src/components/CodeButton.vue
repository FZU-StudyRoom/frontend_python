<script setup>
import { ref, onUnmounted } from 'vue'
import { api } from '../lib/api'
import { notify } from '../lib/feedback'
const props = defineProps({ email: String })
const remaining = ref(0), busy = ref(false)
let interval
async function send() {
  if (!props.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(props.email)) return notify('请先填写有效邮箱', 'error')
  busy.value = true
  try { await api.code(props.email); remaining.value = 60; interval = setInterval(() => { if (--remaining.value <= 0) clearInterval(interval) }, 1000); notify('验证码已发送，请检查邮箱') }
  catch (error) { notify(error.message, 'error') }
  finally { busy.value = false }
}
onUnmounted(() => clearInterval(interval))
</script>
<template><button type="button" class="code-button" :disabled="busy || remaining > 0" @click="send">{{ remaining ? `${remaining}s 后重发` : busy ? '发送中…' : '获取验证码' }}</button></template>
