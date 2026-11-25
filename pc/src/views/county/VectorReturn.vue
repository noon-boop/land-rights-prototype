<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiVectorReturnPreview, apiVectorReturnSubmit, apiVectorReturns } from '@/api'

const preview = ref(null)
const records = ref([])
const loading = ref(false)
const submitting = ref(false)
const err = ref('')
const ok = ref('')
const form = ref({ returnName: '', remark: '' })

async function load() {
  loading.value = true
  err.value = ''
  try {
    preview.value = await apiVectorReturnPreview()
    const d = await apiVectorReturns({ page: 1, pageSize: 20 })
    records.value = (d && d.list) || []
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const dist = computed(() => (preview.value && preview.value.statusDistribution) || {})
const willAdvance = computed(() => Number((preview.value && preview.value.willAdvance) || 0))
const totalHH = computed(() => Number((preview.value && preview.value.totalHouseholds) || 0))
const villageCount = computed(() => Number((preview.value && preview.value.villageCount) || 0))

async function submit() {
  err.value = ''
  ok.value = ''
  if (!form.value.returnName.trim()) {
    err.value = '请填写回传名称'
    return
  }
  if (willAdvance.value === 0) {
    err.value = '当前没有「已通过」的户，无需回传'
    return
  }
  submitting.value = true
  try {
    const r = await apiVectorReturnSubmit({
      returnName: form.value.returnName.trim(),
      remark: form.value.remark.trim(),
    })
    ok.value = r.message || '提交成功'
    form.value = { returnName: '', remark: '' }
    await load()
  } catch (e) {
    err.value = e.message || '提交失败'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="vr">
    <div class="intro">
      <div class="in-t">矢量成果回传（全县一次性置位）</div>
      <div class="in-d">
        县级提交回传信息后，全县范围内状态为「已通过」的户统一置为「待最终确认」，农户端第二轮最终确认随之开放。
        待审核 / 未提交 / 未通过 的户不受影响；已最终确认的户不会被送回。
      </div>
    </div>

    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="ok" class="ok">{{ ok }}</div>

    <div class="grid">
      <div class="panel">
        <div class="pt">提交前预览</div>
        <div class="kpis">
          <div class="kpi"><div class="v">{{ villageCount }}</div><div class="l">覆盖村数</div></div>
          <div class="kpi"><div class="v">{{ totalHH }}</div><div class="l">范围内总户数</div></div>
          <div class="kpi hi"><div class="v">{{ willAdvance }}</div><div class="l">将推进户数</div></div>
        </div>

        <div class="dist">
          <div class="dt">当前状态分布</div>
          <div class="drow" v-for="(v, k) in dist" :key="k">
            <span class="dn">{{ k }}</span>
            <div class="dtrack"><div class="dfill" :class="{ hi: k === '已通过' }" :style="{ width: (totalHH ? (v / totalHH * 100) : 0) + '%' }"></div></div>
            <span class="dv">{{ v }}</span>
          </div>
          <div v-if="!Object.keys(dist).length" class="dim">暂无数据</div>
        </div>

        <div class="form">
          <div class="fld">
            <label>回传名称 <span class="req">*</span></label>
            <input v-model="form.returnName" placeholder="如：2026年示范村片区实测成果回传" />
          </div>
          <div class="fld">
            <label>备注</label>
            <textarea v-model="form.remark" rows="2" placeholder="选填，如：实测图斑已核对"></textarea>
          </div>
          <button class="btn primary" :disabled="submitting || willAdvance === 0" @click="submit">
            {{ submitting ? '提交中…' : `提交回传并置位（${willAdvance} 户）` }}
          </button>
          <div class="fhint">回传编号 HC- 由系统按年生成；重复提交幂等，已置位的户不会重复推进。</div>
        </div>
      </div>

      <div class="panel">
        <div class="pt">回传记录</div>
        <table class="tbl">
          <thead><tr><th>编号</th><th>名称</th><th class="num">村</th><th class="num">置位户数</th><th>提交人</th><th>时间</th></tr></thead>
          <tbody>
            <tr v-for="r in records" :key="r.id">
              <td class="mono small">{{ r.returnNo }}</td>
              <td class="small">{{ r.returnName }}</td>
              <td class="num small">{{ r.villageCount }}</td>
              <td class="num strong">{{ r.affected }}</td>
              <td class="small">{{ r.operator || '—' }}</td>
              <td class="small dim">{{ r.createdAt }}</td>
            </tr>
            <tr v-if="!records.length"><td colspan="6" class="empty">暂无回传记录</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.vr { padding: 18px 20px; }
.intro { background: #fff; border-radius: 10px; padding: 18px 20px; border-left: 3px solid #0e7a4f; }
.in-t { font-size: 15px; font-weight: 600; color: #1b2733; }
.in-d { font-size: 12.5px; color: #5a6875; line-height: 1.8; margin-top: 8px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-top: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-top: 12px; }
.grid { display: grid; grid-template-columns: 1.15fr 1fr; gap: 14px; margin-top: 14px; align-items: start; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 14px; }
.kpis { display: flex; gap: 12px; }
.kpi { flex: 1; background: #f7f9fa; border-radius: 8px; padding: 14px; text-align: center; }
.kpi.hi { background: #fff3e0; }
.kpi .v { font-size: 24px; font-weight: 700; color: #0e7a4f; }
.kpi.hi .v { color: #b26a00; }
.kpi .l { font-size: 11.5px; color: #8a97a5; margin-top: 4px; }
.dist { margin-top: 18px; }
.dt { font-size: 12.5px; color: #5a6875; margin-bottom: 10px; }
.drow { display: flex; align-items: center; gap: 10px; margin-bottom: 7px; }
.dn { width: 84px; font-size: 12.5px; color: #5a6875; }
.dtrack { flex: 1; height: 8px; background: #f0f3f5; border-radius: 4px; overflow: hidden; }
.dfill { height: 100%; background: #9aa6b2; border-radius: 4px; }
.dfill.hi { background: #c9a45c; }
.dv { width: 34px; text-align: right; font-size: 12.5px; color: #1b2733; font-weight: 600; }
.dim { color: #9aa6b2; font-size: 12.5px; }
.form { margin-top: 20px; border-top: 1px solid #f0f3f5; padding-top: 18px; }
.fld { margin-bottom: 13px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.req { color: #c9302c; }
.fld input, .fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 9px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.fld input:focus, .fld textarea:focus { border-color: #0e7a4f; }
.btn { height: 36px; padding: 0 16px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13.5px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; width: 100%; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.fhint { font-size: 11.5px; color: #9aa6b2; margin-top: 10px; line-height: 1.7; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 9px 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; white-space: nowrap; }
.tbl td { padding: 9px 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.strong { font-weight: 700; color: #0e7a4f; }
.dim { color: #9aa6b2; }
.empty { text-align: center; color: #9aa6b2; padding: 28px 0; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
