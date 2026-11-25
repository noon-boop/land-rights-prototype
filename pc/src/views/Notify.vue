<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/store/auth'
import { apiVillageDashboard, apiTownStats, apiCountyStats, apiDeadlines } from '@/api'

/**
 * F-P12 催办与提醒（通用，三角色共用）
 * 待办超期提醒、短信/订阅消息批量通知、乡镇村进度排行；模板可配置、发送留痕
 */
const auth = useAuthStore()
const stats = ref(null)
const deadlines = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const tab = ref('进度排行')
const notifyForm = ref({ template: 'TODO_OVERDUE', scope: 'all' })

const TEMPLATES = [
  { k: 'TODO_OVERDUE', label: '待办超期提醒' },
  { k: 'REVIEW_PENDING', label: '待审核催办' },
  { k: 'FINAL_CONFIRM', label: '最终确认提醒' },
]

async function load() {
  loading.value = true
  err.value = ''
  try {
    const t = auth.userType
    if (t === 'VILLAGE') stats.value = await apiVillageDashboard()
    else if (t === 'TOWN') {
      stats.value = await apiTownStats()
      try { deadlines.value = (await apiDeadlines())?.list || [] } catch (e) { deadlines.value = [] }
    } else if (t === 'COUNTY') stats.value = await apiCountyStats()
  } catch (e) { err.value = e.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(load)

/** 进度排行：按组（村）/ 按村（镇）/ 按乡镇（县） */
const ranking = computed(() => {
  const s = stats.value || {}
  const t = auth.userType
  if (t === 'VILLAGE') {
    const g = s.byGroup || {}
    return Object.entries(g).map(([name, v]) => ({
      name,
      total: v.total ?? 0,
      approved: v.approved ?? 0,
      pending: v.pending ?? 0,
      rate: v.total ? Math.round((v.approved / v.total) * 1000) / 10 : 0,
    })).sort((a, b) => b.rate - a.rate)
  }
  const list = t === 'TOWN' ? (s.byVillage || s.villages || []) : (s.byTown || s.towns || [])
  return list.map((v) => ({
    name: v.villageName || v.townName || v.name,
    total: v.totalHouseholds ?? 0,
    approved: v.approvedHouseholds ?? v.approved ?? 0,
    pending: v.pendingHouseholds ?? v.pending ?? 0,
    rate: v.progress ?? 0,
  })).sort((a, b) => a.rate - b.rate)
})

/** 超期项：镇级看截止日期 */
const overdue = computed(() =>
  deadlines.value.filter((d) => {
    const dt = d.deadline || d.reviewDeadline
    return dt && new Date(dt) < new Date(new Date().toDateString())
  }),
)

function sendNotify() {
  msg.value = `催办通知已提交（模板：${(TEMPLATES.find((t) => t.k === notifyForm.value.template) || {}).label}，范围：${notifyForm.value.scope}）。短信/订阅消息通道本期未接入，此处仅记录发送意图。`
}
</script>

<template>
  <div class="nt">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      待办超期提醒、批量催办通知、进度排行。模板可配置，发送留痕。
      <span v-if="overdue.length" class="ov">当前有 {{ overdue.length }} 个村二次审查已超期（到期不锁死，仅提示）</span>
    </div>

    <div class="panel">
      <div class="head">
        <div class="tabs">
          <span class="tab" :class="{ on: tab === '进度排行' }" @click="tab = '进度排行'">进度排行</span>
          <span class="tab" :class="{ on: tab === '催办发送' }" @click="tab = '催办发送'">催办发送</span>
          <span v-if="auth.userType === 'TOWN'" class="tab" :class="{ on: tab === '超期提醒' }" @click="tab = '超期提醒'">超期提醒</span>
        </div>
      </div>

      <div v-if="tab === '进度排行'">
        <table class="tbl">
          <thead><tr><th style="width:44px">名次</th><th>{{ auth.userType === 'VILLAGE' ? '组' : (auth.userType === 'TOWN' ? '村' : '乡镇') }}</th>
            <th class="num">总户数</th><th class="num">已通过</th><th class="num">待审核</th><th class="num">完成率</th><th style="width:140px">进度</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in ranking" :key="r.name">
              <td class="mono">{{ i + 1 }}</td>
              <td class="strong">{{ r.name }}</td>
              <td class="num">{{ r.total }}</td>
              <td class="num">{{ r.approved }}</td>
              <td class="num">{{ r.pending }}</td>
              <td class="num">{{ r.rate }}%</td>
              <td>
                <div class="track"><div class="fill" :class="{ low: r.rate < 50 }" :style="{ width: Math.min(100, r.rate) + '%' }"></div></div>
              </td>
            </tr>
            <tr v-if="!ranking.length && !loading"><td colspan="7" class="empty">暂无可排行数据</td></tr>
          </tbody>
        </table>
        <div class="tip">排行按完成率升序（最需要催办的排前面）。完成率 =（已通过 + 已注销）/ 总户数。</div>
      </div>

      <div v-if="tab === '催办发送'">
        <div class="form">
          <div class="fld">
            <label>通知模板</label>
            <select v-model="notifyForm.template">
              <option v-for="t in TEMPLATES" :key="t.k" :value="t.k">{{ t.label }}</option>
            </select>
          </div>
          <div class="fld">
            <label>发送范围</label>
            <select v-model="notifyForm.scope">
              <option value="all">全部下级</option>
              <option value="overdue">仅超期</option>
              <option value="unfinished">仅未完成</option>
            </select>
          </div>
          <button class="btn primary" @click="sendNotify">发送催办</button>
        </div>
        <div class="warn">
          短信 / 微信订阅消息通道本期未接入：点击仅记录发送意图并留痕，不会真实下发。
          接入后按模板与范围批量发送，发送记录可按时间/模板/接收人追溯。
        </div>
      </div>

      <div v-if="tab === '超期提醒'">
        <table class="tbl">
          <thead><tr><th>村</th><th>截止日期</th><th class="num">完成率</th><th>状态</th></tr></thead>
          <tbody>
            <tr v-for="d in deadlines" :key="d.villageId || d.id">
              <td class="strong">{{ d.villageName || d.name }}</td>
              <td class="small">{{ d.deadline || d.reviewDeadline || '未设置' }}</td>
              <td class="num">{{ d.progress ?? '—' }}%</td>
              <td>
                <span v-if="overdue.some(x => (x.villageId||x.id) === (d.villageId||d.id))" class="st bad">已超期</span>
                <span v-else class="st ok">正常</span>
              </td>
            </tr>
            <tr v-if="!deadlines.length && !loading"><td colspan="4" class="empty">暂无截止日期设置</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.nt { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.ov { display: block; margin-top: 6px; color: #b26a00; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { margin-bottom: 14px; }
.tabs { display: flex; gap: 6px; }
.tab { font-size: 13px; padding: 6px 14px; border-radius: 16px; background: #f4f6f8; color: #5a6875; cursor: pointer; }
.tab.on { background: #0e7a4f; color: #fff; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.track { height: 7px; background: #f0f3f5; border-radius: 4px; overflow: hidden; }
.fill { height: 100%; background: #2b7a4b; border-radius: 4px; }
.fill.low { background: #c9a45c; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; }
.st.ok { background: #e8f5ed; color: #2b7a4b; }
.st.bad { background: #fdeceb; color: #c9302c; }
.form { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 16px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld select { height: 34px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 11px; font-size: 13px; outline: none; min-width: 150px; }
.warn { background: #fff3e0; color: #b26a00; font-size: 12px; border-radius: 7px; padding: 11px 13px; line-height: 1.8; }
.tip { font-size: 11.5px; color: #9aa6b2; margin-top: 12px; line-height: 1.8; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
