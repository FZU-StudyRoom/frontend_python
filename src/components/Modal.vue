<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import Icon from './Icon.vue'
defineProps({ title: String, busy: Boolean })
const emit = defineEmits(['close'])
const dialog = ref(null)
let previous
function keys(event) {
  if (event.key !== 'Tab') return
  const elements = [...dialog.value.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex="0"]')]
  if (!elements.length) { event.preventDefault(); return }
  if (event.shiftKey && document.activeElement === elements[0]) { event.preventDefault(); elements.at(-1).focus() }
  else if (!event.shiftKey && document.activeElement === elements.at(-1)) { event.preventDefault(); elements[0].focus() }
}
onMounted(() => { previous = document.activeElement; dialog.value.showModal(); dialog.value.addEventListener('keydown', keys) })
onUnmounted(() => previous?.focus())
</script>
<template><Teleport to="body"><dialog ref="dialog" class="modal" aria-labelledby="modal-title" @cancel.prevent="!busy && emit('close')"><header><h2 id="modal-title">{{ title }}</h2><button class="icon-button" :disabled="busy" aria-label="关闭" @click="emit('close')"><Icon name="close" /></button></header><slot /></dialog></Teleport></template>
