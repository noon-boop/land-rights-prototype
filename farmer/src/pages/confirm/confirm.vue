<script setup>
import { ref, computed } from 'vue'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import StepBar from '../../components/StepBar.vue'
import Icon from '../../components/Icon.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'

const steps = ['基本信息', '家庭成员', '承包地', '变更诉求', '确认提交']
const bi = store.state.basicInfo

// 户主信息取自家庭成员中「户主」成员（提交后以此为准）
const householdHead = computed(() => store.membersActive.value.find((m) => m.relation === '户主') || null)

const agreed = ref(false)

const summary = computed(() => [
  { label: '发包方', value: bi.contractorName },
  { label: '承包方代表（户主）', value: householdHead.value ? householdHead.value.name : bi.name },
  { label: '户主身份证号', value: householdHead.value ? householdHead.value.idCard : bi.idCard },
  { label: '承包方地址', value: bi.address },
  { label: '合同编号', value: bi.contractNo },
  { label: '家庭成员', value: `${store.membersActive.value.length} 人` },
  { label: '承包地块', value: `${store.landsActive.value.length} 块 / ${store.totalArea.value} 亩` },
  { label: '变更类型', value: (store.state.changes.changeType && store.state.changes.changeType.length ? store.state.changes.changeType.join('、') : '未选择') },
  { label: '延包诉求', value: store.state.changes.appeal || '无' },
])

/** 待线下划矢量的地块（分割 / 分户产生 / 新增未测） */
const pendingVector = computed(() => store.pendingVectorLands.value)

function prev() { uni.navigateBack() }

// 提交前二次确认：提交后信息不可修改
const showSubmitDialog = ref(false)
function submit() {
  if (store.state.confirm.submitted) { showToast('已提交确认，请勿重复提交'); return }
  if (!store.state.canEdit) { showToast('当前状态不可修改'); return }
  if (!agreed.value) { showToast('请勾选确认信息无误'); return }
  showSubmitDialog.value = true
}
async function onConfirmSubmit() {
  showSubmitDialog.value = false
  const ok = await store.submitConfirm()
  if (!ok) return
  showToast('提交成功，已报送村级审核')
  setTimeout(() => uni.switchTab({ url: '/pages/home/home' }), 900)
}
</script>

<template>
  <view class="page">
    <StepBar :current="5" :steps="steps" />

    <view class="page-body">
      <view class="info-banner">
        <Icon name="info" :size="18" color="#C9932B" />
        <text>请核对以下信息，确认无误后勾选须知并提交；提交后不可修改</text>
      </view>

      <!-- 信息汇总 -->
      <view class="summary-section">
        <view class="summary-header">
          <view class="icon">✓</view>
          <text>承包信息汇总</text>
        </view>
        <view v-for="(s, i) in summary" :key="i" class="summary-item">
          <text class="s-label">{{ s.label }}</text>
          <text class="s-value">{{ s.value }}</text>
        </view>
      </view>

      <!-- 成员清单 -->
      <view class="summary-section">
        <view class="summary-header">
          <view class="icon">✓</view>
          <text>家庭成员（{{ store.membersActive.value.length }}人）</text>
        </view>
        <view v-for="m in store.membersActive.value" :key="m.id" class="summary-item">
          <text class="s-label">{{ m.name }}</text>
          <text class="s-value">{{ m.relation }} · {{ m.changeType }}</text>
        </view>
      </view>

      <!-- 地块清单（含来源标记与待划矢量提示） -->
      <view class="summary-section">
        <view class="summary-header">
          <view class="icon">✓</view>
          <text>承包地块（{{ store.landsActive.value.length }}块）</text>
        </view>
        <view v-for="l in store.landsActive.value" :key="l.id" class="summary-item">
          <text class="s-label">{{ l.name }}</text>
          <text class="s-value">
            {{ l.area }}亩
            <text class="src" :class="'src-' + l.source">{{ l.source }}</text>
            <text v-if="l.isPendingVector" class="pending">待划矢量</text>
          </text>
        </view>
      </view>

      <!-- 待核实项 -->
      <view v-if="pendingVector.length" class="warn-card">
        <view class="warn-title"><Icon name="warning" :size="16" color="#C9932B" /> 需线下现场划界的地块</view>
        <view class="warn-body">
          <text v-for="l in pendingVector" :key="l.id">· {{ l.name }}（{{ l.code }}）{{ l.splitNote ? '：' + l.splitNote : '' }}</text>
          <text class="warn-note">上述地块矢量将由技术人员线下实测后回传，本系统不提供在线绘制</text>
        </view>
      </view>

      <!-- 须知勾选（无手写签名、无电子签章） -->
      <view class="agree-row" @click="agreed = !agreed">
        <view class="checkbox-box" :class="{ checked: agreed }"></view>
        <text>本人确认以上承包信息真实有效，自愿申请延长土地承包期；知悉提交后不可修改。</text>
      </view>
    </view>

    <view class="bottom-action">
      <view class="btn btn-outline flex-half" @click="prev">上一步</view>
      <view class="btn btn-primary" :class="{ disabled: store.state.confirm.submitted || !agreed }" @click="submit">
        {{ store.state.confirm.submitted ? '已提交确认' : '提交确认' }}
      </view>
    </view>

    <ConfirmDialog
      :visible="showSubmitDialog"
      title="提交确认"
      message="提交后信息将锁定、不可修改，须等村级审核。是否确认提交？"
      confirm-text="确认提交"
      @cancel="showSubmitDialog = false"
      @confirm="onConfirmSubmit"
    />
  </view>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.s-value { display: flex; align-items: center; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
.src { font-size: 10px; border-radius: 4px; padding: 1px 5px; background: var(--color-primary-light); color: var(--color-primary); }
.src.src-新增 { background: #E8F5ED; color: #2B7A4B; }
.src.src-分割 { background: #FFF3E0; color: #B26A00; }
.src.src-合户并入 { background: #EDE7F6; color: #5E35B1; }
.pending { font-size: 10px; color: #B26A00; background: #FFF8E6; border-radius: 4px; padding: 1px 5px; }
.warn-card { margin: 12px 16px 0; background: #FFF8E6; border-radius: var(--radius-lg); padding: 14px 16px; border-left: 3px solid var(--color-accent); }
.warn-title { font-size: 13px; font-weight: 600; color: #B26A00; display: flex; align-items: center; gap: 6px; }
.warn-body { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--color-text-secondary); line-height: 1.6; }
.warn-note { color: var(--color-text-tertiary); font-size: 11px; margin-top: 4px; }
.agree-row { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--color-text-secondary); margin: 12px 16px 0; line-height: 1.6; }
.btn.disabled { opacity: 0.5; }
</style>
