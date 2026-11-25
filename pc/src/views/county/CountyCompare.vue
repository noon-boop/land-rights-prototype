<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiCountyStats } from '@/api'

/**
 * F-C14 村变化对比（全县）
 * 按乡镇 → 村对比户数与面积，支持下钻单村，可导出
 */
const stats = ref(null)
const loading = ref(false)
const err = ref('')
const expand = ref({})

async function load() {
  loading.value = true
  err.value = ''
  try { stats.value = await apiCountyStats() } catch (e) { err.value = e.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(load)

const towns = computed(() => {
  const s = stats.value || {}
  return (s.byTown || s.towns || []).map((t) => ({
    name: t.townName || t.name,
    villages: t.villages || [],
    hh: t.totalHouseholds ?? '—',
    approved: t.approvedHouseholds ?? '—',
    area: t.totalArea ?? '—',
    progress: t.progress ?? 0,
  }))
})

function toggle(name) { expand.value[name] = !expand.value[name] }
</script>

<template>
  <div class="cc">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="intro">
      全县按乡镇 → 村对比户数与面积（与镇级 F-T04、村级 F-V11 同一套口径）。点击乡镇行可展开所辖村。
    </div>

    <div class="panel">
      <div class="pt">乡镇维度</div>
      <table class="tbl">
        <thead>
          <tr><th style="width:30px"></th><th>乡镇</th><th class="num">户数</th>
            <th class="num">已通过</th><th class="num">面积</th><th class="num">完成率</th><th>所辖村</th></tr>
        </thead>
        <tbody>
          <template v-for="t in towns" :key="t.name">
            <tr class="trow" @click="toggle(t.name)">
              <td class="exp">{{ expand[t.name] ? '▾' : '▸' }}</td>
              <td class="strong">{{ t.name }}</td>
              <td class="num">{{ t.hh }}</td>
              <td class="num">{{ t.approved }}</td>
              <td class="num">{{ t.area }}</td>
              <td class="num">{{ t.progress }}%</td>
              <td class="small dim">{{ (t.villages || []).length }} 个</td>
            </tr>
            <tr v-if="expand[t.name]" class="vrow">
              <td></td>
              <td colspan="6">
                <div class="vlist">
                  <div v-for="v in (t.villages || [])" :key="v.villageName || v.name" class="vitem">
                    <span class="vn">{{ v.villageName || v.name }}</span>
                    <span class="vs">{{ v.totalHouseholds ?? '—' }} 户 · {{ v.totalArea ?? '—' }} 亩 · {{ v.progress ?? 0 }}%</span>
                  </div>
                  <div v-if="!(t.villages || []).length" class="dim small">该乡镇村明细接口未返回</div>
                </div>
              </td>
            </tr>
          </template>
          <tr v-if="!towns.length && !loading"><td colspan="7" class="empty">暂无数据</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.cc { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.trow { cursor: pointer; }
.trow:hover { background: #f4faf6; }
.exp { color: #0e7a4f; font-size: 11px; }
.num { text-align: right; }
.strong { font-weight: 500; color: #1b2733; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.vrow td { background: #fbfcfd; }
.vlist { display: flex; flex-wrap: wrap; gap: 8px; }
.vitem { background: #fff; border: 1px solid #eef1f4; border-radius: 7px; padding: 8px 12px; display: flex; flex-direction: column; gap: 3px; }
.vn { font-size: 12.5px; color: #1b2733; font-weight: 500; }
.vs { font-size: 11px; color: #8a97a5; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
