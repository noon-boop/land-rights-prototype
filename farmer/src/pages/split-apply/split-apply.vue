<script setup>
import { ref, reactive, computed } from 'vue'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import Icon from '../../components/Icon.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'

/**
 * F-A12 发起分户申请（农户发起 → 村级审核 → 生效）
 *
 * 规则：
 * - 仅 ① 未提交 / ③ 已退回（后端 status = 未提交 / 未通过）可发起
 * - 提交即锁、不可撤回；审核阶段发现问题由村级退回，退回后可改后重新申请
 * - 两种形态：整块迁移（把整块地划给新户）/ 同地块面积分配（面积在户间拆分）
 * - 面积守恒：原户保留 + 新户分出 = 原合同面积（容差 ≤0.01 亩）
 * - 新块编码 = 原编码-1、几何留空待线下划矢量
 * - 两侧各须恰好一名户主：新户主必须从勾选分出的成员中指定
 */
const mode = ref('WHOLE') // WHOLE 整块迁移 / AREA 同地块面积分配

const form = reactive({
  memberIds: [],
  parcelIds: [],
  allocations: {}, // { [parcelId]: { keepArea, splitArea } }
  newHeadName: '',
  newHeadIdCard: '',
  newHeadPhone: '',
  newHeadRelation: '',
  origHeadName: '',
  origHeadIdCard: '',
  reason: '',
})

/** 只能分出非户主的成员（户主留在原户；若原户主也要变，走户主变更流程） */
const members = computed(() => store.membersActive.value)
const lands = computed(() => store.landsActive.value)
const currentHead = computed(() => members.value.find((m) => m.relation === '户主') || null)

// 原户新户主默认为当前户主
if (currentHead.value) {
  form.origHeadName = currentHead.value.name
  form.origHeadIdCard = currentHead.value.idCard
}

const canApply = computed(() => {
  const st = store.state.household.status
  return ['未提交', '未通过'].includes(st)
})

function toggleMember(m) {
  if (m.relation === '户主') {
    showToast('户主不能分出，请先通过村级办理户主变更')
    return
  }
  const i = form.memberIds.indexOf(m.id)
  if (i > -1) {
    form.memberIds.splice(i, 1)
    if (m.idCard === form.newHeadIdCard) {
      form.newHeadName = ''
      form.newHeadIdCard = ''
      form.newHeadPhone = ''
      form.newHeadRelation = ''
    }
  } else {
    form.memberIds.push(m.id)
  }
}

function toggleParcel(p) {
  if (mode.value !== 'WHOLE') return
  const i = form.parcelIds.indexOf(p.id)
  if (i > -1) form.parcelIds.splice(i, 1)
  else form.parcelIds.push(p.id)
}

/** 指定新户户主：必须从已勾选分出的成员中选 */
function pickNewHead(m) {
  if (!form.memberIds.includes(m.id)) {
    showToast('请先勾选该成员为分出成员')
    return
  }
  form.newHeadName = m.name
  form.newHeadIdCard = m.idCard
  form.newHeadPhone = m.phone || ''
  form.newHeadRelation = m.relation
}

/** AREA 模式：按地块填保留/分出面积 */
function allocOf(p) {
  if (!form.allocations[p.id]) {
    form.allocations[p.id] = { keepArea: p.area, splitArea: '' }
  }
  return form.allocations[p.id]
}

const areaErrors = computed(() => {
  if (mode.value !== 'AREA') return []
  const bad = []
  form.parcelIds.forEach((pid) => {
    const p = lands.value.find((x) => x.id === pid)
    if (!p) return
    const a = form.allocations[pid] || {}
    const keep = parseFloat(a.keepArea) || 0
    const split = parseFloat(a.splitArea) || 0
    if (split <= 0 || Math.abs(keep + split - Number(p.area)) > 0.01) {
      bad.push(p.code + ' ' + p.name)
    }
  })
  return bad
})

const errors = reactive({})
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  let ok = true
  if (!form.memberIds.length) { errors.members = true; ok = false }
  if (!form.newHeadName || !form.newHeadIdCard) { errors.newHead = true; ok = false }
  if (!form.origHeadName || !form.origHeadIdCard) { errors.origHead = true; ok = false }
  if (!form.reason.trim()) { errors.reason = true; ok = false }
  if (mode.value === 'WHOLE') {
    if (!form.parcelIds.length) { errors.parcels = true; ok = false }
  } else {
    if (!form.parcelIds.length) { errors.parcels = true; ok = false }
    if (areaErrors.value.length) { errors.area = true; ok = false }
  }
  return ok
}

const showConfirm = ref(false)
const submitting = ref(false)

function preSubmit() {
  if (!canApply.value) {
    showToast('当前户状态「' + store.state.household.status + '」不可发起分户')
    return
  }
  if (!validate()) {
    if (errors.members) showToast('请勾选分出的家庭成员')
    else if (errors.newHead) showToast('请从分出成员中指定新户户主')
    else if (errors.parcels) showToast(mode.value === 'WHOLE' ? '请勾选要划给新户的地块' : '请勾选要分配面积的地块')
    else if (errors.area) showToast('面积校验不通过：' + areaErrors.value.join('、'))
    else showToast('请填写分户原因')
    return
  }
  showConfirm.value = true
}

async function doSubmit() {
  showConfirm.value = false
  if (submitting.value) return
  submitting.value = true
  const payload = {
    splitMode: mode.value,
    memberIds: form.memberIds,
    parcelIds: mode.value === 'WHOLE' ? form.parcelIds : [],
    allocations: mode.value === 'AREA'
      ? form.parcelIds.map((pid) => ({
          parcelId: pid,
          keepArea: parseFloat((form.allocations[pid] || {}).keepArea) || 0,
          splitArea: parseFloat((form.allocations[pid] || {}).splitArea) || 0,
        }))
      : [],
    newHeadName: form.newHeadName,
    newHeadIdCard: form.newHeadIdCard,
    newHeadPhone: form.newHeadPhone,
    newHeadRelation: form.newHeadRelation,
    origHeadName: form.origHeadName,
    origHeadIdCard: form.origHeadIdCard,
    reason: form.reason.trim(),
  }
  const r = await store.applySplit(payload)
  submitting.value = false
  if (r) {
    showToast('分户申请已提交，不可撤回，等待村级审核')
    setTimeout(() => uni.switchTab({ url: '/pages/home/home' }), 900)
  }
}
</script>

<template>
  <div class="page">
    <div class="page-body">
      <!-- 不可发起提示 -->
      <div v-if="!canApply" class="block-card">
        <div class="block-title"><Icon name="warning" :size="16" color="#C9932B" /> 当前不可发起分户</div>
        <div class="block-desc">
          当前户状态为「{{ store.state.household.status }}」。分户仅在「未提交」或「已退回」时可发起；
          已通过及之后的户需由村级重新打开并退回后才能申请。
        </div>
      </div>

      <div v-if="store.state.splitPending" class="block-card">
        <div class="block-title"><Icon name="info" :size="16" color="#0E7490" /> 已有待审核的分户申请</div>
        <div class="block-desc">分户申请提交后不可撤回，请等待村级审核结果。</div>
      </div>

      <template v-if="canApply && !store.state.splitPending">
        <div class="info-banner">
          <Icon name="info" :size="18" color="#C9932B" />
          <text>提交后不可撤回；审核阶段由村级退回才能修改重提</text>
        </div>

        <!-- 1 分出成员 -->
        <div class="form-card">
          <div class="form-card-title"><span class="required">*</span>1. 勾选分出的家庭成员</div>
          <div class="pick-list">
            <div
              v-for="m in members"
              :key="m.id"
              class="pick-item"
              :class="{ on: form.memberIds.includes(m.id), disabled: m.relation === '户主' }"
              @click="toggleMember(m)"
            >
              <div class="pick-check" :class="{ on: form.memberIds.includes(m.id) }"></div>
              <div class="pick-main">
                <div class="pick-name">{{ m.name }}<span class="pick-rel">{{ m.relation }}</span></div>
                <div class="pick-sub">{{ m.idCard }}</div>
              </div>
              <div v-if="m.relation === '户主'" class="pick-tag">户主留原户</div>
            </div>
          </div>
        </div>

        <!-- 2 新户户主 -->
        <div class="form-card">
          <div class="form-card-title"><span class="required">*</span>2. 指定新户户主</div>
          <div class="pick-list">
            <div
              v-for="m in members.filter((x) => form.memberIds.includes(x.id))"
              :key="'h' + m.id"
              class="head-item"
              :class="{ on: form.newHeadIdCard === m.idCard }"
              @click="pickNewHead(m)"
            >
              <span>{{ m.name }}</span>
              <span class="head-rel">{{ m.relation }}</span>
              <span v-if="form.newHeadIdCard === m.idCard" class="head-on">已选为新户主</span>
            </div>
            <div v-if="!form.memberIds.length" class="empty-hint">请先在上方勾选分出成员</div>
          </div>
        </div>

        <!-- 3 地块处理方式 -->
        <div class="form-card">
          <div class="form-card-title"><span class="required">*</span>3. 地块处理方式</div>
          <div class="mode-row">
            <div class="mode-item" :class="{ on: mode === 'WHOLE' }" @click="mode = 'WHOLE'">
              <div class="mode-title">整块迁移</div>
              <div class="mode-desc">把整块地块划给新户，面积不变</div>
            </div>
            <div class="mode-item" :class="{ on: mode === 'AREA' }" @click="mode = 'AREA'">
              <div class="mode-title">同地块面积分配</div>
              <div class="mode-desc">一块地在两户间拆分面积</div>
            </div>
          </div>

          <div class="pick-list" style="margin-top:12px;">
            <div
              v-for="p in lands"
              :key="p.id"
              class="parcel-item"
              :class="{ on: form.parcelIds.includes(p.id) }"
              @click="mode === 'WHOLE' ? toggleParcel(p) : (form.parcelIds.includes(p.id) ? form.parcelIds.splice(form.parcelIds.indexOf(p.id), 1) : form.parcelIds.push(p.id))"
            >
              <div class="parcel-head">
                <div class="pick-check" :class="{ on: form.parcelIds.includes(p.id) }"></div>
                <div class="parcel-main">
                  <div class="pick-name">{{ p.name }}<span class="pick-rel">{{ p.code }}</span></div>
                  <div class="pick-sub">合同 {{ p.area }} 亩 · {{ p.use }}</div>
                </div>
              </div>
              <!-- AREA：面积分配 -->
              <div v-if="mode === 'AREA' && form.parcelIds.includes(p.id)" class="alloc-box" @click.stop>
                <div class="alloc-row">
                  <span class="alloc-label">原户保留</span>
                  <input v-model="allocOf(p).keepArea" class="form-input alloc-input" type="digit">
                  <span class="alloc-unit">亩</span>
                </div>
                <div class="alloc-row">
                  <span class="alloc-label">新户分出</span>
                  <input v-model="allocOf(p).splitArea" class="form-input alloc-input" type="digit" placeholder="0.00">
                  <span class="alloc-unit">亩</span>
                </div>
                <div class="alloc-note">两数之和须等于原面积 {{ p.area }} 亩（容差 0.01）</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4 原户新户主（保持） -->
        <div class="form-card">
          <div class="form-card-title"><span class="required">*</span>4. 原户保留的户主</div>
          <div class="form-row">
            <div class="form-label">姓名</div>
            <div class="form-value"><input v-model="form.origHeadName" class="form-input" placeholder="原户户主姓名"></div>
          </div>
          <div class="form-row">
            <div class="form-label">身份证号</div>
            <div class="form-value"><input v-model="form.origHeadIdCard" class="form-input form-mono" maxlength="18" placeholder="原户户主身份证号"></div>
          </div>
          <div class="inline-hint">原户主默认不变；确需变更户主请另行由村级办理「户主变更」</div>
        </div>

        <!-- 5 分户原因 -->
        <div class="form-card">
          <div class="form-card-title"><span class="required">*</span>5. 分户原因</div>
          <div class="form-row column">
            <div class="form-value">
              <textarea maxlength="-1" v-model="form.reason" class="form-textarea" :class="{ error: errors.reason }" style="min-height:90px;" placeholder="如：子女成家独立立户、家庭成员分家协议等"></textarea>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="canApply && !store.state.splitPending" class="bottom-action">
      <div class="btn btn-primary" :class="{ disabled: submitting }" @click="preSubmit">
        {{ submitting ? '提交中…' : '提交分户申请（提交即锁）' }}
      </div>
    </div>

    <ConfirmDialog
      :visible="showConfirm"
      title="提交分户申请"
      message="提交后不可撤回，须等待村级审核。审核阶段发现问题由村级退回后才能修改重提。是否确认提交？"
      confirm-text="确认提交"
      @cancel="showConfirm = false"
      @confirm="doSubmit"
    />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.block-card { margin: 12px 16px; background: #FFF8E6; border-radius: var(--radius-lg); padding: 16px; border-left: 3px solid var(--color-accent); }
.block-title { font-size: 14px; font-weight: 600; color: #B26A00; display: flex; align-items: center; gap: 6px; }
.block-desc { font-size: 12px; color: var(--color-text-secondary); margin-top: 8px; line-height: 1.7; }

.pick-list { padding: 6px 16px 14px; display: flex; flex-direction: column; gap: 8px; }
.pick-item, .parcel-item { background: var(--color-bg); border-radius: var(--radius-md); padding: 12px; border: 1px solid transparent; }
.pick-item.on, .parcel-item.on { border-color: var(--color-primary); background: var(--color-primary-lighter); }
.pick-item.disabled { opacity: 0.55; }
.pick-item { display: flex; align-items: center; gap: 10px; }
.pick-check { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--color-border); background: #fff; flex-shrink: 0; position: relative; }
.pick-check.on { background: var(--color-primary); border-color: var(--color-primary); }
.pick-check.on::after { content: '✓'; position: absolute; inset: 0; color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.pick-main { flex: 1; min-width: 0; }
.pick-name { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
.pick-rel { font-size: 11px; color: var(--color-text-tertiary); margin-left: 6px; font-weight: 400; }
.pick-sub { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; font-family: 'SF Mono', monospace; }
.pick-tag { font-size: 10px; color: var(--color-text-tertiary); background: #F0F0F0; border-radius: 4px; padding: 2px 6px; flex-shrink: 0; }

.head-item { display: flex; align-items: center; gap: 8px; background: var(--color-bg); border-radius: var(--radius-md); padding: 12px; border: 1px solid transparent; font-size: 14px; }
.head-item.on { border-color: var(--color-primary); background: var(--color-primary-lighter); }
.head-rel { font-size: 11px; color: var(--color-text-tertiary); }
.head-on { margin-left: auto; font-size: 11px; color: var(--color-primary); font-weight: 500; }
.empty-hint { font-size: 12px; color: var(--color-text-tertiary); text-align: center; padding: 16px 0; }

.mode-row { display: flex; gap: 10px; padding: 6px 16px 0; }
.mode-item { flex: 1; background: var(--color-bg); border-radius: var(--radius-md); padding: 12px; border: 1.5px solid transparent; }
.mode-item.on { border-color: var(--color-primary); background: var(--color-primary-lighter); }
.mode-title { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.mode-desc { font-size: 11px; color: var(--color-text-secondary); margin-top: 4px; line-height: 1.5; }

.parcel-head { display: flex; align-items: center; gap: 10px; }
.parcel-main { flex: 1; min-width: 0; }
.alloc-box { margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--color-border); }
.alloc-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.alloc-label { font-size: 12px; color: var(--color-text-secondary); width: 56px; flex-shrink: 0; }
.alloc-input { flex: 1; background: #fff; }
.alloc-unit { font-size: 12px; color: var(--color-text-secondary); }
.alloc-note { font-size: 11px; color: var(--color-text-tertiary); }

.inline-hint { font-size: 12px; color: var(--color-text-tertiary); padding: 0 16px 12px; line-height: 1.6; }
.form-textarea.error { background: var(--color-danger-light); }
.btn.disabled { opacity: 0.5; }
</style>
