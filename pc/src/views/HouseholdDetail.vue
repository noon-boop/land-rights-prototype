<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { apiHouseholdDetail, apiHouseholdReview } from '@/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const d = ref(null)
const loading = ref(false)
const err = ref('')
const msg = ref('')

const CATS = ['直接延包','户主变更','增加成员','减少成员','分户','合户',
              '地块信息错误（户）','征地','整户消亡','新增户','无地户']
const dialog = ref(false)
const form = ref({ result: '已通过', opinion: '', changeCategory: '直接延包' })

async function load() {
  loading.value = true
  err.value = ''
  try {
    d.value = await apiHouseholdDetail(route.params.id)
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const members = computed(() => (d.value && d.value.members) || [])
const lands = computed(() => (d.value && d.value.lands) || [])
const landsActive = computed(() => lands.value.filter((x) => !x.deleted))
const pendingVector = computed(() => landsActive.value.filter((x) => x.isPendingVector))

/**
 * 四至文本：接口返回 boundary 对象（{东,南,西,北}），
 * 兼容扁平的 boundaryEast/South/West/North 形式。
 */
function boundaryText(l) {
  if (l.boundary && typeof l.boundary === 'object') {
    const t = ['东', '南', '西', '北'].map((k) => l.boundary[k]).filter(Boolean).join(' / ')
    if (t) return t
  }
  return [l.boundaryEast, l.boundarySouth, l.boundaryWest, l.boundaryNorth].filter(Boolean).join(' / ') || '—'
}

const canReview = computed(() =>
  d.value && d.value.status === '待审核' && auth.userType === 'VILLAGE' && auth.canWrite('F-V01'),
)

function openReview(result) {
  form.value = { result, opinion: '', changeCategory: d.value.changeCategory || '直接延包' }
  dialog.value = true
}
function closeDialog() {
  dialog.value = false
}
async function submitReview() {
  const f = form.value
  if (f.result === '未通过' && f.opinion.trim().length < 10) {
    err.value = '退回意见不少于 10 个字'
    return
  }
  if (f.result === '已通过' && !f.changeCategory) {
    err.value = '通过时必须选择业务分类'
    return
  }
  try {
    await apiHouseholdReview(d.value.id, {
      result: f.result,
      opinion: f.opinion.trim(),
      changeCategory: f.result === '已通过' ? f.changeCategory : undefined,
    })
    dialog.value = false
    err.value = ''
    msg.value = f.result === '已通过' ? '已通过审核' : '已退回农户修改'
    await load()
  } catch (e) {
    err.value = e.message || '提交失败'
  }
}
</script>

<template>
  <div class="hd">
    <div class="bar">
      <button class="btn" @click="router.back()">← 返回</button>
      <div v-if="msg" class="msg">{{ msg }}</div>
    </div>
    <div v-if="err" class="err">{{ err }}</div>

    <template v-if="d">
      <div class="hero">
        <div>
          <div class="h-name">{{ d.householder }}
            <span class="st" :class="'st-' + d.status">{{ d.status }}</span>
          </div>
          <div class="h-sub">{{ d.villageGroup || d.groupName }} · {{ d.idCard || d.idCardMasked }} · {{ d.contractNo }}</div>
        </div>
        <div class="h-meta">
          <div><span class="k">发包方</span>{{ d.contractorName || '—' }}</div>
          <div><span class="k">地块</span>{{ d.plotCount ?? landsActive.length }} 块 / {{ d.contractArea }} 亩</div>
          <div><span class="k">业务分类</span>{{ d.changeCategory || '—' }}</div>
        </div>
      </div>

      <div v-if="pendingVector.length" class="alert">
        有 {{ pendingVector.length }} 块地待线下实测划矢量（分割/分户/新增产生），不阻断本轮提交。
      </div>

      <div class="panel">
        <div class="pt">家庭成员（{{ members.filter(m => !m.deleted).length }} 人）</div>
        <table class="tbl">
          <thead><tr><th>姓名</th><th>关系</th><th>身份证</th><th>成员类型</th><th>变化类型</th></tr></thead>
          <tbody>
            <tr v-for="m in members" :key="m.id" :class="{ del: m.deleted }">
              <td class="strong">{{ m.name }}<span v-if="m.deleted" class="dtag">已删除</span></td>
              <td>{{ m.relation }}</td>
              <td class="mono small">{{ m.idCard }}</td>
              <td class="small">{{ m.memberType }}</td>
              <td class="small">{{ m.changeType }}</td>
            </tr>
            <tr v-if="!members.length"><td colspan="5" class="empty">无成员</td></tr>
          </tbody>
        </table>
      </div>

      <div class="panel">
        <div class="pt">承包地块（{{ landsActive.length }} 块）</div>
        <table class="tbl">
          <thead><tr><th>编码</th><th>名称</th><th class="num">合同</th><th class="num">实测</th><th>用途</th><th>等级</th><th>来源</th><th>四至</th></tr></thead>
          <tbody>
            <tr v-for="l in lands" :key="l.id" :class="{ del: l.deleted }">
              <td class="mono small">{{ l.code || l.plotCode }}</td>
              <td>{{ l.name || l.plotName }}<span v-if="l.isPendingVector" class="vtag">待划矢量</span></td>
              <td class="num">{{ l.area ?? l.contractArea }}</td>
              <td class="num">{{ l.measuredArea }}</td>
              <td class="small">{{ l.use || l.landUse }}</td>
              <td class="small">{{ l.quality || l.landGrade || '—' }}</td>
              <td class="small"><span class="src" :class="'src-' + (l.source || '原有')">{{ l.source || '原有' }}</span></td>
              <td class="small dim2">{{ boundaryText(l) }}</td>
            </tr>
            <tr v-if="!lands.length"><td colspan="8" class="empty">无地块</td></tr>
          </tbody>
        </table>
      </div>

      <div class="panel">
        <div class="pt">审核时间线</div>
        <div class="timeline">
          <div class="tl-item"><span class="dot"></span>农户提交（{{ d.status === '未提交' ? '未提交' : '已提交' }}）</div>
          <div class="tl-item" v-if="d.reviewedAt"><span class="dot on"></span>村级审核：{{ d.status }} · {{ d.reviewedAt }}</div>
          <div class="tl-item" v-if="d.reviewOpinion"><span class="dot warn"></span>意见：{{ d.reviewOpinion }}</div>
          <div class="tl-item" v-if="!d.reviewedAt"><span class="dot"></span>待审核</div>
        </div>
      </div>

      <div v-if="canReview" class="actions">
        <button class="btn ok" @click="openReview('已通过')">审核通过</button>
        <button class="btn bad" @click="openReview('未通过')">退回修改</button>
      </div>

      <!-- 审核弹窗 -->
      <div v-if="dialog" class="mask" @click.self="closeDialog">
        <div class="dlg">
          <div class="dlg-t">{{ form.result === '已通过' ? '审核通过' : '退回农户修改' }}</div>
          <div class="fld" v-if="form.result === '已通过'">
            <label>户级业务分类（必选，11 类之一）</label>
            <select v-model="form.changeCategory">
              <option v-for="c in CATS" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="fld">
            <label>{{ form.result === '已通过' ? '审核意见（选填）' : '退回意见（不少于 10 字）' }}</label>
            <textarea v-model="form.opinion" rows="4" :placeholder="form.result === '已通过' ? '可留空' : '请具体说明需修改的内容'"></textarea>
          </div>
          <div class="dlg-actions">
            <button class="btn" @click="closeDialog">取消</button>
            <button class="btn primary" @click="submitReview">确认</button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.hd { padding: 18px 20px; }
.bar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.btn { height: 32px; padding: 0 13px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.btn.ok { background: #2b7a4b; border-color: #2b7a4b; color: #fff; }
.btn.bad { background: #fff; border-color: #c9302c; color: #c9302c; }
.msg { font-size: 13px; color: #2b7a4b; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.hero { background: #fff; border-radius: 10px; padding: 18px 20px; display: flex; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.h-name { font-size: 18px; font-weight: 600; color: #1b2733; display: flex; align-items: center; gap: 10px; }
.h-sub { font-size: 12.5px; color: #8a97a5; margin-top: 7px; }
.h-meta { display: flex; gap: 22px; font-size: 12.5px; color: #3d4b5a; flex-wrap: wrap; }
.h-meta .k { color: #9aa6b2; margin-right: 6px; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #f4f6f8; color: #5a6875; font-weight: 400; }
.st-已通过, .st-已最终确认 { background: #e8f5ed; color: #2b7a4b; }
.st-待审核, .st-待最终确认 { background: #fff3e0; color: #b26a00; }
.st-未通过 { background: #fdeceb; color: #c9302c; }
.alert { background: #fff3e0; color: #b26a00; font-size: 12.5px; border-radius: 8px; padding: 10px 14px; margin-top: 12px; border-left: 3px solid #c9a45c; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; margin-top: 12px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 9px 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 9px 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.dim2 { color: #8a97a5; }
.row-del td { opacity: .55; }
.del td { opacity: .5; }
.dtag { font-size: 10.5px; background: #f4f6f8; color: #9aa6b2; border-radius: 3px; padding: 1px 5px; margin-left: 6px; }
.vtag { font-size: 10.5px; background: #fff3e0; color: #b26a00; border-radius: 3px; padding: 1px 5px; margin-left: 6px; }
.src { font-size: 11px; border-radius: 4px; padding: 1px 6px; background: #e4f3ea; color: #0e7a4f; }
.src-新增 { background: #e8f5ed; color: #2b7a4b; }
.src-分割 { background: #fff3e0; color: #b26a00; }
.src-合户并入 { background: #ede7f6; color: #5e35b1; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.timeline { display: flex; flex-direction: column; gap: 9px; }
.tl-item { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: #5a6875; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: #dfe4ea; }
.dot.on { background: #2b7a4b; }
.dot.warn { background: #c9a45c; }
.actions { display: flex; gap: 10px; margin-top: 14px; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 420px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.fld { margin-bottom: 14px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld select, .fld textarea { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; font-family: inherit; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 30px; }
</style>
