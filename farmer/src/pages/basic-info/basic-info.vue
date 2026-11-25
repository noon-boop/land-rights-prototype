<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import StepBar from '../../components/StepBar.vue'
import Icon from '../../components/Icon.vue'
const steps = ['基本信息', '家庭成员', '承包地', '变更诉求', '确认提交']

const bi = store.state.basicInfo
const household = store.state.household

/**
 * PRD v2.8 B-A02：
 * - 发包方（村组集体）、负责人、户主姓名、身份证号、合同编号、承包期 —— 系统带入，只读
 * - 承包方地址、联系电话 —— 农户可改
 */
const form = reactive({
  phone: bi.phone || '',
  address: bi.address || '',
})

/** 户主取家庭成员中的「户主」（提交后以此为准） */
const head = computed(() => store.membersActive.value.find((m) => m.relation === '户主') || null)

const errors = reactive({})
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  let ok = true
  if (!String(form.phone).trim()) {
    errors.phone = '请填写联系电话'
    ok = false
  } else if (!/^1[3-9]\d{9}$/.test(String(form.phone).trim())) {
    errors.phone = '请填写 11 位手机号'
    ok = false
  }
  if (!String(form.address).trim()) {
    errors.address = '请填写承包方地址'
    ok = false
  }
  return ok
}

async function persist() {
  if (!validate()) {
    showToast(errors.phone || errors.address || '请完整填写必填项')
    return false
  }
  return await store.saveBasicInfo({
    address: String(form.address).trim(),
    phone: String(form.phone).trim(),
  })
}

async function saveDraft() {
  const ok = await persist()
  if (!ok) return
  showToast('草稿已保存')
  uni.switchTab({ url: '/pages/home/home' })
}
async function next() {
  const ok = await persist()
  if (!ok) return
  uni.navigateTo({ url: '/pages/family/family' })
}
</script>

<template>
  <div class="page">

    <StepBar :current="1" :steps="steps" />

    <div class="info-banner">
      <Icon name="info" :size="18" color="#C9932B" />
      <span>{{ store.state.canEdit ? '转发包方、户主、合同信息由系统带入不可修改；地址与电话可核对修改' : '已提交，信息锁定不可修改' }}</span>
    </div>

    <div class="page-body">
      <!-- 发包方信息（只读） -->
      <div class="form-card">
        <div class="form-card-title">发包方信息</div>
        <div class="form-row">
          <div class="form-label">发包方名称</div>
          <div class="form-value readonly">{{ bi.contractorName }}<span class="ro-tag">只读</span></div>
        </div>
        <div class="form-row">
          <div class="form-label">负责人姓名</div>
          <div class="form-value readonly">{{ bi.leader || '—' }}<span class="ro-tag">只读</span></div>
        </div>
      </div>

      <!-- 承包方信息 -->
      <div class="form-card">
        <div class="form-card-title">承包方（代表）信息</div>
        <div class="form-row">
          <div class="form-label">姓名（户主）</div>
          <div class="form-value readonly">{{ head ? head.name : household.name }}<span class="ro-tag">只读</span></div>
        </div>
        <div class="form-row" :class="{ error: errors.phone }">
          <div class="form-label"><span class="required">*</span>联系电话</div>
          <div class="form-value">
            <input
              v-model="form.phone"
              class="form-input"
              type="number"
              maxlength="11"
              :disabled="!store.state.canEdit"
              placeholder="请输入 11 位手机号"
            >
          </div>
        </div>
        <div class="form-row">
          <div class="form-label">身份证号码</div>
          <div class="form-value readonly">{{ head ? head.idCard : household.idMasked }}<span class="ro-tag">只读</span></div>
        </div>
        <div class="form-row" :class="{ error: errors.address }">
          <div class="form-label"><span class="required">*</span>承包方地址</div>
          <div class="form-value">
            <input
              v-model="form.address"
              class="form-input"
              :disabled="!store.state.canEdit"
              placeholder="如：幸福村一组 12 号"
            >
          </div>
        </div>
      </div>

      <!-- 合同信息（只读） -->
      <div class="form-card">
        <div class="form-card-title">原承包合同信息</div>
        <div class="form-row">
          <div class="form-label">合同编号</div>
          <div class="form-value readonly mono">{{ bi.contractNo }}<span class="ro-tag">只读</span></div>
        </div>
        <div class="form-row">
          <div class="form-label">地块总数</div>
          <div class="form-value readonly">
            共 <span class="primary-text fw600">{{ bi.plotCount }}</span> 块 ·
            <span class="primary-text fw600">{{ bi.area }}</span> 亩
            <span class="ro-tag">只读</span>
          </div>
        </div>
        <div class="form-row column">
          <div class="form-label block">第二轮承包期</div>
          <div class="form-value" style="display:flex;align-items:center;gap:8px;">
            <div class="readonly-pill">{{ bi.periodStart }}</div>
            <span class="tertiary">至</span>
            <div class="readonly-pill">{{ bi.periodEnd }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-action">
      <div class="btn btn-outline flex-half" @click="saveDraft">保存草稿</div>
      <div class="btn btn-primary" @click="next">下一步：家庭成员</div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.readonly-pill { flex: 1; background: var(--color-bg); border-radius: var(--radius-sm); padding: 8px 12px; text-align: center; font-size: 14px; color: var(--color-text-secondary); }
.form-row.error { background: var(--color-danger-light); }
.form-value.readonly { color: var(--color-text-secondary); display: flex; align-items: center; gap: 6px; justify-content: flex-end; text-align: right; }
.ro-tag { font-size: 10px; color: var(--color-text-tertiary); background: #F0F0F0; border-radius: 4px; padding: 1px 5px; flex-shrink: 0; }
.mono { font-family: 'SF Mono', monospace; }
.form-input:disabled { background: var(--color-bg); color: var(--color-text-secondary); -webkit-text-fill-color: var(--color-text-secondary); opacity: 1; }
</style>
