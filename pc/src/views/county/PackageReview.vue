<script setup>
import { ref, onMounted } from 'vue'
import { apiCountyPackages, apiCountyPackageDetail, apiCountyPackageReview } from '@/api'

const rows = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const detail = ref(null)
const dialog = ref(false)
const form = ref({ result: '通过', opinion: '', townId: null })

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiCountyPackages({ page: 1, pageSize: 50 })
    rows.value = (d && (d.list || d.records)) || []
  } catch (e) {
    err.value = e.message || '加载失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function open(r) {
  try {
    detail.value = await apiCountyPackageDetail(r.id || r.packageId)
  } catch (e) {
    err.value = e.message || '加载详情失败'
  }
}
function openReview(r, result) {
  detail.value = detail.value || r
  form.value = { result, opinion: '', townId: null }
  dialog.value = true
}
async function submitReview() {
  const id = (detail.value && (detail.value.id || detail.value.packageId)) || null
  if (!id) { err.value = '未选中上报包'; return }
  if (form.value.result === '退回' && form.value.opinion.trim().length < 10) {
    err.value = '退回意见不少于 10 个字'
    return
  }
  try {
    await apiCountyPackageReview(id, {
      result: form.value.result,
      opinion: form.value.opinion.trim(),
      townId: form.value.townId,
    })
    dialog.value = false
    err.value = ''
    msg.value = form.value.result === '通过' ? '已通过，可归档' : '已退回镇级'
    detail.value = null
    await load()
  } catch (e) {
    err.value = e.message || '提交失败'
  }
}
</script>

<template>
  <div class="pr">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="panel">
      <div class="pt">乡镇上报包（XZ-）</div>
      <table class="tbl">
        <thead><tr><th>包编号</th><th>乡镇</th><th class="num">村数</th><th class="num">户数</th><th class="num">面积</th><th>状态</th><th>提交时间</th><th style="width:150px">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id || r.packageId">
            <td class="mono small">{{ r.packageNo || r.submitNo }}</td>
            <td>{{ r.townName || r.townId }}</td>
            <td class="num">{{ r.villageCount ?? '—' }}</td>
            <td class="num">{{ r.householdCount ?? '—' }}</td>
            <td class="num">{{ r.totalArea ?? '—' }}</td>
            <td><span class="st" :class="'st-' + (r.statusCode || r.status)">{{ r.statusName || r.status }}</span></td>
            <td class="small dim">{{ r.submittedAt || r.createdAt }}</td>
            <td>
              <span class="link" @click="open(r)">详情</span>
              <span class="link" @click="openReview(r, '通过')">通过</span>
              <span class="link danger" @click="openReview(r, '退回')">退回</span>
            </td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="8" class="empty">暂无上报包</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="detail" class="panel">
      <div class="pt">上报包详情</div>
      <div class="kv">
        <div><span class="k">包编号</span>{{ detail.packageNo || '—' }}</div>
        <div><span class="k">乡镇</span>{{ detail.townName || '—' }}</div>
        <div><span class="k">镇审时间</span>{{ detail.reviewedAt || '—' }}</div>
      </div>
      <table class="tbl" style="margin-top:14px">
        <thead><tr><th>村</th><th>村上报单</th><th class="num">户数</th><th class="num">面积</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="v in (detail.submissions || detail.villages || [])" :key="v.id">
            <td>{{ v.villageName || v.name }}</td>
            <td class="mono small">{{ v.submitNo || v.submissionNo || '—' }}</td>
            <td class="num">{{ v.householdCount ?? '—' }}</td>
            <td class="num">{{ v.totalArea ?? '—' }}</td>
            <td class="small">{{ v.statusCode || v.status || '—' }}</td>
          </tr>
          <tr v-if="!(detail.submissions || detail.villages || []).length"><td colspan="5" class="empty">暂无村级明细</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="dialog = false">
      <div class="dlg">
        <div class="dlg-t">{{ form.result === '通过' ? '通过上报包' : '退回镇级' }}</div>
        <div class="fld">
          <label>{{ form.result === '通过' ? '审批意见（选填）' : '退回意见（不少于 10 字）' }}</label>
          <textarea v-model="form.opinion" rows="4" :placeholder="form.result === '通过' ? '可留空' : '请说明退回原因，可点名某村要求下推'"></textarea>
        </div>
        <div class="dlg-actions">
          <button class="btn" @click="dialog = false">取消</button>
          <button class="btn primary" @click="submitReview">确认</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.pr { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; margin-bottom: 14px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.kv { display: flex; gap: 26px; font-size: 12.5px; color: #3d4b5a; flex-wrap: wrap; }
.kv .k { color: #9aa6b2; margin-right: 6px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 9px 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; white-space: nowrap; }
.tbl td { padding: 9px 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #f4f6f8; color: #5a6875; }
.st-C, .st-通过, .st-已通过 { background: #fff3e0; color: #b26a00; }
.st-F, .st-待审批 { background: #e4f3ea; color: #0e7a4f; }
.st-G, .st-H { background: #e8f5ed; color: #2b7a4b; }
.link { color: #0e7a4f; font-size: 12.5px; cursor: pointer; margin-right: 8px; }
.link.danger { color: #c9302c; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 420px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.fld { margin-bottom: 14px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 9px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
