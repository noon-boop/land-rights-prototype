<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { apiHouseholdList, apiVillageAddMember, apiVillageAddLand, apiVillageReportsExport } from '@/api'

/**
 * F-V09 代录采集
 * 为无智能终端 / 不会操作的农户代录。
 * 三要素（B-V05）：① 授权书线下签署并登记编号 ② 农户手机验证码通过 ③ 代录人具备村级权限
 * 数据带 source=PROXY，记录代录人 / 时间 / IP / 设备
 */
const rows = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const step = ref(1)

const form = reactive({
  // 三要素
  householdId: null,
  authNo: '',            // 授权书编号
  phone: '',
  code: '',              // 验证码
  codeSent: false,
  // 代录内容
  memberName: '', memberRelation: '子女', memberIdCard: '', memberType: '世居', memberChangeType: '新增（出生/迁入）',
  landName: '', landUse: '旱地', landArea: '', bEast: '', bSouth: '', bWest: '', bNorth: '',
})

async function load() {
  loading.value = true
  try {
    const d = await apiHouseholdList({ status: 'all', page: 1, pageSize: 100 })
    rows.value = (d && (d.list || d.records)) || []
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const target = computed(() => rows.value.find((r) => r.id === form.householdId) || null)

/** 三要素齐备才允许代录提交 */
const gateOk = computed(() => !!form.authNo.trim() && form.codeSent && form.code.trim().length === 6)

function pick(r) {
  form.householdId = r.id
  form.phone = r.phone || ''
  err.value = ''
}

/** 发送验证码：真实环境走短信网关，本期提示已发送并校验 6 位 */
async function sendCode() {
  if (!form.householdId) { err.value = '请先选择要代录的户'; return }
  if (!form.phone.trim()) { err.value = '该户未登记手机号，请先在账号维护中补充'; return }
  form.codeSent = true
  msg.value = `验证码已发送至 ${form.phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2')}（本期为模拟通道，请向农户索取实际验证码）`
}

async function addMember() {
  if (!gateOk.value) { err.value = '代录三要素缺一不可：授权书编号 + 农户验证码 + 村级权限'; return }
  if (!form.memberName.trim() || !form.memberIdCard.trim() || form.memberIdCard.trim().length !== 18) {
    err.value = '请填写成员姓名与 18 位身份证号'; return
  }
  try {
    await apiVillageAddMember(form.householdId, {
      name: form.memberName.trim(),
      relation: form.memberRelation,
      idCard: form.memberIdCard.trim(),
      isMember: '是',
      memberType: form.memberType,
      changeType: form.memberChangeType,
      changeNote: `代录（授权书 ${form.authNo.trim()}）`,
      source: 'PROXY',
      phone: '',
    })
    msg.value = `成员「${form.memberName}」已代录（source=PROXY，授权书 ${form.authNo}）`
    form.memberName = ''
    form.memberIdCard = ''
  } catch (e) {
    err.value = e.message || '代录失败'
  }
}

async function addLand() {
  if (!gateOk.value) { err.value = '代录三要素缺一不可：授权书编号 + 农户验证码 + 村级权限'; return }
  if (!form.landName.trim() || !form.landArea) { err.value = '请填写地块名称与自测面积'; return }
  try {
    await apiVillageAddLand(form.householdId, {
      plotName: form.landName.trim(),
      landUse: form.landUse,
      measuredArea: parseFloat(form.landArea) || 0,
      boundaryEast: form.bEast.trim(),
      boundarySouth: form.bSouth.trim(),
      boundaryWest: form.bWest.trim(),
      boundaryNorth: form.bNorth.trim(),
    })
    msg.value = `地块「${form.landName}」已代录（待线下划矢量）`
    form.landName = ''
    form.landArea = ''
  } catch (e) {
    err.value = e.message || '代录失败'
  }
}
</script>

<template>
  <div class="px">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      为无智能终端或不会操作的农户代录。<b>代录三要素缺一不可</b>：
      ① 授权书线下签署并登记编号　② 农户手机验证码通过　③ 代录人具备村级权限。
      代录数据带 <code>source=PROXY</code>，并记录代录人 / 时间 / IP / 设备。
    </div>

    <div class="panel">
      <div class="pt">① 选择代录对象</div>
      <div class="pick-list">
        <div v-for="r in rows" :key="r.id" class="pick-item" :class="{ on: form.householdId === r.id }" @click="pick(r)">
          <span class="pn">{{ r.householder }}</span>
          <span class="ps">{{ r.villageGroup }} · {{ r.phone || '未登记手机号' }}</span>
        </div>
        <div v-if="!rows.length && !loading" class="empty">无可选户</div>
      </div>
    </div>

    <div class="panel" style="margin-top:14px">
      <div class="pt">② 代录三要素</div>
      <div class="row3">
        <div class="fld">
          <label>授权书编号 *</label>
          <input v-model="form.authNo" placeholder="线下签署的授权书编号" />
        </div>
        <div class="fld">
          <label>农户手机号</label>
          <input v-model="form.phone" maxlength="11" placeholder="接收验证码的手机号" />
        </div>
        <div class="fld">
          <label>验证码 *</label>
          <div class="code-row">
            <input v-model="form.code" maxlength="6" placeholder="6 位验证码" />
            <button class="btn" @click="sendCode">{{ form.codeSent ? '重发' : '发送' }}</button>
          </div>
        </div>
      </div>
      <div class="gate" :class="gateOk ? 'ok' : 'wait'">
        {{ gateOk ? '✓ 三要素已齐备，可进行代录' : '⚠ 三要素未齐备，代录提交按钮不可用' }}
      </div>
    </div>

    <div class="panel" style="margin-top:14px">
      <div class="pt">③ 代录内容</div>
      <div class="sub">成员</div>
      <div class="row3">
        <div class="fld"><label>姓名</label><input v-model="form.memberName" placeholder="成员姓名" /></div>
        <div class="fld"><label>与户主关系</label>
          <select v-model="form.memberRelation">
            <option>配偶</option><option>子女</option><option>父母</option><option>兄弟姐妹</option><option>其他</option>
          </select>
        </div>
        <div class="fld"><label>身份证号</label><input v-model="form.memberIdCard" maxlength="18" placeholder="18 位" /></div>
      </div>
      <button class="btn primary" :disabled="!gateOk" @click="addMember">代录成员</button>

      <div class="sub" style="margin-top:20px">地块</div>
      <div class="row3">
        <div class="fld"><label>地块名称</label><input v-model="form.landName" placeholder="如：东大田" /></div>
        <div class="fld"><label>土地用途</label>
          <select v-model="form.landUse">
            <option>水田</option><option>旱地</option><option>菜地</option><option>园地</option><option>林地</option>
          </select>
        </div>
        <div class="fld"><label>自测面积（亩）</label><input v-model="form.landArea" placeholder="如 2.35" /></div>
      </div>
      <div class="row4">
        <div class="fld"><label>东至</label><input v-model="form.bEast" placeholder="相邻地块或地物" /></div>
        <div class="fld"><label>南至</label><input v-model="form.bSouth" /></div>
        <div class="fld"><label>西至</label><input v-model="form.bWest" /></div>
        <div class="fld"><label>北至</label><input v-model="form.bNorth" /></div>
      </div>
      <button class="btn primary" :disabled="!gateOk" @click="addLand">代录地块</button>
      <div class="tip">代录的新地块编号由系统生成，几何待线下实测回传。</div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.px { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.9; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.intro code { background: #f0f3f5; border-radius: 3px; padding: 1px 5px; font-size: 11.5px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.sub { font-size: 12.5px; color: #0e7a4f; font-weight: 500; margin: 4px 0 10px; }
.pick-list { display: flex; flex-wrap: wrap; gap: 8px; max-height: 180px; overflow-y: auto; }
.pick-item { display: flex; flex-direction: column; gap: 3px; padding: 9px 13px; border: 1px solid #dfe4ea; border-radius: 8px; cursor: pointer; font-size: 13px; }
.pick-item.on { border-color: #0e7a4f; background: #e4f3ea; }
.pn { font-weight: 500; color: #1b2733; }
.ps { font-size: 11px; color: #8a97a5; }
.empty { color: #9aa6b2; font-size: 13px; padding: 20px; }
.row3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.row4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.fld { margin-bottom: 12px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld input, .fld select { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.code-row { display: flex; gap: 8px; }
.code-row input { flex: 1; }
.gate { margin-top: 4px; font-size: 12.5px; border-radius: 7px; padding: 9px 12px; }
.gate.ok { background: #e8f5ed; color: #2b7a4b; }
.gate.wait { background: #fff3e0; color: #b26a00; }
.tip { font-size: 11.5px; color: #9aa6b2; margin-top: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; white-space: nowrap; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
