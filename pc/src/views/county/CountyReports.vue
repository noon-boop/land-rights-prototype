<script setup>
import { ref, reactive, onMounted } from 'vue'
import { apiCountyReportsExport, apiCountyExports } from '@/api'

/**
 * F-C11 报表与导出（官方口径统计 + 需修改内容，DC- / DB-）
 */
const list = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const form = reactive({ types: ['DC'], scope: 'county', format: 'EXCEL' })

const TYPES = [
  { k: 'DC', label: '官方口径统计报表（DC-）' },
  { k: 'DB', label: '需修改内容报表（DB-）' },
]

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiCountyExports({ page: 1, pageSize: 30 })
    list.value = (d && (d.list || d.records)) || []
  } catch (e) { list.value = [] }
  finally { loading.value = false }
}
onMounted(load)

async function doExport() {
  if (!form.types.length) { err.value = '请至少选择一种报表'; return }
  try {
    const r = await apiCountyReportsExport({ types: form.types, scope: form.scope, format: form.format })
    msg.value = `已导出${r && r.fileName ? '：' + r.fileName : ''}`
    await load()
  } catch (e) { err.value = e.message || '导出失败' }
}
</script>

<template>
  <div class="cr">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="panel">
      <div class="pt">报表导出</div>
      <div class="types">
        <label v-for="t in TYPES" :key="t.k" class="ty">
          <input type="checkbox" :value="t.k" v-model="form.types" /> {{ t.label }}
        </label>
      </div>
      <div class="row">
        <div class="fld"><label>范围</label>
          <select v-model="form.scope">
            <option value="county">全县</option>
            <option value="town">按乡镇</option>
          </select>
        </div>
        <div class="fld"><label>格式</label>
          <select v-model="form.format"><option>EXCEL</option><option>SHP</option></select>
        </div>
        <button class="btn primary" @click="doExport">导出</button>
      </div>
    </div>

    <div class="panel" style="margin-top:14px">
      <div class="pt">导出记录</div>
      <table class="tbl">
        <thead><tr><th>编号</th><th>类型</th><th>范围</th><th>格式</th><th class="num">行数</th><th>状态</th><th>导出时间</th></tr></thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td class="mono small">{{ r.exportNo || r.id }}</td>
            <td class="small">{{ r.exportType || r.type || '—' }}</td>
            <td class="small">{{ r.scopeType || r.scope || '—' }}</td>
            <td class="small">{{ r.fileType || r.format || '—' }}</td>
            <td class="num">{{ r.rowCount ?? '—' }}</td>
            <td><span class="st">{{ r.status || '—' }}</span></td>
            <td class="small dim">{{ r.createdAt || '—' }}</td>
          </tr>
          <tr v-if="!list.length && !loading"><td colspan="7" class="empty">暂无导出记录</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.cr { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 14px; }
.types { display: flex; flex-direction: column; gap: 9px; margin-bottom: 16px; }
.ty { font-size: 13px; color: #3d4b5a; display: flex; align-items: center; gap: 7px; cursor: pointer; }
.row { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld select { height: 34px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 11px; font-size: 13px; outline: none; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #e8f5ed; color: #2b7a4b; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
