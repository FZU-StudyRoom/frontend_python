<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({ items: { type: Array, required: true }, level: { type: Number, default: 0 }, reserved: Boolean, name: String })
const emit = defineEmits(['reserve'])
const track = ref(null), offset = ref(0), step = ref(1)
const columns = computed(() => {
  // Preserve the cabinet's actual column and row when positions are available.
  if (props.items.every(item => item.col != null && item.row != null)) {
    return [...new Set(props.items.map(item => item.col))].sort((a, b) => a - b)
      .map(col => props.items.filter(item => item.col === col).sort((a, b) => a.row - b.row || a.cab_id - b.cab_id))
  }
  return Array.from({ length: Math.ceil(props.items.length / 3) }, (_, index) => props.items.slice(index * 3, index * 3 + 3))
})
const current = computed(() => Math.round(offset.value / step.value))
const last = computed(() => Math.max(0, columns.value.length - 2))
function state(cabinet) { return cabinet.res_status === 1 ? 'occupied' : props.level < cabinet.min_level ? 'locked' : 'free' }
function measure() {
  const element = track.value
  if (!element) return
  step.value = (element.clientWidth + 12) / 2
  offset.value = element.scrollLeft
}
function move(delta) {
  const index = Math.max(0, Math.min(last.value, current.value + delta))
  track.value?.scrollTo({ left: index * step.value, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
}
function turn(index) {
  const distance = Math.max(-1, Math.min(1, (index * step.value - offset.value) / step.value - .5))
  return { transform: `perspective(900px) rotateY(${distance * -12}deg)`, transformOrigin: distance < 0 ? 'right center' : 'left center' }
}
let observer
onMounted(() => { observer = new ResizeObserver(measure); observer.observe(track.value); measure() })
onUnmounted(() => observer?.disconnect())
watch(() => props.items, async () => { await nextTick(); track.value?.scrollTo({ left: 0 }); measure() })
</script>

<template>
  <div class="cabinet-carousel">
    <div ref="track" class="cabinet-reel" tabindex="0" role="region" :aria-label="`${name}柜子，左右滑动查看`" @scroll.passive="measure" @keydown.left.prevent="move(-1)" @keydown.right.prevent="move(1)">
      <div v-for="(column, index) in columns" :key="index" class="cabinet-column">
        <div class="cabinet-column-face" :style="turn(index)">
          <button v-for="cabinet in column" :key="cabinet.cab_id" :class="['cabinet', state(cabinet)]" :disabled="state(cabinet) !== 'free' || reserved" :aria-label="`${cabinet.cab_id}号柜，${cabinet.row ?? '未知'}行，${cabinet.col ?? '未知'}列，${state(cabinet) === 'free' ? '可预约' : state(cabinet) === 'locked' ? '等级不足' : '已占用'}`" @click="emit('reserve', cabinet)">
            <div class="cabinet-top"><span>{{ String(cabinet.cab_id).padStart(2, '0') }}</span><Icon :name="state(cabinet) === 'locked' ? 'lock' : 'box'" :size="18" /></div>
            <small>{{ cabinet.row != null && cabinet.col != null ? `${cabinet.row} 行 · ${cabinet.col} 列` : '位置未标注' }}</small>
            <span class="cabinet-state">{{ state(cabinet) === 'free' ? '可预约' : state(cabinet) === 'locked' ? `需 Lv.${cabinet.min_level}` : '已占用' }}</span>
            <span v-if="state(cabinet) === 'free'" class="cabinet-min">Lv.{{ cabinet.min_level }} 起</span>
          </button>
        </div>
      </div>
    </div>
    <div v-if="columns.length > 2" class="cabinet-reel-controls">
      <button class="icon-button" :disabled="current === 0" aria-label="向左滚动一列" @click="move(-1)"><Icon class="reel-previous" name="right" :size="18" /></button>
      <span aria-live="polite">{{ current + 1 }}–{{ Math.min(current + 2, columns.length) }} / {{ columns.length }} 列 <small>左右滑动选柜</small></span>
      <button class="icon-button" :disabled="current >= last" aria-label="向右滚动一列" @click="move(1)"><Icon name="right" :size="18" /></button>
    </div>
  </div>
</template>

<style scoped>
.cabinet-carousel{min-width:0}
.cabinet-reel{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;scrollbar-width:thin;scrollbar-color:#b7c9a7 transparent;padding:8px 0 14px;border-radius:12px}
.cabinet-reel:focus-visible{outline:3px solid #8ac5a9;outline-offset:3px}
.cabinet-column{flex:0 0 calc((100% - 12px)/2);min-width:0;scroll-snap-align:start;scroll-snap-stop:always}
.cabinet-column-face{display:flex;flex-direction:column;gap:10px;will-change:transform}
.cabinet-column .cabinet{width:100%;min-height:132px;flex-shrink:0}
.cabinet-reel-controls{display:flex;align-items:center;justify-content:space-between;margin-top:5px;color:#6b845c;font-size:12px;font-variant-numeric:tabular-nums}
.cabinet-reel-controls small{color:#89958e;margin-left:10px;font-size:11px}
.reel-previous{transform:rotate(180deg)}
@media(prefers-reduced-motion:reduce){.cabinet-column-face{transform:none!important;will-change:auto}}
</style>
