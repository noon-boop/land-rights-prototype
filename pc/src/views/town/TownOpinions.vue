<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiTownOpinions, apiTownReportOpinions, apiTownRejectVillageOpinion } from '@/api'

/**
 * F-T10 二次意见上报（镇 → 县）
 * 汇总辖区已有村级上报的意见，可附镇级处理意见；上报县级
 * 可对村级上报退回重报
 */
const list = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const tab = ref('待上报')
const dialog = ref(false)
const form = ref({ townNote: '' })

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiTownOpinions()
    list.value = (d && (d.list || d.records)) || (Array.isArray(d) ? d : [])
  } catch (e) {
    err.value = e.message || '加载失败'
    list.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)

const shown = computed(() => list.value.filter((r) => (r.status || '待上报') === tab.value))
const pending = computed(() => list.value.filter((r) => (r.status || '待上报') === '待上报').length)

function openReport() {
  if (!pending.value) { err.value = '当前没有待上报的意见'; return }
  form.value = { townNote: '' }
  dialog.value = true
}
async function doReport() {
  try {
    const r = await apiTownReportOpinions({ townNote: form.value.townNote.trim() })
    dialog.value = false
    err.value = ''
    msg.value = `已上报县级${r && r.count ? '（' + r.count + ' 条）' : ''}`
    await load()
  } catch (e) {
    err.value = e.message || '上报失败'
  }
}
async function rejectVillage(r) {
  const reason = window.prompt('退回村级重报，请填写原因（不少于 10 字）')
  if (!reason) return
  if (reason.trim().length < 10) { err.value = '退回原因不少于 10 个字'; return }
  try {
    await apiTownRejectVillageOpinion({ id: r.id, opinion: reason.trim() })
    msg.value = '已退回村级重报'
    await load()
  } catch (e) {
    err.value = e.message || '退回失败'
  }
}
</script>

<template>
  <div class="to">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      汇总辖区村级已上报的问题意见，可附镇级处理意见后上报县级。退回村级后，该村须重新上报。
      二次审查阶段只统计问题意见，不改任何业务数据。
    </div>

    <div class="panel">
      <div class="head">
        <div class="tabs">
          <span class="tab" :class="{ on: tab === '待上报' }" @click="tab = '待上报'">待上报（{{ pending }}）</span>
          <span class="tab" :class="{ on: tab === '已上报' }" @click="tab = '已上报'">已上报</span>
        </div>
        <button class="btn primary" :disabled="!pending" @click="openReport">汇总上报县级</button>
      </div>
      <table class="tbl">
        <thead><tr><th>村</th><th>户主</th><th>问题意见</th><th>村级处理意见</th><th>状态</th><th>县级意见</th><th style="width:80px">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in shown" :key="r.id">
            <td class="small">{{ r.villageName || '—' }}</td>
            <td class="strong">{{ r.householder || '—' }}</td>
            <td class="op">{{ r.opinion || r.content || '—' }}</td>
            <td class="small dim2">{{ r.villageNote || r.villageOpinion || '—' }}</td>
            <td><span class="st" :class="r.status === '已上报' ? 'st-done' : 'st-wait'">{{ r.status || '待上报' }}</span></td>
            <td class="small dim2">{{ r.countyNote || '—' }}</td>
            <td>
              <span v-if="r.status !== '已上报'" class="link danger" @click="rejectVillage(r)">退回村</span>
              <span v-else class="dim small">—</span>
            </td>
          </tr>
          <tr v-if="!shown.length && !loading"><td colspan="7" class="empty">暂无{{ tab }}意见</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="dialog = false">
      <div class="dlg">
        <div class="dlg-t">汇总上报县级</div>
        <div class="fld">
          <label>镇级处理意见（选填）</label>
          <textarea v-model="form.townNote" rows="4" placeholder="可说明镇级对上述问题的核实与处理情况"></textarea>
        </div>
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
.to { padding: 18px 20px; }
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
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.dim2 { color: #8a97a5; }
.strong { font-weight: 500; color: #1b2733; }
.op { max-width: 260px; font-size: 12.5px; line-height: 1.6; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; }
.st-wait { background: #fff3e0; color: #b26a00; }
.st-done { background: #e8f5ed; color: #2b7a4b; }
.link { color: #c9302c; font-size: 12.5px; cursor: pointer; }
.empty { text-align: center; color: #9aa6b2; padding: 28px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 460px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.fld { margin-bottom: 14px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
