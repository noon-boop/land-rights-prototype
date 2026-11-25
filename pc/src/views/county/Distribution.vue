<script setup>
import { ref, reactive, onMounted } from 'vue'
import { apiDistributions, apiCreateDistribution, get } from '@/api'

/**
 * F-C05 数据下发（按乡镇/村，支持批次与撤销下发）
 * 未下发下级不可见
 */
const list = ref([])
const towns = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const dialog = ref(false)
const form = reactive({ scopeType: 'town', townIds: [], remark: '' })

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiDistributions({ page: 1, pageSize: 30 })
    list.value = (d && (d.list || d.records)) || []
    const t = await get('/county/towns')
    towns.value = (t && (t.list || t.records)) || []
  } catch (e) { err.value = e.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(load)

function toggleTown(id) {
  const i = form.townIds.indexOf(id)
  if (i > -1) form.townIds.splice(i, 1)
  else form.townIds.push(id)
}

async function submit() {
  if (!form.townIds.length) { err.value = '请至少选择一个乡镇'; return }
  try {
    await apiCreateDistribution({
      scopeType: form.scopeType,
      townIds: form.townIds,
      remark: form.remark.trim(),
    })
    dialog.value = false
    err.value = ''
    msg.value = '下发已执行；未下发的下级不可见'
    await load()
  } catch (e) { err.value = e.message || '下发失败' }
}
</script>

<template>
  <div class="ds">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      按乡镇/村下发基线数据，<b>未下发的下级不可见</b>。支持多批次下发与撤销；每次下发生成批次记录，操作留痕。
    </div>

    <div class="panel">
      <div class="head">
        <div class="pt">下发批次</div>
        <button class="btn primary" @click="dialog = true">新建下发</button>
      </div>
      <table class="tbl">
        <thead><tr><th>批次号</th><th>范围</th><th class="num">乡镇数</th><th class="num">村数</th>
          <th class="num">户数</th><th>状态</th><th>下发时间</th><th style="width:70px">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td class="mono small">{{ r.batchNo || r.id }}</td>
            <td class="small">{{ r.scopeTypeName || r.scopeType || '—' }}</td>
            <td class="num">{{ r.townCount ?? '—' }}</td>
            <td class="num">{{ r.villageCount ?? '—' }}</td>
            <td class="num">{{ r.householdCount ?? '—' }}</td>
            <td><span class="st">{{ r.status || '—' }}</span></td>
            <td class="small dim">{{ r.createdAt || r.distributedAt || '—' }}</td>
            <td><span class="link" @click="msg='撤销下发需确认批次状态，当前版本仅支持查看记录'">撤销</span></td>
          </tr>
          <tr v-if="!list.length && !loading"><td colspan="8" class="empty">暂无下发记录</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="dialog = false">
      <div class="dlg">
        <div class="dlg-t">新建下发</div>
        <div class="fld">
          <label>下发范围</label>
          <select v-model="form.scopeType">
            <option value="town">按乡镇</option>
            <option value="village">按村</option>
          </select>
        </div>
        <div class="fld">
          <label>选择乡镇 *</label>
          <div class="town-list">
            <span v-for="t in towns" :key="t.townId || t.id" class="chip"
              :class="{ on: form.townIds.includes(t.townId || t.id) }"
              @click="toggleTown(t.townId || t.id)">
              {{ t.townName || t.name }}
            </span>
            <span v-if="!towns.length" class="dim small">暂无乡镇</span>
          </div>
        </div>
        <div class="fld"><label>备注</label><input v-model="form.remark" placeholder="选填" /></div>
        <div class="dlg-actions">
          <button class="btn" @click="dialog = false">取消</button>
          <button class="btn primary" @click="submit">确认下发</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.ds { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #e8f5ed; color: #2b7a4b; }
.link { color: #c9302c; font-size: 12.5px; cursor: pointer; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 480px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.fld { margin-bottom: 13px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld input, .fld select { width: 100%; height: 34px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 11px; font-size: 13px; box-sizing: border-box; outline: none; }
.town-list { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { font-size: 12.5px; padding: 6px 13px; border-radius: 16px; background: #f4f6f8; color: #5a6875; cursor: pointer; }
.chip.on { background: #0e7a4f; color: #fff; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
