<script setup>
import { ref, reactive, onMounted } from 'vue'
import { apiCountyArchives, apiCountyArchiveCreate } from '@/api'

/**
 * F-C12 归档（按乡镇上报包 XZ- 归档，GD-）
 * 归档后只读
 */
const list = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const dialog = ref(false)
const form = reactive({ archiveName: '', packageId: '' })

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiCountyArchives({ page: 1, pageSize: 30 })
    list.value = (d && (d.list || d.records)) || []
  } catch (e) { err.value = e.message || '加载失败' }
  finally { loading.value = false }
}
onMounted(load)

function open() { form.archiveName = ''; form.packageId = ''; dialog.value = true }

async function submit() {
  if (!form.archiveName.trim()) { err.value = '请填写归档名称'; return }
  try {
    await apiCountyArchiveCreate({
      archiveName: form.archiveName.trim(),
      packageId: form.packageId ? Number(form.packageId) : null,
    })
    dialog.value = false
    err.value = ''
    msg.value = '归档已完成（GD-）；归档后数据只读'
    await load()
  } catch (e) { err.value = e.message || '归档失败' }
}
</script>

<template>
  <div class="am">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      按乡镇上报包（XZ-）归档成果（GD-）。<b>归档后该包数据只读</b>，不可再修改；归档记录含户数、面积、乡镇范围与操作人。
    </div>

    <div class="panel">
      <div class="head">
        <div class="pt">归档记录</div>
        <button class="btn primary" @click="open">发起归档</button>
      </div>
      <table class="tbl">
        <thead><tr><th>归档编号</th><th>归档名称</th><th class="num">面积</th><th class="num">户数</th>
          <th class="num">地块</th><th>乡镇范围</th><th>操作人</th><th>归档时间</th></tr></thead>
        <tbody>
          <tr v-for="r in list" :key="r.archiveId || r.id">
            <td class="mono small">{{ r.archiveNo }}</td>
            <td class="strong">{{ r.archiveName }}</td>
            <td class="num">{{ r.totalArea ?? '—' }}</td>
            <td class="num">{{ r.householdCount ?? '—' }}</td>
            <td class="num">{{ r.parcelCount ?? '—' }}</td>
            <td class="small">{{ r.townNames || '—' }}</td>
            <td class="small">{{ r.operator || '—' }}</td>
            <td class="small dim">{{ r.archivedAt || '—' }}</td>
          </tr>
          <tr v-if="!list.length && !loading"><td colspan="8" class="empty">暂无归档记录</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="dialog = false">
      <div class="dlg">
        <div class="dlg-t">发起归档</div>
        <div class="fld"><label>归档名称 *</label><input v-model="form.archiveName" placeholder="如：2026年永宁县农村土地承包延包成果归档" /></div>
        <div class="fld"><label>关联上报包 ID（选填）</label><input v-model="form.packageId" placeholder="按包归档时填写" /></div>
        <div class="warn">归档后数据只读，不可撤回。请确认成果已通过县级审批（G）。</div>
        <div class="dlg-actions">
          <button class="btn" @click="dialog = false">取消</button>
          <button class="btn primary" @click="submit">确认归档</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.am { padding: 18px 20px; }
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
.strong { font-weight: 500; color: #1b2733; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 460px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.fld { margin-bottom: 13px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld input { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; }
.warn { background: #fdeceb; color: #c9302c; font-size: 12px; border-radius: 7px; padding: 10px 12px; line-height: 1.7; margin-bottom: 14px; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
