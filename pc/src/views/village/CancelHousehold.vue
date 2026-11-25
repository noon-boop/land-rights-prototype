<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { apiHouseholdList, apiCancelHousehold, apiDeleteRecords, apiLockState } from '@/api'

/**
 * F-V06 销户办理
 * 必填原因、纸质材料编号、日期、经办人；修改完成即生效（不经镇级核定）
 * 提交为独立路径，提交后村级不可再改；受两级锁约束
 */
const rows = ref([])
const records = ref([])
const lock = ref(null)
const loading = ref(false)
const err = ref('')
const msg = ref('')
const dialog = ref(false)
const current = ref(null)
const form = reactive({ reason: '', materialNo: '', docDate: '', operator: '' })

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
    try { records.value = (await apiDeleteRecords()) || [] } catch (e) { records.value = [] }
    try { lock.value = await apiLockState() } catch (e) { lock.value = null }
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

function open(r) {
  if (locked.value) { err.value = '当前已锁定，不可办理销户'; return }
  current.value = r
  form.reason = ''
  form.materialNo = ''
  form.docDate = new Date().toISOString().slice(0, 10)
  form.operator = ''
  dialog.value = true
}
function close() { dialog.value = false }

async function submit() {
  if (!form.reason.trim()) { err.value = '请填写销户原因'; return }
  if (!form.materialNo.trim()) { err.value = '请填写纸质材料编号'; return }
  if (!form.operator.trim()) { err.value = '请填写经办人'; return }
  try {
    await apiCancelHousehold(current.value.id, {
      reason: form.reason.trim(),
      materialNo: form.materialNo.trim(),
      materialDate: form.docDate || null,
      handler: form.operator.trim(),
    })
    dialog.value = false
    err.value = ''
    msg.value = `「${current.value.householder}」已办理销户（立即生效）`
    await load()
  } catch (e) {
    err.value = e.message || '销户失败'
  }
}
</script>

<template>
  <div class="cs">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      销户用于整户消亡等情形：必填原因与纸质材料编号（材料线下存档，系统只登记编号与日期），
      修改完成即生效并计入完成；<b>提交为独立动作</b>，提交后村内不可再改，纠正随整村上报单退回处理。
    </div>
    <div v-if="locked" class="lock-banner">当前已锁定，不可办理销户。</div>

    <div class="panel">
      <div class="pt">销户记录</div>
      <table class="tbl">
        <thead><tr><th>户</th><th>原因</th><th>材料编号</th><th>经办人</th><th>办理时间</th></tr></thead>
        <tbody>
          <tr v-for="r in records" :key="r.id">
            <td class="strong">{{ r.householder || r.householdId }}</td>
            <td class="small">{{ r.reason || '—' }}</td>
            <td class="mono small">{{ r.materialNo || r.approveRecord || '—' }}</td>
            <td class="small">{{ r.operator || '—' }}</td>
            <td class="small dim">{{ r.createdAt || r.docDate || '—' }}</td>
          </tr>
          <tr v-if="!records.length && !loading"><td colspan="5" class="empty">暂无销户记录</td></tr>
        </tbody>
      </table>
    </div>

    <div class="panel" style="margin-top:14px">
      <div class="pt">选择要销户的户</div>
      <table class="tbl">
        <thead><tr><th>户号</th><th>户主</th><th>村组</th><th class="num">地块</th><th>状态</th><th style="width:70px">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="mono">{{ r.id }}</td>
            <td class="strong">{{ r.householder }}</td>
            <td class="small">{{ r.villageGroup || '—' }}</td>
            <td class="num">{{ r.plotCount ?? '—' }}</td>
            <td class="small"><span class="st" :class="'st-' + r.status">{{ r.status }}</span></td>
            <td><span class="link" :class="{ disabled: locked }" @click="open(r)">销户</span></td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="6" class="empty">无数据</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="close">
      <div class="dlg">
        <div class="dlg-t">办理销户 · {{ current && current.householder }}</div>
        <div class="warn">销户立即生效，该户将从有效户中移出并计入完成。请确认真实情况后再办理。</div>
        <div class="fld"><label>销户原因 *</label><textarea v-model="form.reason" rows="2" placeholder="如：整户消亡、全家迁出并已办理退出等"></textarea></div>
        <div class="fld"><label>纸质材料编号 *</label><input v-model="form.materialNo" placeholder="线下存档的材料编号，如 XH-2026-007" /></div>
        <div class="fld"><label>材料日期</label><input v-model="form.docDate" type="date" /></div>
        <div class="fld"><label>经办人 *</label><input v-model="form.operator" placeholder="本次经办人姓名" /></div>
        <div class="dlg-actions">
          <button class="btn" @click="close">取消</button>
          <button class="btn primary" @click="submit">确认销户（立即生效）</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.cs { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.lock-banner { background: #fff3e0; color: #b26a00; font-size: 12.5px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; border-left: 3px solid #c9a45c; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.strong { font-weight: 500; color: #1b2733; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #f4f6f8; color: #5a6875; }
.st-已通过, .st-已最终确认 { background: #e8f5ed; color: #2b7a4b; }
.st-待审核, .st-待最终确认 { background: #fff3e0; color: #b26a00; }
.st-未通过 { background: #fdeceb; color: #c9302c; }
.link { color: #c9302c; font-size: 12.5px; cursor: pointer; }
.link.disabled { color: #c8d0d8; cursor: not-allowed; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 460px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 14px; }
.warn { background: #fdeceb; color: #c9302c; font-size: 12px; border-radius: 7px; padding: 10px 12px; line-height: 1.7; margin-bottom: 14px; }
.fld { margin-bottom: 13px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld input, .fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #c9302c; border-color: #c9302c; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
