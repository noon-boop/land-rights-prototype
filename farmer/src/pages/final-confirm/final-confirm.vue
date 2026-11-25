<script setup>
import { ref, computed } from 'vue'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import StepBar from '../../components/StepBar.vue'
import Icon from '../../components/Icon.vue'
import ConfirmDialog from '../../components/ConfirmDialog.vue'

const steps = ['基本信息', '家庭成员', '承包地', '变更诉求', '确认提交']
const bi = store.state.basicInfo
const c = store.state.confirm

/**
 * F-A14 第二轮：最终确认
 * - 仅在村级审核通过 + 本村矢量成果已回传后开放（后端置 status=待最终确认）
 * - 只收「问题意见」单一文本框，可留空
 * - 不改任何数据、无手写签名/电子签章
 */
const canFinal = computed(() => store.state.canFinalConfirm && !c.finalSubmitted)
const opinion = ref(c.opinion || '')
const agreed = ref(false)

const summary = computed(() => [
  { label: '发包方', value: bi.contractorName },
  { label: '户主', value: bi.name },
  { label: '合同编号', value: bi.contractNo },
  { label: '家庭成员', value: `${store.membersActive.value.length} 人` },
  { label: '承包地块', value: `${store.landsActive.value.length} 块 / ${store.totalArea.value} 亩` },
  { label: '变更类型', value: (store.state.changes.changeType || []).join('、') || '无' },
])

function prev() { uni.navigateBack() }

const showDialog = ref(false)
function submit() {
  if (c.finalSubmitted) { showToast('已完成最终确认'); return }
  if (!canFinal.value) {
    showToast('暂不可最终确认：须村级审核通过且本村矢量成果已回传')
    return
  }
  if (!agreed.value) { showToast('请勾选确认'); return }
  showDialog.value = true
}
async function doSubmit() {
  showDialog.value = false
  const ok = await store.submitFinalConfirm(opinion.value.trim(), agreed.value)
  if (!ok) return
  showToast('已提交，问题意见将逐级上报')
  setTimeout(() => uni.switchTab({ url: '/pages/home/home' }), 900)
}
</script>

<template>
  <view class="page">
    <StepBar :current="5" :steps="steps" />

    <view class="page-body">
      <!-- 未开放提示 -->
      <view v-if="!canFinal && !c.finalSubmitted" class="lock-card">
        <view class="lock-title"><Icon name="lock" :size="18" color="#C9932B" /> 最终确认暂未开放</view>
        <view class="lock-desc">
          最终确认须同时满足：① 本户第一轮信息已通过村级审核；② 本村矢量成果已回传。
          两项都完成后，村委会将通知您进行最终确认。
        </view>
        <view class="lock-status">
          当前状态：{{ store.state.household.status || '待审核' }}
        </view>
      </view>

      <!-- 已有意见（后台回填） -->
      <view v-if="c.opinionStatus" class="opinion-status">
        <Icon name="info" :size="16" color="#0E7490" />
        <text>问题意见处理状态：{{ c.opinionStatus }}</text>
      </view>

      <view class="info-banner">
        <Icon name="info" :size="18" color="#C9932B" />
        <text>请核对最终承包信息；如与实际情况不符，请在下方填写问题意见</text>
      </view>

      <!-- 最终信息 -->
      <view class="summary-section">
        <view class="summary-header">
          <view class="icon">✓</view>
          <text>最终承包信息</text>
        </view>
        <view v-for="(s, i) in summary" :key="i" class="summary-item">
          <text class="s-label">{{ s.label }}</text>
          <text class="s-value">{{ s.value }}</text>
        </view>
      </view>

      <!-- 地块（实测面积此时已回传） -->
      <view class="summary-section">
        <view class="summary-header">
          <view class="icon">✓</view>
          <text>承包地块（{{ store.landsActive.value.length }}块）</text>
        </view>
        <view v-for="l in store.landsActive.value" :key="l.id" class="summary-item">
          <text class="s-label">{{ l.name }}</text>
          <text class="s-value">
            合同 {{ l.area }}亩<text v-if="l.measuredArea" class="measured">实测 {{ l.measuredArea }}亩</text>
            <text class="src" :class="'src-' + l.source">{{ l.source }}</text>
          </text>
        </view>
      </view>

      <!-- 问题意见（单一文本框，可留空） -->
      <view class="form-card" v-if="!c.finalSubmitted">
        <view class="form-card-title">问题意见（选填）</view>
        <view class="form-row column">
          <view class="form-value">
            <textarea
              maxlength="-1"
              v-model="opinion"
              class="form-textarea"
              style="min-height:110px;"
              :disabled="!canFinal"
              placeholder="如无问题可留空；如有异议请具体说明，例如：实测面积与合同不符、四至界限有误、成员信息有误等"
            ></textarea>
          </view>
        </view>
        <view class="inline-hint">问题意见将逐级上报：村 → 镇 → 县</view>
      </view>

      <!-- 已提交展示 -->
      <view v-if="c.finalSubmitted" class="done-card">
        <view class="done-icon">✓</view>
        <view class="done-title">已完成最终确认</view>
        <view class="done-desc">您提交的问题意见已按流程逐级上报，处理进度可在首页查看。</view>
        <view v-if="c.opinion" class="done-opinion">已提交意见：{{ c.opinion }}</view>
      </view>

      <!-- 须知勾选（无手写签名、无电子签章） -->
      <view v-if="canFinal" class="agree-row" @click="agreed = !agreed">
        <view class="checkbox-box" :class="{ checked: agreed }"></view>
        <text>本人已核对最终承包信息，对以上内容无异议（或已在下方填写问题意见）。</text>
      </view>
    </view>

    <view v-if="canFinal" class="bottom-action">
      <view class="btn btn-outline flex-half" @click="prev">上一步</view>
      <view class="btn btn-primary" :class="{ disabled: !agreed }" @click="submit">提交最终确认</view>
    </view>

    <ConfirmDialog
      :visible="showDialog"
      title="提交最终确认"
      message="提交后将进入上报镇级流程，不可撤回。是否确认提交？"
      confirm-text="确认提交"
      @cancel="showDialog = false"
      @confirm="doSubmit"
    />
  </view>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.lock-card { margin: 12px 16px; background: #FFF8E6; border-radius: var(--radius-lg); padding: 16px; border-left: 3px solid var(--color-accent); }
.lock-title { font-size: 14px; font-weight: 600; color: #B26A00; display: flex; align-items: center; gap: 6px; }
.lock-desc { font-size: 12px; color: var(--color-text-secondary); margin-top: 8px; line-height: 1.7; }
.lock-status { font-size: 12px; color: var(--color-text-tertiary); margin-top: 8px; }
.opinion-status { margin: 12px 16px 0; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--color-primary); background: var(--color-primary-lighter); border-radius: var(--radius-md); padding: 10px 12px; }
.s-value { display: flex; align-items: center; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
.measured { font-size: 11px; color: var(--color-text-tertiary); }
.src { font-size: 10px; border-radius: 4px; padding: 1px 5px; background: var(--color-primary-light); color: var(--color-primary); }
.src.src-新增 { background: #E8F5ED; color: #2B7A4B; }
.src.src-分割 { background: #FFF3E0; color: #B26A00; }
.src.src-合户并入 { background: #EDE7F6; color: #5E35B1; }
.inline-hint { font-size: 12px; color: var(--color-text-tertiary); padding: 0 16px 12px; }
.done-card { margin: 12px 16px 0; background: #E8F5ED; border-radius: var(--radius-lg); padding: 22px 16px; text-align: center; }
.done-icon { width: 44px; height: 44px; border-radius: 50%; background: #2B7A4B; color: #fff; font-size: 22px; display: flex; align-items: center; justify-content: center; margin: 0 auto 10px; }
.done-title { font-size: 15px; font-weight: 600; color: #2B7A4B; }
.done-desc { font-size: 12px; color: var(--color-text-secondary); margin-top: 6px; line-height: 1.6; }
.done-opinion { font-size: 12px; color: var(--color-text-secondary); margin-top: 10px; background: rgba(255,255,255,0.7); border-radius: var(--radius-sm); padding: 8px 10px; text-align: left; }
.agree-row { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--color-text-secondary); margin: 12px 16px 0; line-height: 1.6; }
.btn.disabled { opacity: 0.5; }
</style>
