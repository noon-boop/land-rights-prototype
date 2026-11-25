<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { apiPendingSplits, apiReviewSplit, apiLockState } from '@/api'

/**
 * F-V03 分户审核
 * 核对：成员勾选 / 地块分配（整块 WHOLE、面积 AREA）/ 两边户主
 * 通过 = 一次事务落库（建户 + 迁成员 + 迁地块 + 建号 + 换号 + 写记录）
 * 退回须填意见；两级锁定期仅可退回
 */
const rows = ref([])
const lock = ref(null)
const loading = ref(false)
const err = ref('')
const msg = ref('')
const dialog = ref(false)
const current = ref(null)
const form = reactive({ result: '通过', opinion: '' })

const locked = computed(() => {
  const l = lock.value
  return !!(l && (l.villageLocked || l.townLocked))
})

async function load() {
  loading.value = true
  err.value = ''
  try {
    rows.value = (await apiPendingSplits()) || []
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
  current.value = r
  form.result = result
  form.opinion = ''
  dialog.value = true
}
function close() { dialog.value = false }

async function submit() {
  if (form.result === '通过' && locked.value) {
    err.value = '当前已锁定，只能退回分户申请'
    return
  }
  if (form.result === '退回' && form.opinion.trim().length < 10) {
    err.value = '退回意见不少于 10 个字'
    return
  }
  try {
    const r = await apiReviewSplit({
      id: current.value.id,
      result: form.result,
      opinion: form.opinion.trim(),
    })
    dialog.value = false
    err.value = ''
    if (form.result === '通过' && r) {
      msg.value = `分户已通过，新户已建（${r.newHouseholdCode || r.newHouseholdId || ''}），农户账号已开通`
    } else {
      msg.value = '已退回农户修改'
    }
    await load()
  } catch (e) {
    err.value = e.message || '提交失败'
  }
}

/** 后端 memberIds/parcelIds/allocations 为 JSON 字符串，需解析为数组 */
function parseArr(v) {
  if (Array.isArray(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const s = v.trim()
    try {
      const a = JSON.parse(s)
      if (Array.isArray(a)) return a
      // 单值形式：JSON.parse("13") → 13，需包成数组
      if (a !== null && a !== undefined && typeof a !== 'object') return [a]
      return []
    } catch (e) {
      // 逗号分隔的降级形式，如 "13,14"
      return s.split(',').map((x) => x.trim()).filter(Boolean)
    }
  }
  return []
}

/** 面积分配形态：把 allocations 拼成可读文本 */
function allocText(r) {
  const a = parseArr(r.allocations || r.areaAllocations)
  if (!a.length) return '整块迁移'
  return a.map((x) => `地块${x.parcelId}：保留 ${x.keepArea} / 分出 ${x.splitArea}`).join('；')
}
</script>

<template>
  <div class="sr">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div v-if="locked" class="lock-banner">
      <b>仅可退回</b>：当前已锁定（本村整村单或乡镇上报包已提交），分户审核通过入口关闭。
    </div>

    <div class="panel">
      <div class="pt">
        待审分户申请（{{ rows.length }}）
        <span class="pt-sub">通过即一次事务落库：建户 + 迁成员 + 迁地块 + 建号 + 换号 + 写记录</span>
      </div>
      <table class="tbl">
        <thead>
          <tr>
            <th>申请编号</th><th>原户</th><th>新户主</th><th>形态</th>
            <th>分出成员</th><th>地块处理</th><th>原因</th><th style="width:130px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="mono small">{{ r.splitNo || r.id }}</td>
            <td class="strong">{{ r.origHeadName || r.originalHouseholder || '—' }}</td>
            <td>{{ r.newHeadName || '—' }}</td>
            <td>
              <span class="mode" :class="r.splitMode === 'AREA' ? 'area' : 'whole'">
                {{ r.splitMode === 'AREA' ? '面积分配' : '整块迁移' }}
              </span>
            </td>
            <td class="small">{{ parseArr(r.memberIds).length }} 人</td>
            <td class="small dim2">{{ allocText(r) }}</td>
            <td class="small dim2">{{ r.reason || '—' }}</td>
            <td>
              <span class="link" :class="{ disabled: locked }" @click="open(r, '通过')">通过</span>
              <span class="link danger" @click="open(r, '退回')">退回</span>
            </td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="8" class="empty">暂无待审分户申请</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="close">
      <div class="dlg">
        <div class="dlg-t">{{ form.result === '通过' ? '通过分户申请' : '退回分户申请' }}</div>
        <div class="card">
          <div class="row"><span class="k">申请编号</span>{{ current.splitNo || current.id }}</div>
          <div class="row"><span class="k">原户</span>{{ current.origHeadName || current.originalHouseholder || '—' }}</div>
          <div class="row"><span class="k">新户主</span>{{ current.newHeadName || '—' }}</div>
          <div class="row"><span class="k">形态</span>{{ current.splitMode === 'AREA' ? '面积分配' : '整块迁移' }}</div>
          <div class="row"><span class="k">地块</span>{{ allocText(current) }}</div>
        </div>
        <div class="fld" v-if="form.result === '通过'">
          <div class="warn">
            通过后：新户即刻建立、分出的成员与地块迁入新户、新户主账号自动开通。
            面积守恒须满足「原户保留 + 新户分出 = 原合同面积」（容差 0.01 亩）。
          </div>
        </div>
        <div class="fld">
          <label>{{ form.result === '通过' ? '审核意见（选填）' : '退回意见（不少于 10 字）' }}</label>
          <textarea v-model="form.opinion" rows="4"
            :placeholder="form.result === '通过' ? '可留空' : '请说明退回原因，如：两户户主填写有误，请重新指定'"></textarea>
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
.sr { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.lock-banner { background: #fff3e0; color: #b26a00; font-size: 12.5px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; border-left: 3px solid #c9a45c; line-height: 1.7; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.pt-sub { font-size: 11.5px; font-weight: 400; color: #9aa6b2; margin-left: 10px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; white-space: nowrap; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim2 { color: #8a97a5; font-size: 11.5px; }
.strong { font-weight: 500; color: #1b2733; }
.mode { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; }
.mode.whole { background: #e4f3ea; color: #0e7a4f; }
.mode.area { background: #fff3e0; color: #b26a00; }
.link { color: #0e7a4f; font-size: 12.5px; cursor: pointer; margin-right: 10px; }
.link.danger { color: #c9302c; }
.link.disabled { color: #c8d0d8; cursor: not-allowed; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 460px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.card { background: #f7f9fa; border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
.row { display: flex; font-size: 12.5px; color: #3d4b5a; line-height: 2; }
.k { color: #9aa6b2; width: 78px; flex-shrink: 0; }
.warn { background: #fff3e0; color: #b26a00; font-size: 12px; border-radius: 7px; padding: 10px 12px; line-height: 1.7; }
.fld { margin-bottom: 14px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
