<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiCountyStats, get } from '@/api'

/**
 * F-C06 需修改内容统计（按类型 / 按乡镇村 / 按户汇总，支持导出）
 */
const stats = ref(null)
const loading = ref(false)
const err = ref('')
const tab = ref('按乡镇')

async function load() {
  loading.value = true
  err.value = ''
  try {
    stats.value = await apiCountyStats()
  } catch (e) { err.value = e.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(load)

const totals = computed(() => {
  const s = stats.value || {}
  return {
    member: s.memberFixCount ?? s.memberIssues ?? 0,
    land: s.landFixCount ?? s.landIssues ?? 0,
    total: (s.memberFixCount ?? 0) + (s.landFixCount ?? 0),
  }
})

const townRows = computed(() => {
  const s = stats.value || {}
  return (s.byTown || []).map((t) => ({
    name: t.townName || t.name,
    member: t.memberFixCount ?? 0,
    land: t.landFixCount ?? 0,
    hh: t.fixHouseholds ?? '—',
  }))
})
</script>

<template>
  <div class="cf">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="cards">
      <div class="card"><div class="v">{{ totals.total }}</div><div class="l">需修改项合计</div></div>
      <div class="card m"><div class="v">{{ totals.member }}</div><div class="l">成员类</div></div>
      <div class="card l"><div class="v">{{ totals.land }}</div><div class="l">地块类</div></div>
    </div>

    <div class="panel">
      <div class="head">
        <div class="pt">按乡镇汇总</div>
        <button class="btn">导出（DB-）</button>
      </div>
      <table class="tbl">
        <thead><tr><th>乡镇</th><th class="num">需修改户数</th><th class="num">成员类</th><th class="num">地块类</th></tr></thead>
        <tbody>
          <tr v-for="r in townRows" :key="r.name">
            <td class="strong">{{ r.name }}</td>
            <td class="num">{{ r.hh }}</td>
            <td class="num">{{ r.member }}</td>
            <td class="num">{{ r.land }}</td>
          </tr>
          <tr v-if="!townRows.length && !loading"><td colspan="4" class="empty">暂无数据</td></tr>
        </tbody>
      </table>
      <div class="tip">
        统计口径：成员 changeType 非「无变化」计成员类；地块 adjustNote 非空或标记待线下划矢量计地块类。
        明细级（按户）请到「全县户与地块查阅」逐户查看。
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.cf { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
.card { background: #fff; border-radius: 10px; padding: 16px; border-left: 3px solid #dfe4ea; }
.card.m { border-left-color: #0e7a4f; } .card.l { border-left-color: #c9a45c; }
.card .v { font-size: 22px; font-weight: 700; color: #1b2733; }
.card .l { font-size: 11.5px; color: #8a97a5; margin-top: 4px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.strong { font-weight: 500; color: #1b2733; }
.tip { font-size: 11.5px; color: #9aa6b2; margin-top: 12px; line-height: 1.8; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.btn { height: 32px; padding: 0 13px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
