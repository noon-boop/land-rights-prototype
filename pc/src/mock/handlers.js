/* ============================================================
   mock 接口分发：按 method + path 返回演示数据
   ------------------------------------------------------------
   覆盖 api/index.js 里全部 89 个接口 + 视图里直接调用的通用路径。
   写操作会真正改内存里的那份 db 并落 localStorage，所以流程能连贯走完。
   ============================================================ */

import { db, saveDb, currentUser, setSession, clearSession, resetDb, nextSeq } from './store'
import { ACCOUNTS, ORGS, permsOf, META } from './dataset'

const now = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
const today = () => now().slice(0, 10)
const round2 = (v) => Math.round(v * 100) / 100
const sum = (arr, f) => round2(arr.reduce((s, x) => s + Number(f(x) || 0), 0))

const FAIL = (msg, code = 400) => {
  const e = new Error(msg)
  e.code = code
  throw e
}

/* ---------------- 数据范围 ---------------- */
function scopeHouseholds(user, d) {
  const all = d.households
  if (!user) return all
  if (user.userType === 'VILLAGE') return all.filter((h) => h.villageId === user.villageId)
  if (user.userType === 'TOWN') return all.filter((h) => h.townId === user.townId)
  return all
}
const scopeVillages = (user, d) => {
  if (!user) return ORGS.villages
  if (user.userType === 'VILLAGE') return ORGS.villages.filter((v) => v.villageId === user.villageId)
  if (user.userType === 'TOWN') return ORGS.villages.filter((v) => v.townId === user.townId)
  return ORGS.villages
}
const scopeSubmissions = (user, d) => {
  if (!user) return d.submissions
  if (user.userType === 'VILLAGE') return d.submissions.filter((s) => s.villageId === user.villageId)
  if (user.userType === 'TOWN') return d.submissions.filter((s) => s.townId === user.townId)
  return d.submissions
}
const scopePackages = (user, d) => {
  if (!user) return d.packages
  if (user.userType === 'TOWN') return d.packages.filter((p) => p.townId === user.townId)
  if (user.userType === 'VILLAGE') return []
  return d.packages
}

/* ---------------- 分页 ---------------- */
function page(list, q) {
  const p = Number(q.page || 1)
  const size = Number(q.pageSize || 20)
  const total = list.length
  const start = (p - 1) * size
  const rows = list.slice(start, start + size)
  return { list: rows, records: rows, total, page: p, pageSize: size }
}

/* ---------------- 统计口径 ---------------- */
function villageStats(user, d) {
  const hs = scopeHouseholds(user, d)
  const byGroup = {}
  for (const v of ORGS.villages.filter((x) => !user || user.userType !== 'VILLAGE' || x.villageId === user.villageId)) {
    for (const g of v.groups) byGroup[g] = { total: 0, approved: 0, pending: 0, rejected: 0, unsubmitted: 0 }
  }
  for (const h of hs) {
    const g = h.villageGroup
    if (!byGroup[g]) byGroup[g] = { total: 0, approved: 0, pending: 0, rejected: 0, unsubmitted: 0 }
    byGroup[g].total += 1
    if (h.status === '已通过') byGroup[g].approved += 1
    else if (h.status === '待审核') byGroup[g].pending += 1
    else if (h.status === '未通过') byGroup[g].rejected += 1
    else if (h.status === '未提交') byGroup[g].unsubmitted += 1
  }
  const total = hs.length
  const approved = hs.filter((h) => h.status === '已通过').length
  return {
    total,
    totalHouseholds: total,
    approved,
    approvedHouseholds: approved,
    pending: hs.filter((h) => h.status === '待审核').length,
    pendingHouseholds: hs.filter((h) => h.status === '待审核').length,
    rejected: hs.filter((h) => h.status === '未通过').length,
    rejectedHouseholds: hs.filter((h) => h.status === '未通过').length,
    unsubmitted: hs.filter((h) => h.status === '未提交').length,
    unsubmittedHouseholds: hs.filter((h) => h.status === '未提交').length,
    cancelled: hs.filter((h) => h.status === '已注销' || h.deleted).length,
    totalArea: sum(hs.filter((h) => h.status !== '已注销'), (h) => h.contractArea),
    measuredArea: sum(hs.filter((h) => h.status !== '已注销'), (h) => h.measuredArea),
    totalPlots: hs.reduce((s, h) => s + h.plotCount, 0),
    totalMembers: hs.reduce((s, h) => s + h.memberCount, 0),
    progress: total ? Math.round((approved / total) * 100) : 0,
    byGroup,
    categoryStats: categoryStats(hs),
  }
}

function categoryStats(hs) {
  const m = {}
  META.CATS.forEach((c) => (m[c] = 0))
  hs.forEach((h) => {
    if (h.status === '已通过' && h.changeCategory && m[h.changeCategory] !== undefined) m[h.changeCategory] += 1
  })
  return m
}

function villageRow(v, d) {
  const hs = d.households.filter((h) => h.villageId === v.villageId)
  const valid = hs.filter((h) => h.status !== '已注销')
  const approved = hs.filter((h) => h.status === '已通过').length
  const total = hs.length
  const sub = d.submissions.find((s) => s.villageId === v.villageId)
  return {
    villageId: v.villageId,
    villageName: v.villageName,
    name: v.villageName,
    leaderName: v.leaderName,
    villageCount: 1,
    totalHouseholds: total,
    baseHouseholds: total + 2,
    approved: approved,
    approvedHouseholds: approved,
    pending: hs.filter((h) => h.status === '待审核').length,
    pendingHouseholds: hs.filter((h) => h.status === '待审核').length,
    rejectedHouseholds: hs.filter((h) => h.status === '未通过').length,
    unsubmittedHouseholds: hs.filter((h) => h.status === '未提交').length,
    cancelledHouseholds: hs.filter((h) => h.status === '已注销').length,
    cancelCount: hs.filter((h) => h.status === '已注销').length,
    addedHouseholds: 2,
    splitCount: 1,
    mergeCount: 1,
    baseArea: sum(valid, (h) => h.contractArea) + 12.4,
    totalArea: sum(valid, (h) => h.contractArea),
    measuredArea: sum(valid, (h) => h.measuredArea),
    vectorArea: sum(valid.filter((h) => h.vectorArea), (h) => h.vectorArea),
    progress: total ? Math.round((approved / total) * 100) : 0,
    reportStatus: sub ? (sub.statusCode === 'A' ? '未上报' : sub.statusCode === 'B' ? '待镇级审批' : '已上报') : '未上报',
    submitNo: sub ? sub.submitNo : '—',
    overdue: hs.filter((h) => h.status === '待审核').length > 3 ? 1 : 0,
    fixHouseholds: hs.filter((h) => h.status === '未通过').length,
    memberFixCount: hs.filter((h) => h.status === '未通过').length * 2,
    landFixCount: hs.filter((h) => h.status === '未通过').length * 3,
  }
}

function townStats(user, d) {
  const villages = scopeVillages(user, d).map((v) => villageRow(v, d))
  const hs = scopeHouseholds(user, d)
  const total = hs.length
  const approved = hs.filter((h) => h.status === '已通过').length
  const pkgs = scopePackages(user, d)
  return {
    totalHouseholds: total,
    total: total,
    approved,
    approvedHouseholds: approved,
    pending: hs.filter((h) => h.status === '待审核').length,
    pendingHouseholds: hs.filter((h) => h.status === '待审核').length,
    rejected: hs.filter((h) => h.status === '未通过').length,
    rejectedHouseholds: hs.filter((h) => h.status === '未通过').length,
    unsubmitted: hs.filter((h) => h.status === '未提交').length,
    cancelled: hs.filter((h) => h.status === '已注销').length,
    totalVillages: villages.length,
    totalArea: sum(hs.filter((h) => h.status !== '已注销'), (h) => h.contractArea),
    progress: total ? Math.round((approved / total) * 100) : 0,
    categoryStats: categoryStats(hs),
    byVillage: villages,
    villages,
    packages: pkgs.length,
    reportedVillages: villages.filter((v) => v.reportStatus === '已上报').length,
    memberFixCount: villages.reduce((s, v) => s + v.memberFixCount, 0),
    landFixCount: villages.reduce((s, v) => s + v.landFixCount, 0),
    fixHouseholds: villages.reduce((s, v) => s + v.fixHouseholds, 0),
  }
}

function countyStats(user, d) {
  const towns = ORGS.towns.map((t) => {
    const vs = ORGS.villages.filter((v) => v.townId === t.townId).map((v) => villageRow(v, d))
    const hs = d.households.filter((h) => h.townId === t.townId)
    const pkg = d.packages.find((p) => p.townId === t.townId && p.statusCode !== 'E')
    return {
      townId: t.townId,
      townName: t.townName,
      name: t.townName,
      villageCount: vs.length,
      villages: vs,
      totalHouseholds: hs.length,
      approvedHouseholds: hs.filter((h) => h.status === '已通过').length,
      pendingHouseholds: hs.filter((h) => h.status === '待审核').length,
      rejectedHouseholds: hs.filter((h) => h.status === '未通过').length,
      totalArea: sum(hs.filter((h) => h.status !== '已注销'), (h) => h.contractArea),
      measuredArea: sum(hs.filter((h) => h.status !== '已注销'), (h) => h.measuredArea),
      progress: hs.length ? Math.round((hs.filter((h) => h.status === '已通过').length / hs.length) * 100) : 0,
      reportStatus: pkg ? (pkg.statusCode === 'G' ? '县级已通过' : pkg.statusCode === 'F' ? '待县级审批' : '待组包') : '待组包',
      submitted: !!pkg,
      submitNo: pkg ? pkg.packageNo : '—',
      fixHouseholds: hs.filter((h) => h.status === '未通过').length,
      memberFixCount: hs.filter((h) => h.status === '未通过').length * 2,
      landFixCount: hs.filter((h) => h.status === '未通过').length * 3,
    }
  })
  const hs = d.households
  return {
    totalTowns: towns.length,
    totalVillages: ORGS.villages.length,
    totalHouseholds: hs.length,
    total: hs.length,
    approved: hs.filter((h) => h.status === '已通过').length,
    approvedHouseholds: hs.filter((h) => h.status === '已通过').length,
    pending: hs.filter((h) => h.status === '待审核').length,
    rejected: hs.filter((h) => h.status === '未通过').length,
    unsubmitted: hs.filter((h) => h.status === '未提交').length,
    totalArea: sum(hs.filter((h) => h.status !== '已注销'), (h) => h.contractArea),
    reportedTowns: towns.filter((t) => t.submitted).length,
    approvedTowns: towns.filter((t) => t.reportStatus === '县级已通过').length,
    memberFixCount: towns.reduce((s, t) => s + t.memberFixCount, 0),
    landFixCount: towns.reduce((s, t) => s + t.landFixCount, 0),
    fixHouseholds: towns.reduce((s, t) => s + t.fixHouseholds, 0),
    byTown: towns,
    towns,
    categoryStats: categoryStats(hs),
  }
}

/* ---------------- 户列表过滤 ---------------- */
function filterHouseholds(hs, q) {
  let out = hs.slice()
  if (q.status && q.status !== 'all') {
    if (q.status === '待审核') out = out.filter((h) => h.status === '待审核')
    else out = out.filter((h) => h.status === q.status)
  }
  if (q.villageId) out = out.filter((h) => h.villageId === q.villageId)
  if (q.townId) out = out.filter((h) => h.townId === q.townId)
  if (q.groupName || q.villageGroup) {
    const g = q.groupName || q.villageGroup
    out = out.filter((h) => h.villageGroup === g)
  }
  if (q.keyword) {
    const k = String(q.keyword).toLowerCase()
    out = out.filter(
      (h) =>
        h.householder.toLowerCase().includes(k) ||
        h.idCard.includes(k) ||
        h.contractNo.toLowerCase().includes(k) ||
        h.villageName.includes(q.keyword),
    )
  }
  return out
}

function landRows(hs) {
  const rows = []
  hs.forEach((h) => {
    ;(h.lands || []).forEach((l) => {
      rows.push({
        ...l,
        householdId: h.id,
        householder: h.householder,
        householdCode: h.idCardMasked,
        villageId: h.villageId,
        villageName: h.villageName,
        villageGroup: h.villageGroup,
        townId: h.townId,
        townName: h.townName,
        contractNo: h.contractNo,
        titleStatus: h.status,
      })
    })
  })
  return rows
}

/* ---------------- 组织 ---------------- */
function orgOf(user) {
  if (!user) return { name: '平台管理' }
  if (user.userType === 'VILLAGE') {
    const v = ORGS.villages.find((x) => x.villageId === user.villageId)
    return { ...v, orgName: v.villageName, contractorName: `${v.villageName}村民委员会` }
  }
  if (user.userType === 'TOWN') {
    const t = ORGS.towns.find((x) => x.townId === user.townId)
    return { ...t, orgName: t.townName, contractorName: `${t.townName}人民政府` }
  }
  if (user.userType === 'COUNTY') return { ...ORGS.county, orgName: ORGS.county.countyName, contractorName: '幸福县农业农村局' }
  return { name: '平台管理', orgName: '平台管理', contractorName: '系统运维' }
}

function permsPayload(user) {
  return permsOf(user.userType).map((code) => ({ code, level: 'W' }))
}

function userPayload(acc) {
  return {
    userId: acc.username,
    id: acc.username,
    username: acc.username,
    realName: acc.realName,
    userType: acc.userType,
    villageId: acc.villageId || null,
    townId: acc.townId || null,
    countyId: acc.countyId || 'C01',
    householdId: null,
    mustChangePassword: false,
    orgLabel: acc.orgLabel,
  }
}

/* ---------------- WKT 图斑 ---------------- */
function wktPolygon(cx, cy, w, h, seed) {
  const r = ((seed * 9301 + 49297) % 233280) / 233280
  const dx = w * (0.82 + r * 0.32)
  const dy = h * (0.82 + r * 0.32)
  const jx = w * 0.08
  const jy = h * 0.08
  const x0 = cx - dx / 2
  const y0 = cy - dy / 2
  const pts = [
    [x0 + jx * r, y0],
    [x0 + dx, y0 + jy],
    [x0 + dx - jx, y0 + dy],
    [x0, y0 + dy - jy],
    [x0 + jx * r, y0],
  ]
  return `POLYGON((${pts.map(([x, y]) => `${x.toFixed(6)} ${y.toFixed(6)}`).join(', ')}))`
}

/* ============================================================
   分发
   ============================================================ */
export function handle(method, rawPath, query = {}, body = null) {
  const path = rawPath.split('?')[0].replace(/\/+$/, '') || '/'
  const q = { ...query }
  const M = method.toUpperCase()
  const d = db()
  const user = currentUser()
  const ok = (v) => v

  /* ---------------- 认证 ---------------- */
  if (path === '/auth/login' && M === 'POST') {
    const acc = ACCOUNTS.find((a) => a.username === (body?.username || '').trim())
    if (!acc || acc.password !== (body?.password || '')) FAIL('账号或密码错误', 401)
    setSession(acc.username)
    return {
      token: `mock.${acc.username}.${Date.now()}`,
      user: userPayload(acc),
      permissions: permsOf(acc.userType).map((c) => ({ code: c, level: 'W' })),
      dataScope: acc.userType === 'COUNTY' || acc.userType === 'ADMIN' ? 'ALL' : acc.userType,
      mustChangePassword: false,
    }
  }
  if (path === '/auth/user/info') {
    if (!user) FAIL('登录已过期，请重新登录', 401)
    return { ...userPayload(user), permissions: permsPayload(user), dataScope: user.userType }
  }
  if (path === '/auth/password/change') return {}
  if (path === '/auth/password/reset') return { resetCount: 1, username: body?.username || 'demo' }
  if (path === '/auth/wechat/bind') return { bound: true, openid: 'mock-openid' }
  if (path === '/auth/wechat/unbind') return { unbound: true }
  if (path === '/auth/import/accounts/abnormal') return page(d.abnormalAccounts, q)

  /* ---------------- 组织 ---------------- */
  if (/^\/village\/org$/.test(path)) return orgOf(user)
  if (/^\/township\/org$/.test(path)) return orgOf(user)
  if (/^\/county\/org$/.test(path)) return orgOf(user)
  if (/^\/village\/scope$/.test(path)) return { adminCode: 'V01', villageName: '幸福村' }
  if (/^\/village\/groups$/.test(path)) {
    const vs = scopeVillages(user, d)
    const list = (vs[0]?.groups || ['一组', '二组', '三组']).map((g, i) => ({ groupId: `${vs[0]?.villageId}G${i + 1}`, groupName: g, name: g }))
    return { list, records: list }
  }
  if (/^\/township\/villages$/.test(path)) {
    const list = scopeVillages(user, d).map((v) => ({ ...v, name: v.villageName }))
    return { list, records: list, total: list.length }
  }
  if (/^\/county\/towns$/.test(path)) {
    const list = ORGS.towns.map((t) => ({ ...t, name: t.townName, villageCount: ORGS.villages.filter((v) => v.townId === t.townId).length }))
    return { list, records: list, total: list.length }
  }
  if (/^\/county\/towns\/[^/]+\/villages$/.test(path)) {
    const id = path.split('/')[3]
    const list = ORGS.villages.filter((v) => v.townId === id).map((v) => ({ ...v, name: v.villageName }))
    return { list, records: list, total: list.length }
  }

  /* ---------------- 工作台统计 ---------------- */
  if (path === '/village/dashboard/stats') return villageStats(user, d)
  if (path === '/township/stats') return townStats(user, d)
  if (path === '/county/stats') return countyStats(user, d)
  if (path === '/village/lock-state') {
    const hs = scopeHouseholds(user, d)
    const vid = user?.villageId || 'V01'
    const sub = d.submissions.find((s) => s.villageId === vid)
    const pkg = d.packages.find((p) => p.townId === (user?.townId || 'T01') && ['F', 'G'].includes(p.statusCode))
    return {
      villageSubmissionStatus: sub ? sub.statusName : '未提交（A）',
      villageStatus: sub ? sub.statusCode : 'A',
      villageLocked: !!sub && ['B', 'C', 'E', 'F', 'G'].includes(sub.statusCode),
      townPackageStatus: pkg ? pkg.statusName : '未组包',
      packageStatus: pkg ? pkg.statusCode : 'E',
      townLocked: !!pkg,
      households: hs.length,
    }
  }

  /* ---------------- 户 ---------------- */
  if (path === '/village/households' && M === 'GET') {
    const hs = filterHouseholds(scopeHouseholds(user, d), q)
    const p = page(hs, q)
    return { ...p, summary: villageStats(user, d) }
  }
  if (path === '/township/households' && M === 'GET') {
    const hs = filterHouseholds(d.households.filter((h) => !user || user.userType !== 'TOWN' || h.townId === user.townId), q)
    return page(hs, q)
  }
  if (path === '/county/households' && M === 'GET') {
    const hs = filterHouseholds(d.households.filter((h) => (!q.townId || h.townId === q.townId) && (!q.villageId || h.villageId === q.villageId)), q)
    return page(hs, q)
  }
  if (/^\/township\/households\/[^/]+$/.test(path) && M === 'GET') {
    const id = path.split('/')[2]
    const h = d.households.find((x) => x.id === id)
    if (!h) FAIL('户不存在')
    return h
  }
  if (/^\/village\/households\/[^/]+$/.test(path) && M === 'GET' && !/\/me(\/|$)/.test(path)) {
    const id = path.split('/')[3]
    const h = d.households.find((x) => x.id === id)
    if (!h) FAIL('户不存在')
    return h
  }
  if (path === '/village/households' && M === 'POST') {
    const id = `H${nextSeq()}`
    const nh = {
      id,
      householder: body?.householder || '新立户',
      name: body?.householder || '新立户',
      idCard: body?.idCard || '420123199001010000',
      idCardMasked: body?.idCard ? body.idCard.replace(/^(.{6})(?:\d{8})(.{4})$/, '$1********$2') : '420123********0000',
      countyId: 'C01',
      countyName: '幸福县',
      townId: user?.townId || 'T01',
      townName: '幸福镇',
      villageId: user?.villageId || 'V01',
      villageName: ORGS.villages.find((v) => v.villageId === (user?.villageId || 'V01'))?.villageName || '幸福村',
      villageGroup: body?.villageGroup || '一组',
      groupName: body?.villageGroup || '一组',
      contractNo: `XF-NEW-${id.slice(-4)}`,
      plotCount: 0,
      memberCount: 1,
      contractArea: 0,
      measuredArea: 0,
      status: '未提交',
      changeCategory: '新增户',
      submitTime: '',
      reviewedAt: '',
      reviewOpinion: '',
      source: 'VILLAGE',
      isPendingVector: true,
      deleted: false,
      members: [{ id: `M${nextSeq()}`, name: body?.householder || '新立户', relation: '户主', isCollective: true, memberType: '世居', changeType: '新增' }],
      lands: [],
      changes: [{ type: '建户', content: '村级新建户', at: now() }],
    }
    d.households.push(nh)
    saveDb(d)
    return nh
  }
  if (/^\/village\/households\/[^/]+\/review$/.test(path) && M === 'POST') {
    const id = path.split('/')[3]
    const h = d.households.find((x) => x.id === id)
    if (!h) FAIL('户不存在')
    const sub = d.submissions.find((s) => s.villageId === h.villageId)
    if (sub && ['B', 'C'].includes(sub.statusCode)) FAIL('本村整村单已提交，本村已锁定，须镇级退回后解锁')
    h.status = body?.result === '未通过' ? '未通过' : '已通过'
    h.reviewOpinion = body?.opinion || (h.status === '已通过' ? '材料齐全，予以通过' : '')
    if (h.status === '已通过' && body?.changeCategory) h.changeCategory = body.changeCategory
    h.reviewedAt = now()
    saveDb(d)
    return { ...h, ok: true }
  }
  if (/^\/village\/households\/[^/]+\/(merge|cancel|change-head)$/.test(path) && M === 'POST') {
    const parts = path.split('/')
    const id = parts[3]
    const op = parts[4]
    const h = d.households.find((x) => x.id === id)
    if (!h) FAIL('户不存在')
    if (op === 'cancel') {
      h.status = '已注销'
      h.deleted = true
      d.deleteRecords.unshift({
        id: `DR${nextSeq()}`,
        householdId: h.id,
        householder: h.householder,
        villageName: h.villageName,
        reason: body?.reason || '整户消亡',
        paperNo: body?.paperNo || `ZX-${today()}`,
        opDate: body?.opDate || today(),
        operator: user?.realName || '村级经办人',
        status: '已生效',
      })
    } else if (op === 'change-head') {
      const old = h.householder
      h.householder = body?.newHead || body?.householder || h.householder
      h.changes.unshift({ type: '户主变更', content: `户主由 ${old} 变更为 ${h.householder}`, at: now() })
    } else {
      d.mergeRecords.unshift({
        id: `MR${nextSeq()}`,
        fromName: h.householder,
        toName: body?.toName || body?.targetHouseholder || '并入户',
        villageName: h.villageName,
        reason: body?.reason || '合户',
        mergedAt: now(),
        operator: user?.realName || '村级经办人',
        status: '已生效',
      })
      h.status = '已注销'
      h.deleted = true
    }
    saveData(d)
    return { ok: true, id: h.id }
  }
  if (/^\/village\/households\/[^/]+\/lands$/.test(path) && M === 'POST') {
    const id = path.split('/')[3]
    const h = d.households.find((x) => x.id === id)
    if (!h) FAIL('户不存在')
    const l = {
      id: `L${nextSeq()}`,
      householdId: h.id,
      plotCode: body?.plotCode || `${h.villageGroup === '一组' ? '01' : '02'}-${String(h.lands.length + 1).padStart(3, '0')}`,
      plotName: body?.plotName || '新代录地块',
      landUse: body?.landUse || '耕地',
      landGrade: body?.landGrade || '二级',
      isBasicFarmland: true,
      contractArea: Number(body?.contractArea || 0),
      measuredArea: Number(body?.measuredArea || body?.contractArea || 0),
      area: Number(body?.measuredArea || body?.contractArea || 0),
      boundaryEast: body?.boundaryEast || '—',
      boundarySouth: body?.boundarySouth || '—',
      boundaryWest: body?.boundaryWest || '—',
      boundaryNorth: body?.boundaryNorth || '—',
      source: 'PROXY',
      isPendingVector: true,
    }
    h.lands.push(l)
    h.plotCount = h.lands.length
    saveDb(d)
    return l
  }
  if (/^\/village\/households\/[^/]+\/members$/.test(path)) {
    const id = path.split('/')[3]
    const h = d.households.find((x) => x.id === id)
    if (!h) FAIL('户不存在')
    if (M === 'GET') return { list: h.members, records: h.members }
    if (M === 'POST') {
      const m = { id: `M${nextSeq()}`, ...body, relation: body?.relation || '子', isCollective: true, changeType: '新增' }
      h.members.push(m)
      h.memberCount = h.members.length
      saveDb(d)
      return m
    }
  }
  if (/^\/village\/households\/[^/]+\/members\/[^/]+$/.test(path)) {
    const parts = path.split('/')
    const h = d.households.find((x) => x.id === parts[3])
    if (!h) FAIL('户不存在')
    const mid = parts[5]
    if (M === 'PUT') {
      const i = h.members.findIndex((m) => m.id === mid)
      if (i >= 0) h.members[i] = { ...h.members[i], ...body }
      saveDb(d)
      return h.members[i] || {}
    }
    if (M === 'DELETE') {
      h.members = h.members.filter((m) => m.id !== mid)
      h.memberCount = h.members.length
      saveDb(d)
      return { ok: true }
    }
  }
  if (/^\/village\/households\/[^/]+$/.test(path) && M === 'PUT') {
    const id = path.split('/')[3]
    const h = d.households.find((x) => x.id === id)
    if (!h) FAIL('户不存在')
    Object.assign(h, body || {})
    saveDb(d)
    return h
  }
  if (/^\/village\/households\/[^/]+$/.test(path) && M === 'DELETE') {
    const id = path.split('/')[3]
    const i = d.households.findIndex((x) => x.id === id)
    if (i < 0) FAIL('户不存在')
    d.households[i].deleted = true
    d.households[i].status = '已注销'
    saveDb(d)
    return { ok: true }
  }

  /* ---------------- 地块 / 矢量 ---------------- */
  if (path === '/village/lands' || path === '/township/lands' || path === '/county/lands') {
    let hs = scopeHouseholds(user, d)
    const rows = landRows(hs)
    let out = rows
    if (q.keyword) {
      const k = String(q.keyword)
      out = out.filter((r) => (r.plotName || '').includes(k) || (r.householder || '').includes(k) || (r.plotCode || '').includes(k))
    }
    if (q.badge === 'pending') out = out.filter((r) => r.isPendingVector)
    if (q.badge === 'measured') out = out.filter((r) => r.measuredArea !== r.contractArea)
    return page(out, q)
  }
  if (path === '/gis/admin-regions') {
    const list = ORGS.villages.map((v) => ({ adminCode: v.villageId, code: v.villageId, name: v.villageName, level: 4, parentCode: v.townId }))
    return list
  }
  if (/^\/gis\/parcels\/village\/[^/]+$/.test(path)) {
    const code = path.split('/')[4]
    const hs = d.households.filter((h) => h.villageId === code)
    const features = []
    let n = 0
    hs.forEach((h, hi) => {
      ;(h.lands || []).forEach((l, li) => {
        n += 1
        const cx = 125.31 + (hi % 6) * 0.0042
        const cy = 45.12 - Math.floor(hi / 6) * 0.0035 - li * 0.0008
        features.push({
          id: l.id,
          plotCode: l.plotCode,
          plotName: l.plotName,
          householdCode: h.idCardMasked,
          householder: h.householder,
          areaMu: l.contractArea,
          measuredArea: l.measuredArea,
          qualityGrade: l.landGrade,
          landTypeCode: l.landUse,
          isBasicFarm: l.isBasicFarmland,
          villageId: code,
          geometry: wktPolygon(cx, cy, 0.0026, 0.0018, n),
        })
      })
    })
    return { type: 'FeatureCollection', villageId: code, count: features.length, features }
  }
  if (/^\/gis\/village\/[^/]+\/overview$/.test(path)) {
    const code = path.split('/')[3]
    const hs = d.households.filter((h) => h.villageId === code)
    const lands = landRows(hs)
    return {
      adminCode: code,
      villageName: ORGS.villages.find((v) => v.villageId === code)?.villageName || '',
      parcelCount: lands.length,
      totalAreaMu: sum(lands, (l) => l.contractArea),
      measuredAreaMu: sum(lands, (l) => l.measuredArea),
      householdCount: hs.length,
      farmlandCount: lands.filter((l) => l.isBasicFarmland).length,
    }
  }

  /* ---------------- 村变化对比 ---------------- */
  if (path === '/village/compare') {
    const hs = scopeHouseholds(user, d)
    const valid = hs.filter((h) => h.status !== '已注销')
    return {
      villageName: hs[0]?.villageName || '',
      households: {
        baseline: hs.length + 2,
        currentEffective: valid.length,
        total: hs.length,
        added: 2,
        split: 1,
        merged: 1,
        cancelled: hs.filter((h) => h.status === '已注销').length,
      },
      area: {
        baselineContract: round2(sum(valid, (h) => h.contractArea) + 12.4),
        currentContract: sum(valid, (h) => h.contractArea),
        measured: sum(valid, (h) => h.measuredArea),
        vector: sum(valid.filter((h) => h.vectorArea), (h) => h.vectorArea),
      },
      byGroup: villageStats(user, d).byGroup,
    }
  }

  /* ---------------- 操作留痕 ---------------- */
  if (path === '/village/operations/merges') return page(d.mergeRecords, q)
  if (path === '/village/operations/deletes') return page(d.deleteRecords, q)
  if (path === '/village/operations/splits') {
    const rows = d.splitApps.map((s) => ({ ...s, status: s.status, splitAt: s.appliedAt }))
    return page(rows, q)
  }
  if (/^\/village\/change-ops\/[^/]+\/submit$/.test(path)) return { ok: true, locked: true }

  /* ---------------- 分户 ---------------- */
  if (path === '/village/split-applications/pending') {
    const rows = d.splitApps.filter((s) => s.status === '待审核')
    return { list: rows, records: rows, total: rows.length }
  }
  if (path === '/village/split-applications/review' && M === 'POST') {
    const app = d.splitApps.find((s) => s.id === (body?.id || body?.applicationId))
    if (app) app.status = body?.result === '未通过' ? '未通过' : '已通过'
    saveDb(d)
    return { ok: true, status: app?.status }
  }

  /* ---------------- 意见 ---------------- */
  if (path === '/village/opinions') {
    let rows = d.opinions.filter((o) => !user || user.userType !== 'VILLAGE' || o.villageId === user.villageId)
    if (q.status && q.status !== 'all') rows = rows.filter((o) => o.status === q.status)
    return { list: rows, records: rows, total: rows.length }
  }
  if (path === '/village/opinions/report' && M === 'POST') {
    d.opinions.unshift({
      id: `O${nextSeq()}`,
      townId: user?.townId || 'T01',
      townName: '幸福镇',
      villageId: user?.villageId || 'V01',
      villageName: '幸福村',
      householder: body?.householder || '农户',
      opinion: body?.opinion || '意见内容',
      villageNote: body?.villageNote || '',
      townNote: '',
      status: '已上报',
      reportedAt: now(),
    })
    saveDb(d)
    return { ok: true }
  }
  if (path === '/township/opinions') {
    let rows = d.opinions.filter((o) => !user || user.userType !== 'TOWN' || o.townId === user.townId)
    if (q.status && q.status !== 'all') rows = rows.filter((o) => o.status === q.status)
    return { list: rows, records: rows, total: rows.length }
  }
  if (path === '/township/opinions/report' && M === 'POST') {
    const o = d.opinions.find((x) => x.id === body?.id)
    if (o) { o.townNote = body?.townNote || '同意村级处理意见'; o.status = '已上报' }
    saveDb(d)
    return { ok: true }
  }
  if (path === '/township/opinions/back' && M === 'POST') {
    const o = d.opinions.find((x) => x.id === body?.id)
    if (o) o.status = '已退回村级'
    saveDb(d)
    return { ok: true }
  }
  if (path === '/county/packages/opinions') {
    let rows = d.opinions.filter((o) => o.status !== '已退回村级')
    if (q.status && q.status !== 'all') rows = rows.filter((o) => o.status === q.status)
    return { list: rows, records: rows, total: rows.length }
  }
  if (path === '/county/packages/opinions/back' && M === 'POST') {
    const o = d.opinions.find((x) => x.id === body?.id)
    if (o) o.status = '已退回镇级'
    saveDb(d)
    return { ok: true }
  }

  /* ---------------- 村级上报单 ---------------- */
  if (path === '/village/submissions') {
    const rows = scopeSubmissions(user, d)
    if (M === 'GET') return page(rows, q)
    if (M === 'POST') {
      const vid = user?.villageId || 'V01'
      const exist = d.submissions.find((s) => s.villageId === vid)
      const v = ORGS.villages.find((x) => x.villageId === vid)
      const hs = d.households.filter((h) => h.villageId === vid && h.status !== '已注销')
      const approved = hs.filter((h) => h.status === '已通过')
      if (approved.length !== hs.length) FAIL(`完成率须 100% 才能提交（当前 ${Math.round((approved.length / hs.length) * 100)}%）`)
      if (!body?.sealNo) FAIL('请登记盖章件编号')
      const no = `XF-2026-${String(d.submissions.length + 1).padStart(3, '0')}`
      const rec = exist || { id: `S${nextSeq()}`, villageId: vid, villageName: v?.villageName, townId: v?.townId, townName: '幸福镇' }
      Object.assign(rec, {
        submitNo: no,
        householdCount: approved.length,
        totalArea: sum(approved, (h) => h.contractArea),
        measuredTotal: sum(approved, (h) => h.measuredArea),
        parcelCount: approved.reduce((s, h) => s + h.plotCount, 0),
        sealNo: body.sealNo,
        sealDate: body.sealDate || today(),
        statusCode: 'B',
        statusName: '待镇级审批',
        submittedAt: now(),
        remark: body.remark || '',
        opinion: '',
      })
      if (!exist) d.submissions.push(rec)
      saveDb(d)
      return rec
    }
  }
  if (path === '/village/reports/export' && M === 'POST') {
    const name = `XF-统计表_${today()}.xlsx`
    d.exports.unshift({ id: `EX${nextSeq()}`, exportNo: `XF-${today()}`, exportType: 'XF', type: 'XF', scopeType: '村', scope: '幸福村', fileType: 'EXCEL', format: 'EXCEL', fileName: name, rowCount: 14, status: '已完成', createdAt: now(), operator: user?.realName || '' })
    saveDb(d)
    return { fileName: name, downloadUrl: '#', rowCount: 14 }
  }

  /* ---------------- 镇级上报单 ---------------- */
  if (path === '/township/submissions') {
    const rows = scopeSubmissions(user, d)
    return page(rows, q)
  }
  if (/^\/township\/submissions\/[^/]+$/.test(path) && M === 'GET') {
    const id = path.split('/')[3]
    const s = d.submissions.find((x) => x.id === id)
    if (!s) FAIL('上报单不存在')
    return s
  }
  if (/^\/township\/flow\/submissions\/[^/]+\/review$/.test(path) && M === 'POST') {
    const id = path.split('/')[4]
    const s = d.submissions.find((x) => x.id === id)
    if (!s) FAIL('上报单不存在')
    if (body?.result === '退回') {
      s.statusCode = 'D'
      s.statusName = '已退回村级'
      s.opinion = body?.opinion || ''
      // 退回后村内户解锁（状态回到待审核，示范「整村打回」）
      d.households.filter((h) => h.villageId === s.villageId && h.status === '已通过').slice(0, 2).forEach((h) => {
        h.status = '待审核'
        h.reviewOpinion = ''
      })
    } else {
      s.statusCode = 'C'
      s.statusName = '镇级已通过'
      s.opinion = body?.opinion || '整村材料齐全，同意通过'
      s.reviewedAt = now()
    }
    saveDb(d)
    return s
  }
  if (/^\/township\/flow\/submissions\/[^/]+\/reject-village$/.test(path) && M === 'POST') return { ok: true, statusCode: 'D' }

  /* ---------------- 乡镇上报包 ---------------- */
  if (path === '/township/flow/packages' && M === 'GET') {
    const rows = scopePackages(user, d)
    return { list: rows, records: rows, total: rows.length }
  }
  if (path === '/township/flow/packages/readiness') {
    const tid = user?.townId || 'T01'
    const vs = ORGS.villages.filter((v) => v.townId === tid)
    const rows = vs.map((v) => {
      const s = d.submissions.find((x) => x.villageId === v.villageId)
      const hs = d.households.filter((h) => h.villageId === v.villageId)
      const approved = hs.filter((h) => h.status === '已通过').length
      const rate = hs.length ? Math.round((approved / hs.length) * 100) : 0
      return {
        villageId: v.villageId,
        villageName: v.villageName,
        submitNo: s?.submitNo || '—',
        submissionId: s?.id || null,
        householdCount: s?.householdCount || approved,
        totalArea: s?.totalArea || 0,
        statusCode: s?.statusCode || 'A',
        statusName: s?.statusName || '未提交',
        progress: rate,
        ready: !!(s && s.statusCode === 'C'),
      }
    })
    const unready = rows.filter((r) => !r.ready)
    return {
      townId: tid,
      villages: rows,
      readyVillages: rows.filter((r) => r.ready),
      unreadyVillages: unready,
      canSubmit: unready.length === 0,
      ready: unready.length === 0,
      submissionIds: rows.filter((r) => r.ready).map((r) => r.submissionId),
    }
  }
  if (path === '/township/flow/packages' && M === 'POST') {
    const tid = user?.townId || 'T01'
    const rec = {
      id: `P${nextSeq()}`,
      packageNo: `XZ-2026-${String(d.packages.length + 1).padStart(3, '0')}`,
      townId: tid,
      townName: ORGS.towns.find((t) => t.townId === tid)?.townName || '幸福镇',
      submissionIds: body?.submissionIds || [],
      villages: [],
      villageCount: 0,
      householdCount: 0,
      totalArea: 0,
      statusCode: 'E',
      statusName: '待提交',
      createdAt: now(),
      submittedAt: '',
      reviewedAt: '',
      opinion: '',
    }
    d.packages.push(rec)
    saveDb(d)
    return rec
  }
  if (/^\/township\/flow\/packages\/[^/]+\/submissions\/[^/]+$/.test(path)) {
    const parts = path.split('/')
    const pid = parts[4]
    const sid = parts[6]
    const p = d.packages.find((x) => x.id === pid)
    if (!p) FAIL('上报包不存在')
    if (p.statusCode !== 'E') FAIL('上报包已提交，包内锁定，不可再调整')
    if (M === 'POST') {
      if (!p.submissionIds.includes(sid)) p.submissionIds.push(sid)
    } else {
      p.submissionIds = p.submissionIds.filter((x) => x !== sid)
    }
    const subs = d.submissions.filter((s) => p.submissionIds.includes(s.id))
    p.villages = subs.map((s) => ({ villageId: s.villageId, villageName: s.villageName, householdCount: s.householdCount, totalArea: s.totalArea, submitNo: s.submitNo }))
    p.villageCount = subs.length
    p.householdCount = subs.reduce((s, x) => s + x.householdCount, 0)
    p.totalArea = sum(subs, (s) => s.totalArea)
    saveDb(d)
    return p
  }
  if (/^\/township\/flow\/packages\/[^/]+\/submit$/.test(path) && M === 'POST') {
    const pid = path.split('/')[4]
    const p = d.packages.find((x) => x.id === pid)
    if (!p) FAIL('上报包不存在')
    p.statusCode = 'F'
    p.statusName = '已提交县级待审'
    p.submittedAt = now()
    d.submissions.filter((s) => p.submissionIds.includes(s.id)).forEach((s) => { s.statusCode = 'E'; s.statusName = '县级待审' })
    saveDb(d)
    return p
  }
  if (/^\/township\/flow\/packages\/[^/]+$/.test(path) && M === 'GET') {
    const pid = path.split('/')[4]
    const p = d.packages.find((x) => x.id === pid)
    if (!p) FAIL('上报包不存在')
    const subs = d.submissions.filter((s) => p.submissionIds.includes(s.id))
    return { ...p, submissions: subs, items: subs }
  }

  /* ---------------- 截止日期 ---------------- */
  if (path === '/township/flow/deadlines') {
    const rows = d.deadlines.filter((x) => !user || user.userType !== 'TOWN' || x.townId === user.townId)
    if (M === 'GET') return { list: rows, records: rows, total: rows.length }
    const arr = Array.isArray(body) ? body : body?.list || [body]
    arr.forEach((b) => {
      const row = d.deadlines.find((x) => x.villageId === b.villageId)
      if (row) Object.assign(row, { deadline: b.deadline || row.deadline, reviewDeadline: b.reviewDeadline || row.reviewDeadline })
    })
    saveDb(d)
    return { ok: true }
  }
  if (path === '/township/reports/export' && M === 'POST') {
    const name = `DC-镇级统计表_${today()}.xlsx`
    d.exports.unshift({ id: `EX${nextSeq()}`, exportNo: `DC-${today()}`, exportType: 'DC', type: 'DC', scopeType: '乡镇', scope: '幸福镇', fileType: 'EXCEL', format: 'EXCEL', fileName: name, rowCount: 62, status: '已完成', createdAt: now(), operator: user?.realName || '' })
    saveDb(d)
    return { fileName: name, rowCount: 62 }
  }

  /* ---------------- 县级上报包 ---------------- */
  if (path === '/county/packages') return page(scopePackages(user, d), q)
  if (path === '/county/submissions') return page(scopeSubmissions(user, d), q)
  if (/^\/county\/packages\/[^/]+\/review$/.test(path) && M === 'POST') {
    const pid = path.split('/')[3]
    const p = d.packages.find((x) => x.id === pid)
    if (!p) FAIL('上报包不存在')
    if (body?.result === '退回') {
      p.statusCode = 'E'
      p.statusName = '已退回镇级'
      p.opinion = body?.opinion || ''
    } else {
      p.statusCode = 'G'
      p.statusName = '县级已通过'
      p.reviewedAt = now()
      p.opinion = body?.opinion || '同意通过，可归档'
    }
    saveDb(d)
    return p
  }
  if (/^\/county\/packages\/[^/]+\/archive$/.test(path) && M === 'POST') {
    const pid = path.split('/')[3]
    const p = d.packages.find((x) => x.id === pid)
    if (!p) FAIL('上报包不存在')
    if (p.statusCode !== 'G') FAIL('须县级审批通过（G）后才可归档')
    p.statusCode = 'H'
    p.statusName = '已归档'
    const a = {
      id: `AR${nextSeq()}`,
      archiveId: `GD-${today()}`,
      archiveNo: `GD-2026-${String(d.archives.length + 1).padStart(3, '0')}`,
      archiveName: `${p.townName}上报包归档成果`,
      packageId: p.id,
      packageNo: p.packageNo,
      townNames: p.townName,
      villageCount: p.villageCount,
      householdCount: p.householdCount,
      parcelCount: p.householdCount * 3,
      totalArea: p.totalArea,
      operator: user?.realName || '赵立县',
      archivedAt: now(),
      status: '已归档',
    }
    d.archives.unshift(a)
    saveDb(d)
    return a
  }
  if (/^\/county\/packages\/[^/]+$/.test(path) && M === 'GET') {
    const pid = path.split('/')[3]
    const p = d.packages.find((x) => x.id === pid)
    if (!p) FAIL('上报包不存在')
    const subs = d.submissions.filter((s) => p.submissionIds.includes(s.id))
    return { ...p, submissions: subs, items: subs }
  }

  /* ---------------- 归档 ---------------- */
  if (path === '/county/archives') {
    if (M === 'GET') return page(d.archives, q)
    const rec = {
      id: `AR${nextSeq()}`,
      archiveId: `GD-${today()}`,
      archiveNo: `GD-2026-${String(d.archives.length + 1).padStart(3, '0')}`,
      archiveName: body?.archiveName || '县级归档批次',
      townNames: body?.townNames || '幸福镇',
      villageCount: body?.villageCount || 3,
      householdCount: body?.householdCount || 41,
      parcelCount: (body?.householdCount || 41) * 3,
      totalArea: body?.totalArea || 386.4,
      operator: user?.realName || '赵立县',
      archivedAt: now(),
      status: '已归档',
    }
    d.archives.unshift(rec)
    saveDb(d)
    return rec
  }

  /* ---------------- 数据下发 ---------------- */
  if (path === '/county/distributions') {
    if (M === 'GET') return page(d.distributions, q)
    const rec = {
      id: `D${nextSeq()}`,
      batchNo: `XF-DATA-2026-${String(d.distributions.length + 1).padStart(3, '0')}`,
      scopeType: body?.scopeType || 'TOWN',
      scopeTypeName: body?.scopeType === 'VILLAGE' ? '按村' : body?.scopeType === 'TOWN' ? '按乡镇' : '全县',
      townCount: body?.townCount || ORGS.towns.length,
      villageCount: body?.villageCount || ORGS.villages.length,
      householdCount: body?.householdCount || d.households.length,
      status: '已下发',
      createdAt: now(),
      distributedAt: now(),
      operator: user?.realName || '赵立县',
    }
    d.distributions.unshift(rec)
    saveDb(d)
    return rec
  }

  /* ---------------- 矢量回传 ---------------- */
  if (path === '/county/vector-returns/preview') {
    const hs = d.households.filter((h) => h.status === '已通过')
    return {
      villageCount: ORGS.villages.length,
      affected: hs.filter((h) => h.isPendingVector).length,
      totalHouseholds: hs.length,
      parcelCount: landRows(hs).length,
      changedParcels: landRows(hs).filter((l) => l.isPendingVector).length,
      villages: ORGS.villages.map((v) => ({
        villageId: v.villageId,
        villageName: v.villageName,
        parcelCount: landRows(d.households.filter((h) => h.villageId === v.villageId)).length,
        changed: landRows(d.households.filter((h) => h.villageId === v.villageId)).filter((l) => l.isPendingVector).length,
      })),
    }
  }
  if (path === '/county/vector-returns') {
    if (M === 'GET') return page(d.vectorReturns, q)
    const rec = {
      id: `VR${nextSeq()}`,
      returnNo: `HT-2026-${String(d.vectorReturns.length + 1).padStart(3, '0')}`,
      returnName: body?.returnName || '矢量成果回传',
      villageCount: body?.villageCount || ORGS.villages.length,
      affected: body?.affected || 18,
      totalHouseholds: body?.totalHouseholds || 41,
      operator: user?.realName || '赵立县',
      createdAt: now(),
      status: '待同步',
      remark: body?.remark || '',
      statusDistribution: { 已更新: 0, 待复核: body?.affected || 18, 无变化: 23 },
    }
    d.vectorReturns.unshift(rec)
    saveDb(d)
    return rec
  }

  /* ---------------- 导出 ---------------- */
  if (path === '/county/exports') return page(d.exports, q)
  if (path === '/county/reports/export' && M === 'POST') {
    const name = `DC-全县统计表_${today()}.xlsx`
    const rec = { id: `EX${nextSeq()}`, exportNo: `DC-${today()}`, exportType: body?.types?.[0] || 'DC', type: 'DC', scopeType: '全县', scope: '幸福县', fileType: body?.format || 'EXCEL', format: body?.format || 'EXCEL', fileName: name, rowCount: d.households.length, status: '已完成', createdAt: now(), operator: user?.realName || '赵立县' }
    d.exports.unshift(rec)
    saveDb(d)
    return rec
  }

  /* ---------------- 基线导入 ---------------- */
  if (path === '/county/shapefile/imports') return page(d.imports, q)
  if (/^\/county\/shapefile\/imports\/[^/]+\/execute$/.test(path) && M === 'POST') {
    const id = path.split('/')[4]
    const rec = d.imports.find((x) => x.id === id)
    if (rec) { rec.status = '已导入'; rec.executedAt = now() }
    saveDb(d)
    return { ...(rec || {}), status: '已导入', imported: rec?.totalRows || 0 }
  }
  if (/^\/county\/imports\/[^/]+\/field-mapping$/.test(path) && M === 'PUT') {
    const id = path.split('/')[3]
    const rec = d.imports.find((x) => x.id === id)
    if (rec) rec.mapping = body
    saveDb(d)
    return { ok: true, importId: id, mapping: body }
  }
  if (path === '/county/shapefile/upload-preview' && M === 'POST') {
    return {
      importId: d.imports[0].id,
      batchNo: `JC-2026-${String(d.imports.length + 1).padStart(3, '0')}`,
      fileName: body?.fileName || '2007成果_演示村.zip',
      totalRows: 286,
      households: 96,
      members: 372,
      parcels: 286,
      status: '待映射',
      createdAt: now(),
      sourceFields: ['DKBM', 'DKMC', 'SCMJ', 'TDLYLX', 'DLDJ', 'SFJBNT', 'DKDZ', 'DKNZ', 'DKXZ', 'DKBZ'],
      suggestedMappings: [
        { source: 'DKBM', target: 'plotCode', label: '地块编码' },
        { source: 'DKMC', target: 'plotName', label: '地块名称' },
        { source: 'SCMJ', target: 'measuredArea', label: '实测面积' },
        { source: 'TDLYLX', target: 'landUse', label: '土地利用类型' },
        { source: 'DLDJ', target: 'landGrade', label: '地力等级' },
        { source: 'SFJBNT', target: 'isBasicFarmland', label: '是否基本农田' },
        { source: 'DKDZ', target: 'boundaryEast', label: '四至-东' },
        { source: 'DKNZ', target: 'boundarySouth', label: '四至-南' },
        { source: 'DKXZ', target: 'boundaryWest', label: '四至-西' },
        { source: 'DKBZ', target: 'boundaryNorth', label: '四至-北' },
      ],
      warn: '3 条地块缺编码，将自动补号',
    }
  }

  /* ---------------- 兜底：明确的未实现 ---------------- */
  FAIL(`原型未提供该接口：${M} ${path}`, 404)
}

/* 兼容命名 */
function saveData(d) {
  saveDb(d)
}

export { resetDb }
