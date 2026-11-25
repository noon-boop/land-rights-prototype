<script setup>
import { computed } from 'vue'
import { store } from '../../store'
import Icon from '../../components/Icon.vue'
const h = store.state.household
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20

const entries = computed(() => [
  { key: 'basic', to: '/basic-info', icon: 'user', title: '基本信息', desc: '发包方、承包方代表、合同信息' },
  { key: 'family', to: '/family', icon: 'people', title: '家庭成员情况', desc: `家庭成员及变动情况（${store.membersActive.value.length}人）` },
  { key: 'land', to: '/lands', icon: 'field', title: '承包地情况', desc: `${store.landsActive.value.length}块地块 · ${store.totalArea.value}亩` },
  { key: 'changes', to: '/changes', icon: 'edit', title: '变更与诉求', desc: '变更情况（11类多选）、延包诉求' },
  { key: 'confirm', to: '/confirm', icon: 'check', title: '确认与提交', desc: '信息核对后提交，提交即锁' },
  { key: 'final', to: '/final-confirm', icon: 'check', title: '最终确认', desc: '村级通过且矢量回传后开放' },
])

function statusMeta(s) {
  switch (s) {
    case 'done': return { cls: 'tag-approved', text: '已完成' }
    case 'submitted': return { cls: 'tag-info', text: '已提交' }
    case 'doing': return { cls: 'tag-pending', text: '填写中' }
    case 'locked': return { cls: 'tag-default', text: '待解锁' }
    default: return { cls: 'tag-default', text: '待填写' }
  }
}

/**
 * 最终确认可操作性只看后端标记 canFinalConfirm
 * （= 第一轮已通过村级审核 且 本村矢量成果已回传）
 * 而非 phase>=2 —— phase 在村级通过后即置 2 用于展示进度
 */
function finalMeta() {
  if (store.state.confirm.finalSubmitted) return { cls: 'tag-approved', text: '已完成' }
  if (store.state.canFinalConfirm) return { cls: 'tag-pending', text: '待确认' }
  return { cls: 'tag-default', text: '待解锁' }
}
function entryMeta(e) {
  return e.key === 'final' ? finalMeta() : statusMeta(store.state.sections[e.key])
}
function isLocked(e) {
  if (e.key === 'confirm') return store.state.sections.confirm === 'locked'
  if (e.key === 'final') return !store.state.canFinalConfirm && !store.state.confirm.finalSubmitted
  return false
}
function navigateEntry(to) {
  const map = {
    '/basic-info': '/pages/basic-info/basic-info',
    '/family': '/pages/family/family',
    '/lands': '/pages/lands/lands',
    '/changes': '/pages/changes/changes',
    '/confirm': '/pages/confirm/confirm',
    '/final-confirm': '/pages/final-confirm/final-confirm',
  }
  uni.navigateTo({ url: map[to] })
}
function open(e) {
  if (isLocked(e)) return
  navigateEntry(e.to)
}

/** 分户申请入口：未提交/已退回 且 无在审申请 */
const canApplySplit = computed(() =>
  ['未提交', '未通过'].includes(h.status) && !store.state.splitPending,
)
const showSplitEntry = computed(() =>
  canApplySplit.value || store.state.splitPending || (store.state.changes.changeType || []).includes('分户'),
)

function splitMeta() {
  if (store.state.splitPending) return { cls: 'tag-pending', text: '审核中' }
  if (canApplySplit.value) return { cls: 'tag-default', text: '可发起' }
  return { cls: 'tag-default', text: '—' }
}
function goSplit() {
  uni.navigateTo({ url: '/pages/split-apply/split-apply' })
}

/** 待线下划矢量的地块数 */
const pendingVectorCount = computed(() => store.pendingVectorLands.value.length)
</script>

<template>
  <div class="home">
    <!-- 个人头部 -->
    <div class="home-header" :style="{ paddingTop: (statusBarHeight + 10) + 'px' }">
      <div class="row" style="gap:12px;">
        <div class="avatar">{{ h.initial }}</div>
        <div style="flex:1;min-width:0;">
          <div class="h-name">{{ h.name }}</div>
          <div class="h-sub">{{ h.villageGroup }} · {{ h.idMasked }}</div>
        </div>
        <div class="h-status">{{ h.status || '未提交' }}</div>
      </div>
    </div>

    <div class="home-scroll">
      <!-- 上传进度 -->
      <div class="progress-card anim-in">
        <div class="row-between" style="margin-bottom:14px;">
          <div class="pc-title">我的填报进度</div>
          <div class="pc-num">{{ store.progress.value }}<span class="pc-pct">%</span></div>
        </div>
        <div class="progress-track"><div class="progress-fill" :style="{ width: store.progress.value + '%' }"></div></div>
        <div class="pc-grid">
          <div class="pc-item">
            <div class="pc-val">{{ store.landsActive.value.length }}</div>
            <div class="pc-lab">承包地块</div>
          </div>
          <div class="pc-item">
            <div class="pc-val">{{ store.totalArea.value }}</div>
            <div class="pc-lab">合同面积(亩)</div>
          </div>
          <div class="pc-item">
            <div class="pc-val">{{ store.membersActive.value.length }}</div>
            <div class="pc-lab">家庭成员</div>
          </div>
        </div>
      </div>

      <!-- 待线下划矢量提示 -->
      <view v-if="pendingVectorCount" class="vector-alert anim-in" @click="navigateEntry('/lands')">
        <Icon name="warning" :size="16" color="#B26A00" />
        <text class="va-text">有 {{ pendingVectorCount }} 块地块待线下实测划矢量，不影响您本次提交</text>
        <Icon name="right" :size="12" color="#B26A00" />
      </view>

      <!-- 两轮阶段 -->
      <div class="phase-card anim-in">
        <div class="phase-item" :class="{ on: h.phase === 1 }">
          <div class="phase-dot">1</div>
          <div>
            <div class="phase-title">核实修改并提交</div>
            <div class="phase-sub">第一轮 · {{ h.phase === 1 ? '进行中' : '已完成' }}</div>
          </div>
        </div>
        <div class="phase-line" :class="{ on: h.phase >= 2 }"></div>
        <div class="phase-item" :class="{ on: h.phase === 2 }">
          <div class="phase-dot hollow">2</div>
          <div>
            <div class="phase-title">最终确认</div>
            <div class="phase-sub">第二轮 · {{ store.state.confirm.finalSubmitted ? '已完成' : (store.state.canFinalConfirm ? '待最终确认' : '待解锁') }}</div>
          </div>
        </div>
      </div>

      <!-- 填报须知 -->
      <div class="info-banner">
        <Icon name="info" :size="18" color="#C9932B" />
        <span>{{ store.state.canEdit ? '请按顺序填写各项信息，全部完成后提交确认' : '已提交，信息锁定不可修改；如需变更请联系村委会退回' }}</span>
      </div>

      <!-- 调查内容 -->
      <div class="section-bar" style="padding-left:16px;padding-right:16px;">调查内容</div>
      <div class="entry-list">
        <div
          v-for="e in entries"
          :key="e.key"
          class="entry-card anim-in"
          :class="{ disabled: isLocked(e) }"
          @click="open(e)"
        >
          <div class="entry-icon" :class="{ accent: e.key === 'land' }">
            <Icon :name="e.icon" :size="22" :color="e.key === 'land' ? '#C9932B' : '#0E7490'" />
          </div>
          <div class="entry-main">
            <div class="entry-title">{{ e.title }}</div>
            <div class="entry-desc">{{ e.desc }}</div>
          </div>
          <div class="entry-right">
            <span class="tag" :class="entryMeta(e).cls">{{ entryMeta(e).text }}</span>
            <Icon v-if="!isLocked(e)" name="right" :size="14" color="#999999" class="entry-arrow" />
            <Icon v-else name="lock" :size="14" color="#999999" class="entry-arrow" />
          </div>
        </div>

        <!-- 分户申请（仅相关户显示） -->
        <div v-if="showSplitEntry" class="entry-card anim-in" @click="goSplit">
          <div class="entry-icon accent"><Icon name="people" :size="22" color="#C9932B" /></div>
          <div class="entry-main">
            <div class="entry-title">分户申请</div>
            <div class="entry-desc">{{ store.state.splitPending ? '申请审核中，不可撤回' : '分出成员与地块，提交后由村级审核' }}</div>
          </div>
          <div class="entry-right">
            <span class="tag" :class="splitMeta().cls">{{ splitMeta().text }}</span>
            <Icon name="right" :size="14" color="#999999" class="entry-arrow" />
          </div>
        </div>
      </div>

      <!-- 通知 -->
      <div class="notice anim-in">
        <div class="notice-title">
          <Icon name="warning" :size="16" color="#C9932B" />
          填报须知
        </div>
        <view class="notice-body">
          <text>1. 本表仅展示您本人的承包信息，请如实核对</text>
          <text>2. 地块编号、合同面积、实测面积、质量等级由系统提供，不可修改</text>
          <text>3. 提交后信息即锁定，须等村级审核；第二轮最终确认在村级通过且矢量回传后开放</text>
          <text>4. 矢量图斑由技术人员线下实测后回传，本系统不提供在线绘制</text>
        </view>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home { display: flex; flex-direction: column; height: 100%; }
.home-header {
  background: linear-gradient(135deg, #0E7490 0%, #0B5E75 100%);
  padding: 16px 20px 28px; color: #fff;
}
.avatar {
  width: 52px; height: 52px; border-radius: 50%;
  background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 700; color: #fff; flex-shrink: 0;
}
.h-name { font-size: 18px; font-weight: 600; color: #fff; }
.h-sub { font-size: 12px; color: rgba(255,255,255,0.8); margin-top: 2px; }
.h-status { background: rgba(255,255,255,0.2); border-radius: 18px; padding: 4px 12px; font-size: 12px; color: #fff; font-weight: 500; flex-shrink: 0; }

.home-scroll { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.home-scroll::-webkit-scrollbar { display: none; }

/* 进度卡 */
.progress-card { margin: -12px 16px 0; background: #fff; border-radius: var(--radius-lg); padding: 18px 16px; box-shadow: var(--shadow-sm); }
.pc-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
.pc-num { font-size: 24px; font-weight: 700; color: var(--color-primary); }
.pc-pct { font-size: 14px; }
.pc-grid { display: flex; gap: 8px; margin-top: 14px; }
.pc-item { flex: 1; text-align: center; padding: 8px 4px; background: var(--color-primary-lighter); border-radius: var(--radius-sm); }
.pc-val { font-size: 18px; font-weight: 700; color: var(--color-primary); }
.pc-lab { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }

/* 待划矢量提示 */
.vector-alert { margin: 12px 16px 0; background: #FFF8E6; border-radius: var(--radius-md); padding: 10px 12px; display: flex; align-items: center; gap: 8px; border-left: 3px solid var(--color-accent); }
.va-text { flex: 1; font-size: 12px; color: #B26A00; line-height: 1.5; }

/* 阶段 */
.phase-card { margin: 14px 16px 0; display: flex; align-items: center; gap: 8px; background: #fff; border-radius: var(--radius-lg); padding: 14px; box-shadow: var(--shadow-sm); }
.phase-item { display: flex; align-items: center; gap: 8px; flex: 1; }
.phase-dot { width: 24px; height: 24px; border-radius: 50%; background: var(--color-primary); color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.phase-dot.hollow { background: var(--color-primary-light); color: var(--color-primary); border: 1px solid var(--color-primary); }
.phase-item.on .phase-dot.hollow { background: var(--color-primary); color: #fff; }
.phase-title { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.phase-sub { font-size: 11px; color: var(--color-text-secondary); }
.phase-line { width: 24px; height: 2px; background: var(--color-border); border-radius: 1px; flex-shrink: 0; }
.phase-line.on { background: var(--color-primary); }

/* 调查内容入口 */
.entry-list { padding: 4px 16px 0; }
.entry-card {
  background: #fff; border-radius: var(--radius-lg); padding: 14px 16px; margin-bottom: 10px;
  box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 12px; cursor: pointer;
  transition: var(--transition);
}
.entry-card:active { transform: scale(0.98); }
.entry-card.disabled { opacity: 0.6; cursor: not-allowed; }
.entry-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--color-primary-light); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--color-primary); }
.entry-icon.accent { background: var(--color-accent-light); color: var(--color-accent); }
.entry-main { flex: 1; min-width: 0; }
.entry-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
.entry-desc { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }
.entry-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.entry-arrow { color: var(--color-text-tertiary); }

/* 通知 */
.notice { margin: 20px 16px 0; padding: 14px 16px; background: #fff; border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); }
.notice-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; color: var(--color-accent); }
.notice-body { font-size: 12px; color: var(--color-text-secondary); line-height: 1.7; display: flex; flex-direction: column; gap: 4px; }
</style>
