<script setup>
const props = defineProps({
  current: { type: Number, default: 1 }, // 1-based
  steps: {
    type: Array,
    default: () => ['基本信息', '家庭成员', '承包地', '变更诉求', '确认提交'],
  },
})

function statusOf(i) {
  if (i < props.current) return 'done'
  if (i === props.current) return 'active'
  return 'todo'
}
</script>

<template>
  <div>
    <div class="step-bar">
      <template v-for="(s, i) in steps" :key="i">
        <div class="step-item" :class="statusOf(i + 1)">
          <div class="step-dot">{{ statusOf(i + 1) === 'done' ? '✓' : i + 1 }}</div>
        </div>
        <div v-if="i < steps.length - 1" class="step-line" :class="{ done: i + 1 < current }"></div>
      </template>
    </div>
    <div class="step-labels">
      <span
        v-for="(s, i) in steps"
        :key="i"
        class="step-label"
        :class="{
          'active': i + 1 === current,
          'done': i + 1 < current,
        }"
      >{{ s }}</span>
    </div>
  </div>
</template>

<style scoped>
.step-labels {
  display: flex;
  padding: 0 20px 10px;
  background: #fff;
  gap: 6px;
}
.step-labels .step-label {
  flex: 1;
  text-align: center;
  white-space: nowrap;
  font-size: 11px;
  color: var(--color-text-tertiary);
}
.step-labels .step-label.active { color: var(--color-primary); font-weight: 500; }
.step-labels .step-label.done { color: var(--color-text-secondary); }
</style>
