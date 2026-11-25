<script setup>
import { ref, computed } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, required: true },
  placeholder: { type: String, default: '请选择' },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const selected = computed(() => props.modelValue)

function toggle() {
  open.value = !open.value
}
function pick(opt) {
  emit('update:modelValue', opt)
  open.value = false
}
function close() {
  open.value = false
}
</script>

<template>
  <view class="select" :class="{ open }">
    <view class="select-control" :class="{ placeholder: !selected }" @click="toggle">
      <text class="select-text">{{ selected || placeholder }}</text>
      <Icon name="down" :size="20" color="#999999" class="select-arrow" />
    </view>

    <!-- 底部弹层：小程序无 Teleport/transition，v-if + fixed 遮罩 -->
    <view v-if="open" class="sheet-mask" @click="close">
      <view class="sheet" @click.stop>
        <view class="sheet-header">
          <text>请选择</text>
          <view class="sheet-close" @click="close"><Icon name="close" :size="20" color="#999999" /></view>
        </view>
        <view class="sheet-options">
          <view
            v-for="opt in options"
            :key="opt"
            class="sheet-option"
            :class="{ active: opt === selected }"
            @click="pick(opt)"
          >
            <text>{{ opt }}</text>
            <Icon v-if="opt === selected" name="check" :size="20" color="#0E7490" class="sheet-check" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.select { width: 100%; }
.select-control {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  background: var(--color-bg); border-radius: var(--radius-sm); padding: 9px 12px;
  font-size: 14px; color: var(--color-text-primary); min-height: 40px;
}
.select-control.placeholder .select-text { color: var(--color-text-placeholder); }
.select-arrow { transition: transform 0.2s ease; }
.select.open .select-arrow { transform: rotate(180deg); }
.select-text { line-height: 1.4; }

/* 底部弹层 */
.sheet-mask {
  position: fixed; top: 0; right: 0; bottom: 0; left: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: flex-end; justify-content: center; z-index: 1000;
}
.sheet {
  width: 100%; max-width: 430px; background: #fff;
  border-radius: 16px 16px 0 0; overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; font-size: 15px; font-weight: 600; color: var(--color-text-primary);
  border-bottom: 0.5px solid var(--color-divider);
}
.sheet-close { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; }
.sheet-options { max-height: 50vh; overflow-y: auto; padding: 6px 0; }
.sheet-option {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px; font-size: 15px; color: var(--color-text-primary);
}
.sheet-option:active { background: var(--color-primary-lighter); }
.sheet-option.active { color: var(--color-primary); font-weight: 600; }
.sheet-check { flex-shrink: 0; }
</style>
