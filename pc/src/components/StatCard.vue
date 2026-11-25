<template>
  <div class="stat-card">
    <div class="stat-icon" :style="{ background: bg }">
      <svg viewBox="0 0 24 24" :fill="fg"><path :d="icon" /></svg>
    </div>
    <div class="stat-info">
      <div class="stat-num" :style="{ color: fg }">{{ num }}</div>
      <div class="stat-label">{{ label }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, required: true },
  num: { type: [String, Number], required: true },
  label: { type: String, required: true },
  bg: { type: String, default: 'var(--color-primary-light)' },
  fg: { type: String, default: 'var(--color-primary-mid)' },
})
</script>
