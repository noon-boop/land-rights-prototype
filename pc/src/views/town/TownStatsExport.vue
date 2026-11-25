<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { apiTownStats, apiTownReportsExport } from '@/api'

/**
 * F-T07 审核统计与导出（辖区）
 * 官方 11 类口径 + 汇总；报表导出（DC-）
 */
const CATS = ['直接延包','户主变更','增加成员','减少成员','分户','合户',
              '地块信息错误（户）','征地','整户消亡','新增户','无地户']
const stats = ref(null)
const loading = ref(false)
const err = ref('')
const msg = ref('')
const form = reactive({ types: ['DC'], scope: 'town' })

async function load() {
  loading.value = true
  err.value = ''
  try { stats.value = await apiTownStats() } catch (e) { err.value = e.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(load)

const totals = computed(() => {
  const s = stats.value || {}
  return {
    total: s.totalHouseholds ?? 0,
    approved: s.approved ?? 0,
    pending: s.pending ?? 0,
    rejected: s.rejected ?? 0,
    unsubmitted: s.unsubmitted ?? 0,
    villages: s.totalVillages ?? 0,
    area: s.totalArea ?? 0,
  }
})

const byCat = computed(() => {
  const s = stats.value || {}
  const src = s.categoryStats || s.categories || {}
  const o = {}
  CATS.forEach((c) => { o[c] = Number(src[c] || 0) })
  return o
})
const maxCat = computed(() => Math.max(1, ...Object.values(byCat.value)))

async function doExport() {
  try {
    const r = await apiTownReportsExport({ types: form.types, scope: form.scope })
    msg.value = `已导出${r && r.fileName ? '：' + r.fileName : '（DC-）'}`
  } catch (e) { err.value = e.message || '导出失败' }
}
</script>

<template>
  <div class="tse">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="cards">
      <div class="card"><div class="v">{{ totals.villages }}</div><div class="l">辖区村数</div></div>
      <div class="card"><div class="v">{{ totals.total }}</div><div class="l">总户数</div></div>
      <div class="card ok"><div class="v">{{ totals.approved }}</div><div class="l">已通过</div></div>
      <div class="card warn"><div class="v">{{ totals.pending }}</div><div class="l">待审核</div></div>
      <div class="card bad"><div class="v">{{ totals.rejected }}</div><div class="l">未通过</div></div>
      <div class="card muted"><div class="v">{{ totals.unsubmitted }}</div><div class="l">未提交</div></div>
    </div>

    <div class="panel">
      <div class="pt">官方 11 类口径统计</div>
      <div class="bars">
        <div v-for="c in CATS" :key="c" class="bar-row">
          <span class="bn">{{ c }}</span>
          <div class="btrack"><div class="bfill" :style="{ width: (byCat[c] / maxCat * 100) + '%' }"></div></div>
          <span class="bv">{{ byCat[c] }}</span>
        </div>
      </div>
      <div class="tip">分类口径以村级审核通过时定稿的 11 类为准；未定稿的户不计入分类分布。</div>
    </div>

    <div class="panel" style="margin-top:14px">
      <div class="head">
        <div class="pt">报表导出（DC-）</div>
        <button class="btn primary" @click="doExport">导出辖区统计报表</button>
      </div>
      <div class="tip">导出内容：辖区各村审核统计（官方 11 类口径 + 汇总），文件编号 DC-。</div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.tse { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.cards { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 14px; }
.card { background: #fff; border-radius: 10px; padding: 15px; border-left: 3px solid #dfe4ea; }
.card.ok { border-left-color: #2b7a4b; } .card.warn { border-left-color: #c9a45c; }
.card.bad { border-left-color: #c9302c; } .card.muted { border-left-color: #9aa6b2; }
.card .v { font-size: 22px; font-weight: 700; color: #1b2733; }
.card .l { font-size: 11.5px; color: #8a97a5; margin-top: 4px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.bars { display: flex; flex-direction: column; gap: 9px; }
.bar-row { display: flex; align-items: center; gap: 10px; }
.bn { width: 132px; font-size: 12.5px; color: #5a6875; flex-shrink: 0; }
.btrack { flex: 1; height: 8px; background: #f0f3f5; border-radius: 4px; overflow: hidden; }
.bfill { height: 100%; background: #0e7a4f; border-radius: 4px; }
.bv { width: 32px; text-align: right; font-size: 12.5px; font-weight: 600; color: #1b2733; }
.tip { font-size: 11.5px; color: #9aa6b2; margin-top: 12px; line-height: 1.7; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
