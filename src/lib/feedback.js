import { ref } from 'vue'
export const notice = ref(null)
let timer
export function notify(text, type = 'success') {
  notice.value = { text, type }; clearTimeout(timer)
  timer = setTimeout(() => { notice.value = null }, 5500)
}
