/* ============================================================
   接口层（pc-platform）
   一个客户端服务三种角色，接口按业务域分组而非按端分组；
   各角色用到的差异由后端按数据权限（village_id/town_id/county_id）隔离。
   ============================================================ */

import { get, post, put, del } from './request'
import { mockFetch, MOCK_ENABLED } from '@/mock'

// 通用方法透出（按角色切换辖域接口时用）
export { get, post, put, del }

/* ---------------- 认证 / 用户上下文（F-P01~F-P05） ---------------- */
export const apiLogin = (username, password) => post('/auth/login', { username, password })
export const apiUserInfo = () => get('/auth/user/info')
export const apiChangePassword = (oldPassword, newPassword) =>
  post('/auth/password/change', { oldPassword, newPassword })

/* ---------------- 组织（顶栏身份 / 下拉） ---------------- */
export const apiOrg = () => get('/village/org')
export const apiGroups = () => get('/village/groups')
export const apiTownOrg = () => get('/township/org')
export const apiTownVillages = () => get('/township/villages')
export const apiCountyOrg = () => get('/county/org')
export const apiCountyTowns = () => get('/county/towns')

/* ---------------- 工作台（F-P06） ---------------- */
export const apiVillageDashboard = () => get('/village/dashboard/stats')
export const apiTownStats = () => get('/township/stats')
export const apiCountyStats = () => get('/county/stats')

/* ---------------- 户（F-P07 / F-P08） ---------------- */
export const apiHouseholdList = (params) => get('/village/households', params)
export const apiHouseholdDetail = (id) => get(`/village/households/${id}`)
export const apiHouseholdReview = (id, body) => post(`/village/households/${id}/review`, body)
export const apiHouseholdSave = (body) => post('/village/households', body)
export const apiHouseholdUpdate = (id, body) => put(`/village/households/${id}`, body)
export const apiHouseholdMerge = (id, body) => post(`/village/households/${id}/merge`, body)
export const apiHouseholdCancel = (id, body) => post(`/village/households/${id}/cancel`, body)
export const apiHouseholdDelete = (id, body) => del(`/village/households/${id}`, body)
export const apiChangeHead = (id, body) => post(`/village/households/${id}/change-head`, body)

/* ---------------- 地块（F-P09） ---------------- */
export const apiLandList = (params) => get('/village/lands', params)

/* ---------------- 统计（F-P10） ---------------- */
export const apiVillageCompare = () => get('/village/compare')

/* ---------------- 锁状态（v2.8 两级锁） ---------------- */
export const apiVillageLockState = () => get('/village/lock-state')

/* ---------------- 镇级（F-T*） ---------------- */
export const apiTownSubmissions = (params) => get('/township/submissions', params)
export const apiTownSubmissionDetail = (id) => get(`/township/submissions/${id}`)
export const apiTownReview = (id, body) => post(`/township/flow/submissions/${id}/review`, body)
export const apiTownRejectVillage = (id, body) => post(`/township/flow/submissions/${id}/reject-village`, body)
export const apiPackages = () => get('/township/flow/packages')
export const apiPackageReadiness = () => get('/township/flow/packages/readiness')
export const apiPackageCreate = (body) => post('/township/flow/packages', body)
export const apiPackageAddSubmission = (id, submissionId) =>
  post(`/township/flow/packages/${id}/submissions/${submissionId}`)
export const apiPackageRemoveSubmission = (id, submissionId) =>
  del(`/township/flow/packages/${id}/submissions/${submissionId}`)
export const apiPackageSubmit = (id) => post(`/township/flow/packages/${id}/submit`)
export const apiPackageDetail = (id) => get(`/township/flow/packages/${id}`)
export const apiDeadlines = () => get('/township/flow/deadlines')
export const apiSetDeadlines = (body) => post('/township/flow/deadlines', body)

/* ---------------- 县级（F-C*） ---------------- */
export const apiCountySubmissions = (params) => get('/county/submissions', params)
export const apiCountyPackages = (params) => get('/county/packages', params)
export const apiCountyPackageDetail = (id) => get(`/county/packages/${id}`)
export const apiCountyPackageReview = (id, body) => post(`/county/packages/${id}/review`, body)
export const apiCountyPackageArchive = (id, body) => post(`/county/packages/${id}/archive`, body)
export const apiVectorReturnPreview = () => get('/county/vector-returns/preview')
export const apiVectorReturnSubmit = (body) => post('/county/vector-returns', body)
export const apiVectorReturns = (params) => get('/county/vector-returns', params)
export const apiCountyOpinions = (params) => get('/county/packages/opinions', params)
export const apiCountyOpinionBack = (body) => post('/county/packages/opinions/back', body)

/* ---------------- 村级业务 F-V01~F-V12 ---------------- */

/** F-V01 待审核户（复用户列表，按状态筛） */
export const apiPendingHouseholds = (params) =>
  get('/village/households', { status: '待审核', page: 1, pageSize: 100, ...params })

/** F-V03 分户审核 */
export const apiPendingSplits = () => get('/village/split-applications/pending')
export const apiReviewSplit = (body) => post('/village/split-applications/review', body)

/** F-V05 户主变更（见上 apiChangeHead） */

/** F-V04 合户 / F-V06 销户 */
export const apiMergePreview = (params) => get('/village/households', params)

/** F-V12 二次意见上报 */
export const apiVillageOpinions = (status = 'all') => get('/village/opinions', { status })
export const apiReportOpinions = (body) => post('/village/opinions/report', body)

/** F-V11 村变化对比 */
export const apiVillageCompareDetail = () => get('/village/compare')

/** F-V07 需修改内容（按户取 adjustNote / changeNote） */
export const apiFixList = (params) => get('/village/households', { status: 'all', page: 1, pageSize: 500, ...params })

/** 两级锁状态 */
export const apiLockState = () => get('/village/lock-state')

/** F-V04 合户（修改即生效） */
export const apiMergeHousehold = (id, body) => post(`/village/households/${id}/merge`, body)
export const apiMergeRecords = () => get('/village/operations/merges')

/** F-V06 销户 */
export const apiCancelHousehold = (id, body) => post(`/village/households/${id}/cancel`, body)
export const apiDeleteRecords = () => get('/village/operations/deletes')
export const apiSplitRecords = () => get('/village/operations/splits')

/** 合户/销户 提交（独立路径，提交后锁定） */
export const apiSubmitChangeOp = (opId) => post(`/village/change-ops/${opId}/submit`)

/** F-V02 村级成员维护 */
export const apiVillageMembers = (id) => get(`/village/households/${id}/members`)
export const apiVillageAddMember = (id, body) => post(`/village/households/${id}/members`, body)
export const apiVillageUpdateMember = (id, mid, body) => put(`/village/households/${id}/members/${mid}`, body)
export const apiVillageDeleteMember = (id, mid) => del(`/village/households/${id}/members/${mid}`)

/** F-V08 账号维护 */
export const apiResetPassword = (body) => post('/auth/password/reset', body)
export const apiUnbindWechat = (body) => post('/auth/wechat/unbind', body)
export const apiBindWechat = (body) => post('/auth/wechat/bind', body)

/** F-V10 上报单 */
export const apiVillageReportsExport = (body) => post('/village/reports/export', body)
export const apiVillageSubmissions = (params) => get('/village/submissions', params)
export const apiSubmitVillage = (body) => post('/village/submissions', body)

/** F-V09 代录地块 */
export const apiVillageAddLand = (id, body) => post(`/village/households/${id}/lands`, body)

/** F-T10 镇级二次意见 */
export const apiTownOpinions = (status = 'all') => get('/township/opinions', { status })
export const apiTownReportOpinions = (body) => post('/township/opinions/report', body)
export const apiTownRejectVillageOpinion = (body) => post('/township/opinions/back', body)

/** F-T07 辖区统计报表导出（DC-） */
export const apiTownReportsExport = (body) => post('/township/reports/export', body)
/** F-T04/T05 辖区村与户（复用主控） */
export const apiTownVillageHouseholds = (params) => get('/township/households', params)

/* ---------------- 县级补充 ---------------- */
export const apiCountyReportsExport = (body) => post('/county/reports/export', body)
export const apiCountyExports = (params) => get('/county/exports', params)
export const apiCountyArchives = (params) => get('/county/archives', params)
export const apiCountyArchiveCreate = (body) => post('/county/archives', body)
export const apiDistributions = (params) => get('/county/distributions', params)
export const apiCreateDistribution = (body) => post('/county/distributions', body)
export const apiShapefileImports = (params) => get('/county/shapefile/imports', params)
export const apiShapefileExecute = (id) => post(`/county/shapefile/imports/${id}/execute`, {})
export const apiFieldMapping = (id, body) => put(`/county/imports/${id}/field-mapping`, body)
export const apiAccountCheck = () => get('/auth/import/accounts/abnormal')
export const apiShapefileUploadPreview = (file) => {
  if (MOCK_ENABLED) return mockFetch('POST', '/county/shapefile/upload-preview', { fileName: file && file.name })
  const fd = new FormData()
  fd.append('file', file)
  return fetch((import.meta.env.VITE_API_BASE_URL || '/api') + '/county/shapefile/upload-preview', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + (localStorage.getItem('lp_token') || '') },
    body: fd,
  }).then(async (r) => {
    const j = await r.json().catch(() => null)
    if (j && typeof j === 'object' && 'code' in j) {
      if (j.code !== 0 && j.code !== 200) throw new Error(j.message || '上传失败')
      return j.data
    }
    return j
  })
}
