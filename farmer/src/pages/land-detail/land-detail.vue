<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { store } from '../../store'
import Icon from '../../components/Icon.vue'

const id = ref(0)
const land = computed(() => store.state.lands.find((l) => l.id === id.value) || store.state.lands[0])

// 实测面积：可编辑，默认值与合同面积保持一致，修改后写入 store
const measured = ref('')
// 四至信息：可编辑，本地绑定后写入 store
const boundary = reactive({ 东: '', 南: '', 西: '', 北: '' })
const adjustNote = ref('')
// 实测面积与合同面积不一致时，需填写“面积调整情况”（必填）
const areaMismatch = computed(() => {
  const a = parseFloat(land.value.area)
  const m = parseFloat(measured.value)
  if (isNaN(a) || isNaN(m)) return false
  return Math.abs(a - m) > 0.0001
})

onLoad((options) => {
  id.value = Number(options.id || 0)
  uni.setNavigationBarTitle({ title: land.value.name })
  measured.value = land.value.measuredArea
  Object.assign(boundary, land.value.boundary)
  adjustNote.value = land.value.adjustNote || ''
})

// 本地即时更新（避免逐字符请求后端），离开页面时统一持久化
watch(measured, (v) => {
  const num = parseFloat(v)
  land.value.measuredArea = isNaN(num) ? 0 : num
})
watch(boundary, () => {
  land.value.boundary = { ...boundary }
}, { deep: true })
watch(adjustNote, (v) => {
  land.value.adjustNote = String(v || '').trim()
})

let saved = false
async function persist() {
  if (saved || !land.value) return
  saved = true
  await store.updateLand(land.value.id, {
    measuredArea: Number(land.value.measuredArea) || 0,
    boundary: { ...land.value.boundary },
    adjustNote: land.value.adjustNote || '',
  })
}
async function back() {
  await persist()
  uni.navigateBack()
}
onUnload(() => {
  persist()
})
</script>

<template>
  <div class="page">

    <div class="page-body">
      <!-- 封面（仅一张示意图） -->
      <div class="cover">
        <div class="plot-image-placeholder" style="height:180px;">
          <Icon name="field" :size="56" color="#0E7490" />
        </div>
        <div class="plot-badge">地块示意图</div>
        <div class="plot-status-badge">{{ land.badge }}</div>
      </div>

      <!-- 基本信息 -->
      <div class="form-card" style="margin-top:16px;">
        <div class="form-card-title">地块基本信息</div>
        <div class="form-row"><div class="form-label">地块编号</div><div class="form-value form-mono">{{ land.code }}</div></div>
        <div class="form-row"><div class="form-label">地块名称</div><div class="form-value">{{ land.name }}</div></div>
        <div class="form-row">
          <div class="form-label">合同面积</div>
          <div class="form-value"><span class="primary-text fw600">{{ land.area }}</span> 亩</div>
        </div>
        <div class="form-row editable">
          <div class="form-label">实测面积</div>
          <div class="form-value">
            <div class="measure-input">
              <input v-model="measured" class="form-input" type="digit">
              <span class="unit">亩</span>
            </div>
          </div>
        </div>
        <div class="form-row"><div class="form-label">土地用途</div><div class="form-value">{{ land.use }}</div></div>
        <div class="form-row"><div class="form-label">质量等级</div><div class="form-value">{{ land.quality }}</div></div>
      </div>

      <!-- 实测面积与合同面积不一致（或已填写说明）时弹出面积调整情况，必填 -->
      <div class="form-card adjust-card" v-if="areaMismatch || adjustNote.trim()">
        <div class="adjust-head"><span class="required">*</span>面积调整情况</div>
        <textarea maxlength="-1" v-model="adjustNote" class="form-textarea" placeholder="实测面积与合同面积不一致，请说明调整原因（如：测量误差、地块合并/分割、自然增减等）"></textarea>
      </div>

      <!-- 四至 -->
      <div class="form-card">
        <div class="form-card-title">四至界限（可修改）</div>
        <div class="form-row column">
          <div class="form-label block">相邻地块 / 地物</div>
          <div class="form-value">
            <div class="boundary-box">
              <div v-for="dir in ['东','南','西','北']" :key="dir" class="boundary-item">
                <span class="boundary-dir">{{ dir }}</span>
                <input v-model="boundary[dir]" class="boundary-input" placeholder="点击填写相邻地块或地物">
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.cover { position: relative; }
.cover .plot-image-placeholder { width: 100%; }
.plot-image-placeholder { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #E0F2F5 0%, #D4E9D8 100%); }
.measure-input { display: flex; align-items: center; gap: 6px; background: var(--color-bg); border-radius: var(--radius-sm); padding: 6px 12px; }
.measure-input .form-input { background: transparent; padding: 0; }
.measure-input .unit { color: var(--color-text-secondary); font-size: 14px; flex-shrink: 0; }
.form-row.editable .form-value { margin-top: 2px; }
.adjust-note { background: #FFF8E6; border-radius: var(--radius-sm); padding: 8px 10px; font-size: 13px; line-height: 1.5; color: #8a5a00; }
.boundary-input { flex: 1; border: none; background: transparent; font-size: 14px; color: var(--color-text-primary); padding: 6px 0; outline: none; }
.boundary-input::placeholder { color: var(--color-text-placeholder); }
.boundary-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 0.5px solid var(--color-divider); }
.boundary-item:last-child { border-bottom: none; }
.boundary-dir { width: 28px; font-weight: 600; color: var(--color-primary); flex-shrink: 0; }
/* 面积调整情况卡片（与添加地块保持一致） */
.adjust-card { margin: 0 16px 12px; border: 1px solid var(--color-warning, #E0A100); background: #FFF8E6; }
.adjust-head { font-size: 14px; font-weight: 600; color: #B26A00; margin-bottom: 8px; }
.adjust-card .form-textarea { background: #fff; }
</style>
