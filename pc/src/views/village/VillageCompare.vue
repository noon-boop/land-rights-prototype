<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiVillageCompareDetail } from '@/api'

/**
 * F-V11 村变化对比（本村，只读）
 * 户数：基线 / 当前有效 / 新增 / 分户 / 合户 / 销户
 * 面积：合同 / 实测 / 矢量
 * 口径与镇级 F-T04 同一套，范围限本村
 */
const data = ref(null)
const loading = ref(false)
const err = ref('')

async function load() {
  loading.value = true
  err.value = ''
  try {
    data.value = await apiVillageCompareDetail()
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

/** 兼容后端返回：户数在 households 嵌套对象内，面积在 area 内 */
const hhRows = computed(() => {
  const d = data.value || {}
  const h = d.households || {}
  const base = h.baseline ?? d.baselineHouseholds ?? d.baseline_hh
  const cur = h.currentEffective ?? h.total ?? d.currentHouseholds ?? d.current_hh
  const delta = base != null && cur != null ? Number(cur) - Number(base) : (d.householdDelta ?? null)
  return [
    { label: '户数', base, cur, delta, note: '基线 → 当前有效' },
    { label: '新增户', base: '—', cur: h.added ?? d.addedHouseholds ?? 0, delta: null, note: '基线后新建' },
    { label: '分户', base: 0, cur: h.split ?? d.splitCount ?? 0, delta: null, note: '分户产生的新户' },
    { label: '合户', base: 0, cur: h.merged ?? d.mergeCount ?? 0, delta: null, note: '被并入的户数' },
    { label: '销户', base: 0, cur: h.cancelled ?? d.cancelCount ?? 0, delta: null, note: '整户消亡等' },
  ]
})

const areaRows = computed(() => {
  const d = data.value || {}
  const a = d.area || {}
  return [
    { label: '合同面积', base: a.baselineContract ?? a.baseline ?? d.baselineArea, cur: a.currentContract ?? a.contract ?? d.currentArea ?? d.contractArea },
    { label: '实测面积', base: null, cur: a.measured ?? d.measuredArea },
    { label: '矢量面积', base: null, cur: a.vector ?? a.geom ?? d.vectorArea ?? d.geomArea },
  ]
})

const raw = computed(() => (data.value ? JSON.stringify(data.value, null, 2) : ''))
</script>

<template>
  <div class="vc">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="intro">
      本村户数与面积变化对比（只读，口径与镇级村变化对比一致）。矢量面积依赖线下实测回传，未回传时为空。
    </div>

    <div class="panel">
      <div class="pt">户数对比</div>
      <table class="tbl">
        <thead><tr><th>项目</th><th class="num">基线</th><th class="num">当前</th><th class="num">变化</th><th>说明</th></tr></thead>
        <tbody>
          <tr v-for="r in hhRows" :key="r.label">
            <td class="strong">{{ r.label }}</td>
            <td class="num">{{ r.base ?? '—' }}</td>
            <td class="num">{{ r.cur ?? '—' }}</td>
            <td class="num">
              <span v-if="r.delta !== null && r.delta !== undefined"
                :class="Number(r.delta) > 0 ? 'up' : (Number(r.delta) < 0 ? 'down' : '')">
                {{ Number(r.delta) > 0 ? '+' : '' }}{{ r.delta }}
              </span>
              <span v-else class="dim">—</span>
            </td>
            <td class="small dim2">{{ r.note }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel" style="margin-top:14px">
      <div class="pt">面积对比（亩）</div>
      <table class="tbl">
        <thead><tr><th>项目</th><th class="num">基线</th><th class="num">当前</th></tr></thead>
        <tbody>
          <tr v-for="r in areaRows" :key="r.label">
            <td class="strong">{{ r.label }}</td>
            <td class="num">{{ r.base ?? '—' }}</td>
            <td class="num">{{ r.cur ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div class="tip">实测面积为线下实测回传值；矢量面积为 GIS 成果面积，未回传时为空。</div>
    </div>

    <div class="panel" v-if="raw" style="margin-top:14px">
      <div class="pt">原始数据</div>
      <pre class="raw">{{ raw }}</pre>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.vc { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.strong { font-weight: 500; color: #1b2733; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.dim2 { color: #8a97a5; }
.up { color: #2b7a4b; font-weight: 600; }
.down { color: #c9302c; font-weight: 600; }
.tip { font-size: 11.5px; color: #9aa6b2; margin-top: 12px; line-height: 1.7; }
.raw { font-size: 11.5px; color: #3d4b5a; background: #f7f9fa; border-radius: 8px; padding: 12px; overflow: auto; max-height: 320px; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
