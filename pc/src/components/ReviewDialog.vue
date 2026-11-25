<template>
  <div v-if="visible" class="modal-mask" @click.self="cancel">
    <div class="modal" role="dialog" aria-label="审核">
      <div class="modal-header">
        <span>{{ action === 'approve' ? '审核通过' : '审核不通过' }} — {{ householder }}</span>
        <span class="close-btn" @click="cancel">&times;</span>
      </div>
      <div class="modal-body">
        <div class="alert" :class="action === 'approve' ? 'alert-info' : 'alert-danger'">
          <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          <div>{{ action === 'approve' ? '确认该农户确权信息无误并通过审核？' : '请填写不通过原因，农户将收到退回通知。' }}</div>
        </div>

        <div class="form-item mb-16 mt-16">
          <div class="form-item-label">审核意见</div>
          <textarea
            v-model="opinion"
            class="form-textarea"
            :placeholder="action === 'approve' ? '请输入审核意见（可选）' : '请输入不通过原因（必填）'"
          ></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-gray" @click="cancel">取消</button>
        <button
          class="btn"
          :class="action === 'approve' ? 'btn-primary' : 'btn-danger'"
          :disabled="!valid"
          @click="confirm"
        >
          {{ action === 'approve' ? '确认通过' : '确认不通过' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  action: { type: String, default: 'approve' }, // approve | reject
  householder: { type: String, default: '' },
})
const emit = defineEmits(['cancel', 'confirm'])

const opinion = ref('')

watch(
  () => props.visible,
  (v) => {
    if (v) opinion.value = props.action === 'approve' ? '信息核对无误，同意通过。' : ''
  },
)

const valid = computed(() => {
  if (props.action === 'approve') return true
  return opinion.value.trim().length > 0
})

function cancel() {
  emit('cancel')
}
function confirm() {
  if (!valid.value) return
  emit('confirm', {
    result: props.action === 'approve' ? '已通过' : '未通过',
    opinion: opinion.value.trim(),
  })
}
</script>
