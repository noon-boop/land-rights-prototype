<script setup>
import { ref } from 'vue'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import StepBar from '../../components/StepBar.vue'
import Icon from '../../components/Icon.vue'
const steps = ['基本信息', '家庭成员', '承包地', '变更诉求', '确认提交']

// 新增成员的变动类型需在列表页先行确认（删除改在编辑页内进行，并校验变动类型）
const addTypes = ['新增（出生/迁入）', '婚嫁迁入']

// action sheet 状态：null | { mode:'add' }
const sheet = ref(null)
const sheetTitle = ref('')
const sheetOptions = ref([])

function goEdit(id) {
  uni.navigateTo({ url: '/pages/family-edit/family-edit?id=' + id })
}
function openAdd() {
  sheetTitle.value = '请选择新增成员的变动类型'
  sheetOptions.value = addTypes
  sheet.value = { mode: 'add' }
}
function pick(opt) {
  const s = sheet.value
  sheet.value = null
  if (!s) return
  if (s.mode === 'add') {
    uni.navigateTo({ url: '/pages/family-edit/family-edit?id=0&ct=' + encodeURIComponent(opt) })
  }
}
function closeSheet() {
  sheet.value = null
}
async function onCard(m) {
  if (m.deleted) {
    // 恢复成员：其“二轮承包以来成员变动情况”重置为“无变化”
    await store.restoreMember(m.id)
    await store.updateMember(m.id, { changeType: '无变化' })
    showToast('已恢复该成员')
  } else {
    goEdit(m.id)
  }
}
function prev() {
  uni.navigateBack()
}
async function next() {
  // 离开家庭成员页、进入承包地前：
  // 1) 自动判定“二轮承包以来成员变动情况”——变动类型为空、“未变化”或旧值“无变动”的成员，统一置为“无变化”
  let fixed = 0
  const tasks = []
  store.state.members.forEach((m) => {
    const t = m.changeType
    if (!m.deleted && (!t || String(t).trim() === '' || t === '未变化' || t === '无变动')) {
      tasks.push(store.updateMember(m.id, { changeType: '无变化' }))
      fixed++
    }
  })
  if (tasks.length) await Promise.all(tasks)
  if (fixed > 0) showToast(`已将 ${fixed} 名未变动成员标记为“无变化”`)
  // 2) 户主 / 配偶唯一性统一核验（仅统计未删除成员）
  const active = store.state.members.filter((m) => !m.deleted)
  const heads = active.filter((m) => m.relation === '户主')
  const spouses = active.filter((m) => m.relation === '配偶')
  if (heads.length === 0) {
    showToast('该户必须设置一名户主，请先添加或恢复户主')
    return
  }
  if (heads.length > 1) {
    showToast('该户不能同时存在多名户主，请修改家庭成员')
    return
  }
  if (spouses.length > 1) {
    showToast('该户最多只能有一名配偶，请修改家庭成员')
    return
  }
  uni.navigateTo({ url: '/pages/lands/lands' })
}
</script>

<template>
  <div class="page">

    <StepBar :current="2" :steps="steps" />

    <div class="info-banner">
      <Icon name="info" :size="18" color="#C9932B" />
      <span>涉及分户、合户的信息修改，由村级账号办理</span>
    </div>

    <div class="page-body">
      <div class="member-list">
        <div
          v-for="m in store.state.members"
          :key="m.id"
          class="member-card"
          :class="{ deleted: m.deleted }"
          @click="onCard(m)"
        >
          <div class="member-card-header">
            <div class="member-avatar">{{ m.initial || m.name?.[0] }}</div>
            <div class="member-name">
              <div class="name">{{ m.name }}<span v-if="m.deleted" class="deleted-tag">已删除</span></div>
              <div class="relation">{{ m.relation }}{{ m.relation === '户主' ? ' / 承包方代表' : '' }}</div>
            </div>
            <div class="member-edit-btn">
              <Icon v-if="!m.deleted" name="edit" :size="16" color="#0E7490" @click.stop="goEdit(m.id)" />
              <Icon v-else name="refresh" :size="16" color="#0E7490" class="restore-ico" @click.stop="onCard(m)" />
            </div>
          </div>
          <div class="member-detail">
            <div class="member-detail-item">身份证: <span class="form-mono">{{ m.idCard }}</span></div>
            <div class="member-detail-item">集体成员: {{ m.isMember }}</div>
          </div>
          <div class="member-detail plain" :class="{ accent: m.changeType && m.changeType !== '无变化' }">
            <div class="member-detail-item">变动: {{ m.changeType }}</div>
          </div>
          <div v-if="m.deleted" class="restore-hint">已删除 · 点击卡片可恢复</div>
        </div>

        <div class="add-member-btn" @click="openAdd">
          <Icon name="plus" :size="18" color="#0E7490" />
          添加家庭成员
        </div>
      </div>
    </div>

    <div class="bottom-action">
      <div class="btn btn-outline flex-half" @click="prev">上一步</div>
      <div class="btn btn-primary" @click="next">下一步：承包地信息</div>
    </div>

    <!-- 变动类型选择层 -->
    <view v-if="sheet" class="sheet-mask" @click="closeSheet">
      <view class="sheet" @click.stop>
        <view class="sheet-title">{{ sheetTitle }}</view>
        <view v-for="opt in sheetOptions" :key="opt" class="sheet-item" @click="pick(opt)">{{ opt }}</view>
        <view class="sheet-cancel" @click="closeSheet">取消</view>
      </view>
    </view>
  </div>
</template>

<style scoped>
.page { position: relative; display: flex; flex-direction: column; height: 100%; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-top: 12px; padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.member-list { padding: 0 16px; }
.member-detail.plain.accent :deep(.member-detail-item) { color: var(--color-accent); }
/* 已删除成员：变暗 */
.member-card.deleted { opacity: 0.5; background: #F2F2F2; }
.member-card.deleted .member-avatar { background: #D9D9D9; color: #999; }
.deleted-tag { font-size: 11px; color: #fff; background: var(--color-text-tertiary); border-radius: 8px; padding: 1px 6px; margin-left: 6px; vertical-align: middle; }
.restore-ico { color: var(--color-primary); }
.del-ico { color: var(--color-danger); }
.restore-hint { font-size: 12px; color: var(--color-primary); text-align: center; padding-top: 8px; margin-top: 8px; border-top: 1px dashed var(--color-border); }
/* 变动类型选择层（限定在手机框内） */
.sheet-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-end; justify-content: center; z-index: 200; }
.sheet { width: 100%; background: #fff; border-radius: 16px 16px 0 0; overflow: hidden; padding-bottom: env(safe-area-inset-bottom, 0px); }
.sheet-title { text-align: center; padding: 16px; font-size: 14px; color: var(--color-text-secondary); border-bottom: 0.5px solid var(--color-divider); }
.sheet-item { text-align: center; padding: 16px; font-size: 16px; color: var(--color-primary); border-bottom: 0.5px solid var(--color-divider); }
.sheet-item:active { background: var(--color-bg); }
.sheet-cancel { text-align: center; padding: 16px; font-size: 16px; color: var(--color-text-secondary); background: var(--color-bg); }
.sheet-enter-active, .sheet-leave-active { transition: opacity .25s ease; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform .25s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }
</style>
