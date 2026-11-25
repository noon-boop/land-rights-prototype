<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '提交确认' },
  message: { type: String, default: '提交后信息将不可修改，请确认信息无误。' },
  cancelText: { type: String, default: '取消' },
  confirmText: { type: String, default: '确认提交' },
})
const emit = defineEmits(['cancel', 'confirm'])
</script>

<template>
  <view v-if="visible" class="modal-mask" @click="emit('cancel')">
    <view class="modal-card" @click.stop>
      <view class="modal-title">{{ title }}</view>
      <view class="modal-msg">{{ message }}</view>
      <view class="modal-actions">
        <view class="modal-btn cancel" @click="emit('cancel')">{{ cancelText }}</view>
        <view class="modal-btn ok" @click="emit('confirm')">{{ confirmText }}</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.modal-mask {
  position: fixed; top: 0; right: 0; bottom: 0; left: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 0 32px;
}
.modal-card {
  width: 100%; max-width: 320px;
  background: #fff; border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md); overflow: hidden;
  animation: pop 0.18s ease;
}
@keyframes pop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
.modal-title {
  font-size: 16px; font-weight: 600; color: var(--color-text-primary);
  text-align: center; padding: 20px 16px 8px;
}
.modal-msg {
  font-size: 14px; color: var(--color-text-secondary); line-height: 1.6;
  text-align: center; padding: 0 20px 20px;
}
.modal-actions { display: flex; border-top: 0.5px solid var(--color-divider); }
.modal-btn {
  flex: 1; height: 50px; display: flex; align-items: center; justify-content: center;
  font-size: 15px;
}
.modal-btn.cancel { color: var(--color-text-secondary); border-right: 0.5px solid var(--color-divider); }
.modal-btn.cancel:active { background: var(--color-bg); }
.modal-btn.ok { color: #fff; background: var(--color-primary); font-weight: 500; }
.modal-btn.ok:active { background: var(--color-primary-dark); }
</style>
