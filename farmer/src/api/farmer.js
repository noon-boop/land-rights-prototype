/* ============================================================
   农户端 · 接口层（PRD v2.8）
   ------------------------------------------------------------
   登录与账号
     POST   /auth/login                          身份证号 + 真实密码
     POST   /auth/password/change                首登强制改密 / 主动改密
     POST   /auth/wechat/bind                    微信强绑定（mock openid）
   户信息
     GET    /village/households/me               户信息 + 进度 + 可分状态
     PUT    /village/households/me/basic-info    只改地址/电话（发包方等只读）
   家庭成员
     GET    /village/households/me/members
     POST   /village/households/me/members
     PUT    /village/households/me/members/{id}
     DELETE /village/households/me/members/{id}
     POST   /village/households/me/members/{id}/restore
   承包地块
     GET    /village/households/me/lands
     POST   /village/households/me/lands          新增（编号系统生成、不填合同面积）
     PUT    /village/households/me/lands/{id}     只改名称/用途/四至/调整说明
     DELETE /village/households/me/lands/{id}?reason=
     POST   /village/households/me/lands/{id}/restore
     POST   /village/households/me/lands/{id}/split    F-A10 分割登记
     GET    /village/households/me/lands/splits
   变更诉求（官方 11 类多选）
     GET|PUT /village/households/me/changes
   两轮提交
     POST   /village/households/me/submit            F-A13 提交即锁
     POST   /village/households/me/final-confirm     F-A14 只收问题意见
   分户
     GET|POST /village/households/me/split-applications
   村组（发包方下拉，只读展示）
     GET    /village/groups
   ============================================================ */

import { get, post, put, del } from './request'

/* ---------- 登录与账号 ---------- */
export function login(payload) {
  // payload: { username, password }
  return post('/auth/login', payload)
}

/** 首登强制改密 / 主动改密 */
export function changePassword(oldPassword, newPassword) {
  return post('/auth/password/change', { oldPassword, newPassword })
}

/** 微信绑定：小程序端传 wx.login 的 code（本期为 mock openid） */
export function bindWechat(openid, bindBy) {
  return post('/auth/wechat/bind', { openid, bindBy })
}

/** 当前用户信息（含 mustChangePassword / wechatBound） */
export function userInfo() {
  return get('/auth/user/info')
}

/* ---------- 村组（发包方，只读） ---------- */
export function getVillageGroups() {
  return get('/village/groups')
}

/* ---------- 户信息 ---------- */
export function fetchMyHousehold() {
  return get('/village/households/me')
}

export function saveBasicInfo(patch) {
  return put('/village/households/me/basic-info', patch)
}

/* ---------- 家庭成员 ---------- */
export function fetchMembers() {
  return get('/village/households/me/members')
}

export function addMember(member) {
  return post('/village/households/me/members', member)
}

export function updateMember(id, patch) {
  return put('/village/households/me/members/' + id, patch)
}

export function softDeleteMember(id) {
  return del('/village/households/me/members/' + id)
}

export function restoreMember(id) {
  return post('/village/households/me/members/' + id + '/restore')
}

/* ---------- 承包地块 ---------- */
export function fetchLands() {
  return get('/village/households/me/lands')
}

export function addLand(land) {
  return post('/village/households/me/lands', land)
}

export function updateLand(id, patch) {
  return put('/village/households/me/lands/' + id, patch)
}

/** 软删除地块，必须带原因（B-A13） */
export function softDeleteLand(id, reason) {
  return del('/village/households/me/lands/' + id + '?reason=' + encodeURIComponent(reason || ''))
}

export function restoreLand(id) {
  return post('/village/households/me/lands/' + id + '/restore')
}

/** F-A10 地块分割登记：新块编码 = 原编码-1，原地块记「分割给 X X亩」 */
export function splitLand(id, payload) {
  // payload: { splitArea, newPlotName, boundaryEast/South/West/North, reason }
  return post('/village/households/me/lands/' + id + '/split', payload)
}

export function fetchLandSplits() {
  return get('/village/households/me/lands/splits')
}

/* ---------- 变更诉求（官方 11 类多选） ---------- */
export function saveChanges(patch) {
  return put('/village/households/me/changes', patch)
}

export function fetchChanges() {
  return get('/village/households/me/changes')
}

/* ---------- 两轮提交 ---------- */
export function submitConfirm() {
  return post('/village/households/me/submit')
}

/** F-A14 最终确认：仅收问题意见（可留空），不改任何数据 */
export function submitFinalConfirm(opinion, agreed) {
  return post('/village/households/me/final-confirm', { opinion: opinion || '', agreed: !!agreed })
}

/* ---------- 分户（F-A12） ---------- */
export function applySplit(payload) {
  // payload: { splitMode:'WHOLE'|'AREA', memberIds:[], parcelIds:[], allocations:[{parcelId,keepArea,splitArea}],
  //            newHeadName, newHeadIdCard, newHeadPhone, newHeadRelation, origHeadName, origHeadIdCard, reason }
  return post('/village/households/me/split-applications', payload)
}

export function fetchSplitApplications() {
  return get('/village/households/me/split-applications')
}

/* ---------- 图斑几何（gis-service） ---------- */
/**
 * 按地块编码批量取矢量几何（经纬度 WKT）
 * 用编码而不是身份证，避免农户端只有脱敏身份证的问题
 * @param {string[]} codes 地块编码数组
 */
export function fetchParcelGeometries(codes) {
  const list = (codes || []).filter(Boolean)
  if (!list.length) return Promise.resolve({ count: 0, features: [] })
  return get('/gis/parcels/batch?codes=' + encodeURIComponent(list.join(',')))
}
