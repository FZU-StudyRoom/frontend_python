<script setup>
import { ref } from 'vue'
import Modal from './Modal.vue'

defineEmits(['close'])
const enlarged = ref(false)
const failed = ref(false)
const mapUrl = `${import.meta.env.BASE_URL}zone-map.png`
</script>

<template>
  <Modal title="分区示意图" class="zone-map-dialog" @close="$emit('close')">
    <div class="map-toolbar"><span>当前为占位图</span><button class="text-button" :disabled="failed" :aria-pressed="enlarged" @click="enlarged = !enlarged">{{ enlarged ? '适应窗口' : '放大查看' }}</button></div>
    <p v-if="failed" class="inline-warning" role="alert">图片加载失败，请关闭后重试。</p>
    <div v-else class="map-viewport" tabindex="0" aria-label="分区图，放大后可滚动查看"><img :src="mapUrl" alt="分区示意图占位图片" :class="{ enlarged }" @error="failed = true"></div>
  </Modal>
</template>

<style scoped>
:global(.zone-map-dialog){width:min(900px,calc(100% - 32px))}
.map-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;font-size:12px;color:#89958e}
.map-toolbar button{min-height:44px}
.map-viewport{overflow:auto;max-height:60dvh;background:#f5f7f4;border:1px solid var(--border);border-radius:10px}
.map-viewport img{display:block;width:100%;height:auto}
.map-viewport img.enlarged{width:200%;max-width:none}
</style>
