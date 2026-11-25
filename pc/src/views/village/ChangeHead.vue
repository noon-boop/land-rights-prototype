<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { apiHouseholdList, apiChangeHead } from '@/api'

/**
 * F-V05 户主变更
 * 变更户主（姓名+身份证+手机号）；生效后停用原户主账号、建/启用新户主账号
 * 身份证号不允许村级直接改，只能走本流程
 */
const keyword = ref('')
const rows = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const dialog = ref(false)
const current = ref(null)
const detail = ref(null)
const form = reactive({ newHeadName: '', newHeadIdCard: '', newHeadPhone: '', reason: '' })

async function search() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiHouseholdList({
      keyword: keyword.value.trim(), status: 'all', page: 1, pageSize: 50,
    })
    rows.value = (d && (d.list || d.records)) || []
  } catch (e) {
    err.value = e.message || '加载失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}
onMounted(search)

/** 开弹窗时拉该户成员，便于从成员里选新户主 */
async function open(r) {
  current.value = r
  detail.value = null
  form.newHeadName = ''
  form.newHeadIdCard = ''
  form.newHeadPhone = ''
  form.reason = ''
  dialog.value = true
  try {
    const { apiHouseholdDetail } = await import('@/api')
    detail.value = await apiHouseholdDetail(r.id)
  } catch (e) {
    detail.value = null
  }
}
function close() { dialog.value = false }

const members = computed(() => (detail.value && detail.value.members) || [])

/** 从成员列表点选新户主（不能选当前户主） */
function pickMember(m) {
  if (m.relation === '户主') {
    err.value = '该成员已是户主，请选择其他成员'
    return
  }
  form.newHeadName = m.name
  form.newHeadIdCard = m.idCard
  form.newHeadPhone = m.phone || ''
  err.value = ''
}

async function submit() {
  if (!form.newHeadName.trim() || !form.newHeadIdCard.trim()) {
    err.value = '请填写新户主姓名与身份证号'
    return
  }
  if (form.newHeadIdCard.trim().length !== 18) {
    err.value = '身份证号须为 18 位'
    return
  }
  try {
    const r = await apiChangeHead(current.value.id, {
      newHeadName: form.newHeadName.trim(),
      newHeadIdCard: form.newHeadIdCard.trim(),
      newHeadPhone: form.newHeadPhone.trim(),
      reason: form.reason.trim(),
    })
    dialog.value = false
    err.value = ''
    const extra = r && (r.accountDisabled || r.accountCreated) ? '（账号已同步）' : ''
    msg.value = `「${current.value.householder}」户主已变更为 ${form.newHeadName}${extra}`
    await search()
  } catch (e) {
    err.value = e.message || '变更失败'
  }
}
</script>

<template>
  <div class="ch">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      户主变更后：原户主账号停用、新户主账号建立或启用，前后值全程留痕。身份证号不允许直接修改，须走本流程。
    </div>

    <div class="panel">
      <div class="bar">
        <input v-model="keyword" placeholder="户主姓名 / 身份证 / 地块编码 / 合同号" @keyup.enter="search" />
        <button class="btn primary" @click="search">搜索</button>
        <span class="cnt">共 {{ rows.length }} 户</span>
      </div>
      <table class="tbl">
        <thead>
          <tr><th style="width:52px">户号</th><th>户主</th><th>身份证</th><th>村组</th><th>状态</th><th style="width:80px">操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="mono">{{ r.id }}</td>
            <td class="strong">{{ r.householder }}</td>
            <td class="mono small">{{ r.idCard || r.idCardMasked }}</td>
            <td class="small">{{ r.villageGroup || '—' }}</td>
            <td class="small"><span class="st" :class="'st-' + r.status">{{ r.status }}</span></td>
            <td><span class="link" @click="open(r)">变更户主</span></td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="6" class="empty">无匹配户</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="close">
      <div class="dlg">
        <div class="dlg-t">变更户主 · {{ current && current.householder }}</div>

        <div v-if="members.length" class="pick">
          <div class="pick-t">从家庭成员中选择新户主</div>
          <div class="pick-row">
            <span v-for="m in members" :key="m.id" class="chip"
              :class="{ on: m.idCard === form.newHeadIdCard, cur: m.relation === '户主' }"
              @click="pickMember(m)">
              {{ m.name }}<i>{{ m.relation }}</i>
            </span>
          </div>
          <div class="fhint">当前户主不可选；如新户主不在成员中，可直接在下方填写</div>
        </div>

        <div class="fld"><label>新户主姓名 *</label><input v-model="form.newHeadName" placeholder="请输入姓名" /></div>
        <div class="fld"><label>新户主身份证号 *</label><input v-model="form.newHeadIdCard" maxlength="18" placeholder="18 位身份证号" /></div>
        <div class="fld"><label>联系电话</label><input v-model="form.newHeadPhone" maxlength="11" placeholder="用于接收验证码与通知" /></div>
        <div class="fld"><label>变更原因</label><textarea v-model="form.reason" rows="3" placeholder="如：原户主去世、家庭成员协商变更等"></textarea></div>

        <div class="dlg-actions">
          <button class="btn" @click="close">取消</button>
          <button class="btn primary" @click="submit">确认变更</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.ch { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.bar input { width: 280px; height: 34px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 11px; font-size: 13px; outline: none; }
.bar input:focus { border-color: #0e7a4f; }
.cnt { margin-left: auto; font-size: 12.5px; color: #8a97a5; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #f4f6f8; color: #5a6875; }
.st-已通过, .st-已最终确认 { background: #e8f5ed; color: #2b7a4b; }
.st-待审核, .st-待最终确认 { background: #fff3e0; color: #b26a00; }
.st-未通过 { background: #fdeceb; color: #c9302c; }
.link { color: #0e7a4f; font-size: 12.5px; cursor: pointer; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 480px; background: #fff; border-radius: 12px; padding: 22px; max-height: 90vh; overflow-y: auto; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.pick { background: #f7f9fa; border-radius: 8px; padding: 12px; margin-bottom: 14px; }
.pick-t { font-size: 12.5px; color: #5a6875; margin-bottom: 8px; }
.pick-row { display: flex; flex-wrap: wrap; gap: 7px; }
.chip { font-size: 12.5px; padding: 5px 10px; border-radius: 14px; background: #fff; border: 1px solid #dfe4ea; cursor: pointer; color: #3d4b5a; }
.chip i { font-style: normal; font-size: 10.5px; color: #9aa6b2; margin-left: 4px; }
.chip.on { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.chip.on i { color: rgba(255,255,255,.75); }
.chip.cur { opacity: .5; }
.fld { margin-bottom: 13px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld input, .fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.fld input:focus, .fld textarea:focus { border-color: #0e7a4f; }
.fhint { font-size: 11px; color: #9aa6b2; margin-top: 6px; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
