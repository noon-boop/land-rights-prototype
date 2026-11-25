<script setup>
import { reactive, ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import SelectDropdown from '../../components/SelectDropdown.vue'

const id = ref(0)
const isNew = computed(() => id.value === 0)
const existing = computed(() => store.state.lands.find((l) => l.id === id.value))

const uses = ['水田', '旱地', '菜地', '园地', '林地', '其他']

/**
 * 可编辑：名称 / 用途 / 四至 / 面积调整说明
 * 只读：地块编码 / 合同面积 / 实测面积 / 质量等级（B-A03，服务端同样兜底）
 * 新增：编号系统生成、不填合同面积，只填自测面积（B-A13）
 */
const form = reactive({
  name: '',
  use: '水田',
  /** 新增地块时农户填的自测面积 */
  selfMeasured: 0,
  adjustNote: '',
  boundary: { 东: '', 南: '', 西: '', 北: '' },
})

/** 只读展示值（来自后端，不参与提交） */
const readonly = reactive({
  code: '',
  contractArea: 0,
  measuredArea: 0,
  quality: '',
  source: '原有',
  isPendingVector: false,
  splitNote: '',
})

onLoad((options) => {
  id.value = Number(options.id || 0)
  uni.setNavigationBarTitle({ title: id.value === 0 ? '添加地块' : '编辑地块' })
  if (!isNew.value && existing.value) {
    const e = existing.value
    Object.assign(form, {
      name: e.name,
      use: e.use,
      adjustNote: e.adjustNote || '',
      boundary: { ...e.boundary },
    })
    Object.assign(readonly, {
      code: e.code,
      contractArea: e.area,
      measuredArea: e.measuredArea,
      quality: e.quality || '',
      source: e.source || '原有',
      isPendingVector: !!e.isPendingVector,
      splitNote: e.splitNote || '',
    })
  }
})

/** 实测 ≠ 合同 → 必填面积调整说明（F-A09，仅编辑已有地块） */
const areaMismatch = computed(() => {
  if (isNew.value) return false
  const a = Number(readonly.contractArea)
  const m = Number(readonly.measuredArea)
  if (isNaN(a) || isNaN(m)) return false
  return Math.abs(a - m) > 0.0001
})

const errors = reactive({})
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  let ok = true
  if (!String(form.name).trim()) { errors.name = true; ok = false }
  if (isNew.value) {
    const m = parseFloat(form.selfMeasured)
    if (isNaN(m) || m <= 0) { errors.selfMeasured = true; ok = false }
    for (const dir of ['东', '南', '西', '北']) {
      if (!String(form.boundary[dir]).trim()) { errors['boundary_' + dir] = true; ok = false }
    }
  }
  if (!isNew.value && areaMismatch.value && !String(form.adjustNote).trim()) {
    errors.adjustNote = true
    ok = false
  }
  return ok
}

async function save() {
  if (!store.state.canEdit) {
    showToast('当前状态不可修改')
    return
  }
  if (!validate()) {
    if (isNew.value && Object.keys(errors).some((k) => k.startsWith('boundary_'))) {
      showToast('请填写四至界限（东、南、西、北）')
    } else if (isNew.value && errors.selfMeasured) {
      showToast('请填写自测面积')
    } else if (errors.adjustNote) {
      showToast('实测面积与合同面积不一致，请填写面积调整说明')
    } else {
      showToast('请完整填写必填项')
    }
    return
  }

  if (isNew.value) {
    const ok = await store.addLand({
      name: form.name.trim(),
      use: form.use,
      measuredArea: parseFloat(form.selfMeasured) || 0,
      boundary: { ...form.boundary },
    })
    if (ok) {
      showToast('地块已添加（编号由系统生成，待线下划矢量）')
      uni.navigateBack()
    }
  } else {
    const ok = await store.updateLand(id.value, {
      name: form.name.trim(),
      use: form.use,
      adjustNote: String(form.adjustNote).trim(),
      boundary: { ...form.boundary },
    })
    if (ok) {
      showToast('已保存')
      uni.navigateBack()
    }
  }
}

/* ---------- 分割登记（F-A10） ---------- */
function goSplit() {
  uni.navigateTo({ url: '/pages/land-split/land-split?id=' + id.value })
}

/* ---------- 软删除（须填原因） ---------- */
const showDeleteDialog = ref(false)
const deleteReason = ref('')
function openDelete() {
  deleteReason.value = ''
  showDeleteDialog.value = true
}
async function confirmDelete() {
  if (!deleteReason.value.trim()) {
    showToast('请填写删除原因')
    return
  }
  const ok = await store.softDeleteLand(id.value, deleteReason.value.trim())
  if (ok) {
    showDeleteDialog.value = false
    showToast('已删除（可在「已删除地块」中恢复）')
    uni.navigateBack()
  }
}

function prev() {
  uni.navigateBack()
}
</script>

<template>
  <div class="page">

    <div class="page-body">
      <div class="form-card">
        <div class="form-card-title">地块基本信息</div>

        <!-- 只读区：编码 / 来源 / 待划矢量 -->
        <div v-if="!isNew" class="form-row">
          <div class="form-label">地块编号</div>
          <div class="form-value readonly">{{ readonly.code }}<span class="ro-tag">只读</span></div>
        </div>
        <div v-if="!isNew" class="form-row">
          <div class="form-label">来源</div>
          <div class="form-value">
            <span class="source-tag" :class="'src-' + readonly.source">{{ readonly.source }}</span>
            <span v-if="readonly.isPendingVector" class="pending-tag">待线下划矢量</span>
          </div>
        </div>

        <div class="form-row" :class="{ error: errors.name }">
          <div class="form-label"><span class="required">*</span>地块名称</div>
          <div class="form-value"><input v-model="form.name" class="form-input" placeholder="如：东大田"></div>
        </div>

        <div class="form-row column">
          <div class="form-label block">土地用途</div>
          <div class="form-value"><SelectDropdown v-model="form.use" :options="uses" placeholder="请选择用途" /></div>
        </div>

        <!-- 只读区：合同面积 / 实测面积 / 质量等级 -->
        <template v-if="!isNew">
          <div class="form-row">
            <div class="form-label">合同面积</div>
            <div class="form-value readonly">
              <div class="measure-input readonly"><span class="ro-num">{{ readonly.contractArea }}</span><span class="unit">亩</span></div>
              <span class="ro-tag">只读</span>
            </div>
          </div>
          <div class="form-row">
            <div class="form-label">实测面积</div>
            <div class="form-value readonly">
              <div class="measure-input readonly"><span class="ro-num">{{ readonly.measuredArea }}</span><span class="unit">亩</span></div>
              <span class="ro-tag">只读</span>
            </div>
          </div>
          <!-- 质量等级：无值不展示 -->
          <div v-if="readonly.quality" class="form-row">
            <div class="form-label">质量等级</div>
            <div class="form-value readonly">{{ readonly.quality }}<span class="ro-tag">只读</span></div>
          </div>
          <!-- 分割备注：原地块记录分割去向 -->
          <div v-if="readonly.splitNote" class="form-row column">
            <div class="form-label block">分割登记</div>
            <div class="form-value">
              <div class="split-note">{{ readonly.splitNote }}</div>
            </div>
          </div>
        </template>

        <!-- 新增地块：只填自测面积，不填合同面积 -->
        <div class="form-row" v-if="isNew" :class="{ error: errors.selfMeasured }">
          <div class="form-label"><span class="required">*</span>自测面积</div>
          <div class="form-value">
            <div class="measure-input"><input v-model="form.selfMeasured" class="form-input" type="digit" placeholder="如 2.35"><span class="unit">亩</span></div>
          </div>
        </div>
        <div v-if="isNew" class="inline-hint">编号由系统自动生成，合同面积待线下实测确认后回传</div>

        <!-- 实测 ≠ 合同：必填面积调整说明 -->
        <div class="form-card adjust-card" v-if="areaMismatch && !isNew" :class="{ error: errors.adjustNote }">
          <div class="adjust-head"><span class="required">*</span>面积调整说明</div>
          <textarea maxlength="-1" v-model="form.adjustNote" class="form-textarea" placeholder="实测面积与合同面积不一致，请说明原因（如：测量误差、地块分割/合并、自然增减等）"></textarea>
        </div>
      </div>

      <div class="form-card">
        <div class="form-card-title">四至界限<span v-if="isNew" class="required"> *</span></div>
        <div class="boundary-edit">
          <div v-for="dir in ['东','南','西','北']" :key="dir" class="boundary-edit-row" :class="{ error: errors['boundary_' + dir] }">
            <span class="be-dir"><span class="required" v-if="isNew">*</span>{{ dir }}</span>
            <input v-model="form.boundary[dir]" class="form-input" placeholder="相邻地块或地物">
          </div>
        </div>
        <div class="inline-hint">四至可修改；矢量图斑由线下实测后回传，此处不提供绘制</div>
      </div>

      <!-- 分割登记入口（仅已有地块） -->
      <div v-if="!isNew" class="action-wrap">
        <div class="action-btn" @click="goSplit">
          <span>分割登记</span>
          <span class="action-sub">从本块分出面积，新块编码 = 原编码-1</span>
        </div>
      </div>

      <div v-if="!isNew" class="delete-wrap">
        <div class="delete-btn" @click="openDelete">删除该地块</div>
      </div>
    </div>

    <div class="bottom-action">
      <div class="btn btn-outline flex-half" @click="prev">取消</div>
      <div class="btn btn-primary" @click="save">保存</div>
    </div>

    <!-- 删除原因弹窗 -->
    <view v-if="showDeleteDialog" class="dialog-mask" @click="showDeleteDialog = false">
      <view class="dialog" @click.stop>
        <view class="dialog-title">删除地块</view>
        <view class="dialog-desc">删除后可恢复，请填写删除原因（村级审核时确认）</view>
        <textarea maxlength="-1" v-model="deleteReason" class="form-textarea dialog-input" placeholder="如：重复录入、地块已并入其他地块"></textarea>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @click="showDeleteDialog = false">取消</view>
          <view class="dialog-btn danger" @click="confirmDelete">确认删除</view>
        </view>
      </view>
    </view>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; position: relative; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.form-row.error { background: var(--color-danger-light); }
.form-value.readonly { color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px; justify-content: flex-end; }
.ro-tag { font-size: 10px; color: var(--color-text-tertiary); background: #F0F0F0; border-radius: 4px; padding: 1px 5px; flex-shrink: 0; }
.source-tag { font-size: 11px; border-radius: 4px; padding: 2px 6px; background: var(--color-primary-light); color: var(--color-primary); }
.source-tag.src-新增 { background: #E8F5ED; color: #2B7A4B; }
.source-tag.src-分割 { background: #FFF3E0; color: #B26A00; }
.source-tag.src-合户并入 { background: #EDE7F6; color: #5E35B1; }
.pending-tag { font-size: 11px; color: #B26A00; background: #FFF8E6; border-radius: 4px; padding: 2px 6px; }
.split-note { font-size: 13px; color: var(--color-accent); background: #FFF8E6; border-radius: var(--radius-sm); padding: 8px 10px; line-height: 1.6; }
.inline-hint { font-size: 12px; color: var(--color-text-tertiary); padding: 0 16px 12px; line-height: 1.6; }
.adjust-card { margin: 0 16px 12px; border: 1px solid var(--color-warning, #E0A100); background: #FFF8E6; }
.adjust-head { font-size: 14px; font-weight: 600; color: #B26A00; margin-bottom: 8px; }
.adjust-card.error { background: var(--color-danger-light); border-color: var(--color-danger); }
.adjust-card .form-textarea { background: #fff; }
.measure-input { display: flex; align-items: center; gap: 6px; background: var(--color-bg); border-radius: var(--radius-sm); padding: 6px 12px; }
.measure-input.readonly { background: transparent; padding: 0; }
.measure-input .form-input { background: transparent; padding: 0; }
.measure-input .ro-num { font-size: 15px; color: var(--color-text-secondary); }
.measure-input .unit { color: var(--color-text-secondary); font-size: 14px; flex-shrink: 0; }
.boundary-edit { padding: 6px 16px 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.boundary-edit-row { display: flex; align-items: center; gap: 8px; background: var(--color-primary-lighter); border-radius: var(--radius-sm); padding: 8px 12px; }
.boundary-edit-row.error { background: var(--color-danger-light); }
.be-dir { font-size: 13px; font-weight: 600; color: var(--color-primary); width: 16px; flex-shrink: 0; }
.action-wrap { padding: 0 16px 8px; }
.action-btn { background: #fff; border-radius: var(--radius-md); padding: 14px 16px; display: flex; flex-direction: column; gap: 3px; box-shadow: var(--shadow-sm); }
.action-btn:active { opacity: 0.85; }
.action-btn span:first-child { font-size: 14px; font-weight: 500; color: var(--color-primary); }
.action-sub { font-size: 11px; color: var(--color-text-tertiary); }
.delete-wrap { padding: 8px 16px 24px; }
.delete-btn { background: #fff; border-radius: var(--radius-md); padding: 14px 16px; text-align: center; color: var(--color-danger); font-size: 14px; font-weight: 500; border: 1px solid #FFCDD2; }
.delete-btn:active { background: var(--color-danger-light); }
.dialog-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 0 32px; }
.dialog { width: 100%; background: #fff; border-radius: var(--radius-lg); padding: 20px 18px; }
.dialog-title { font-size: 16px; font-weight: 600; text-align: center; color: var(--color-text-primary); }
.dialog-desc { font-size: 12px; color: var(--color-text-secondary); text-align: center; margin: 8px 0 12px; line-height: 1.6; }
.dialog-input { background: var(--color-bg); min-height: 80px; }
.dialog-actions { display: flex; gap: 10px; margin-top: 16px; }
.dialog-btn { flex: 1; text-align: center; padding: 11px; border-radius: var(--radius-md); font-size: 14px; font-weight: 500; }
.dialog-btn.cancel { background: var(--color-bg); color: var(--color-text-secondary); }
.dialog-btn.danger { background: var(--color-danger); color: #fff; }
</style>
