<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { apiHouseholdList, apiMergeHousehold, apiMergeRecords, apiLockState } from '@/api'

/**
 * F-V04 合户（仅村级发起）
 * 并入户户主账号随即停用；修改完成即生效；提交为独立路径，提交后不可改
 * 受两级锁约束
 */
const rows = ref([])
const records = ref([])
const lock = ref(null)
const loading = ref(false)
const err = ref('')
const msg = ref('')
const dialog = ref(false)
const form = reactive({ primaryId: null, mergedIds: [], reason: '' })

const locked = computed(() => {
  const l = lock.value
  return !!(l && (l.villageLocked || l.townLocked))
})

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiHouseholdList({ status: 'all', page: 1, pageSize: 200 })
    rows.value = (d && (d.list || d.records)) || []
    try { records.value = (await apiMergeRecords()) || [] } catch (e) { records.value = [] }
    try { lock.value = await apiLockState() } catch (e) { lock.value = null }
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

function open() {
  if (locked.value) { err.value = '当前已锁定，不可发起合户'; return }
  form.primaryId = null
  form.mergedIds = []
  form.reason = ''
  dialog.value = true
}
function close() { dialog.value = false }

function toggleMerged(r) {
  if (form.primaryId === r.id) return
  const i = form.mergedIds.indexOf(r.id)
  if (i > -1) form.mergedIds.splice(i, 1)
  else form.mergedIds.push(r.id)
}
function pickPrimary(r) {
  form.primaryId = r.id
  const i = form.mergedIds.indexOf(r.id)
  if (i > -1) form.mergedIds.splice(i, 1)
}

const primaryRow = computed(() => rows.value.find((r) => r.id === form.primaryId) || null)
const mergedRows = computed(() => rows.value.filter((r) => form.mergedIds.includes(r.id)))

async function submit() {
  if (!form.primaryId) { err.value = '请指定并入户'; return }
  if (!form.mergedIds.length) { err.value = '请至少勾选一个被并入户'; return }
  if (!form.reason.trim()) { err.value = '请填写合户原因'; return }
  try {
    await apiMergeHousehold(form.primaryId, {
      mergedHouseholdIds: form.mergedIds, reason: form.reason.trim(),
    })
    dialog.value = false
    err.value = ''
    msg.value = `合户已生效：${mergedRows.value.map((x) => x.householder).join('、')} 并入「${primaryRow.value.householder}」`
    await load()
  } catch (e) {
    err.value = e.message || '合户失败'
  }
}
</script>

<template>
  <div class="mg">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      合户仅由村级发起。并入户的户主账号随即停用且不再恢复；修改完成即生效，<b>提交为独立动作</b>，
      提交后不再可直接修改（无编辑、无撤销入口），纠正须随整村上报单退回一并处理。
    </div>
    <div v-if="locked" class="lock-banner">当前已锁定（本村整村单或乡镇上报包已提交），不可发起合户。</div>

    <div class="panel">
      <div class="head">
        <div class="pt">合户操作</div>
        <button class="btn primary" :disabled="locked" @click="open">发起合户</button>
      </div>
      <table class="tbl">
        <thead><tr><th>操作编号</th><th>并入户</th><th>被并入户</th><th>原因</th><th>状态</th><th>操作时间</th></tr></thead>
        <tbody>
          <tr v-for="r in records" :key="r.id">
            <td class="mono small">{{ r.mergeNo || r.id }}</td>
            <td class="strong">{{ r.primaryHouseholder || r.primaryName || '—' }}</td>
            <td class="small">{{ r.mergedNames || r.mergedHouseholders || '—' }}</td>
            <td class="small dim2">{{ r.reason || '—' }}</td>
            <td><span class="st" :class="r.status === '已合户' ? 'st-ok' : 'st-wait'">{{ r.status || '—' }}</span></td>
            <td class="small dim">{{ r.createdAt || r.operatedAt || '—' }}</td>
          </tr>
          <tr v-if="!records.length && !loading"><td colspan="6" class="empty">暂无合户记录</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="close">
      <div class="dlg">
        <div class="dlg-t">发起合户</div>
        <div class="hint-row">① 先点「设为并入户」，再勾选被并入户</div>
        <div class="pick-list">
          <div v-for="r in rows" :key="r.id" class="pick-item"
            :class="{ primary: form.primaryId === r.id, merged: form.mergedIds.includes(r.id) }">
            <span class="pick-name">{{ r.householder }}</span>
            <span class="pick-sub">{{ r.villageGroup }} · {{ r.plotCount }}块 / {{ r.contractArea }}亩</span>
            <span class="pick-act" @click="pickPrimary(r)">{{ form.primaryId === r.id ? '并入户' : '设为并入户' }}</span>
            <span class="pick-ck" @click="toggleMerged(r)">{{ form.mergedIds.includes(r.id) ? '✓ 被并' : '勾选' }}</span>
          </div>
          <div v-if="!rows.length" class="empty">无可用户</div>
        </div>
        <div class="sum" v-if="primaryRow && mergedRows.length">
          合户后：<b>{{ mergedRows.map((x) => x.householder).join('、') }}</b> 并入 <b>{{ primaryRow.householder }}</b>，
          地块与成员迁入并入户，被并入户户主账号停用。
        </div>
        <div class="fld"><label>合户原因 *</label><textarea v-model="form.reason" rows="3" placeholder="如：家庭成员合并共同生活、原分户误操作需合并等"></textarea></div>
        <div class="dlg-actions">
          <button class="btn" @click="close">取消</button>
          <button class="btn primary" @click="submit">确认合户（立即生效）</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.mg { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.lock-banner { background: #fff3e0; color: #b26a00; font-size: 12.5px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; border-left: 3px solid #c9a45c; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.dim2 { color: #8a97a5; }
.strong { font-weight: 500; color: #1b2733; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; }
.st-ok { background: #e8f5ed; color: #2b7a4b; }
.st-wait { background: #fff3e0; color: #b26a00; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 520px; background: #fff; border-radius: 12px; padding: 22px; max-height: 88vh; overflow-y: auto; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.hint-row { font-size: 12px; color: #0e7a4f; background: #e4f3ea; border-radius: 6px; padding: 8px 11px; margin-bottom: 12px; }
.pick-list { max-height: 240px; overflow-y: auto; border: 1px solid #eef1f4; border-radius: 8px; margin-bottom: 12px; }
.pick-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-bottom: 1px solid #f4f6f8; font-size: 13px; }
.pick-item:last-child { border-bottom: none; }
.pick-item.primary { background: #e4f3ea; }
.pick-item.merged { background: #fff3e0; }
.pick-name { font-weight: 500; color: #1b2733; width: 74px; flex-shrink: 0; }
.pick-sub { flex: 1; font-size: 11.5px; color: #8a97a5; }
.pick-act, .pick-ck { font-size: 11.5px; cursor: pointer; padding: 3px 8px; border-radius: 5px; flex-shrink: 0; }
.pick-act { color: #0e7a4f; background: #e4f3ea; }
.pick-ck { color: #b26a00; background: #fff3e0; }
.sum { font-size: 12.5px; color: #3d4b5a; background: #f7f9fa; border-radius: 7px; padding: 10px 12px; line-height: 1.8; margin-bottom: 12px; }
.fld { margin-bottom: 14px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.btn:disabled { opacity: .55; cursor: not-allowed; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
