<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { apiVillageDashboard, apiTownStats, apiCountyStats, apiVillageLockState } from '@/api'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(false)
const stats = ref(null)
const lock = ref(null)
const err = ref('')

/** 按角色取对应口径的统计 */
async function load() {
  loading.value = true
  err.value = ''
  try {
    const t = auth.userType
    if (t === 'VILLAGE') stats.value = await apiVillageDashboard()
    else if (t === 'TOWN') stats.value = await apiTownStats()
    else if (t === 'COUNTY') stats.value = await apiCountyStats()
    else stats.value = null
    if (t === 'VILLAGE') {
      try { lock.value = await apiVillageLockState() } catch (e) { lock.value = null }
    }
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const num = (v) => (v === undefined || v === null ? '—' : v)

/** 兼容三种后端返回结构的卡片取值 */
const cards = computed(() => {
  const s = stats.value || {}
  const pick = (...keys) => {
    for (const k of keys) {
      if (s[k] !== undefined && s[k] !== null) return s[k]
      if (s.summary && s.summary[k] !== undefined) return s.summary[k]
      if (s.stats && s.stats[k] !== undefined) return s.stats[k]
    }
    return null
  }
  // 村级：approved/pending/…；镇级与县级：approvedHouseholds/pendingHouseholds/…
  return [
    { label: '总户数', value: pick('total', 'totalHouseholds'), key: 'total' },
    { label: '已通过', value: pick('approved', 'approvedHouseholds'), tone: 'ok' },
    { label: '待审核', value: pick('pending', 'pendingHouseholds'), tone: 'warn' },
    { label: '未通过', value: pick('rejected', 'rejectedHouseholds'), tone: 'bad' },
    { label: '未提交', value: pick('unsubmitted', 'unsubmittedHouseholds'), tone: 'muted' },
  ]
})

const progress = computed(() => {
  const s = stats.value || {}
  const total = Number((s.summary && s.summary.total) || s.total || 0)
  const done = Number((s.summary && s.summary.approved) || s.approved || 0)
  if (!total) return 0
  return Math.round((done / total) * 100)
})

const lockText = computed(() => {
  const l = lock.value
  if (!l) return null
  return {
    village: l.villageSubmissionStatus || l.villageStatus || '—',
    town: l.townPackageStatus || l.packageStatus || '—',
    villageLocked: !!(l.villageLocked),
    townLocked: !!(l.townLocked),
  }
})
</script>

<template>
  <div class="dash">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="hero">
      <div>
        <div class="hero-title">{{ auth.orgLabel }} · {{ auth.roleName }}</div>
        <div class="hero-sub">{{ auth.user && auth.user.realName }}，欢迎回来</div>
      </div>
      <div class="hero-progress">
        <div class="hp-num">{{ progress }}<span>%</span></div>
        <div class="hp-lab">审核完成率</div>
      </div>
    </div>

    <div class="cards">
      <div v-for="c in cards" :key="c.label" class="card" :class="c.tone">
        <div class="c-val">{{ num(c.value) }}</div>
        <div class="c-lab">{{ c.label }}</div>
      </div>
    </div>

    <!-- 两级锁状态（v2.8） -->
    <div v-if="lockText" class="panel">
      <div class="panel-title">两级锁状态</div>
      <div class="lock-row">
        <div class="lock-item" :class="{ on: lockText.villageLocked }">
          <span class="li-dot"></span>
          <span class="li-name">本村整村单</span>
          <span class="li-val">{{ lockText.village }}</span>
          <span class="li-flag">{{ lockText.villageLocked ? '已锁本村' : '未锁' }}</span>
        </div>
        <div class="lock-item" :class="{ on: lockText.townLocked }">
          <span class="li-dot"></span>
          <span class="li-name">乡镇上报包</span>
          <span class="li-val">{{ lockText.town }}</span>
          <span class="li-flag">{{ lockText.townLocked ? '已锁全乡镇' : '未锁' }}</span>
        </div>
      </div>
      <div class="panel-tip">整村单提交（B 及之后）锁本村；上报包提交（F 及之后）锁全乡镇。逐级退回后解锁。</div>
    </div>

    <div class="panel">
      <div class="panel-title">常用入口</div>
      <div class="quick">
        <div class="q-item" @click="router.push('/households')">
          <div class="q-t">户信息列表</div>
          <div class="q-d">搜索、状态筛选、进入审核</div>
        </div>
        <div class="q-item" @click="router.push('/lands')">
          <div class="q-t">地块信息总览</div>
          <div class="q-d">地块清单、四至、来源、待划矢量</div>
        </div>
        <div class="q-item" @click="router.push('/stats')">
          <div class="q-t">审核统计</div>
          <div class="q-d">官方 11 类口径 + 分类明细</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dash { padding: 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; }
.hero { background: linear-gradient(135deg, #0e7a4f, #0c6441); border-radius: 12px; padding: 22px 24px; color: #fff; display: flex; align-items: center; justify-content: space-between; }
.hero-title { font-size: 18px; font-weight: 600; }
.hero-sub { font-size: 12.5px; color: rgba(255,255,255,.78); margin-top: 6px; }
.hero-progress { text-align: right; }
.hp-num { font-size: 30px; font-weight: 700; line-height: 1; }
.hp-num span { font-size: 15px; }
.hp-lab { font-size: 11.5px; color: rgba(255,255,255,.72); margin-top: 5px; }
.cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 14px; }
.card { background: #fff; border-radius: 10px; padding: 16px; border-left: 3px solid #dfe4ea; }
.card.ok { border-left-color: #2b7a4b; }
.card.warn { border-left-color: #c9a45c; }
.card.bad { border-left-color: #c9302c; }
.card.muted { border-left-color: #9aa6b2; }
.c-val { font-size: 24px; font-weight: 700; color: #1b2733; }
.c-lab { font-size: 12px; color: #8a97a5; margin-top: 4px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; margin-top: 14px; }
.panel-title { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.panel-tip { font-size: 11.5px; color: #9aa6b2; margin-top: 12px; line-height: 1.7; }
.lock-row { display: flex; gap: 12px; flex-wrap: wrap; }
.lock-item { flex: 1; min-width: 240px; display: flex; align-items: center; gap: 9px; background: #f7f9fa; border-radius: 8px; padding: 12px 14px; font-size: 13px; }
.lock-item.on { background: #fff3e0; }
.li-dot { width: 8px; height: 8px; border-radius: 50%; background: #9aa6b2; flex-shrink: 0; }
.lock-item.on .li-dot { background: #c9a45c; }
.li-name { color: #5a6875; }
.li-val { font-weight: 700; color: #0e7a4f; font-family: monospace; }
.li-flag { margin-left: auto; font-size: 11.5px; color: #8a97a5; }
.lock-item.on .li-flag { color: #b26a00; }
.quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.q-item { background: #f7f9fa; border-radius: 8px; padding: 14px 16px; cursor: pointer; transition: background .15s; }
.q-item:hover { background: #e4f3ea; }
.q-t { font-size: 13.5px; font-weight: 500; color: #0e7a4f; }
.q-d { font-size: 11.5px; color: #8a97a5; margin-top: 4px; }
</style>
