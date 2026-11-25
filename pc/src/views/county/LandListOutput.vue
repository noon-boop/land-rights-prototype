<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { apiCountyExports, apiCountyReportsExport, get } from '@/api'

/**
 * F-C07 需调整地块清单输出
 * Excel 台账（地块编码、户、面积、需调整说明、四至、来源、是否待划矢量）
 * + Shapefile（带地块编码），两套同步导出
 */
const rows = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const form = reactive({ format: 'EXCEL', includeVector: false })

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await get('/county/lands', { page: 1, pageSize: 100 })
    rows.value = (d && (d.list || d.records)) || []
  } catch (e) { err.value = e.message || '加载失败'; rows.value = [] }
  finally { loading.value = false }
}
onMounted(load)

const needAdjust = computed(() =>
  rows.value.filter((r) => r.adjustNote || r.isPendingVector),
)
const pendingVector = computed(() => rows.value.filter((r) => r.isPendingVector))

async function doExport() {
  try {
    const r = await apiCountyReportsExport({
      types: ['LAND_LIST'],
      scope: 'county',
      format: form.format,
      includeVector: form.includeVector,
    })
    msg.value = `已导出${form.format}清单${r && r.fileName ? '：' + r.fileName : ''}`
  } catch (e) { err.value = e.message || '导出失败' }
}
</script>

<template>
  <div class="ll">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      输出需调整地块清单供线下实测使用。<b>Excel 台账与 Shapefile 两套同步导出</b>，
      均带地块编码，实测完成后按编码回传。
    </div>

    <div class="cards">
      <div class="card"><div class="v">{{ rows.length }}</div><div class="l">地块总数</div></div>
      <div class="card warn"><div class="v">{{ needAdjust.length }}</div><div class="l">需调整</div></div>
      <div class="card acc"><div class="v">{{ pendingVector.length }}</div><div class="l">待线下划矢量</div></div>
    </div>

    <div class="panel">
      <div class="head">
        <div class="pt">导出</div>
        <div class="acts">
          <select v-model="form.format">
            <option value="EXCEL">Excel 台账</option>
            <option value="SHP">Shapefile</option>
            <option value="BOTH">两套同步导出</option>
          </select>
          <button class="btn primary" @click="doExport">导出清单</button>
        </div>
      </div>
      <div class="tip">
        Excel 台账字段：地块编码、所属户、合同面积、实测面积、需调整说明、四至、来源、是否待划矢量。
        <br />Shapefile 带地块编码属性，坐标系 CGCS2000；无几何的地块（分割/分户新增）不进入 SHP，仅在 Excel 中标注待划矢量。
      </div>
    </div>

    <div class="panel" style="margin-top:14px">
      <div class="pt">需调整地块（前 100 条）</div>
      <table class="tbl">
        <thead>
          <tr><th>地块编码</th><th>名称</th><th>所属户</th><th class="num">合同</th>
            <th class="num">实测</th><th>需调整说明</th><th>来源</th><th>待划矢量</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="mono small">{{ r.code || r.plotCode }}</td>
            <td class="small">{{ r.name || r.plotName }}</td>
            <td class="small">{{ r.householder || '—' }}</td>
            <td class="num">{{ r.area ?? r.contractArea }}</td>
            <td class="num">{{ r.measuredArea ?? '—' }}</td>
            <td class="small dim2">{{ r.adjustNote || '—' }}</td>
            <td class="small"><span class="src" :class="'src-' + (r.source || '原有')">{{ r.source || '原有' }}</span></td>
            <td class="small"><span v-if="r.isPendingVector" class="pv-tag">是</span><span v-else class="dim">否</span></td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="8" class="empty">暂无地块</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.ll { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 14px; }
.card { background: #fff; border-radius: 10px; padding: 16px; border-left: 3px solid #dfe4ea; }
.card.warn { border-left-color: #c9a45c; } .card.acc { border-left-color: #0e7a4f; }
.card .v { font-size: 22px; font-weight: 700; color: #1b2733; }
.card .l { font-size: 11.5px; color: #8a97a5; margin-top: 4px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; }
.acts { display: flex; gap: 10px; align-items: center; }
.acts select { height: 34px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 11px; font-size: 13px; outline: none; }
.tip { font-size: 11.5px; color: #9aa6b2; line-height: 1.9; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.dim2 { color: #8a97a5; }
.src { font-size: 11px; border-radius: 4px; padding: 1px 6px; background: #e4f3ea; color: #0e7a4f; }
.src-新增 { background: #e8f5ed; color: #2b7a4b; }
.src-分割 { background: #fff3e0; color: #b26a00; }
.src-合户并入 { background: #ede7f6; color: #5e35b1; }
.pv-tag { font-size: 11px; background: #fff3e0; color: #b26a00; border-radius: 3px; padding: 1px 6px; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
