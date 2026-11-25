<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiCountyStats } from '@/api'

/**
 * F-C01 乡镇列表与进度
 * 全县进度总览（含上报单状态、二次审查超期统计）
 */
const stats = ref(null)
const loading = ref(false)
const err = ref('')

async function load() {
  loading.value = true
  err.value = ''
  try { stats.value = await apiCountyStats() } catch (e) { err.value = e.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(load)

const totals = computed(() => {
  const s = stats.value || {}
  return {
    towns: s.totalTowns ?? 0,
    villages: s.totalVillages ?? 0,
    hh: s.total ?? s.totalHouseholds ?? 0,
    approved: s.approved ?? s.approvedHouseholds ?? 0,
    pending: s.pending ?? 0,
    rejected: s.rejected ?? s.rejectedHouseholds ?? 0,
    unsub: s.unsubmitted ?? 0,
    reportedTowns: s.reportedTowns ?? 0,
    approvedTowns: s.approvedTowns ?? 0,
    area: s.totalArea ?? 0,
  }
})

const rows = computed(() => {
  const s = stats.value || {}
  return (s.byTown || s.towns || []).map((t) => ({
    name: t.townName || t.name,
    villages: t.villageCount ?? '—',
    hh: t.totalHouseholds ?? '—',
    approved: t.approvedHouseholds ?? '—',
    pending: t.pendingHouseholds ?? '—',
    area: t.totalArea ?? '—',
    progress: t.progress ?? 0,
    reportStatus: t.reportStatus || (t.submitted ? '已上报' : '未上报'),
    submitNo: t.submitNo || '—',
  }))
})
</script>

<template>
  <div class="tp">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="cards">
      <div class="card"><div class="v">{{ totals.towns }}</div><div class="l">乡镇数</div></div>
      <div class="card"><div class="v">{{ totals.villages }}</div><div class="l">辖区村数</div></div>
      <div class="card"><div class="v">{{ totals.hh }}</div><div class="l">总户数</div></div>
      <div class="card ok"><div class="v">{{ totals.approved }}</div><div class="l">已通过</div></div>
      <div class="card warn"><div class="v">{{ totals.reportedTowns }}</div><div class="l">已上报乡镇</div></div>
      <div class="card muted"><div class="v">{{ totals.approvedTowns }}</div><div class="l">县已通过乡镇</div></div>
    </div>

    <div class="panel">
      <div class="pt">乡镇进度</div>
      <table class="tbl">
        <thead>
          <tr><th>乡镇</th><th class="num">村数</th><th class="num">户数</th><th class="num">已通过</th>
            <th class="num">待审核</th><th class="num">面积</th><th class="num">完成率</th>
            <th>上报状态</th><th>上报包号</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.name">
            <td class="strong">{{ r.name }}</td>
            <td class="num">{{ r.villages }}</td>
            <td class="num">{{ r.hh }}</td>
            <td class="num">{{ r.approved }}</td>
            <td class="num">{{ r.pending }}</td>
            <td class="num">{{ r.area }}</td>
            <td class="num">
              <div class="prog">
                <div class="track"><div class="fill" :style="{ width: Math.min(100, Number(r.progress)) + '%' }"></div></div>
                <span>{{ r.progress }}%</span>
              </div>
            </td>
            <td><span class="st" :class="r.reportStatus === '未上报' ? 'st-wait' : 'st-ok'">{{ r.reportStatus }}</span></td>
            <td class="mono small">{{ r.submitNo }}</td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="9" class="empty">辖区暂无乡镇</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.tp { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.cards { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 14px; }
.card { background: #fff; border-radius: 10px; padding: 15px; border-left: 3px solid #dfe4ea; }
.card.ok { border-left-color: #2b7a4b; } .card.warn { border-left-color: #c9a45c; } .card.muted { border-left-color: #9aa6b2; }
.card .v { font-size: 22px; font-weight: 700; color: #1b2733; }
.card .l { font-size: 11.5px; color: #8a97a5; margin-top: 4px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; white-space: nowrap; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.prog { display: flex; align-items: center; gap: 7px; justify-content: flex-end; }
.track { width: 56px; height: 6px; background: #f0f3f5; border-radius: 3px; overflow: hidden; }
.fill { height: 100%; background: #0e7a4f; border-radius: 3px; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; }
.st-ok { background: #e8f5ed; color: #2b7a4b; }
.st-wait { background: #f4f6f8; color: #5a6875; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
