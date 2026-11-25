<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { apiHouseholdList, apiHouseholdDetail, apiVillageUpdateMember, apiVillageAddMember, apiVillageDeleteMember } from '@/api'

/**
 * F-V02 成员信息处理
 * 协助成员增减 / 关系变更，承接基线成员信息错误的更正（不设独立纠错通道）
 * 每次操作写 audit_log（操作人 + 时间 + 前后值）
 */
const keyword = ref('')
const rows = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const current = ref(null)
const detail = ref(null)
const dialog = ref(false)
const mode = ref('edit')
const form = reactive({ name: '', relation: '子女', idCard: '', memberType: '世居', changeType: '无变化', changeNote: '', phone: '' })

const RELATIONS = ['户主', '配偶', '子女', '父母', '兄弟姐妹', '其他']
const MTYPES = ['世居', '婚迁', '新生', '迁入', '其他']
const CTYPES = ['无变化', '新增（出生/迁入）', '成员死亡', '成员迁出', '关系更正']

async function search() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiHouseholdList({ keyword: keyword.value.trim(), status: 'all', page: 1, pageSize: 50 })
    rows.value = (d && (d.list || d.records)) || []
  } catch (e) {
    err.value = e.message || '加载失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}
onMounted(search)

async function open(r) {
  current.value = r
  detail.value = null
  try { detail.value = await apiHouseholdDetail(r.id) } catch (e) { detail.value = null }
}

const members = computed(() => (detail.value && detail.value.members) || [])

function openEdit(m) {
  mode.value = 'edit'
  Object.assign(form, {
    id: m.id, name: m.name, relation: m.relation, idCard: m.idCard,
    memberType: m.memberType, changeType: m.changeType || '无变化',
    changeNote: m.changeNote || '', phone: m.phone || '',
  })
  dialog.value = true
}
function openAdd() {
  mode.value = 'add'
  Object.assign(form, { id: null, name: '', relation: '子女', idCard: '', memberType: '世居', changeType: '新增（出生/迁入）', changeNote: '', phone: '' })
  dialog.value = true
}

async function submit() {
  if (!form.name.trim()) { err.value = '请填写姓名'; return }
  if (!form.idCard.trim()) { err.value = '请填写身份证号'; return }
  if (form.idCard.trim().length !== 18) { err.value = '身份证号须为 18 位'; return }
  try {
    if (mode.value === 'add') {
      await apiVillageAddMember(current.value.id, {
        name: form.name.trim(), relation: form.relation, idCard: form.idCard.trim(),
        isMember: '是', memberType: form.memberType, changeType: form.changeType,
        changeNote: form.changeNote.trim(), phone: form.phone.trim(),
      })
      msg.value = `已新增成员「${form.name}」`
    } else {
      await apiVillageUpdateMember(current.value.id, form.id, {
        name: form.name.trim(), relation: form.relation, idCard: form.idCard.trim(),
        isMember: '是', memberType: form.memberType, changeType: form.changeType,
        changeNote: form.changeNote.trim(), phone: form.phone.trim(),
      })
      msg.value = `已更新成员「${form.name}」，前后值已留痕`
    }
    dialog.value = false
    err.value = ''
    detail.value = await apiHouseholdDetail(current.value.id)
  } catch (e) {
    err.value = e.message || '保存失败'
  }
}

async function softDelete(m) {
  try {
    await apiVillageDeleteMember(current.value.id, m.id)
    msg.value = `已删除成员「${m.name}」（软删除可恢复）`
    detail.value = await apiHouseholdDetail(current.value.id)
  } catch (e) {
    err.value = e.message || '删除失败'
  }
}
</script>

<template>
  <div class="mm">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      协助农户处理成员增减与关系变更，<b>并承接基线成员信息错误的更正</b>（并入本流程，不设独立纠错通道）。
      每次操作均写留痕：操作人 + 时间 + 前后值。
    </div>

    <div class="panel">
      <div class="bar">
        <input v-model="keyword" placeholder="户主姓名 / 身份证 / 合同号" @keyup.enter="search" />
        <button class="btn primary" @click="search">搜索</button>
        <span class="cnt">{{ rows.length }} 户</span>
      </div>
      <table class="tbl">
        <thead><tr><th style="width:52px">户号</th><th>户主</th><th>村组</th><th>状态</th><th style="width:90px">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" :class="{ on: current && current.id === r.id }">
            <td class="mono">{{ r.id }}</td>
            <td class="strong">{{ r.householder }}</td>
            <td class="small">{{ r.villageGroup || '—' }}</td>
            <td class="small"><span class="st" :class="'st-' + r.status">{{ r.status }}</span></td>
            <td><span class="link" @click="open(r)">处理成员</span></td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="5" class="empty">无匹配户</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="current" class="panel" style="margin-top:14px">
      <div class="head">
        <div class="pt">{{ current.householder }} · 家庭成员（{{ members.filter(m => !m.deleted).length }} 人）</div>
        <button class="btn primary" @click="openAdd">新增成员</button>
      </div>
      <table class="tbl">
        <thead><tr><th>姓名</th><th>关系</th><th>身份证</th><th>成员类型</th><th>变化类型</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-for="m in members" :key="m.id" :class="{ del: m.deleted }">
            <td class="strong">{{ m.name }}<span v-if="m.deleted" class="dtag">已删除</span></td>
            <td>{{ m.relation }}</td>
            <td class="mono small">{{ m.idCard }}</td>
            <td class="small">{{ m.memberType }}</td>
            <td class="small">{{ m.changeType }}</td>
            <td>
              <span class="link" @click="openEdit(m)">修改</span>
              <span v-if="!m.deleted" class="link danger" @click="softDelete(m)">删除</span>
            </td>
          </tr>
          <tr v-if="!members.length"><td colspan="6" class="empty">无成员</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="dialog = false">
      <div class="dlg">
        <div class="dlg-t">{{ mode === 'add' ? '新增成员' : '修改成员信息' }}</div>
        <div class="row2">
          <div class="fld"><label>姓名 *</label><input v-model="form.name" placeholder="成员姓名" /></div>
          <div class="fld"><label>与户主关系 *</label>
            <select v-model="form.relation"><option v-for="r in RELATIONS" :key="r" :value="r">{{ r }}</option></select>
          </div>
        </div>
        <div class="fld"><label>身份证号 *</label><input v-model="form.idCard" maxlength="18" placeholder="18 位身份证号" /></div>
        <div class="row2">
          <div class="fld"><label>成员类型</label>
            <select v-model="form.memberType"><option v-for="t in MTYPES" :key="t" :value="t">{{ t }}</option></select>
          </div>
          <div class="fld"><label>变化类型</label>
            <select v-model="form.changeType"><option v-for="c in CTYPES" :key="c" :value="c">{{ c }}</option></select>
          </div>
        </div>
        <div class="fld"><label>联系电话</label><input v-model="form.phone" maxlength="11" placeholder="选填" /></div>
        <div class="fld"><label>备注 / 更正说明</label><textarea v-model="form.changeNote" rows="2" placeholder="如：基线录入有误，按户口簿更正"></textarea></div>
        <div class="dlg-actions">
          <button class="btn" @click="dialog = false">取消</button>
          <button class="btn primary" @click="submit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mm { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.bar input { width: 260px; height: 34px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 11px; font-size: 13px; outline: none; }
.cnt { margin-left: auto; font-size: 12.5px; color: #8a97a5; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.tbl tbody tr.on { background: #f4faf6; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #f4f6f8; color: #5a6875; }
.st-已通过, .st-已最终确认 { background: #e8f5ed; color: #2b7a4b; }
.st-待审核, .st-待最终确认 { background: #fff3e0; color: #b26a00; }
.st-未通过 { background: #fdeceb; color: #c9302c; }
.tr-del td, .del td { opacity: .5; }
.dtag { font-size: 10.5px; background: #f4f6f8; color: #9aa6b2; border-radius: 3px; padding: 1px 5px; margin-left: 6px; }
.link { color: #0e7a4f; font-size: 12.5px; cursor: pointer; margin-right: 10px; }
.link.danger { color: #c9302c; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 520px; background: #fff; border-radius: 12px; padding: 22px; max-height: 88vh; overflow-y: auto; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.row2 { display: flex; gap: 12px; }
.row2 .fld { flex: 1; }
.fld { margin-bottom: 13px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld input, .fld select, .fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
</style>
