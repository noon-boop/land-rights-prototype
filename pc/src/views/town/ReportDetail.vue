<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiTownSubmissions, apiTownSubmissionDetail } from '@/api'

/**
 * F-T03 上报明细查看
 * 上报单明细：户清单、地块汇总、面积合计、业务分类分布
 */
const rows = ref([])
const cur = ref(null)
const loading = ref(false)
const err = ref('')

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiTownSubmissions({ page: 1, pageSize: 50 })
    rows.value = (d && (d.list || d.records)) || []
    if (rows.value.length) await open(rows.value[0])
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function open(r) {
  try { cur.value = await apiTownSubmissionDetail(r.id) } catch (e) { err.value = e.message || '加载失败' }
}

const cats = computed(() => {
  const c = (cur.value && (cur.value.categoryStats || cur.value.categories)) || {}
  if (typeof c === 'string') {
    try { return JSON.parse(c) } catch (e) { return {} }
  }
  return c || {}
})
const catRows = computed(() => Object.entries(cats.value))
const maxCat = computed(() => Math.max(1, ...catRows.value.map(([, v]) => Number(v) || 0)))

const hh = computed(() => (cur.value && (cur.value.households || cur.value.householdList)) || [])
const landSummary = computed(() => {
  const d = cur.value || {}
  return [
    { k: '地块总数', v: d.parcelCount ?? '—' },
    { k: '合同面积合计', v: d.totalArea ?? '—' },
    { k: '实测面积合计', v: d.measuredArea ?? '—' },
    { k: '基本农田面积', v: d.basicFarmlandArea ?? '—' },
  ]
})
</script>

<template>
  <div class="rd">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="panel">
      <div class="pt">选择上报单</div>
      <div class="chips">
        <span v-for="r in rows" :key="r.id" class="chip" :class="{ on: cur && cur.id === r.id }" @click="open(r)">
          {{ r.villageName }} · {{ r.submitNo }}
        </span>
        <span v-if="!rows.length && !loading" class="dim">暂无上报单</span>
      </div>
    </div>

    <template v-if="cur">
      <div class="cards">
        <div class="card" v-for="s in landSummary" :key="s.k">
          <div class="v">{{ s.v }}</div><div class="l">{{ s.k }}</div>
        </div>
      </div>

      <div class="panel" style="margin-top:14px">
        <div class="pt">业务分类分布（官方 11 类口径）</div>
        <div class="bars">
          <div v-for="[k, v] in catRows" :key="k" class="bar-row">
            <span class="bn">{{ k }}</span>
            <div class="btrack"><div class="bfill" :style="{ width: (Number(v) / maxCat * 100) + '%' }"></div></div>
            <span class="bv">{{ v }}</span>
          </div>
          <div v-if="!catRows.length" class="dim">该上报单未记录分类分布</div>
        </div>
      </div>

      <div class="panel" style="margin-top:14px">
        <div class="pt">户清单（{{ hh.length }} 户）</div>
        <table class="tbl">
          <thead><tr><th>户号</th><th>户主</th><th>组</th><th class="num">地块</th><th class="num">面积</th><th>分类</th><th>状态</th></tr></thead>
          <tbody>
            <tr v-for="h in hh" :key="h.id">
              <td class="mono small">{{ h.id }}</td>
              <td class="strong">{{ h.householder }}</td>
              <td class="small">{{ h.villageGroup || '—' }}</td>
              <td class="num">{{ h.plotCount ?? '—' }}</td>
              <td class="num">{{ h.contractArea ?? '—' }}</td>
              <td class="small">{{ h.changeCategory || '—' }}</td>
              <td><span class="st" :class="'st-' + h.status">{{ h.status }}</span></td>
            </tr>
            <tr v-if="!hh.length"><td colspan="7" class="empty">该上报单未返回户清单明细</td></tr>
          </tbody>
        </table>
      </div>
    </template>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.rd { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { font-size: 12.5px; padding: 6px 12px; border-radius: 16px; background: #f4f6f8; color: #5a6875; cursor: pointer; }
.chip.on { background: #0e7a4f; color: #fff; }
.dim { color: #9aa6b2; font-size: 12.5px; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 14px; }
.card { background: #fff; border-radius: 10px; padding: 16px; border-left: 3px solid #0e7a4f; }
.card .v { font-size: 22px; font-weight: 700; color: #1b2733; }
.card .l { font-size: 11.5px; color: #8a97a5; margin-top: 4px; }
.bars { display: flex; flex-direction: column; gap: 9px; }
.bar-row { display: flex; align-items: center; gap: 10px; }
.bn { width: 132px; font-size: 12.5px; color: #5a6875; flex-shrink: 0; }
.btrack { flex: 1; height: 8px; background: #f0f3f5; border-radius: 4px; overflow: hidden; }
.bfill { height: 100%; background: #0e7a4f; border-radius: 4px; }
.bv { width: 32px; text-align: right; font-size: 12.5px; font-weight: 600; color: #1b2733; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #f4f6f8; color: #5a6875; }
.st-已通过, .st-已最终确认 { background: #e8f5ed; color: #2b7a4b; }
.st-待审核, .st-待最终确认 { background: #fff3e0; color: #b26a00; }
.st-未通过 { background: #fdeceb; color: #c9302c; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
