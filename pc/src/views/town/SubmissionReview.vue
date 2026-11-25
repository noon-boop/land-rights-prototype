<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { apiTownSubmissions, apiTownSubmissionDetail, apiTownReview, apiTownRejectVillage } from '@/api'

/**
 * F-T02 上报单审批（镇级核心）
 * 审批整村上报单：通过 / 退回村级（整个村打回，退回意见 ≥10 字）
 * 合户/销户的纠正也走这条通道，不单设户级驳回
 */
const rows = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const detail = ref(null)
const dialog = ref(false)
const form = reactive({ result: '通过', opinion: '', villageIds: [] })

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiTownSubmissions({ page: 1, pageSize: 50 })
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
  try { detail.value = await apiTownSubmissionDetail(r.id) } catch (e) { err.value = e.message || '加载详情失败' }
}

function openReview(r, result) {
  detail.value = detail.value || r
  form.result = result
  form.opinion = ''
  dialog.value = true
}

async function submit() {
  const id = (detail.value && (detail.value.id || detail.value.submissionId)) || null
  if (!id) { err.value = '未选中上报单'; return }
  if (form.result === '退回' && form.opinion.trim().length < 10) {
    err.value = '退回意见不少于 10 个字'
    return
  }
  try {
    await apiTownReview(id, {
      result: form.result,
      opinion: form.opinion.trim(),
    })
    dialog.value = false
    err.value = ''
    msg.value = form.result === '通过' ? '已通过，该村可参与组包' : '已退回村级（整村打回）'
    detail.value = null
    await load()
  } catch (e) {
    err.value = e.message || '提交失败'
  }
}
</script>

<template>
  <div class="sr">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="panel">
      <div class="pt">整村上报单（待审批）</div>
      <table class="tbl">
        <thead>
          <tr>
            <th>上报单号</th><th>村</th><th class="num">户数</th><th class="num">面积</th>
            <th>盖章件编号</th><th>状态</th><th>提交时间</th><th style="width:150px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="mono small">{{ r.submitNo }}</td>
            <td class="strong">{{ r.villageName }}</td>
            <td class="num">{{ r.householdCount ?? '—' }}</td>
            <td class="num">{{ r.totalArea ?? '—' }}</td>
            <td class="mono small">{{ r.sealNo || '—' }}</td>
            <td><span class="st" :class="'st-' + (r.statusCode || r.status)">{{ r.statusName || r.status }}</span></td>
            <td class="small dim">{{ r.submittedAt || '—' }}</td>
            <td>
              <span class="link" @click="open(r)">详情</span>
              <span class="link" @click="openReview(r, '通过')">通过</span>
              <span class="link danger" @click="openReview(r, '退回')">退回村级</span>
            </td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="8" class="empty">暂无上报单</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="detail" class="panel" style="margin-top:14px">
      <div class="pt">上报单详情 · {{ detail.villageName }}</div>
      <div class="kv">
        <div><span class="k">上报单号</span>{{ detail.submitNo || '—' }}</div>
        <div><span class="k">户数</span>{{ detail.householdCount ?? '—' }}</div>
        <div><span class="k">合同面积</span>{{ detail.totalArea ?? '—' }}</div>
        <div><span class="k">盖章件</span>{{ detail.sealNo || '—' }} {{ detail.sealDate || '' }}</div>
      </div>
      <div class="tip">退回村级＝整个村打回，村内所有户解锁可改；合户/销户的纠正同样走这条通道。</div>
    </div>

    <div v-if="dialog" class="mask" @click.self="dialog = false">
      <div class="dlg">
        <div class="dlg-t">{{ form.result === '通过' ? '通过整村上报单' : '退回村级（整村打回）' }}</div>
        <div class="fld">
          <label>{{ form.result === '通过' ? '审批意见（选填）' : '退回意见（不少于 10 字）' }}</label>
          <textarea v-model="form.opinion" rows="4"
            :placeholder="form.result === '通过' ? '可留空' : '请说明退回原因，如：二组 3 户地块四至填写有误，请村级核实后重新提交'"></textarea>
        </div>
        <div class="dlg-actions">
          <button class="btn" @click="dialog = false">取消</button>
          <button class="btn primary" @click="submit">确认</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.sr { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.kv { display: flex; gap: 24px; font-size: 12.5px; color: #3d4b5a; flex-wrap: wrap; }
.kv .k { color: #9aa6b2; margin-right: 6px; }
.tip { font-size: 11.5px; color: #9aa6b2; margin-top: 12px; line-height: 1.7; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; white-space: nowrap; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.strong { font-weight: 500; color: #1b2733; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #f4f6f8; color: #5a6875; }
.st-A, .st-B, .st-待审核 { background: #fff3e0; color: #b26a00; }
.st-C, .st-已通过 { background: #e8f5ed; color: #2b7a4b; }
.st-D, .st-未通过 { background: #fdeceb; color: #c9302c; }
.link { color: #0e7a4f; font-size: 12.5px; cursor: pointer; margin-right: 9px; }
.link.danger { color: #c9302c; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 440px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.fld { margin-bottom: 14px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
