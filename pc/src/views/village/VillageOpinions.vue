<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiVillageOpinions, apiReportOpinions } from '@/api'

/**
 * F-V12 二次审查意见上报（村 → 镇）
 * 汇总本村农户问题意见，可附村级处理意见；上报后本村不可再改，须镇级退回方可重报
 */
const tab = ref('待上报')
const list = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const dialog = ref(false)
const form = ref({ villageNote: '', householdIds: [] })

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiVillageOpinions('all')
    const all = (d && (d.list || d.records)) || (Array.isArray(d) ? d : [])
    list.value = all
  } catch (e) {
    err.value = e.message || '加载失败'
    list.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)

const shown = computed(() => {
  const t = tab.value
  return list.value.filter((r) => {
    const st = r.status || '待上报'
    return st === t
  })
})
const pendingCount = computed(() => list.value.filter((r) => (r.status || '待上报') === '待上报').length)

function openReport() {
  if (!pendingCount.value) {
    err.value = '当前没有待上报的意见'
    return
  }
  form.value = { villageNote: '', householdIds: [] }
  dialog.value = true
}
async function doReport() {
  try {
    const r = await apiReportOpinions({
      householdIds: form.value.householdIds,
      villageNote: form.value.villageNote.trim(),
    })
    dialog.value = false
    err.value = ''
    msg.value = `已上报镇级${r && r.count ? '（' + r.count + ' 条）' : ''}；本村意见已锁定，须镇级退回方可重报`
    await load()
  } catch (e) {
    err.value = e.message || '上报失败'
  }
}
</script>

<template>
  <div class="vo">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      二次审查阶段只统计问题意见，不改任何业务数据。上报后本村不可再改，须镇级退回方可重报。
    </div>

    <div class="panel">
      <div class="head">
        <div class="tabs">
          <span class="tab" :class="{ on: tab === '待上报' }" @click="tab = '待上报'">待上报</span>
          <span class="tab" :class="{ on: tab === '已上报' }" @click="tab = '已上报'">已上报</span>
        </div>
        <button class="btn primary" :disabled="!pendingCount" @click="openReport">
          汇总上报镇级（{{ pendingCount }} 条待上报）
        </button>
      </div>

      <table class="tbl">
        <thead>
          <tr><th>户</th><th>户主</th><th>问题意见</th><th>状态</th><th>镇级处理意见</th><th>上报时间</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in shown" :key="r.id">
            <td class="mono small">{{ r.householdId }}</td>
            <td class="strong">{{ r.householder || '—' }}</td>
            <td class="opinion">{{ r.opinion || r.content || '—' }}</td>
            <td><span class="st" :class="r.status === '已上报' ? 'st-done' : 'st-wait'">{{ r.status || '待上报' }}</span></td>
            <td class="small dim2">{{ r.townNote || r.townOpinion || '—' }}</td>
            <td class="small dim">{{ r.reportedAt || r.createdAt || '—' }}</td>
          </tr>
          <tr v-if="!shown.length && !loading"><td colspan="6" class="empty">暂无{{ tab }}意见</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="dialog = false">
      <div class="dlg">
        <div class="dlg-t">汇总上报镇级</div>
        <div class="fld">
          <label>村级处理意见（选填）</label>
          <textarea v-model="form.villageNote" rows="4"
            placeholder="可说明本村对上述问题的核实与处理情况，如：已现场核实，实测面积差异属测量误差"></textarea>
        </div>
        <div class="warn">上报后本村意见锁定，不可再修改；须镇级退回后方可重新上报。</div>
        <div class="dlg-actions">
          <button class="btn" @click="dialog = false">取消</button>
          <button class="btn primary" @click="doReport">确认上报</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.vo { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.tabs { display: flex; gap: 6px; }
.tab { font-size: 13px; padding: 6px 14px; border-radius: 16px; background: #f4f6f8; color: #5a6875; cursor: pointer; }
.tab.on { background: #0e7a4f; color: #fff; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.dim2 { color: #8a97a5; }
.strong { font-weight: 500; color: #1b2733; }
.opinion { max-width: 320px; font-size: 12.5px; line-height: 1.6; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; }
.st-wait { background: #fff3e0; color: #b26a00; }
.st-done { background: #e8f5ed; color: #2b7a4b; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 460px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.fld { margin-bottom: 14px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.warn { background: #fff3e0; color: #b26a00; font-size: 12px; border-radius: 7px; padding: 10px 12px; line-height: 1.7; margin-bottom: 14px; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
