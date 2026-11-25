<script setup>
import { ref, onMounted, computed } from 'vue'
import { get } from '@/api'

/**
 * F-T06 需修改内容汇总（辖区）
 * 成员类 / 地块类分别统计，按村汇总
 */
const list = ref([])
const loading = ref(false)
const err = ref('')
const tab = ref('全部')

async function load() {
  loading.value = true
  err.value = ''
  try {
    // 辖区村列表 → 逐村取需修改内容（成员 changeType 非「无变化」+ 地块 adjustNote）
    const vs = await get('/township/villages')
    const villages = (vs && (vs.list || vs.records)) || (Array.isArray(vs) ? vs : [])
    const out = []
    for (const v of villages) {
      const vid = v.villageId || v.id
      try {
        const hd = await get('/township/households', { villageId: vid, page: 1, pageSize: 500 })
        const rows = (hd && (hd.list || hd.records)) || []
        let mCnt = 0, lCnt = 0
        const details = []
        for (const h of rows) {
          const d = await get(`/township/households/${h.id}`)
          const ms = (d.members || []).filter((m) => !m.deleted && m.changeType && m.changeType !== '无变化')
          const ls = (d.lands || []).filter((l) => !l.deleted && (l.adjustNote || l.isPendingVector))
          mCnt += ms.length
          lCnt += ls.length
          if (ms.length || ls.length) {
            details.push({ householder: d.householder, memberIssues: ms.length, landIssues: ls.length })
          }
        }
        out.push({ village: v.villageName || v.name, memberCount: mCnt, landCount: lCnt, households: details })
      } catch (e) {
        out.push({ village: v.villageName || v.name, memberCount: 0, landCount: 0, households: [], error: e.message })
      }
    }
    list.value = out
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const totalMember = computed(() => list.value.reduce((a, x) => a + x.memberCount, 0))
const totalLand = computed(() => list.value.reduce((a, x) => a + x.landCount, 0))

const shown = computed(() => {
  if (tab.value === '成员') return list.value.filter((x) => x.memberCount > 0)
  if (tab.value === '地块') return list.value.filter((x) => x.landCount > 0)
  return list.value
})
</script>

<template>
  <div class="tf">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="cards">
      <div class="card"><div class="v">{{ totalMember + totalLand }}</div><div class="l">需修改项合计</div></div>
      <div class="card m"><div class="v">{{ totalMember }}</div><div class="l">成员类</div></div>
      <div class="card l"><div class="v">{{ totalLand }}</div><div class="l">地块类</div></div>
      <div class="card"><div class="v">{{ list.length }}</div><div class="l">辖区村数</div></div>
    </div>

    <div class="panel">
      <div class="head">
        <div class="tabs">
          <span class="tab" :class="{ on: tab === '全部' }" @click="tab = '全部'">全部</span>
          <span class="tab" :class="{ on: tab === '成员' }" @click="tab = '成员'">成员类</span>
          <span class="tab" :class="{ on: tab === '地块' }" @click="tab = '地块'">地块类</span>
        </div>
      </div>
      <table class="tbl">
        <thead><tr><th>村</th><th class="num">需修改户数</th><th class="num">成员类</th><th class="num">地块类</th><th>备注</th></tr></thead>
        <tbody>
          <tr v-for="r in shown" :key="r.village">
            <td class="strong">{{ r.village }}</td>
            <td class="num">{{ r.households.length }}</td>
            <td class="num">{{ r.memberCount }}</td>
            <td class="num">{{ r.landCount }}</td>
            <td class="small dim">{{ r.error ? '加载异常：' + r.error : '—' }}</td>
          </tr>
          <tr v-if="!shown.length && !loading"><td colspan="5" class="empty">辖区暂无需修改内容</td></tr>
        </tbody>
      </table>
      <div class="tip">统计口径：成员 changeType 非「无变化」、地块 adjustNote 非空或标记待线下划矢量。</div>
    </div>

    <div v-if="loading" class="loading">加载中…（逐村核对，稍等）</div>
  </div>
</template>

<style scoped>
.tf { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
.card { background: #fff; border-radius: 10px; padding: 16px; border-left: 3px solid #dfe4ea; }
.card.m { border-left-color: #0e7a4f; }
.card.l { border-left-color: #c9a45c; }
.card .v { font-size: 22px; font-weight: 700; color: #1b2733; }
.card .l { font-size: 11.5px; color: #8a97a5; margin-top: 4px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { margin-bottom: 14px; }
.tabs { display: flex; gap: 6px; }
.tab { font-size: 13px; padding: 6px 14px; border-radius: 16px; background: #f4f6f8; color: #5a6875; cursor: pointer; }
.tab.on { background: #0e7a4f; color: #fff; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.strong { font-weight: 500; color: #1b2733; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.tip { font-size: 11.5px; color: #9aa6b2; margin-top: 12px; line-height: 1.7; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
