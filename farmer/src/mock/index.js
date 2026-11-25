/* ============================================================
   农户端原型 mock（uni.request 拦截）
   ------------------------------------------------------------
   演示账号（密码统一 123456，账号=户主身份证号）：
     420123199003071234  张建国 · 幸福村二组 · 填报中
     420123199205124321  王德发 · 幸福村一组 · 已提交待审核
     420123198504126789  赵桂芳 · 幸福村三组 · 待最终确认（第二轮已开放）
     420123197008152233  刘老根 · 和平村一组 · 已退回需修改
   数据落 uni storage，改一次刷新不丢；清空 storage 即恢复初始。
   ============================================================ */

const KEY = 'lr_mock_db_v2'

const mask = (id) => String(id || '').replace(/^(\d{6})(?:\d{8})(\d{4})$/, '$1********$2')

/* ---------------- 四个演示户 ---------------- */
const PROFILES = {
  zhang: {
    account: { idCard: '420123199003071234', password: '123456', realName: '张建国', villageName: '幸福村', group: '二组' },
    household: {
      id: 'H0001',
      householder: '张建国',
      idCard: mask('420123199003071234'),
      status: '待核实',
      phase: 1,
      villageName: '幸福村',
      villageGroup: '二组',
      groupId: 2,
      address: '幸福镇幸福村二组 12 号',
      phone: '138****6721',
      contractorName: '幸福村村民委员会',
      leaderName: '张建国',
      contractNo: 'XF-V01-001',
      changes: { changeType: [], otherNote: '', appeal: '' },
      progress: { round: 1, submitted: false, finalConfirmed: false },
    },
    members: [
      { id: 'M1', name: '张建国', relation: '户主', idCard: mask('420123199003071234'), isMember: true, memberType: '世居', changeType: '保留', source: '基线', deleted: false },
      { id: 'M2', name: '李秀英', relation: '配偶', idCard: mask('420123199205128888'), isMember: true, memberType: '婚迁', changeType: '保留', source: '基线', deleted: false },
      { id: 'M3', name: '张小明', relation: '子', idCard: mask('420123201803081234'), isMember: true, memberType: '出生', changeType: '保留', source: '基线', deleted: false },
      { id: 'M4', name: '张玉珍', relation: '母', idCard: mask('420123195504073313'), isMember: true, memberType: '世居', changeType: '保留', source: '基线', deleted: false },
    ],
    lands: [
      { id: 'L1', plotCode: '02-001', plotName: '二组东坡地', contractArea: 4.8, measuredArea: 4.75, landUse: '耕地', landGrade: '二级', badge: '基本农田', status: '待核实', source: '原有', isPendingVector: false, adjustNote: '', boundaryEast: '张德发地', boundarySouth: '生产路', boundaryWest: '水渠', boundaryNorth: '村集体机动地', deleted: false },
      { id: 'L2', plotCode: '02-002', plotName: '二组南洼地', contractArea: 3.6, measuredArea: 3.6, landUse: '水田', landGrade: '一级', badge: '基本农田', status: '待核实', source: '原有', isPendingVector: false, adjustNote: '', boundaryEast: '李桂芳地', boundarySouth: '排水沟', boundaryWest: '张建国地', boundaryNorth: '机耕道', deleted: false },
      { id: 'L3', plotCode: '02-003', plotName: '二组河沿地', contractArea: 4.1, measuredArea: 4.28, landUse: '旱地', landGrade: '三级', badge: '一般农田', status: '待核实', source: '原有', isPendingVector: true, adjustNote: '实测多出 0.18 亩，已现场确认', boundaryEast: '村道', boundarySouth: '河堤', boundaryWest: '林地', boundaryNorth: '灌溉渠', deleted: false },
    ],
  },
  wang: {
    account: { idCard: '420123199205124321', password: '123456', realName: '王德发', villageName: '幸福村', group: '一组' },
    household: {
      id: 'H0002',
      householder: '王德发',
      idCard: mask('420123199205124321'),
      status: '待审核',
      phase: 1,
      villageName: '幸福村',
      villageGroup: '一组',
      groupId: 1,
      address: '幸福镇幸福村一组 8 号',
      phone: '139****3345',
      contractorName: '幸福村村民委员会',
      leaderName: '张建国',
      contractNo: 'XF-V01-002',
      changes: { changeType: ['直接延包'], otherNote: '', appeal: '' },
      progress: { round: 1, submitted: true, submittedAt: '2026-11-20 10:12', finalConfirmed: false },
    },
    members: [
      { id: 'M11', name: '王德发', relation: '户主', idCard: mask('420123199205124321'), isMember: true, memberType: '世居', changeType: '保留', source: '基线', deleted: false },
      { id: 'M12', name: '孙桂兰', relation: '配偶', idCard: mask('420123199408123344'), isMember: true, memberType: '婚迁', changeType: '保留', source: '基线', deleted: false },
      { id: 'M13', name: '王小强', relation: '子', idCard: mask('420123201605204455'), isMember: true, memberType: '出生', changeType: '保留', source: '基线', deleted: false },
      { id: 'M14', name: '王小丽', relation: '女', idCard: mask('420123201811306677'), isMember: true, memberType: '出生', changeType: '保留', source: '基线', deleted: false },
      { id: 'M15', name: '王老太', relation: '母', idCard: mask('420123194903158899'), isMember: true, memberType: '世居', changeType: '保留', source: '基线', deleted: false },
    ],
    lands: [
      { id: 'L11', plotCode: '01-001', plotName: '一组东大排', contractArea: 5.2, measuredArea: 5.2, landUse: '水田', landGrade: '一级', badge: '基本农田', status: '已核实', source: '原有', isPendingVector: false, adjustNote: '', boundaryEast: '村道', boundarySouth: '刘老根地', boundaryWest: '水渠', boundaryNorth: '生产路', deleted: false },
      { id: 'L12', plotCode: '01-002', plotName: '一组西沟地', contractArea: 3.8, measuredArea: 3.75, landUse: '耕地', landGrade: '二级', badge: '基本农田', status: '已核实', source: '原有', isPendingVector: false, adjustNote: '实测少 0.05 亩，误差范围内', boundaryEast: '李桂芳地', boundarySouth: '沟渠', boundaryWest: '村集体机动地', boundaryNorth: '机耕道', deleted: false },
      { id: 'L13', plotCode: '01-003', plotName: '一组北岭地', contractArea: 4.6, measuredArea: 4.6, landUse: '旱地', landGrade: '三级', badge: '一般农田', status: '已核实', source: '原有', isPendingVector: false, adjustNote: '', boundaryEast: '林地', boundarySouth: '村道', boundaryWest: '赵桂芳地', boundaryNorth: '河堤', deleted: false },
      { id: 'L14', plotCode: '01-004', plotName: '一组河沿新增', contractArea: 1.2, measuredArea: 1.2, landUse: '耕地', landGrade: '三级', badge: '一般农田', status: '已核实', source: '新增', isPendingVector: true, adjustNote: '', boundaryEast: '河堤', boundarySouth: '河堤', boundaryWest: '村道', boundaryNorth: '水渠', deleted: false },
    ],
  },
  zhao: {
    account: { idCard: '420123198504126789', password: '123456', realName: '赵桂芳', villageName: '幸福村', group: '三组' },
    household: {
      id: 'H0003',
      householder: '赵桂芳',
      idCard: mask('420123198504126789'),
      status: '待最终确认',
      phase: 2,
      villageName: '幸福村',
      villageGroup: '三组',
      groupId: 3,
      address: '幸福镇幸福村三组 21 号',
      phone: '137****9087',
      contractorName: '幸福村村民委员会',
      leaderName: '张建国',
      contractNo: 'XF-V01-003',
      changes: { changeType: ['户主变更'], otherNote: '', appeal: '' },
      progress: { round: 2, submitted: true, submittedAt: '2026-11-18 15:40', finalConfirmed: false, unlockedAt: '2026-11-22 09:10' },
      reviewOpinion: '材料齐全，予以通过；矢量成果已回传，可进行第二轮最终确认',
    },
    members: [
      { id: 'M21', name: '赵桂芳', relation: '户主', idCard: mask('420123198504126789'), isMember: true, memberType: '世居', changeType: '保留', source: '基线', deleted: false },
      { id: 'M22', name: '刘志强', relation: '配偶', idCard: mask('420123198207225566'), isMember: true, memberType: '婚迁', changeType: '保留', source: '基线', deleted: false },
      { id: 'M23', name: '刘洋', relation: '子', idCard: mask('420123201002147788'), isMember: true, memberType: '出生', changeType: '保留', source: '基线', deleted: false },
    ],
    lands: [
      { id: 'L21', plotCode: '03-001', plotName: '三组南洼地', contractArea: 6.4, measuredArea: 6.4, landUse: '水田', landGrade: '一级', badge: '基本农田', status: '已确权', source: '原有', isPendingVector: false, adjustNote: '', boundaryEast: '村道', boundarySouth: '排水沟', boundaryWest: '张建国地', boundaryNorth: '机耕道', deleted: false },
      { id: 'L22', plotCode: '03-002', plotName: '三组北岭地', contractArea: 4.2, measuredArea: 4.2, landUse: '旱地', landGrade: '二级', badge: '基本农田', status: '已确权', source: '原有', isPendingVector: false, adjustNote: '', boundaryEast: '林地', boundarySouth: '村道', boundaryWest: '水渠', boundaryNorth: '河堤', deleted: false },
    ],
  },
  liu: {
    account: { idCard: '420123197008152233', password: '123456', realName: '刘老根', villageName: '和平村', group: '一组' },
    household: {
      id: 'H0004',
      householder: '刘老根',
      idCard: mask('420123197008152233'),
      status: '已退回',
      phase: 1,
      villageName: '和平村',
      villageGroup: '一组',
      groupId: 1,
      address: '幸福镇和平村一组 5 号',
      phone: '135****4412',
      contractorName: '和平村村民委员会',
      leaderName: '王德发',
      contractNo: 'XF-V02-001',
      changes: { changeType: ['地块信息错误（户）'], otherNote: '', appeal: '' },
      progress: { round: 1, submitted: true, submittedAt: '2026-11-19 11:05', returnedAt: '2026-11-21 16:30', finalConfirmed: false },
      reviewOpinion: '地块四至与实测不一致，成员身份证号需核对，请修改后重新提交',
    },
    members: [
      { id: 'M31', name: '刘老根', relation: '户主', idCard: mask('420123197008152233'), isMember: true, memberType: '世居', changeType: '保留', source: '基线', deleted: false },
      { id: 'M32', name: '李桂芳', relation: '配偶', idCard: mask('420123197302189910'), isMember: true, memberType: '婚迁', changeType: '保留', source: '基线', deleted: false },
    ],
    lands: [
      { id: 'L31', plotCode: '01-005', plotName: '一组东坡地', contractArea: 5.5, measuredArea: 5.5, landUse: '耕地', landGrade: '二级', badge: '基本农田', status: '待核实', source: '原有', isPendingVector: true, adjustNote: '', boundaryEast: '', boundarySouth: '生产路', boundaryWest: '水渠', boundaryNorth: '', deleted: false },
      { id: 'L32', plotCode: '01-006', plotName: '一组西沟地', contractArea: 2.8, measuredArea: 2.8, landUse: '旱地', landGrade: '三级', badge: '一般农田', status: '待核实', source: '原有', isPendingVector: true, adjustNote: '', boundaryEast: '林地', boundarySouth: '', boundaryWest: '', boundaryNorth: '村道', deleted: false },
    ],
  },
}

/* 账号清单（登录页弹窗展示用） */
export const DEMO_ACCOUNTS = Object.keys(PROFILES).map((k) => ({
  key: k,
  idCard: PROFILES[k].account.idCard,
  password: PROFILES[k].account.password,
  realName: PROFILES[k].account.realName,
  villageName: PROFILES[k].account.villageName,
  group: PROFILES[k].account.group,
  status: PROFILES[k].household.status,
}))

function seed() {
  const profiles = {}
  for (const [k, p] of Object.entries(PROFILES)) {
    profiles[k] = {
      account: { ...p.account },
      household: JSON.parse(JSON.stringify(p.household)),
      members: JSON.parse(JSON.stringify(p.members)),
      lands: JSON.parse(JSON.stringify(p.lands)),
      landSplits: [],
      splitApplications: [],
    }
  }
  return {
    version: 2,
    current: 'zhang',
    profiles,
    groups: [
      { groupId: 1, groupName: '一组' },
      { groupId: 2, groupName: '二组' },
      { groupId: 3, groupName: '三组' },
    ],
    // 以下字段由 hydrate 从 profiles[current] 拷入，供 handler 直接使用
    account: null,
    household: null,
    members: [],
    lands: [],
    landSplits: [],
    splitApplications: [],
  }
}

/** 把 profiles[current] 的户数据铺到顶层，handler 无需关心多账号 */
function hydrate(d) {
  const p = d.profiles[d.current]
  d.account = p.account
  d.household = p.household
  d.members = p.members
  d.lands = p.lands
  d.landSplits = p.landSplits
  d.splitApplications = p.splitApplications
  return d
}

/** 把顶层改动写回 profiles[current] */
function syncBack(d) {
  const p = d.profiles[d.current]
  if (!p) return
  p.account = d.account
  p.household = d.household
  p.members = d.members
  p.lands = d.lands
  p.landSplits = d.landSplits
  p.splitApplications = d.splitApplications
}

function load() {
  try {
    const raw = uni.getStorageSync(KEY)
    if (raw && typeof raw === 'object' && raw.version === 2 && raw.profiles) {
      return hydrate(raw)
    }
  } catch (e) { /* ignore */ }
  const d = hydrate(seed())
  save(d)
  return d
}
function save(d) {
  syncBack(d)
  try { uni.setStorageSync(KEY, d) } catch (e) { /* ignore */ }
  return d
}
let cache = null
const db = () => (cache = cache || load())


export const MOCK_ENABLED = String(import.meta.env.VITE_USE_MOCK || 'true') !== 'false'

const now = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
let seq = 100
const nid = (p) => `${p}${++seq}`

const fail = (msg) => {
  const e = new Error(msg)
  e.code = 400
  throw e
}

export async function mockRequest(method, path, data) {
  await new Promise((r) => setTimeout(r, 80 + Math.random() * 150))
  const d = db()
  const clean = path.split('?')[0].replace(/\/+$/, '')
  const M = method.toUpperCase()
  const withQuery = path.includes('?') ? path.split('?')[1] : ''

  /* ---------- 登录 / 账号 ---------- */
  if (clean === '/auth/login' && M === 'POST') {
    const idc = String(data?.username || '').trim()
    const key = Object.keys(d.profiles).find((k) => d.profiles[k].account.idCard === idc)
    if (!key || d.profiles[key].account.password !== data?.password) {
      fail('身份证号或密码错误')
    }
    // 切换当前户：之后所有 /village/households/me 都返回该户数据
    d.current = key
    hydrate(d)
    save(d)
    return {
      token: 'mock.farmer.' + Date.now(),
      user: {
        realName: d.account.realName,
        idCard: mask(d.account.idCard),
        villageName: d.account.villageName,
        villageGroup: d.account.group,
      },
      mustChangePassword: false,
      wechatBound: true,
    }
  }
  if (clean === '/auth/user/info') {
    return {
      realName: d.account.realName,
      idCard: mask(d.account.idCard),
      villageName: d.account.villageName,
      mustChangePassword: false,
      wechatBound: true,
    }
  }
  /* 切换演示账号（登录页弹窗用，免去手动登出再登录） */
  if (clean === '/demo/account' && M === 'POST') {
    if (!d.profiles[data?.key]) fail('账号不存在')
    d.current = data.key
    hydrate(d)
    save(d)
    return { ok: true, account: d.account }
  }
  if (clean === '/demo/accounts') return DEMO_ACCOUNTS

  if (clean === '/auth/password/change') return {}
  if (clean === '/auth/wechat/bind') return { bound: true, openid: 'mock-openid' }
  if (clean === '/village/groups') return d.groups

  /* ---------- 户 ---------- */
  if (clean === '/village/households/me' && M === 'GET') {
    return { ...d.household, changes: d.household.changes, progress: d.household.progress }
  }
  if (clean === '/village/households/me/basic-info' && M === 'PUT') {
    if (data?.address) d.household.address = data.address
    if (data?.phone) d.household.phone = data.phone
    save(d)
    return d.household
  }

  /* ---------- 成员 ---------- */
  if (clean === '/village/households/me/members') {
    if (M === 'GET') return d.members
    if (M === 'POST') {
      const m = {
        id: nid('M'),
        name: data?.name || '新成员',
        relation: data?.relation || '子',
        idCard: data?.idCard || '',
        isMember: data?.isMember !== false,
        memberType: data?.memberType || '世居',
        changeType: data?.changeType || '新增',
        changeNote: data?.changeNote || '',
        phone: data?.phone || '',
        source: '新增',
        deleted: false,
      }
      d.members.push(m)
      save(d)
      return m
    }
  }
  if (/^\/village\/households\/me\/members\/[^/]+\/restore$/.test(clean) && M === 'POST') {
    const id = clean.split('/')[5]
    const m = d.members.find((x) => x.id === id)
    if (m) m.deleted = false
    save(d)
    return m || {}
  }
  if (/^\/village\/households\/me\/members\/[^/]+$/.test(clean)) {
    const id = clean.split('/')[5]
    const m = d.members.find((x) => x.id === id)
    if (!m) fail('成员不存在')
    if (M === 'PUT') { Object.assign(m, data || {}); save(d); return m }
    if (M === 'DELETE') {
      const heads = d.members.filter((x) => !x.deleted && x.relation === '户主')
      if (m.relation === '户主' && heads.length <= 1) fail('户内必须有且仅有 1 名户主')
      m.deleted = true
      save(d)
      return { ok: true }
    }
  }

  /* ---------- 地块 ---------- */
  if (clean === '/village/households/me/lands' && M === 'GET') return d.lands
  if (clean === '/village/households/me/lands' && M === 'POST') {
    const n = d.lands.length + 1
    const l = {
      id: nid('L'),
      plotCode: `02-${String(n).padStart(3, '0')}`,
      plotName: data?.plotName || '新增地块',
      contractArea: Number(data?.contractArea || 0),
      measuredArea: Number(data?.measuredArea || data?.contractArea || 0),
      landUse: data?.landUse || '耕地',
      landGrade: data?.landGrade || '',
      badge: '一般农田',
      status: '待核实',
      source: '新增',
      isPendingVector: true,
      adjustNote: '',
      boundaryEast: data?.boundaryEast || '',
      boundarySouth: data?.boundarySouth || '',
      boundaryWest: data?.boundaryWest || '',
      boundaryNorth: data?.boundaryNorth || '',
      deleted: false,
    }
    d.lands.push(l)
    save(d)
    return l
  }
  if (clean === '/village/households/me/lands/splits') return d.landSplits
  if (/^\/village\/households\/me\/lands\/[^/]+\/restore$/.test(clean) && M === 'POST') {
    const id = clean.split('/')[5]
    const l = d.lands.find((x) => x.id === id)
    if (l) l.deleted = false
    save(d)
    return l || {}
  }
  if (/^\/village\/households\/me\/lands\/[^/]+\/split$/.test(clean) && M === 'POST') {
    const id = clean.split('/')[5]
    const l = d.lands.find((x) => x.id === id)
    if (!l) fail('地块不存在')
    const area = Number(data?.splitArea || 0)
    if (!(area > 0) || area >= Number(l.contractArea)) fail('分割面积须大于 0 且小于原地块面积')
    const newLand = {
      ...l,
      id: nid('L'),
      plotCode: l.plotCode + '-1',
      plotName: data?.newPlotName || l.plotName + '（分割）',
      contractArea: area,
      measuredArea: area,
      source: '分割',
      splitFromId: l.id,
      isPendingVector: true,
      boundaryEast: data?.boundaryEast || '',
      boundarySouth: data?.boundarySouth || '',
      boundaryWest: data?.boundaryWest || '',
      boundaryNorth: data?.boundaryNorth || '',
    }
    l.contractArea = Math.round((Number(l.contractArea) - area) * 100) / 100
    l.measuredArea = Math.round((Number(l.measuredArea) - area) * 100) / 100
    l.splitToId = newLand.id
    l.splitNote = `分割给 ${newLand.plotName} ${area} 亩`
    d.lands.push(newLand)
    d.landSplits.unshift({ id: nid('LS'), fromId: l.id, toId: newLand.id, fromCode: l.plotCode, toCode: newLand.plotCode, area, reason: data?.reason || '子女分户分割', at: now() })
    save(d)
    return newLand
  }
  if (/^\/village\/households\/me\/lands\/[^/]+$/.test(clean)) {
    const id = clean.split('/')[5]
    const l = d.lands.find((x) => x.id === id)
    if (!l) fail('地块不存在')
    if (M === 'PUT') { Object.assign(l, data || {}); save(d); return l }
    if (M === 'DELETE') {
      const reason = decodeURIComponent((withQuery.split('reason=')[1] || '').replace(/\+/g, ' '))
      if (!reason.trim()) fail('删除地块须填写原因')
      l.deleted = true
      l.deletedReason = reason
      save(d)
      return { ok: true }
    }
  }

  /* ---------- 变更诉求 ---------- */
  if (clean === '/village/households/me/changes') {
    if (M === 'GET') return d.household.changes
    if (M === 'PUT') { d.household.changes = { ...d.household.changes, ...(data || {}) }; save(d); return d.household.changes }
  }

  /* ---------- 提交 / 最终确认 ---------- */
  if (clean === '/village/households/me/submit' && M === 'POST') {
    d.household.progress = { ...(d.household.progress || {}), round: 2, submitted: true, submittedAt: now() }
    d.household.status = '待审核'
    save(d)
    return { ok: true, status: '待审核', submittedAt: now() }
  }
  if (clean === '/village/households/me/final-confirm' && M === 'POST') {
    d.household.progress = { ...(d.household.progress || {}), finalConfirmed: true, confirmedAt: now() }
    d.household.changes = { ...d.household.changes, appeal: data?.opinion || d.household.changes.appeal }
    save(d)
    return { ok: true, finalConfirmed: true }
  }

  /* ---------- 分户申请 ---------- */
  if (clean === '/village/households/me/split-applications') {
    if (M === 'GET') return d.splitApplications
    if (M === 'POST') {
      const rec = { id: nid('SP'), ...(data || {}), status: '待村级审核', appliedAt: now() }
      d.splitApplications.unshift(rec)
      save(d)
      return rec
    }
  }

  /* ---------- GIS 图斑 ---------- */
  if (clean.startsWith('/gis/parcels/batch')) {
    return d.lands.map((l, i) => ({
      plotCode: l.plotCode,
      plotName: l.plotName,
      areaMu: l.contractArea,
      geometry: `POLYGON((125.31${i}0 45.120, 125.3130 45.120, 125.3130 45.1218, 125.3110 45.1218, 125.31${i}0 45.120))`,
    }))
  }

  fail(`原型未提供该接口：${M} ${clean}`)
}

export function resetMock() {
  cache = seed()
  save(cache)
  return cache
}
