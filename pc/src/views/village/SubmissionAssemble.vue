<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { apiVillageDashboard, apiVillageSubmissions, apiSubmitVillage, apiVillageReportsExport } from '@/api'

/**
 * F-V10 上报单组装与提交
 * 前置（B-V01）：完成率 100%（已通过及以上 + 已注销 = 总户数）且盖章件编号已登记
 * 导出统计表 XF-；生成上报单提交镇级
 */
const stats = ref(null)
const list = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const dialog = ref(false)
const form = reactive({ sealNo: '', sealDate: '', remark: '', householders: [] })

async function load() {
  loading.value = true
  err.value = ''
  try {
    stats.value = await apiVillageDashboard()
    try { list.value = (await apiVillageSubmissions({ page: 1, pageSize: 20 }))?.list || [] } catch (e) { list.value = [] }
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

/** 完成率口径：（已通过及以上 + 已注销）/ 总户数 */
const done = computed(() => {
  const s = stats.value || {}
  const total = Number(s.total || 0)
  const approved = Number(s.approved || 0)
  const cancelled = Number(s.cancelled || s.deleted || 0)
  const rate = total === 0 ? 0 : Math.round(((approved + cancelled) * 1000) / total) / 10
  return { total, approved, cancelled, rate }
})
const ready = computed(() => done.value.total > 0 && done.value.rate >= 100)

/** 未完成户（用于提示清单） */
const unfinished = computed(() => {
  const o = []
  if (stats.value && stats.value.byGroup) {
    for (const [g, v] of Object.entries(stats.value.byGroup)) {
      const bad = Number(v.total || 0) - Number(v.approved || 0)
      if (bad > 0) o.push(`${g}：${bad} 户未通过`)
    }
  }
  return o
})

function openSubmit() {
  if (!ready.value) {
    err.value = `完成率须 100% 才能提交（当前 ${done.value.rate}%）`
    return
  }
  form.sealNo = ''
  form.sealDate = new Date().toISOString().slice(0, 10)
  form.remark = ''
  dialog.value = true
}

async function doExport() {
  try {
    const r = await apiVillageReportsExport({ type: 'XF', scope: 'village', format: 'EXCEL' })
    msg.value = `统计表已导出${r && r.fileName ? '：' + r.fileName : '（XF-）'}`
  } catch (e) {
    err.value = e.message || '导出失败'
  }
}

async function submit() {
  if (!form.sealNo.trim()) {
    err.value = '请登记盖章件编号（材料线下存档，系统只登记编号与日期）'
    return
  }
  try {
    const r = await apiSubmitVillage({
      sealNo: form.sealNo.trim(),
      sealDate: form.sealDate,
      remark: form.remark.trim(),
    })
    dialog.value = false
    err.value = ''
    msg.value = `上报单已提交镇级${r && r.submitNo ? '（' + r.submitNo + '）' : ''}；本村进入锁定状态`
    await load()
  } catch (e) {
    err.value = e.message || '提交失败'
  }
}
</script>

<template>
  <div class="sa">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="cards">
      <div class="card"><div class="v">{{ done.total }}</div><div class="l">总户数</div></div>
      <div class="card ok"><div class="v">{{ done.approved }}</div><div class="l">已通过</div></div>
      <div class="card"><div class="v">{{ done.cancelled }}</div><div class="l">已注销（计入完成）</div></div>
      <div class="card" :class="ready ? 'ok' : 'warn'">
        <div class="v">{{ done.rate }}%</div><div class="l">完成率（须 100%）</div>
      </div>
    </div>

    <div v-if="!ready && unfinished.length" class="block">
      <b>尚未达到提交条件</b>，以下分组仍有未通过户：
      <div class="ul"><span v-for="(u, i) in unfinished" :key="i">{{ u }}</span></div>
    </div>

    <div class="panel">
      <div class="head">
        <div class="pt">上报单组装</div>
        <div class="acts">
          <button class="btn" @click="doExport">导出统计表（XF-）</button>
          <button class="btn primary" :disabled="!ready" @click="openSubmit">生成上报单并提交镇级</button>
        </div>
      </div>
      <div class="steps">
        <div class="step done"><span class="n">1</span>导出统计表 XF-</div>
        <div class="step done"><span class="n">2</span>校验完成率 100%</div>
        <div class="step done"><span class="n">3</span>登记盖章件编号与日期（不上传影像）</div>
        <div class="step"><span class="n">4</span>提交镇级（提交后本村锁定）</div>
      </div>

      <div class="pt" style="margin-top:20px">历史上报单</div>
      <table class="tbl">
        <thead><tr><th>编号</th><th class="num">户数</th><th class="num">面积</th><th>盖章件编号</th><th>状态</th><th>提交时间</th></tr></thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td class="mono small">{{ r.submitNo || r.id }}</td>
            <td class="num">{{ r.householdCount ?? '—' }}</td>
            <td class="num">{{ r.totalArea ?? '—' }}</td>
            <td class="mono small">{{ r.sealNo || '—' }}</td>
            <td><span class="st">{{ r.statusName || r.status || '—' }}</span></td>
            <td class="small dim">{{ r.submittedAt || '—' }}</td>
          </tr>
          <tr v-if="!list.length && !loading"><td colspan="6" class="empty">暂无上报记录</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="dialog = false">
      <div class="dlg">
        <div class="dlg-t">提交上报单</div>
        <div class="warn">提交后本村立即锁定：农户端不可再改、村级合户/销户/分户审核入口关闭，须镇级退回整村单后方可解锁。</div>
        <div class="fld"><label>盖章件编号 *</label><input v-model="form.sealNo" placeholder="如：XG-2026-003（材料线下存档）" /></div>
        <div class="fld"><label>盖章日期</label><input v-model="form.sealDate" type="date" /></div>
        <div class="fld"><label>备注</label><textarea v-model="form.remark" rows="2" placeholder="选填"></textarea></div>
        <div class="dlg-actions">
          <button class="btn" @click="dialog = false">取消</button>
          <button class="btn primary" @click="submit">确认提交</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.sa { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
.card { background: #fff; border-radius: 10px; padding: 16px; border-left: 3px solid #dfe4ea; }
.card.ok { border-left-color: #2b7a4b; }
.card.warn { border-left-color: #c9a45c; }
.card .v { font-size: 24px; font-weight: 700; color: #1b2733; }
.card .l { font-size: 11.5px; color: #8a97a5; margin-top: 4px; }
.block { background: #fff3e0; color: #b26a00; font-size: 12.5px; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; border-left: 3px solid #c9a45c; line-height: 1.8; }
.ul { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 6px; }
.ul span { background: #fff; border-radius: 5px; padding: 3px 9px; font-size: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 12px; flex-wrap: wrap; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; }
.acts { display: flex; gap: 10px; }
.steps { display: flex; gap: 8px; flex-wrap: wrap; }
.step { flex: 1; min-width: 170px; background: #f7f9fa; border-radius: 8px; padding: 12px; font-size: 12.5px; color: #5a6875; line-height: 1.7; }
.step.done { background: #e8f5ed; color: #2b7a4b; }
.step .n { display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: #0e7a4f; color: #fff; font-size: 11px; text-align: center; line-height: 18px; margin-right: 6px; }
.step.done .n { background: #2b7a4b; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #e4f3ea; color: #0e7a4f; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 460px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 14px; }
.warn { background: #fdeceb; color: #c9302c; font-size: 12px; border-radius: 7px; padding: 10px 12px; line-height: 1.7; margin-bottom: 14px; }
.fld { margin-bottom: 13px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld input, .fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
