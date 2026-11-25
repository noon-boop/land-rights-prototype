<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiTownStats } from '@/api'

/**
 * F-T04 村变化对比（按村，核心）
 * 户数：基线 / 当前有效 / 新增 / 分户 / 合户 / 销户
 * 面积：基线合同 / 当前合同 / 实测 / 矢量
 * 支持导出
 */
const stats = ref(null)
const loading = ref(false)
const err = ref('')

async function load() {
  loading.value = true
  err.value = ''
  try {
    stats.value = await apiTownStats()
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const rows = computed(() => {
  const s = stats.value || {}
  return (s.byVillage || s.villages || []).map((v) => ({
    name: v.villageName || v.name,
    baseHh: v.baseHouseholds ?? v.baselineHouseholds ?? '—',
    curHh: v.totalHouseholds ?? '—',
    added: v.addedHouseholds ?? 0,
    split: v.splitCount ?? 0,
    merged: v.mergeCount ?? 0,
    cancelled: v.cancelledHouseholds ?? v.cancelCount ?? 0,
    baseArea: v.baseArea ?? v.baselineArea ?? '—',
    curArea: v.totalArea ?? '—',
    measured: v.measuredArea ?? '—',
    vector: v.vectorArea ?? '—',
    progress: v.progress ?? 0,
  }))
})

function fmt(v) {
  return v === '—' || v === null || v === undefined ? '—' : v
}
</script>

<template>
  <div class="tc">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="intro">
      按村对比户数与面积（口径与村级 F-V11、县级 F-C14 同一套）。矢量面积依赖线下实测回传，未回传时为空。
    </div>

    <div class="panel">
      <div class="pt">户数对比</div>
      <table class="tbl">
        <thead>
          <tr><th>村</th><th class="num">基线户</th><th class="num">当前有效</th><th class="num">新增</th>
            <th class="num">分户</th><th class="num">合户</th><th class="num">销户</th><th class="num">完成率</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.name">
            <td class="strong">{{ r.name }}</td>
            <td class="num">{{ fmt(r.baseHh) }}</td>
            <td class="num">{{ fmt(r.curHh) }}</td>
            <td class="num">{{ fmt(r.added) }}</td>
            <td class="num">{{ fmt(r.split) }}</td>
            <td class="num">{{ fmt(r.merged) }}</td>
            <td class="num">{{ fmt(r.cancelled) }}</td>
            <td class="num">{{ r.progress }}%</td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="8" class="empty">辖区暂无数据</td></tr>
        </tbody>
      </table>
    </div>

    <div class="panel" style="margin-top:14px">
      <div class="pt">面积对比（亩）</div>
      <table class="tbl">
        <thead><tr><th>村</th><th class="num">基线合同</th><th class="num">当前合同</th><th class="num">实测</th><th class="num">矢量</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.name">
            <td class="strong">{{ r.name }}</td>
            <td class="num">{{ fmt(r.baseArea) }}</td>
            <td class="num">{{ fmt(r.curArea) }}</td>
            <td class="num">{{ fmt(r.measured) }}</td>
            <td class="num">{{ fmt(r.vector) }}</td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="5" class="empty">辖区暂无数据</td></tr>
        </tbody>
      </table>
      <div class="tip">基线数据来自 baseline_db；当前数据来自各自业务库；矢量面积为回传成果面积。</div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.tc { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.strong { font-weight: 500; color: #1b2733; }
.tip { font-size: 11.5px; color: #9aa6b2; margin-top: 12px; line-height: 1.7; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
