<template>
  <div class="avatar-sm" :style="{ background: bg, color: fg }">
    {{ initial }}
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  size: { type: String, default: 'sm' }, // sm | md
})

const palette = [
  { bg: '#e4f3ea', fg: '#0e7a4f' },
  { bg: '#f7efdd', fg: '#c9a45c' },
  { bg: '#E8F0FE', fg: '#2563EB' },
  { bg: '#F3E5F5', fg: '#7B1FA2' },
  { bg: '#E0F7FA', fg: '#00838F' },
  { bg: '#FDEBEB', fg: '#DC2626' },
]

const initial = computed(() => (props.name ? props.name[0] : '?'))
const pick = computed(() => {
  let sum = 0
  for (const ch of props.name) sum += ch.charCodeAt(0)
  return palette[sum % palette.length]
})
const bg = computed(() => pick.value.bg)
const fg = computed(() => pick.value.fg)
</script>

<style scoped>
.avatar-sm { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; flex-shrink: 0; }
:deep(.md) .avatar-sm { width: 40px; height: 40px; font-size: 18px; }
</style>
