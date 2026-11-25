import { reactive, computed } from 'vue'
import {
  login as apiLogin,
  changePassword as apiChangePassword,
  bindWechat as apiBindWechat,
  fetchMyHousehold,
  saveBasicInfo as apiSaveBasicInfo,
  fetchMembers,
  addMember as apiAddMember,
  updateMember as apiUpdateMember,
  softDeleteMember as apiSoftDeleteMember,
  restoreMember as apiRestoreMember,
  fetchLands,
  addLand as apiAddLand,
  updateLand as apiUpdateLand,
  softDeleteLand as apiSoftDeleteLand,
  restoreLand as apiRestoreLand,
  splitLand as apiSplitLand,
  fetchLandSplits,
  saveChanges as apiSaveChanges,
  submitConfirm as apiSubmitConfirm,
  submitFinalConfirm as apiSubmitFinalConfirm,
  applySplit as apiApplySplit,
  fetchSplitApplications,
  getVillageGroups,
} from '@/api/farmer'
import { setToken, setUser, clearAuth, getUser } from '@/api/request'
import { showToast } from '@/store/toast'

/* ============================================================
   农户端 store（PRD v2.8）

   口径要点：
   - 登录：身份证号（=账号）+ 真实密码；首登强制改密才可进业务页
   - 微信强绑定：wx.login → code → openid 落库；本期 mock openid
   - 提交即锁：仅 status ∈ {未提交, 未通过} 可编辑
   - 最终确认：仅 status = 待最终确认（村级通过 + 矢量回传后置位）
   - 地块：编码/合同面积/实测面积/质量等级 只读；来源标记四值
   - 变更类型：官方 11 类多选，勾「直接延包」清空其余
   ============================================================ */

const CHANGES_KEY = 'lr_changes'
const BIND_KEY = 'lr_openid'

/** 官方口径 11 类（《村实施方案数据统计表》照抄） */
export const CHANGE_CATEGORIES = [
  '直接延包', '户主变更', '增加成员', '减少成员', '分户', '合户',
  '地块信息错误（户）', '征地', '整户消亡', '新增户', '无地户',
]

/** 地块来源标记四值 */
export const LAND_SOURCES = ['原有', '新增', '分割', '合户并入']

/** 可编辑的户级状态 */
const EDITABLE_STATUS = ['未提交', '未通过']

const state = reactive({
  // 登录态
  loggedIn: false,
  wechatBound: false,
  mustChangePassword: false,
  /** 身份证号（=账号），改密页需要 */
  username: '',

  // 户主 / 户籍
  household: {
    name: '',
    initial: '',
    villageGroup: '',
    idMasked: '',
    status: '',
    phase: 1,
  },

  // 基本信息表单
  basicInfo: {
    contractorName: '',
    leader: '',
    name: '',
    phone: '',
    idCard: '',
    address: '',
    contractNo: '',
    plotCount: 0,
    area: 0,
    periodStart: '',
    periodEnd: '',
  },

  // 家庭成员
  members: [],

  // 承包地
  lands: [],

  // 分割记录
  landSplits: [],

  // 分户申请记录
  splitApplications: [],

  // 变更与诉求（changeType 多选数组）
  changes: {
    changeType: [],
    otherNote: '',
    appeal: '',
  },

  // 确认提交
  confirm: {
    agreed: false,
    submitted: false,
    finalSubmitted: false,
    /** 二次审查问题意见（单一文本框，可留空） */
    opinion: '',
    opinionStatus: '',
  },

  // 各模块完成状态（驱动首页进度与解锁）
  sections: {
    basic: 'todo',
    family: 'todo',
    land: 'todo',
    changes: 'todo',
    confirm: 'locked',
  },

  /** 后端下发的可操作标记 */
  canEdit: true,
  canFinalConfirm: false,
  splitPending: false,
  noReviewNeeded: false,
  reviewOpinion: '',
  changeCategory: '',

  loading: false,
})

/* ---------- 计算属性 ---------- */
const completedCount = computed(() => {
  const s = state.sections
  return [s.basic, s.family, s.land, s.changes].filter((v) => v === 'done').length
})

const progress = computed(() => {
  const map = { done: 1, doing: 0.5, todo: 0, locked: 0 }
  const vals = Object.values(state.sections)
  const sum = vals.reduce((a, v) => a + (map[v] || 0), 0)
  return Math.round((sum / vals.length) * 100)
})

/** 面积累加保留 2 位小数：浮点相加会出现 10.600000000000001 */
const round2 = (v) => Math.round(v * 100) / 100
const totalArea = computed(() =>
  round2(state.lands.filter((l) => !l.deleted).reduce((a, l) => a + Number(l.area || 0), 0)),
)
const totalMeasured = computed(() =>
  round2(state.lands.filter((l) => !l.deleted).reduce((a, l) => a + (parseFloat(l.measuredArea) || 0), 0)),
)

const membersActive = computed(() => state.members.filter((m) => !m.deleted))
const landsActive = computed(() => state.lands.filter((l) => !l.deleted))
const deletedLands = computed(() => state.lands.filter((l) => l.deleted))
/** 待线下划矢量的地块（分户/分割产生、新增未测） */
const pendingVectorLands = computed(() => landsActive.value.filter((l) => l.isPendingVector))

/* ---------- 字段映射：后端 ↔ 前端 ---------- */
function landFromApi(p) {
  return {
    id: p.id,
    code: p.plotCode || '',
    name: p.plotName || '',
    area: Number(p.contractArea) || 0,
    measuredArea: Number(p.measuredArea) || 0,
    use: p.landUse || '',
    // 质量等级无值不展示（PRD：有值只读展示、无值不显示）
    quality: p.landGrade || '',
    badge: p.badge || '一般农田',
    status: p.status || '待核实',
    // 来源标记四值：原有 / 新增 / 分割 / 合户并入
    source: p.source || '原有',
    isPendingVector: !!p.isPendingVector,
    splitNote: p.splitNote || '',
    splitFromId: p.splitFromId || null,
    splitToId: p.splitToId || null,
    adjustNote: p.adjustNote || '',
    bizStatus: p.bizStatus || '延包',
    boundary: {
      东: p.boundaryEast || '',
      南: p.boundarySouth || '',
      西: p.boundaryWest || '',
      北: p.boundaryNorth || '',
    },
    deleted: !!p.deleted || p.deleted === 1,
    deletedReason: p.deletedReason || '',
  }
}

function memberFromApi(m) {
  return {
    id: m.id,
    name: m.name,
    relation: m.relation,
    idCard: m.idCard,
    isMember: m.isMember,
    memberType: m.memberType,
    changeType: m.changeType,
    changeNote: m.changeNote || '',
    phone: m.phone || '',
    initial: (m.name && m.name[0]) || '新',
    migratedFromOther: m.migratedFromOther,
    migratedFromOrg: m.migratedFromOrg || '',
    source: m.source || '基线',
    deleted: !!m.deleted || m.deleted === 1,
  }
}

function memberToApi(m) {
  return {
    name: m.name,
    relation: m.relation,
    idCard: m.idCard,
    isMember: m.isMember,
    memberType: m.memberType,
    changeType: m.changeType,
    changeNote: m.changeNote || '',
    phone: m.phone || '',
    migratedFromOther: m.migratedFromOther,
    migratedFromOrg: m.migratedFromOrg || '',
  }
}

// 日期 "1998-01-01" → "1998年01月01日"
function formatDate(d) {
  if (!d) return ''
  const m = String(d).match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? m[1] + '年' + m[2] + '月' + m[3] + '日' : String(d)
}

/* ---------- 内部工具 ---------- */
let groupMap = {}

function markSection(key, status) {
  state.sections[key] = status
  const allDone = ['basic', 'family', 'land', 'changes'].every((k) => state.sections[k] === 'done')
  if (allDone && state.sections.confirm === 'locked') state.sections.confirm = 'todo'
}

function applyHousehold(hh) {
  const name = hh.householder || ''
  state.household.initial = name ? name[0] : '户'
  state.household.name = name
  state.household.idMasked = hh.idCard || ''
  state.household.status = hh.status || ''
  state.household.phase = hh.phase || 1
  state.household.villageGroup = hh.villageGroup || groupMap[hh.groupId] || (hh.groupId ? '第' + hh.groupId + '组' : '')
  state.basicInfo.contractorName = hh.contractorName || ''
  state.basicInfo.leader = hh.leader || ''
  state.basicInfo.name = name
  state.basicInfo.phone = hh.phone || ''
  state.basicInfo.idCard = hh.idCard || ''
  state.basicInfo.address = hh.address || ''
  state.basicInfo.contractNo = hh.contractNo || ''
  state.basicInfo.plotCount = hh.plotCount || 0
  state.basicInfo.area = Number(hh.contractArea) || 0
  state.basicInfo.periodStart = formatDate(hh.periodStart)
  state.basicInfo.periodEnd = formatDate(hh.periodEnd)

  // v2.8 后端下发的可操作标记
  state.canEdit = hh.canEdit !== false
  state.canFinalConfirm = !!hh.canFinalConfirm
  state.splitPending = !!hh.splitPending
  state.noReviewNeeded = !!hh.noReviewNeeded
  state.reviewOpinion = hh.reviewOpinion || ''
  state.changeCategory = hh.changeCategory || ''
  if (hh.opinion != null) state.confirm.opinion = hh.opinion
  if (hh.opinionStatus) state.confirm.opinionStatus = hh.opinionStatus
}

function toArray(res) {
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res.list)) return res.list
  if (res && Array.isArray(res.records)) return res.records
  return []
}

/* ---------- 数据加载 ---------- */
async function loadAll() {
  state.loading = true
  try {
    const hh = await fetchMyHousehold()
    let members = []
    let lands = []
    try {
      members = toArray(await fetchMembers())
    } catch (e) {
      members = []
    }
    try {
      lands = toArray(await fetchLands())
    } catch (e) {
      lands = []
    }
    try {
      state.landSplits = toArray(await fetchLandSplits())
    } catch (e) {
      state.landSplits = []
    }
    try {
      state.splitApplications = toArray(await fetchSplitApplications())
    } catch (e) {
      state.splitApplications = []
    }
    try {
      const groups = toArray(await getVillageGroups())
      groupMap = {}
      groups.forEach((g) => {
        groupMap[g.id] = g.name
      })
    } catch (e) {
      /* 村组接口失败不阻断 */
    }

    applyHousehold(hh)
    state.members = members.map(memberFromApi)
    state.lands = lands.map(landFromApi)

    // 变更诉求：后端返回 changes（changeType 已是数组）
    const remote = hh && hh.changes
    if (remote && remote.changeType) {
      state.changes.changeType = Array.isArray(remote.changeType)
        ? remote.changeType.filter(Boolean)
        : String(remote.changeType).split(',').filter(Boolean)
      state.changes.otherNote = remote.otherNote || ''
      state.changes.appeal = remote.appeal || ''
    } else {
      const cached = uni.getStorageSync(CHANGES_KEY)
      if (cached) Object.assign(state.changes, cached)
    }

    // 进度推导
    state.sections.basic = 'done'
    state.sections.family = state.members.length ? 'done' : 'todo'
    state.sections.land = state.lands.length ? 'done' : 'doing'
    state.sections.changes = state.changes.changeType && state.changes.changeType.length ? 'done' : 'todo'

    const st = hh.status
    if (['待审核', '已通过', '待最终确认', '已最终确认'].includes(st)) {
      state.confirm.submitted = true
      state.sections.confirm = 'submitted'
    } else if (['basic', 'family', 'land', 'changes'].every((k) => state.sections[k] === 'done')) {
      state.sections.confirm = 'todo'
    } else {
      state.sections.confirm = 'locked'
    }
    if (st === '已最终确认' || hh.finalSubmittedAt) state.confirm.finalSubmitted = true

    return hh
  } finally {
    state.loading = false
  }
}

/* ---------- Actions ---------- */

/**
 * 登录：身份证号（=账号）+ 真实密码
 * 返回 { ok, mustChangePassword } —— 首登须先跳改密页
 */
async function login(idCard, password) {
  try {
    const idc = String(idCard || '').trim()
    const data = await apiLogin({ username: idc, password })
    setToken(data.token)
    setUser(data.user)
    state.loggedIn = true
    state.username = idc
    state.mustChangePassword = !!data.mustChangePassword
    state.wechatBound = !!data.wechatBound
    state.household.name = (data.user && data.user.realName) || state.household.name
    if (!state.household.idMasked && idc) {
      state.household.idMasked = idc.replace(/^(\d{4})\d{10}(\d{4})$/, '$1**********$2')
    }
    // 未改密前不拉业务数据（后端也拦），由页面决定跳改密
    if (!state.mustChangePassword) {
      await loadAll()
    }
    return { ok: true, mustChangePassword: state.mustChangePassword }
  } catch (err) {
    showToast(err.message || '登录失败')
    return { ok: false, message: err.message }
  }
}

/** 首登强制改密 / 主动改密 */
async function changePassword(oldPassword, newPassword) {
  try {
    await apiChangePassword(oldPassword, newPassword)
    state.mustChangePassword = false
    await loadAll()
    return true
  } catch (err) {
    showToast(err.message || '修改密码失败')
    return false
  }
}

/**
 * 微信绑定（强绑定：一户一 openid）
 * 小程序端：wx.login 取 code → 后端 code2session → openid
 * 本期未接微信服务端，用本地持久化的 mock openid 走通流程
 */
async function bindWechat() {
  try {
    let openid = uni.getStorageSync(BIND_KEY)
    if (!openid) {
      // 真机接入时：uni.login({provider:'weixin'}) 取 code 换 openid
      openid = 'mock_' + (state.username || 'farmer') + '_' + Date.now().toString(36)
      uni.setStorageSync(BIND_KEY, openid)
    }
    const r = await apiBindWechat(openid, '')
    state.wechatBound = true
    return { ok: true, suffix: r && r.openidSuffix ? r.openidSuffix : '' }
  } catch (err) {
    // 后端拒绝（如该微信已绑其他账号）时保留未绑定状态，不静默通过
    state.wechatBound = false
    showToast(err.message || '微信绑定失败')
    return { ok: false, message: err.message }
  }
}

function logout() {
  clearAuth()
  state.loggedIn = false
  state.wechatBound = false
  state.mustChangePassword = false
  state.username = ''
  state.sections.basic = 'todo'
  state.sections.family = 'todo'
  state.sections.land = 'todo'
  state.sections.changes = 'todo'
  state.sections.confirm = 'locked'
  state.members = []
  state.lands = []
  state.landSplits = []
  state.splitApplications = []
}

function requireEditable() {
  if (!state.canEdit) {
    showToast('当前状态「' + state.household.status + '」不可修改')
    return false
  }
  return true
}

/** 基本信息：只改地址/电话（发包方、身份证、编码、合同号、承包期只读） */
async function saveBasicInfoAction(patch) {
  if (!requireEditable()) return false
  try {
    await apiSaveBasicInfo({ address: patch.address, phone: patch.phone })
    state.basicInfo.address = patch.address
    state.basicInfo.phone = patch.phone
    markSection('basic', 'done')
    return true
  } catch (err) {
    showToast(err.message || '保存失败')
    return false
  }
}

async function addMemberAction(member) {
  if (!requireEditable()) return false
  try {
    const payload = memberToApi({ changeType: '新增（出生/迁入）', ...member })
    const data = await apiAddMember(payload)
    state.members.push(memberFromApi({ ...payload, id: data && data.id, source: '新增', deleted: 0 }))
    markSection('family', 'done')
    return true
  } catch (err) {
    showToast(err.message || '添加失败')
    return false
  }
}

async function updateMemberAction(id, patch) {
  if (!requireEditable()) return false
  try {
    const m = state.members.find((x) => x.id === id)
    await apiUpdateMember(id, memberToApi({ ...(m || {}), ...patch }))
    if (m) Object.assign(m, patch)
    markSection('family', 'done')
    return true
  } catch (err) {
    showToast(err.message || '保存失败')
    return false
  }
}

async function softDeleteMemberAction(id) {
  if (!requireEditable()) return false
  try {
    await apiSoftDeleteMember(id)
    const m = state.members.find((x) => x.id === id)
    if (m) m.deleted = true
    return true
  } catch (err) {
    showToast(err.message || '删除失败')
    return false
  }
}

async function restoreMemberAction(id) {
  if (!requireEditable()) return false
  try {
    await apiRestoreMember(id)
    const m = state.members.find((x) => x.id === id)
    if (m) m.deleted = false
    return true
  } catch (err) {
    showToast(err.message || '恢复失败')
    return false
  }
}

/* ---------- 承包地 CRUD ---------- */

/**
 * 新增地块（B-A13）
 * - 编号由系统生成，农户不填
 * - 不填合同面积：只填自测面积，后端以自测面积落库为合同面积
 * - 来源标记「新增」、待线下划矢量
 */
async function addLandAction(land) {
  if (!requireEditable()) return false
  try {
    const payload = {
      plotName: land.name,
      landUse: land.use,
      measuredArea: Number(land.measuredArea) || 0,
      boundaryEast: (land.boundary && land.boundary['东']) || '',
      boundarySouth: (land.boundary && land.boundary['南']) || '',
      boundaryWest: (land.boundary && land.boundary['西']) || '',
      boundaryNorth: (land.boundary && land.boundary['北']) || '',
    }
    const data = await apiAddLand(payload)
    // 重新拉一次，拿到后端生成的编码等只读字段
    const fresh = toArray(await fetchLands()).map(landFromApi)
    state.lands = fresh
    markSection('land', 'done')
    return data && data.id
  } catch (err) {
    showToast(err.message || '添加失败')
    return false
  }
}

/** 修改地块：只提交名称/用途/四至/调整说明（只读字段不传，传了也会被后端忽略） */
async function updateLandAction(id, patch) {
  if (!requireEditable()) return false
  try {
    await apiUpdateLand(id, {
      plotName: patch.name,
      landUse: patch.use,
      adjustNote: patch.adjustNote || '',
      boundaryEast: (patch.boundary && patch.boundary['东']) || '',
      boundarySouth: (patch.boundary && patch.boundary['南']) || '',
      boundaryWest: (patch.boundary && patch.boundary['西']) || '',
      boundaryNorth: (patch.boundary && patch.boundary['北']) || '',
    })
    const fresh = toArray(await fetchLands()).map(landFromApi)
    state.lands = fresh
    markSection('land', 'done')
    return true
  } catch (err) {
    showToast(err.message || '保存失败')
    return false
  }
}

async function softDeleteLandAction(id, reason) {
  if (!requireEditable()) return false
  if (!reason || !String(reason).trim()) {
    showToast('删除地块须填写原因')
    return false
  }
  try {
    await apiSoftDeleteLand(id, reason)
    const l = state.lands.find((x) => x.id === id)
    if (l) {
      l.deleted = true
      l.deletedReason = reason
    }
    return true
  } catch (err) {
    showToast(err.message || '删除失败')
    return false
  }
}

async function restoreLandAction(id) {
  if (!requireEditable()) return false
  try {
    await apiRestoreLand(id)
    const l = state.lands.find((x) => x.id === id)
    if (l) l.deleted = false
    return true
  } catch (err) {
    showToast(err.message || '恢复失败')
    return false
  }
}

/** F-A10 分割登记 */
async function splitLandAction(id, payload) {
  if (!requireEditable()) return false
  try {
    const r = await apiSplitLand(id, payload)
    const fresh = toArray(await fetchLands()).map(landFromApi)
    state.lands = fresh
    try {
      state.landSplits = toArray(await fetchLandSplits())
    } catch (e) {
      /* ignore */
    }
    return r
  } catch (err) {
    showToast(err.message || '分割登记失败')
    return false
  }
}

/** 保存变更诉求：官方 11 类多选，勾「直接延包」清空其余 */
async function saveChangesAction(patch) {
  if (!requireEditable()) return false
  try {
    let types = Array.isArray(patch.changeType) ? patch.changeType.slice() : []
    if (types.includes('直接延包')) types = ['直接延包']
    await apiSaveChanges({
      // 后端 changeType 为逗号拼接字符串
      changeType: types.join(','),
      otherNote: patch.otherNote || '',
      appeal: patch.appeal || '',
      willing: patch.willing || '',
    })
    state.changes.changeType = types
    state.changes.otherNote = patch.otherNote || ''
    state.changes.appeal = patch.appeal || ''
    try {
      uni.setStorageSync(CHANGES_KEY, state.changes)
    } catch (e) {
      /* ignore */
    }
    markSection('changes', 'done')
    return true
  } catch (err) {
    showToast(err.message || '保存失败')
    return false
  }
}

/** F-A13 第一轮提交（提交即锁） */
async function submitConfirmAction() {
  try {
    const data = await apiSubmitConfirm()
    state.confirm.submitted = true
    state.household.status = (data && data.status) || '待审核'
    // phase 保持 1：第二轮最终确认要等村级通过 + 矢量回传
    state.household.phase = 1
    state.canEdit = false
    state.sections.confirm = 'submitted'
    return true
  } catch (err) {
    showToast(err.message || '提交失败')
    return false
  }
}

/** F-A14 最终确认：只收问题意见（可留空），不改任何数据 */
async function submitFinalConfirmAction(opinion, agreed) {
  if (state.confirm.finalSubmitted) return false
  if (!state.canFinalConfirm) {
    showToast('暂不可最终确认：须村级审核通过且本村矢量成果已回传')
    return false
  }
  try {
    const data = await apiSubmitFinalConfirm(opinion, agreed)
    state.confirm.finalSubmitted = true
    state.confirm.submitted = true
    state.confirm.opinion = opinion || ''
    state.confirm.opinionStatus = (data && data.opinionStatus) || '待上报镇级'
    state.household.phase = 2
    state.household.status = '已最终确认'
    state.canEdit = false
    state.canFinalConfirm = false
    return true
  } catch (err) {
    showToast(err.message || '提交失败')
    return false
  }
}

/** F-A12 分户申请（提交即锁、不可撤回） */
async function applySplitAction(payload) {
  try {
    const r = await apiApplySplit(payload)
    state.splitPending = true
    state.canEdit = false
    try {
      state.splitApplications = toArray(await fetchSplitApplications())
    } catch (e) {
      /* ignore */
    }
    return r
  } catch (err) {
    showToast(err.message || '分户申请提交失败')
    return false
  }
}

export const store = {
  state,
  progress,
  totalArea,
  totalMeasured,
  completedCount,
  membersActive,
  landsActive,
  deletedLands,
  pendingVectorLands,
  loadAll,
  markSection,
  addMember: addMemberAction,
  updateMember: updateMemberAction,
  softDeleteMember: softDeleteMemberAction,
  restoreMember: restoreMemberAction,
  saveBasicInfo: saveBasicInfoAction,
  saveChanges: saveChangesAction,
  submitConfirm: submitConfirmAction,
  submitFinalConfirm: submitFinalConfirmAction,
  addLand: addLandAction,
  updateLand: updateLandAction,
  softDeleteLand: softDeleteLandAction,
  restoreLand: restoreLandAction,
  splitLand: splitLandAction,
  applySplit: applySplitAction,
  login,
  changePassword,
  bindWechat,
  logout,
  getUser,
}
