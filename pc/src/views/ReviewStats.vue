<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiVillageCompare, apiHouseholdList } from '@/api'
const loading = ref(false)
const rows = ref([])
const compare = ref(null)
const err = ref('')

const CATS = ['直接延包','户主变更','增加成员','减少成员','分户','合户',
              '地块信息错误（户）','征地','整户消亡','新增户','无地户']

async function load() {
  loading.value = true
  err.value = ''
  try {
    // 拉全量户（一页足够本村规模）统计 11 类口径
    const d = await apiHouseholdList({ status: 'all', page: 1, pageSize: 500 })
    rows.value = (d && (d.list || d.records)) || []
    try { compare.value = await apiVillageCompare() } catch (e) { compare.value = null }
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const byCat = computed(() => {
  const m = {}
  CATS.forEach((c) => (m[c] = 0))
  rows.value.forEach((r) => {
    const c = r.changeCategory || r.change_category
    if (c && m[c] !== undefined) m[c] += 1
  })
  return m
})

const totals = computed(() => ({
  total: rows.value.length,
  approved: rows.value.filter((r) => r.status === '已通过').length,
  pending: rows.value.filter((r) => r.status === '待审核').length,
  rejected: rows.value.filter((r) => r.status === '未通过').length,
  unsubmitted: rows.value.filter((r) => r.status === '未提交').length,
  cancelled: rows.value.filter((r) => r.status === '已注销').length,
}))

const maxVal = computed(() => Math.max(1, ...Object.values(byCat.value)))
</script>

<template>
  <div class="stats">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="cards">
      <div class="card"><div class="c-v">{{ totals.total }}</div><div class="c-l">总户数</div></div>
      <div class="card ok"><div class="c-v">{{ totals.approved }}</div><div class="c-l">已通过</div></div>
      <div class="card warn"><div class="c-v">{{ totals.pending }}</div><div class="c-l">待审核</div></div>
      <div class="card bad"><div class="c-v">{{ totals.rejected }}</div><div class="c-l">未通过</div></div>
      <div class="card muted"><div class="c-v">{{ totals.unsubmitted }}</div><div class="c-l">未提交</div></div>
      <div class="card muted"><div class="c-v">{{ totals.cancelled }}</div><div class="c-l">已注销（单列）</div></div>
    </div>

    <div class="panel">
      <div class="pt">官方 11 类业务分类统计</div>
      <div class="bars">
        <div v-for="c in CATS" :key="c" class="bar-row">
          <span class="b-name">{{ c }}</span>
          <div class="b-track"><div class="b-fill" :style="{ width: (byCat[c] / maxVal * 100) + '%' }"></div></div>
          <span class="b-val">{{ byCat[c] }}</span>
        </div>
      </div>
      <div class="tip">通过审核时村级必选 11 类之一；农户端多选仅作表达，以村级定稿为准。</div>
    </div>

    <div class="panel" v-if="compare">
      <div class="pt">本村变化对比（只读）</div>
      <pre class="raw">{{ JSON.stringify(compare, null, 2) }}</pre>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.stats { padding: 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; }
.cards { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
.card { background: #fff; border-radius: 10px; padding: 15px; border-left: 3px solid #dfe4ea; }
.card.ok { border-left-color: #2b7a4b; } .card.warn { border-left-color: #c9a45c; }
.card.bad { border-left-color: #c9302c; } .card.muted { border-left-color: #9aa6b2; }
.c-v { font-size: 22px; font-weight: 700; color: #1b2733; }
.c-l { font-size: 11.5px; color: #8a97a5; margin-top: 4px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; margin-top: 14px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 14px; }
.bars { display: flex; flex-direction: column; gap: 9px; }
.bar-row { display: flex; align-items: center; gap: 10px; }
.b-name { width: 130px; font-size: 12.5px; color: #5a6875; flex-shrink: 0; }
.b-track { flex: 1; height: 8px; background: #f0f3f5; border-radius: 4px; overflow: hidden; }
.b-fill { height: 100%; background: #0e7a4f; border-radius: 4px; transition: width .3s; }
.b-val { width: 34px; text-align: right; font-size: 12.5px; color: #1b2733; font-weight: 600; }
.tip { font-size: 11.5px; color: #9aa6b2; margin-top: 14px; line-height: 1.7; }
.raw { font-size: 11.5px; color: #3d4b5a; background: #f7f9fa; border-radius: 8px; padding: 12px; overflow: auto; max-height: 260px; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 30px; }
</style>
