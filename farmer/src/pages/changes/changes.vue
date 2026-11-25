<script setup>
import { reactive, computed } from 'vue'
import { store, CHANGE_CATEGORIES } from '../../store'
import { showToast } from '../../store/toast'
import StepBar from '../../components/StepBar.vue'
import Icon from '../../components/Icon.vue'
const steps = ['基本信息', '家庭成员', '承包地', '变更诉求', '确认提交']

const c = store.state.changes
const form = reactive({
  changeType: Array.isArray(c.changeType) ? [...c.changeType] : [],
  appeal: c.appeal || '',
})

/** 官方口径 11 类，多选 */
const changeTypes = CHANGE_CATEGORIES

// 勾「直接延包」= 较 2007 年无变化，自动清空其余；取消勾选后允许重选其他项
function toggle(t) {
  if (!store.state.canEdit) {
    showToast('当前状态不可修改')
    return
  }
  if (t === '直接延包') {
    form.changeType = form.changeType.includes('直接延包') ? [] : ['直接延包']
    return
  }
  const i = form.changeType.indexOf(t)
  if (i > -1) {
    form.changeType.splice(i, 1)
  } else {
    form.changeType.push(t)
  }
  const ni = form.changeType.indexOf('直接延包')
  if (ni > -1) form.changeType.splice(ni, 1)
}

/** 勾「分户」「合户」时的引导提示 */
const splitHint = computed(() => form.changeType.includes('分户'))
const mergeHint = computed(() => form.changeType.includes('合户'))

function goSplitApply() {
  uni.navigateTo({ url: '/pages/split-apply/split-apply' })
}

function prev() { uni.navigateBack() }

async function persist() {
  return await store.saveChanges({
    changeType: form.changeType,
    appeal: form.appeal,
  })
}

async function next() {
  if (!form.changeType.length) {
    showToast('请至少选择一项变更情况；无变化请选「直接延包」')
    return
  }
  const ok = await persist()
  if (!ok) return
  showToast('已保存变更与诉求')
  uni.navigateTo({ url: '/pages/confirm/confirm' })
}

async function saveDraft() {
  const ok = await persist()
  if (!ok) return
  showToast('草稿已保存')
  uni.switchTab({ url: '/pages/home/home' })
}
</script>

<template>
  <div class="page">

    <StepBar :current="4" :steps="steps" />

    <view class="info-banner">
      <Icon name="info" :size="18" color="#C9932B" />
      <text>按官方口径多选；若较 2007 年无任何变化，请只勾「直接延包」</text>
    </view>

    <div class="page-body">
      <div class="form-card">
        <div class="form-card-title">变更情况（可多选）</div>
        <div class="form-row column">
          <div class="form-label block">二轮承包以来变化情况</div>
          <div class="form-value">
            <div class="tag-chips">
              <div
                v-for="t in changeTypes"
                :key="t"
                class="tag-chip"
                :class="{ selected: form.changeType.includes(t) }"
                @click="toggle(t)"
              >{{ t }}</div>
            </div>
          </div>
        </div>
        <div v-if="form.changeType.includes('直接延包')" class="inline-hint">
          已选择「直接延包」，表示较 2007 年无变化，其余选项已清空
        </div>
      </div>

      <!-- 勾「分户」→ 引导走正式分户申请（F-A12） -->
      <div v-if="splitHint" class="guide-card">
        <div class="guide-main">
          <div class="guide-title"><Icon name="info" :size="16" color="#0E7490" /> 分户须单独提交申请</div>
          <div class="guide-desc">此处仅表达诉求；实际分户须由您发起分户申请，经村级审核通过后生效</div>
        </div>
        <div class="guide-btn" @click="goSplitApply">去发起分户申请</div>
      </div>

      <!-- 勾「合户」→ 由村级核实办理 -->
      <div v-if="mergeHint" class="guide-card plain">
        <div class="guide-main">
          <div class="guide-title"><Icon name="info" :size="16" color="#C9932B" /> 合户由村级办理</div>
          <div class="guide-desc">合户仅由村级发起，请携带相关材料到村委会办理；此处勾选仅作意愿登记</div>
        </div>
      </div>

      <div class="form-card">
        <div class="form-card-title">延包诉求</div>
        <div class="form-row column">
          <div class="form-label block">对本次延包的意见或诉求（选填）</div>
          <div class="form-value">
            <textarea maxlength="-1" v-model="form.appeal" class="form-textarea" style="min-height:100px;" placeholder="如无异议可填「无」；如有诉求请说明具体情况，例如：希望维持原承包关系、对某地界有异议等"></textarea>
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-action">
      <div class="btn btn-outline flex-half" @click="saveDraft">保存草稿</div>
      <div class="btn btn-primary" @click="next">下一步：确认提交</div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.inline-hint { font-size: 12px; color: var(--color-text-secondary); padding: 0 16px 12px; line-height: 1.6; }
.guide-card {
  margin: 0 16px 12px; background: #fff; border-radius: var(--radius-lg); padding: 14px 16px;
  box-shadow: var(--shadow-sm); border-left: 3px solid var(--color-primary);
}
.guide-card.plain { border-left-color: var(--color-accent); }
.guide-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); display: flex; align-items: center; gap: 6px; }
.guide-desc { font-size: 12px; color: var(--color-text-secondary); margin-top: 6px; line-height: 1.6; }
.guide-btn {
  margin-top: 10px; text-align: center; padding: 10px; border-radius: var(--radius-md);
  background: var(--color-primary-lighter); color: var(--color-primary); font-size: 13px; font-weight: 500;
}
.guide-btn:active { opacity: 0.8; }
</style>
