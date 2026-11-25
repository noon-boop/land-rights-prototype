<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiPackages, apiPackageReadiness, apiPackageCreate, apiPackageAddSubmission,
         apiPackageRemoveSubmission, apiPackageSubmit, apiPackageDetail } from '@/api'

/**
 * F-T08 乡镇组包报县（核心）
 * 前置：辖区全部村「C 镇级已通过」；有村未完成则置灰 + 列出未完成村
 * 提交后包内锁定，不可追加或移除（E → F）
 */
const pkgs = ref([])
const ready = ref(null)
const loading = ref(false)
const err = ref('')
const msg = ref('')
const detail = ref(null)

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiPackages()
    pkgs.value = (d && (d.list || d.records)) || []
    ready.value = await apiPackageReadiness()
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

/** 待纳入的整村单（C 状态） */
const candidates = computed(() => {
  const r = ready.value || {}
  return (r.villages || r.list || []).filter((v) => v.statusCode === 'C' || v.submissionStatus === 'C')
})
/** 未达到 C 的村 */
const notReady = computed(() => {
  const r = ready.value || {}
  return (r.villages || r.list || []).filter(
    (v) => !(v.statusCode === 'C' || v.submissionStatus === 'C'),
  )
})
const canSubmit = computed(() => notReady.value.length === 0 && candidates.value.length > 0)

/** 当前处于 E（组包中）的包 */
const editing = computed(() => pkgs.value.find((p) => p.statusCode === 'E') || null)

async function create() {
  try {
    const r = await apiPackageCreate()
    msg.value = `已创建组包（${r && r.packageNo ? r.packageNo : ''}，状态 E 组包中）`
    await load()
  } catch (e) {
    err.value = e.message || '创建失败'
  }
}

async function addOne(v) {
  if (!editing.value) { err.value = '请先创建组包'; return }
  const sid = v.submissionId || v.id
  try {
    await apiPackageAddSubmission(editing.value.id, sid)
    msg.value = `已纳入「${v.name || v.villageName}」`
    await load()
    await open(editing.value)
  } catch (e) {
    err.value = e.message || '纳入失败'
  }
}

async function removeOne(v) {
  const sid = v.submissionId || v.submissionIdRef || v.id
  try {
    await apiPackageRemoveSubmission(detail.value.id || editing.value.id, sid)
    msg.value = '已移出'
    await load()
    await open(detail.value || editing.value)
  } catch (e) {
    err.value = e.message || '移出失败'
  }
}

async function open(p) {
  try { detail.value = await apiPackageDetail(p.id) } catch (e) { err.value = e.message || '加载详情失败' }
}

async function submitPkg() {
  const id = (detail.value && detail.value.id) || (editing.value && editing.value.id)
  if (!id) { err.value = '未选中上报包'; return }
  try {
    await apiPackageSubmit(id)
    msg.value = '上报包已提交县级（E → F）；包内锁定，不可追加或移除'
    detail.value = null
    await load()
  } catch (e) {
    err.value = e.message || '提交失败'
  }
}
</script>

<template>
  <div class="pa">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="gate" :class="canSubmit ? 'ok' : 'wait'">
      <div class="g-title">
        {{ canSubmit ? '✓ 辖区全部村已通过（C），可组包提交县级' : '⚠ 尚有村未达到「C 镇级已通过」，不可提交' }}
      </div>
      <div v-if="notReady.length" class="g-list">
        <span v-for="(v, i) in notReady" :key="i" class="g-chip">
          {{ v.name || v.villageName }} · {{ v.submissionStatus || v.statusCode || '未上报' }}
        </span>
      </div>
      <div class="g-note">
        规则：辖区有任一村未完成则提交按钮置灰；提交后包内锁定，不可追加或移除。
      </div>
    </div>

    <div class="panel">
      <div class="head">
        <div class="pt">上报包</div>
        <div class="acts">
          <button class="btn" @click="create">创建/取得组包</button>
          <button class="btn primary" :disabled="!canSubmit" @click="submitPkg">提交县级</button>
        </div>
      </div>
      <table class="tbl">
        <thead><tr><th>包编号</th><th>名称</th><th class="num">村数</th><th>状态</th><th>提交时间</th><th style="width:64px">操作</th></tr></thead>
        <tbody>
          <tr v-for="p in pkgs" :key="p.id">
            <td class="mono small">{{ p.packageNo }}</td>
            <td>{{ p.packageName || '—' }}</td>
            <td class="num">{{ p.villageCount ?? '—' }}</td>
            <td><span class="st" :class="'st-' + p.statusCode">{{ p.statusName || p.statusCode }}</span></td>
            <td class="small dim">{{ p.submittedAt || '—' }}</td>
            <td><span class="link" @click="open(p)">查看</span></td>
          </tr>
          <tr v-if="!pkgs.length && !loading"><td colspan="6" class="empty">暂无上报包，点击「创建/取得组包」开始</td></tr>
        </tbody>
      </table>
    </div>

    <!-- 可纳入的整村单 -->
    <div class="panel" style="margin-top:14px" v-if="candidates.length">
      <div class="pt">可纳入的整村单（C 镇级已通过）</div>
      <table class="tbl">
        <thead><tr><th>村</th><th>上报单号</th><th class="num">户数</th><th class="num">面积</th><th style="width:64px">操作</th></tr></thead>
        <tbody>
          <tr v-for="(v, i) in candidates" :key="i">
            <td class="strong">{{ v.name || v.villageName }}</td>
            <td class="mono small">{{ v.submitNo || '—' }}</td>
            <td class="num">{{ v.householdCount ?? '—' }}</td>
            <td class="num">{{ v.totalArea ?? '—' }}</td>
            <td><span class="link" @click="addOne(v)">纳入</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="detail" class="panel" style="margin-top:14px">
      <div class="head">
        <div class="pt">上报包详情 · {{ detail.packageNo }}</div>
        <button v-if="detail.statusCode === 'E'" class="btn primary" :disabled="!canSubmit" @click="submitPkg">提交县级</button>
      </div>
      <table class="tbl">
        <thead><tr><th>村</th><th>整村单号</th><th class="num">户数</th><th class="num">面积</th><th>状态</th><th style="width:64px">操作</th></tr></thead>
        <tbody>
          <tr v-for="v in (detail.villages || detail.submissions || [])" :key="v.id">
            <td class="strong">{{ v.villageName || v.name }}</td>
            <td class="mono small">{{ v.submitNo || '—' }}</td>
            <td class="num">{{ v.householdCount ?? '—' }}</td>
            <td class="num">{{ v.totalArea ?? '—' }}</td>
            <td class="small">{{ v.statusCode || v.status || '—' }}</td>
            <td>
              <span v-if="detail.statusCode === 'E'" class="link danger" @click="removeOne(v)">移出</span>
              <span v-else class="dim small">已锁定</span>
            </td>
          </tr>
          <tr v-if="!(detail.villages || detail.submissions || []).length"><td colspan="6" class="empty">包内暂无整村单</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.pa { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.gate { border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; border-left: 3px solid #c9a45c; background: #fff3e0; }
.gate.ok { background: #e8f5ed; border-left-color: #2b7a4b; }
.gate.wait { background: #fff3e0; }
.g-title { font-size: 13.5px; font-weight: 600; color: #1b2733; }
.g-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 9px; }
.g-chip { background: #fff; border-radius: 5px; padding: 3px 9px; font-size: 12px; color: #b26a00; }
.g-note { font-size: 11.5px; color: #8a97a5; margin-top: 9px; line-height: 1.7; }
.gate.ok .g-note { color: #4a7c5a; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 12px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; }
.acts { display: flex; gap: 10px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.strong { font-weight: 500; color: #1b2733; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #f4f6f8; color: #5a6875; }
.st-E { background: #fff3e0; color: #b26a00; }
.st-F { background: #e4f3ea; color: #0e7a4f; }
.st-G { background: #e8f5ed; color: #2b7a4b; }
.st-H { background: #ede7f6; color: #5e35b1; }
.st-I { background: #fdeceb; color: #c9302c; }
.link { color: #0e7a4f; font-size: 12.5px; cursor: pointer; }
.link.danger { color: #c9302c; }
.empty { text-align: center; color: #9aa6b2; padding: 28px 0; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
