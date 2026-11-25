<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiFixList } from '@/api'

/**
 * F-V07 需修改内容查看
 * 本村需修改内容汇总：成员类 / 地块类分列
 * 来源：成员 changeType ≠ 无变化、地块 adjustNote 非空 / isPendingVector
 */
const router = useRouter()
const rows = ref([])
const details = ref({})
const loading = ref(false)
const err = ref('')
const tab = ref('全部')

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiFixList()
    rows.value = (d && (d.list || d.records)) || []
    // 逐户取详情，收集成员类与地块类待修项
    const { apiHouseholdDetail } = await import('@/api')
    const map = {}
    for (const r of rows.value) {
      try {
        const det = await apiHouseholdDetail(r.id)
        const members = (det.members || []).filter(
          (m) => !m.deleted && m.changeType && m.changeType !== '无变化',
        )
        const lands = (det.lands || []).filter(
          (l) => !l.deleted && (l.adjustNote || l.isPendingVector),
        )
        if (members.length || lands.length) {
          map[r.id] = { members, lands, householder: det.householder, group: det.villageGroup }
        }
      } catch (e) {
        /* 单户失败不阻断 */
      }
    }
    details.value = map
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const items = computed(() => {
  const out = []
  for (const [hid, v] of Object.entries(details.value)) {
    v.members.forEach((m) => {
      out.push({
        type: '成员', householdId: Number(hid), householder: v.householder, group: v.group,
        target: m.name, detail: `${m.relation} · ${m.changeType}${m.changeNote ? '：' + m.changeNote : ''}`,
      })
    })
    v.lands.forEach((l) => {
      out.push({
        type: '地块', householdId: Number(hid), householder: v.householder, group: v.group,
        target: l.name || l.plotCode, code: l.code || l.plotCode,
        detail: [l.adjustNote, l.isPendingVector ? '待线下划矢量' : ''].filter(Boolean).join('；'),
      })
    })
  }
  return out
})

const shown = computed(() =>
  tab.value === '全部' ? items.value : items.value.filter((x) => x.type === tab.value),
)
const memberCount = computed(() => items.value.filter((x) => x.type === '成员').length)
const landCount = computed(() => items.value.filter((x) => x.type === '地块').length)

function goDetail(id) { router.push(`/households/${id}`) }
</script>

<template>
  <div class="fl">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="cards">
      <div class="card"><div class="v">{{ items.length }}</div><div class="l">需修改项合计</div></div>
      <div class="card warn"><div class="v">{{ memberCount }}</div><div class="l">成员类</div></div>
      <div class="card acc"><div class="v">{{ landCount }}</div><div class="l">地块类</div></div>
      <div class="card"><div class="v">{{ Object.keys(details).length }}</div><div class="l">涉及户数</div></div>
    </div>

    <div class="panel">
      <div class="head">
        <div class="tabs">
          <span class="tab" :class="{ on: tab === '全部' }" @click="tab = '全部'">全部</span>
          <span class="tab" :class="{ on: tab === '成员' }" @click="tab = '成员'">成员类（{{ memberCount }}）</span>
          <span class="tab" :class="{ on: tab === '地块' }" @click="tab = '地块'">地块类（{{ landCount }}）</span>
        </div>
      </div>
      <table class="tbl">
        <thead><tr><th style="width:60px">类别</th><th>户</th><th>村组</th><th>对象</th><th>需修改内容</th><th style="width:60px">操作</th></tr></thead>
        <tbody>
          <tr v-for="(x, i) in shown" :key="i">
            <td><span class="tag" :class="x.type === '成员' ? 't-m' : 't-l'">{{ x.type }}</span></td>
            <td class="strong">{{ x.householder }}</td>
            <td class="small">{{ x.group || '—' }}</td>
            <td class="small">{{ x.target }}<span v-if="x.code" class="code">{{ x.code }}</span></td>
            <td class="detail">{{ x.detail || '—' }}</td>
            <td><span class="link" @click="goDetail(x.householdId)">详情</span></td>
          </tr>
          <tr v-if="!shown.length && !loading"><td colspan="6" class="empty">暂无需要修改的内容</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading">加载中…（逐户核对，稍等）</div>
  </div>
</template>

<style scoped>
.fl { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
.card { background: #fff; border-radius: 10px; padding: 15px; border-left: 3px solid #dfe4ea; }
.card.warn { border-left-color: #c9a45c; }
.card.acc { border-left-color: #0e7a4f; }
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
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.tag { font-size: 11px; border-radius: 4px; padding: 2px 7px; }
.t-m { background: #e4f3ea; color: #0e7a4f; }
.t-l { background: #fff3e0; color: #b26a00; }
.code { font-size: 10.5px; color: #9aa6b2; font-family: monospace; margin-left: 6px; }
.detail { font-size: 12px; color: #5a6875; line-height: 1.6; max-width: 340px; }
.link { color: #0e7a4f; font-size: 12.5px; cursor: pointer; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
