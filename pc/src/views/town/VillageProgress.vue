<script setup>
import { ref, onMounted } from 'vue'
import { apiTownVillages } from '@/api'

/**
 * F-T01 村列表与进度
 * 辖区各村：完成率、已通过、销户、超期数；支持筛选
 */
const rows = ref([])
const loading = ref(false)
const err = ref('')
const keyword = ref('')

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiTownVillages()
    rows.value = (d && (d.list || d.records)) || (Array.isArray(d) ? d : [])
  } catch (e) {
    err.value = e.message || '加载失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)

function filtered() {
  const k = keyword.value.trim()
  if (!k) return rows.value
  return rows.value.filter((r) => String(r.name || r.villageName || '').includes(k))
}
</script>

<template>
  <div class="vp">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="panel">
      <div class="bar">
        <input v-model="keyword" placeholder="村名筛选" />
        <span class="cnt">辖区 {{ rows.length }} 个村</span>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th>村名</th><th>负责人</th><th class="num">总户数</th><th class="num">已通过</th>
            <th class="num">待审核</th><th class="num">未通过</th>
            <th class="num">完成率</th><th>上报状态</th><th>上报单号</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in filtered()" :key="r.id || r.villageId">
            <td class="strong">{{ r.name || r.villageName }}</td>
            <td class="small">{{ r.managerName || r.leaderName || '—' }}</td>
            <td class="num">{{ r.totalHouseholds ?? '—' }}</td>
            <td class="num">{{ r.villageApprovedCount ?? r.approvedHouseholds ?? '—' }}</td>
            <td class="num">{{ r.villagePendingCount ?? r.pendingHouseholds ?? '—' }}</td>
            <td class="num">{{ r.villageRejectedCount ?? '—' }}</td>
            <td class="num">
              <div class="prog">
                <div class="track"><div class="fill" :style="{ width: Math.min(100, Number(r.progress || 0)) + '%' }"></div></div>
                <span>{{ r.progress ?? 0 }}%</span>
              </div>
            </td>
            <td><span class="st" :class="r.submitted ? 'st-ok' : 'st-wait'">{{ r.submissionStatus || '未上报' }}</span></td>
            <td class="mono small">{{ r.submitNo || '—' }}</td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="9" class="empty">辖区暂无村</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.vp { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.bar input { width: 220px; height: 34px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 11px; font-size: 13px; outline: none; }
.cnt { margin-left: auto; font-size: 12.5px; color: #8a97a5; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; white-space: nowrap; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.strong { font-weight: 500; color: #1b2733; }
.small { font-size: 12px; }
.mono { font-family: monospace; }
.prog { display: flex; align-items: center; gap: 7px; justify-content: flex-end; }
.track { width: 60px; height: 6px; background: #f0f3f5; border-radius: 3px; overflow: hidden; }
.fill { height: 100%; background: #0e7a4f; border-radius: 3px; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; }
.st-ok { background: #e8f5ed; color: #2b7a4b; }
.st-wait { background: #f4f6f8; color: #5a6875; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
