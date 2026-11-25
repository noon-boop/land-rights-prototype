<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { apiPendingHouseholds, apiLockState, apiHouseholdReview } from '@/api'
import { useAuthStore } from '@/store/auth'

/**
 * F-V01 户级审核：待审户逐个复核 → 通过（必选 11 类）/ 退回（意见 ≥10 字）
 * 两级锁：本村整村单提交（B 及之后）时审核入口关闭
 */
const auth = useAuthStore()
const rows = ref([])
const lock = ref(null)
const loading = ref(false)
const err = ref('')
const msg = ref('')
const dialog = ref(false)
const current = ref(null)
const form = reactive({ result: '已通过', opinion: '', changeCategory: '直接延包' })

const CATS = ['直接延包','户主变更','增加成员','减少成员','分户','合户',
              '地块信息错误（户）','征地','整户消亡','新增户','无地户']

/** 锁定期禁止审核（两级锁） */
const locked = computed(() => {
  const l = lock.value
  if (!l) return false
  return !!(l.villageLocked || l.townLocked)
})
const lockReason = computed(() => {
  const l = lock.value
  if (!l) return ''
  if (l.townLocked) return '乡镇上报包已提交（F 及之后），全乡镇锁定，须镇级退回上报包后解锁'
  if (l.villageLocked) return '本村整村单已提交（B 及之后），本村锁定，须镇级退回整村单后解锁'
  return ''
})

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiPendingHouseholds()
    rows.value = (d && (d.list || d.records)) || []
    try { lock.value = await apiLockState() } catch (e) { lock.value = null }
  } catch (e) {
    err.value = e.message || '加载失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)

function open(r, result) {
  if (locked.value) {
    err.value = '当前已锁定，不可审核：' + lockReason.value
    return
  }
  current.value = r
  form.result = result
  form.opinion = ''
  form.changeCategory = r.changeCategory || '直接延包'
  dialog.value = true
}
function close() { dialog.value = false }

async function submit() {
  const f = form
  if (f.result === '未通过' && f.opinion.trim().length < 10) {
    err.value = '退回意见不少于 10 个字'
    return
  }
  if (f.result === '已通过' && !f.changeCategory) {
    err.value = '通过时必须选择业务分类'
    return
  }
  try {
    await apiHouseholdReview(current.value.id, {
      result: f.result,
      opinion: f.opinion.trim(),
      changeCategory: f.result === '已通过' ? f.changeCategory : undefined,
    })
    dialog.value = false
    err.value = ''
    msg.value = `「${current.value.householder}」${f.result === '已通过' ? '已通过' : '已退回'}`
    await load()
  } catch (e) {
    err.value = e.message || '提交失败'
  }
}
</script>

<template>
  <div class="vr">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div v-if="locked" class="lock-banner">
      <b>审核入口已关闭</b>：{{ lockReason }}
    </div>

    <div class="panel">
      <div class="pt">
        待审核户（{{ rows.length }}）
        <span class="pt-sub">通过时必选户级业务分类（11 类之一）；退回意见不少于 10 字</span>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:52px">户号</th><th>户主</th><th>身份证</th><th>村组</th>
            <th class="num">地块</th><th class="num">合同面积</th><th>农户申报分类</th><th style="width:150px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="mono">{{ r.id }}</td>
            <td class="strong">{{ r.householder }}</td>
            <td class="mono small">{{ r.idCard || r.idCardMasked }}</td>
            <td class="small">{{ r.villageGroup || '—' }}</td>
            <td class="num">{{ r.plotCount ?? '—' }}</td>
            <td class="num">{{ r.contractArea ?? '—' }}</td>
            <td class="small">
              <span v-if="r.changeCategory" class="cat">{{ r.changeCategory }}</span>
              <span v-else class="dim">未申报</span>
            </td>
            <td>
              <span class="link" :class="{ disabled: locked }" @click="open(r, '已通过')">通过</span>
              <span class="link danger" :class="{ disabled: locked }" @click="open(r, '未通过')">退回</span>
            </td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="8" class="empty">暂无待审核户</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="close">
      <div class="dlg">
        <div class="dlg-t">
          {{ form.result === '已通过' ? '审核通过' : '退回农户修改' }} · {{ current && current.householder }}
        </div>
        <div class="fld" v-if="form.result === '已通过'">
          <label>户级业务分类（必选，11 类之一）</label>
          <select v-model="form.changeCategory">
            <option v-for="c in CATS" :key="c" :value="c">{{ c }}</option>
          </select>
          <div class="fhint">可修订农户申报值，最终以本次定稿为准</div>
        </div>
        <div class="fld">
          <label>{{ form.result === '已通过' ? '审核意见（选填）' : '退回意见（不少于 10 字）' }}</label>
          <textarea v-model="form.opinion" rows="4"
            :placeholder="form.result === '已通过' ? '可留空' : '请具体说明需修改的内容，如：地块四至填写有误，请按实际相邻地物更正'"></textarea>
        </div>
        <div class="dlg-actions">
          <button class="btn" @click="close">取消</button>
          <button class="btn primary" @click="submit">确认</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.vr { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.lock-banner { background: #fff3e0; color: #b26a00; font-size: 12.5px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; border-left: 3px solid #c9a45c; line-height: 1.7; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.pt-sub { font-size: 11.5px; font-weight: 400; color: #9aa6b2; margin-left: 10px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; white-space: nowrap; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.dim { color: #b8c2cc; }
.cat { font-size: 11.5px; background: #e4f3ea; color: #0e7a4f; border-radius: 4px; padding: 2px 7px; }
.link { color: #0e7a4f; font-size: 12.5px; cursor: pointer; margin-right: 10px; }
.link.danger { color: #c9302c; }
.link.disabled { color: #c8d0d8; cursor: not-allowed; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 440px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.fld { margin-bottom: 14px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld select, .fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.fhint { font-size: 11px; color: #9aa6b2; margin-top: 5px; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
