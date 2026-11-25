<script setup>
import { ref, reactive, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import Icon from '../../components/Icon.vue'

/**
 * F-A10 地块分割登记
 * 本期只做分割、不做同户地块合并。
 * - 农户只填「分出面积」+ 新块四至，保留面积由系统算
 * - 校验 保留 + 分出 = 原合同面积（容差 ≤0.01 亩）
 * - 新块编码 = 原编码-1（后端生成）、来源「分割」、几何留空待线下划矢量
 * - 原地块自动登记「分割给 {新编码} {分出面积}亩」
 */
const id = ref(0)
const land = computed(() => store.state.lands.find((l) => l.id === id.value))

const form = reactive({
  splitArea: '',
  newPlotName: '',
  reason: '',
  boundary: { 东: '', 南: '', 西: '', 北: '' },
})

onLoad((options) => {
  id.value = Number(options.id || 0)
  const l = land.value
  if (l) {
    form.newPlotName = (l.name || '') + '-分出'
    form.boundary = { ...l.boundary }
  }
})

/** 保留面积 = 原合同面积 - 分出 */
const origArea = computed(() => Number(land.value ? land.value.area : 0))
const splitAreaNum = computed(() => parseFloat(form.splitArea) || 0)
const keepArea = computed(() => {
  const k = origArea.value - splitAreaNum.value
  return k < 0 ? 0 : Math.round(k * 10000) / 10000
})
const invalid = computed(() => splitAreaNum.value <= 0 || splitAreaNum.value > origArea.value)

const errors = reactive({})
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  let ok = true
  if (invalid.value) { errors.splitArea = true; ok = false }
  if (!String(form.newPlotName).trim()) { errors.newPlotName = true; ok = false }
  if (!String(form.reason).trim()) { errors.reason = true; ok = false }
  return ok
}

const submitting = ref(false)
async function submit() {
  if (submitting.value) return
  if (!store.state.canEdit) {
    showToast('当前状态不可修改')
    return
  }
  if (!validate()) {
    if (errors.splitArea) showToast('分出面积须大于 0 且不超过原合同面积 ' + origArea.value + ' 亩')
    else if (errors.reason) showToast('请填写分割原因')
    else showToast('请完整填写')
    return
  }
  submitting.value = true
  const r = await store.splitLand(id.value, {
    splitArea: splitAreaNum.value,
    newPlotName: form.newPlotName.trim(),
    reason: form.reason.trim(),
    boundaryEast: form.boundary['东'],
    boundarySouth: form.boundary['南'],
    boundaryWest: form.boundary['西'],
    boundaryNorth: form.boundary['北'],
  })
  submitting.value = false
  if (r) {
    showToast('分割登记成功，新块待线下划矢量')
    setTimeout(() => uni.navigateBack(), 800)
  }
}
</script>

<template>
  <div class="page">
    <div class="page-body">
      <div class="info-banner">
        <Icon name="info" :size="18" color="#C9932B" />
        <text>只登记分割，不绘制矢量；新块由线下实测后回传</text>
      </div>

      <!-- 原地块信息（只读） -->
      <div class="form-card">
        <div class="form-card-title">原地块</div>
        <div class="form-row"><div class="form-label">地块编号</div><div class="form-value readonly">{{ land ? land.code : '' }}</div></div>
        <div class="form-row"><div class="form-label">地块名称</div><div class="form-value readonly">{{ land ? land.name : '' }}</div></div>
        <div class="form-row"><div class="form-label">合同面积</div><div class="form-value readonly">{{ origArea }} 亩</div></div>
        <div class="form-row"><div class="form-label">来源</div><div class="form-value readonly">{{ land ? land.source : '' }}</div></div>
      </div>

      <!-- 分割表单 -->
      <div class="form-card">
        <div class="form-card-title">分割信息</div>
        <div class="form-row" :class="{ error: errors.splitArea }">
          <div class="form-label"><span class="required">*</span>分出面积</div>
          <div class="form-value">
            <div class="measure-input"><input v-model="form.splitArea" class="form-input" type="digit" placeholder="0.00"><span class="unit">亩</span></div>
          </div>
        </div>
        <div class="keep-row">
          <span class="keep-label">原块保留</span>
          <span class="keep-val">{{ keepArea }} 亩</span>
          <span class="keep-note">（系统自动计算，两数之和须等于 {{ origArea }} 亩）</span>
        </div>
        <div class="form-row" :class="{ error: errors.newPlotName }">
          <div class="form-label"><span class="required">*</span>新块名称</div>
          <div class="form-value"><input v-model="form.newPlotName" class="form-input" placeholder="默认沿用原名加「-分出」"></div>
        </div>
        <div class="new-code-hint">
          新块编号由系统生成：<span class="mono">{{ land ? land.code : '' }}-1</span>
        </div>
      </div>

      <!-- 新块四至 -->
      <div class="form-card">
        <div class="form-card-title">新块四至（可沿用原地块）</div>
        <div class="boundary-edit">
          <div v-for="dir in ['东','南','西','北']" :key="dir" class="boundary-edit-row">
            <span class="be-dir">{{ dir }}</span>
            <input v-model="form.boundary[dir]" class="form-input" placeholder="相邻地块或地物">
          </div>
        </div>
      </div>

      <div class="form-card">
        <div class="form-card-title"><span class="required">*</span>分割原因</div>
        <div class="form-row column">
          <div class="form-value">
            <textarea maxlength="-1" v-model="form.reason" class="form-textarea" :class="{ error: errors.reason }" style="min-height:90px;" placeholder="如：家庭内部分户、地块界线调整等"></textarea>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-action">
      <div class="btn btn-outline flex-half" @click="uni.navigateBack()">取消</div>
      <div class="btn btn-primary" :class="{ disabled: submitting || invalid }" @click="submit">
        {{ submitting ? '提交中…' : '提交分割登记' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.form-row.error { background: var(--color-danger-light); }
.form-value.readonly { color: var(--color-text-secondary); }
.measure-input { display: flex; align-items: center; gap: 6px; background: var(--color-bg); border-radius: var(--radius-sm); padding: 6px 12px; }
.measure-input .form-input { background: transparent; padding: 0; }
.measure-input .unit { color: var(--color-text-secondary); font-size: 14px; flex-shrink: 0; }
.keep-row { display: flex; align-items: baseline; gap: 8px; padding: 4px 16px 12px; flex-wrap: wrap; }
.keep-label { font-size: 13px; color: var(--color-text-secondary); }
.keep-val { font-size: 16px; font-weight: 700; color: var(--color-primary); }
.keep-note { font-size: 11px; color: var(--color-text-tertiary); }
.new-code-hint { font-size: 12px; color: var(--color-text-secondary); padding: 0 16px 14px; }
.new-code-hint .mono { font-family: 'SF Mono', monospace; color: var(--color-primary); font-weight: 600; }
.boundary-edit { padding: 6px 16px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.boundary-edit-row { display: flex; align-items: center; gap: 8px; background: var(--color-primary-lighter); border-radius: var(--radius-sm); padding: 8px 12px; }
.be-dir { font-size: 13px; font-weight: 600; color: var(--color-primary); width: 16px; flex-shrink: 0; }
.form-textarea.error { background: var(--color-danger-light); }
.btn.disabled { opacity: 0.5; }
</style>
