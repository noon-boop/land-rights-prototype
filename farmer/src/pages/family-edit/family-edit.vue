<script setup>
import { reactive, ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import StepBar from '../../components/StepBar.vue'
import Icon from '../../components/Icon.vue'
import SelectDropdown from '../../components/SelectDropdown.vue'

const id = ref(0)
const isNew = computed(() => id.value === 0)
const existing = computed(() => store.state.members.find((m) => m.id === id.value))

const relations = ['户主', '配偶', '子女', '父母', '其他']
const memberTypes = ['世居', '婚迁', '收养', '政策迁入', '其他']
// 编辑“已有”成员时，变动情况仅可展示：无变化 / 减少（死亡/迁出）/ 婚嫁迁出
const changeTypesBase = ['无变化', '减少（死亡/迁出）', '婚嫁迁出']
// 新增成员：变动类型限定为“新增（出生/迁入）/ 婚嫁迁入”两类（由列表页选择后带入）
const changeTypes = computed(() => {
  if (isNew.value) return ['新增（出生/迁入）', '婚嫁迁入']
  // 若该成员当前为“新增/婚嫁迁入”等非三态值（历史数据），保留其原值便于重新归类
  return changeTypesBase.includes(form.changeType) ? changeTypesBase : [form.changeType, ...changeTypesBase]
})
// 是否“迁出 / 减少”类：此类只能删除，不能保存
const isLeaveType = computed(() => ['减少（死亡/迁出）', '婚嫁迁出'].includes(form.changeType))

const form = reactive({
  name: '',
  relation: '配偶',
  idCard: '',
  isMember: '是',
  memberType: '世居',
  memberTypeOther: '',
  changeType: '无变化',
  changeNote: '',
  phone: '',
  migratedFromOther: '否',
  migratedFromOrg: '',
})

onLoad((options) => {
  id.value = Number(options.id || 0)
  uni.setNavigationBarTitle({ title: id.value === 0 ? '添加家庭成员' : '编辑家庭成员' })
  if (!isNew.value && existing.value) {
    Object.assign(form, existing.value)
    form.memberTypeOther = existing.value.memberTypeOther || ''
  }
  // 新增成员：变动类型由列表页选择后带入（新增（出生/迁入）/ 婚嫁迁入），缺省取前者
  if (isNew.value) {
    const q = options.ct
    form.changeType = (q === '新增（出生/迁入）' || q === '婚嫁迁入') ? q : '新增（出生/迁入）'
  }
})

const errors = reactive({})
// 身份证号合规性：18位、末位可为X、校验位正确、出生日期合法
function isValidIdCard(id) {
  if (!/^\d{17}[\dXx]$/.test(id)) return false
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0
  for (let i = 0; i < 17; i++) sum += parseInt(id[i], 10) * w[i]
  if (codes[sum % 11] !== id[17].toUpperCase()) return false
  const y = +id.substr(6, 4), m = +id.substr(10, 2), d = +id.substr(12, 2)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  let ok = true
  if (!form.name.trim()) { errors.name = '请输入姓名'; ok = false }
  if (!form.idCard.trim()) { errors.idCard = '请输入身份证号码'; ok = false }
  // 含 * 的为脱敏预核验号，跳过格式校验；完整号码须合规
  else if (!form.idCard.includes('*') && !isValidIdCard(form.idCard.trim())) {
    errors.idCard = '身份证号码不合规，请核对后重填'; ok = false
  }
  if (form.memberType === '其他' && !form.memberTypeOther.trim()) {
    errors.memberTypeOther = '请说明取得成员资格的具体方式'
    ok = false
  }
  if (form.migratedFromOther === '是' && !form.migratedFromOrg.trim()) {
    errors.migratedFromOrg = '请填写迁入前的农村集体经济组织名称'
    ok = false
  }
  return ok
}

async function save() {
  // 字段级校验（身份证合规、必填、取得方式"其他"说明）在编辑时即校验；
  // 户主/配偶唯一性规则放到"下一步：承包地信息"时统一核验
  if (!validate()) { showToast('请完整填写必填项'); return }

  const payload = { ...form, initial: form.name.trim()[0] || '新' }
  let ok = false
  if (isNew.value) {
    ok = await store.addMember(payload)
    if (ok) showToast('成员已添加')
  } else {
    ok = await store.updateMember(id.value, payload)
    if (ok) showToast('已保存')
  }
  if (ok) uni.navigateBack()
}
// 仅二轮承包以来已“迁出 / 减少”的成员方可删除；其余（无变化、新增、婚嫁迁入）不允许删除
const deletableTypes = ['减少（死亡/迁出）', '婚嫁迁出']
async function remove() {
  if (!deletableTypes.includes(form.changeType)) {
    showToast('仅二轮承包以来已迁出或减少（含婚嫁迁出）的成员方可删除')
    return
  }
  await store.updateMember(id.value, { changeType: form.changeType })
  const ok = await store.softDeleteMember(id.value)
  if (ok) {
    showToast('已删除该成员（可在列表中恢复）')
    uni.navigateBack()
  }
}
function prev() {
  uni.navigateBack()
}
// 是否由其他农村集体经济组织迁入：选“否”时清空原组织名称
function setMigrated(v) {
  form.migratedFromOther = v
  if (v === '否') form.migratedFromOrg = ''
}
</script>

<template>
  <div class="page">

    <StepBar :current="2" :steps="['基本信息', '家庭成员', '承包地', '变更诉求', '确认提交']" />

    <div class="info-banner">
      <Icon name="info" :size="18" color="#C9932B" />
      <span>涉及分户、合户的信息修改，由村级账号办理</span>
    </div>

    <div class="page-body">
      <!-- 头像预览 -->
      <div class="profile-row">
        <div class="member-avatar" style="width:56px;height:56px;font-size:24px;border-radius:50%;background:var(--color-primary-lighter);color:var(--color-primary);display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0;">
          {{ form.name ? form.name[0] : '新' }}
        </div>
        <div>
          <div style="font-size:17px;font-weight:600;color:var(--color-text-primary);">{{ form.name || '未命名成员' }}</div>
          <div style="font-size:13px;color:var(--color-text-secondary);margin-top:2px;">{{ form.relation }}</div>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="form-card">
        <div class="form-card-title">基本信息</div>
        <div class="form-row" :class="{ error: errors.name }">
          <div class="form-label"><span class="required">*</span>姓名</div>
          <div class="form-value"><input v-model="form.name" class="form-input" placeholder="请输入姓名"></div>
        </div>
        <div class="form-row column">
          <div class="form-label block"><span class="required">*</span>与户主关系</div>
          <div class="form-value">
            <SelectDropdown v-model="form.relation" :options="relations" placeholder="请选择与户主关系" />
          </div>
        </div>
        <div class="form-row" :class="{ error: errors.idCard }">
          <div class="form-label"><span class="required">*</span>身份证号码</div>
          <div class="form-value">
            <input v-model="form.idCard" class="form-input form-mono" placeholder="请输入18位身份证号码" @input="errors.idCard = ''">
            <div v-if="errors.idCard" class="err-msg">{{ errors.idCard }}</div>
          </div>
        </div>
      </div>

      <!-- 集体成员身份 -->
      <div class="form-card">
        <div class="form-card-title">集体成员身份</div>
        <div class="form-row column">
          <div class="form-label block"><span class="required">*</span>是否本集体经济组织成员</div>
          <div class="form-value">
            <div class="radio-group">
              <div class="radio-item" :class="{ checked: form.isMember === '是' }" @click="form.isMember = '是'">
                <div class="radio-circle"></div><span>是</span>
              </div>
              <div class="radio-item" :class="{ checked: form.isMember === '否' }" @click="form.isMember = '否'">
                <div class="radio-circle"></div><span>否</span>
              </div>
            </div>
          </div>
        </div>
        <div class="form-row column">
          <div class="form-label block">取得成员资格方式</div>
          <div class="form-value">
            <div class="tag-chips">
              <div v-for="t in memberTypes" :key="t" class="tag-chip" :class="{ selected: form.memberType === t }" @click="form.memberType = t">{{ t }}</div>
            </div>
          </div>
        </div>
        <div class="form-row column" v-if="form.memberType === '其他'" :class="{ error: errors.memberTypeOther }">
          <div class="form-label block"><span class="required">*</span>其他情况说明</div>
          <div class="form-value">
            <textarea maxlength="-1" v-model="form.memberTypeOther" class="form-textarea" placeholder="请说明取得本集体经济组织成员资格的具体方式，如：其他方式来源、审批情况"></textarea>
          </div>
        </div>
      </div>

      <!-- 迁入情况 -->
      <div class="form-card">
        <div class="form-card-title">迁入情况</div>
        <div class="form-row column">
          <div class="form-label block"><span class="required">*</span>是否由其他农村集体经济组织迁入</div>
          <div class="form-value">
            <div class="radio-group">
              <div class="radio-item" :class="{ checked: form.migratedFromOther === '是' }" @click="setMigrated('是')">
                <div class="radio-circle"></div><span>是</span>
              </div>
              <div class="radio-item" :class="{ checked: form.migratedFromOther === '否' }" @click="setMigrated('否')">
                <div class="radio-circle"></div><span>否</span>
              </div>
            </div>
          </div>
        </div>
        <div class="form-row column" v-if="form.migratedFromOther === '是'" :class="{ error: errors.migratedFromOrg }">
          <div class="form-label block"><span class="required">*</span>迁入前集体经济组织名称</div>
          <div class="form-value">
            <input v-model="form.migratedFromOrg" class="form-input" placeholder="请填写迁入前的农村集体经济组织全称">
            <div v-if="errors.migratedFromOrg" class="err-msg">{{ errors.migratedFromOrg }}</div>
          </div>
        </div>
      </div>

      <!-- 变动情况 -->
      <div class="form-card">
        <div class="form-card-title">二轮承包以来成员变动情况</div>
        <div class="form-row column">
          <div class="form-label block">变动类型</div>
          <div class="form-value">
            <div class="tag-chips">
              <div v-for="c in changeTypes" :key="c" class="tag-chip" :class="{ selected: form.changeType === c }" @click="form.changeType = c">{{ c }}</div>
            </div>
          </div>
        </div>
        <div class="form-row column">
          <div class="form-label block">变动时间及说明</div>
          <div class="form-value">
            <textarea maxlength="-1" v-model="form.changeNote" class="form-textarea" placeholder="如无变化可不填，如有变动请说明时间和原因"></textarea>
          </div>
        </div>
      </div>

      <!-- 联系方式 -->
      <div class="form-card">
        <div class="form-card-title">联系方式（选填）</div>
        <div class="form-row">
          <div class="form-label">联系电话</div>
          <div class="form-value"><input v-model="form.phone" class="form-input" type="tel" placeholder="请输入联系电话"></div>
        </div>
      </div>

      <!-- 变动类型提示 -->
      <div v-if="!isNew" class="delete-wrap">
        <div class="delete-hint">提示：「无变化」仅可保存；选择「减少（死亡/迁出）」或「婚嫁迁出」时仅可删除该成员</div>
      </div>
    </div>

    <div class="bottom-action">
      <div class="btn btn-outline flex-half" @click="prev">取消</div>
      <!-- 无变化 / 新增等：仅保存；减少（死亡/迁出）/ 婚嫁迁出：仅删除 -->
      <div v-if="!isLeaveType" class="btn btn-primary" @click="save">保存</div>
      <div v-else class="btn btn-danger" @click="remove">删除该成员</div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.profile-row { background: #fff; padding: 20px 16px; display: flex; align-items: center; gap: 14px; margin-top: 12px; }
.form-row.error { background: var(--color-danger-light); }
.err-msg { color: var(--color-danger); font-size: 12px; margin-top: 4px; }
.delete-wrap { padding: 12px 16px 24px; }
.btn-danger { background: var(--color-danger); color: #fff; font-weight: 500; }
.btn-danger:active { opacity: 0.85; }
.delete-hint { font-size: 12px; color: var(--color-text-placeholder); text-align: center; margin-top: 8px; line-height: 1.6; }
</style>
