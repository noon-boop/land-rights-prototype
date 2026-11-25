/* ============================================================
   单一客户端的菜单与路由表（F-P03 动态菜单）
   ------------------------------------------------------------
   一个平台服务村/镇/县三种角色，菜单不按端硬编码，
   而是「全量菜单 + 按登录人权限点过滤」。
   每条 item.perm 对应 PRD 的功能编号，后端 sys_role_permission 授权。
   impl=true 表示页面已实现；false 走统一的「待建设」页，
   但仍可导航（保证骨架完整、权限与菜单链路可测）。
   ============================================================ */

export const MENU = [
  {
    group: '通用',
    items: [
      { path: '/dashboard', title: '工作台', perm: 'F-P06', icon: 'dashboard', impl: true },
      { path: '/households', title: '户信息列表', perm: 'F-P07', icon: 'doc', impl: true },
      { path: '/lands', title: '地块信息总览', perm: 'F-P09', icon: 'field', impl: true },
      { path: '/stats', title: '审核统计', perm: 'F-P10', icon: 'chart', impl: true },
      { path: '/notify', title: '催办与提醒', perm: 'F-P12', icon: 'bell', impl: true,
        note: '待办超期提醒、短信/订阅消息批量通知、乡镇村进度排行；模板可配置、发送留痕' },
    ],
  },
  {
    group: '村级业务',
    items: [
      { path: '/v/review', title: '户级审核', perm: 'F-V01', icon: 'check', impl: true,
        note: '核对农户填报内容；通过或退回（退回意见 ≥10 字）；通过时必选户级业务分类（11 类之一）' },
      { path: '/v/members', title: '成员信息处理', perm: 'F-V02', icon: 'people', impl: true,
        note: '协助处理成员增减/关系变更，承接基线成员信息错误更正；操作留痕' },
      { path: '/v/split-review', title: '分户审核', perm: 'F-V03', icon: 'split', impl: true,
        note: '核对成员勾选、地块分配（整块/面积）、两边户主；通过一次性事务落库；受两级锁约束' },
      { path: '/v/merge', title: '合户', perm: 'F-V04', icon: 'merge', impl: true,
        note: '仅村级发起；并入户户主账号停用；修改即生效，提交为独立路径' },
      { path: '/v/change-head', title: '户主变更', perm: 'F-V05', icon: 'user', impl: true,
        note: '变更户主（姓名+身份证+手机号）；停用原户主账号、建/启用新户主账号；留存前后值' },
      { path: '/v/cancel', title: '销户办理', perm: 'F-V06', icon: 'trash', impl: true,
        note: '必填原因、纸质材料编号、日期、经办人；修改即生效' },
      { path: '/v/fix-list', title: '需修改内容', perm: 'F-V07', icon: 'warning', impl: true,
        note: '本村需修改内容汇总（成员类 / 地块类分列）' },
      { path: '/v/accounts', title: '建户/建号/手机号', perm: 'F-V08', icon: 'lock', impl: true,
        note: '新增户建户+同步建账号；维护手机号；重置密码；解绑/换绑微信（留痕）' },
      { path: '/v/proxy', title: '代录采集', perm: 'F-V09', icon: 'edit', impl: true,
        note: '代录三要素：授权书编号 + 农户验证码 + 村级权限；数据带 source=PROXY' },
      { path: '/v/submission', title: '上报单组装与提交', perm: 'F-V10', icon: 'submit', impl: true,
        note: '导出统计表（XF-）；完成率 100%；登记盖章件编号与日期；生成上报单提交镇级' },
      { path: '/v/compare', title: '村变化对比', perm: 'F-V11', icon: 'compare', impl: true,
        note: '本村户数（基线/当前/新增/分户/合户/销户）与面积（合同/实测/矢量）对比，只读可导出' },
      { path: '/v/opinions', title: '二次意见上报', perm: 'F-V12', icon: 'message', impl: true,
        note: '汇总本村农户问题意见，可附村级处理意见；上报镇级；上报后不可改' },
    ],
  },
  {
    group: '镇级业务',
    items: [
      { path: '/t/villages', title: '村列表与进度', perm: 'F-T01', icon: 'list', impl: true,
        note: '辖区各村进度（完成率、已通过、销户、超期数）、筛选' },
      { path: '/t/reports', title: '上报单审批', perm: 'F-T02', icon: 'check', impl: true,
        note: '审批整村上报单；通过/退回村级（整个村打回，意见 ≥10 字）' },
      { path: '/t/report-detail', title: '上报明细查看', perm: 'F-T03', icon: 'doc', impl: true,
        note: '上报单明细（户清单、地块汇总、面积合计、业务分类分布）' },
      { path: '/t/compare', title: '村变化对比', perm: 'F-T04', icon: 'compare', impl: true,
        note: '按村对比户数与面积，支持导出' },
      { path: '/t/households', title: '辖区户与地块查阅', perm: 'F-T05', icon: 'search', impl: true,
        note: '跨村只读查看（含需修改内容、问题意见）' },
      { path: '/t/fix-list', title: '需修改内容汇总', perm: 'F-T06', icon: 'warning', impl: true,
        note: '辖区需修改内容统计（成员类 / 地块类）' },
      { path: '/t/stats', title: '审核统计与导出', perm: 'F-T07', icon: 'chart', impl: true,
        note: '辖区统计（官方 11 类口径 + 汇总）+ 报表导出（DC-）' },
      { path: '/t/packages', title: '乡镇组包报县', perm: 'F-T08', icon: 'package', impl: true,
        note: '辖区全部村已 C 后组包（XZ-）提交县级；有村未完成则置灰+未完成村清单；提交后包内锁定' },
      { path: '/t/deadlines', title: '二次审查截止日期', perm: 'F-T09', icon: 'clock', impl: true,
        note: '按村设置或批量设置截止日期；到期不锁死，仅提示超期' },
      { path: '/t/opinions', title: '二次意见上报', perm: 'F-T10', icon: 'message', impl: true,
        note: '汇总村级上报意见，可附镇级处理意见；上报县级；可退回村级重报' },
    ],
  },
  {
    group: '县级业务',
    items: [
      { path: '/c/towns', title: '乡镇列表与进度', perm: 'F-C01', icon: 'list', impl: true,
        note: '全县进度总览（含上报单状态、二次审查超期统计）' },
      { path: '/c/packages', title: '乡镇上报包审批', perm: 'F-C02', icon: 'check', impl: true },
      { path: '/c/households', title: '全县户与地块查阅', perm: 'F-C03', icon: 'search', impl: true,
        note: '只读查看全县户与地块；支持从上报包/乡镇下钻到单个村' },
      { path: '/c/import', title: '基线数据导入', perm: 'F-C04', icon: 'upload', impl: true,
        note: '导入 2007 成果（上传预览→字段映射→校验→执行导入）；导入完成后批量建号' },
      { path: '/c/distribute', title: '数据下发', perm: 'F-C05', icon: 'send', impl: true,
        note: '按乡镇/村下发（支持批次与撤销下发）；未下发下级不可见' },
      { path: '/c/fix-stats', title: '需修改内容统计', perm: 'F-C06', icon: 'warning', impl: true,
        note: '按类型、按乡镇/村、按户汇总；支持导出' },
      { path: '/c/land-list', title: '需调整地块清单输出', perm: 'F-C07', icon: 'export', impl: true,
        note: 'Excel 台账 + Shapefile（带地块编码）两套同步导出' },
      { path: '/c/vector-return', title: '矢量成果回传', perm: 'F-C08', icon: 'upload', impl: true },
      { path: '/c/return-records', title: '回传记录与回执', perm: 'F-C09', icon: 'doc', impl: true },
      { path: '/c/opinions', title: '二次审查意见', perm: 'F-C10', icon: 'message', impl: true,
        note: '仅显示已上报至县级的意见，含村、镇两级处理意见；可退回镇级重报' },
      { path: '/c/reports', title: '报表与导出', perm: 'F-C11', icon: 'export', impl: true,
        note: '官方口径统计报表、需修改内容报表导出（DC-、DB-）' },
      { path: '/c/archive', title: '归档', perm: 'F-C12', icon: 'archive', impl: true,
        note: '按乡镇上报包（XZ-）归档成果（GD-）；归档后只读' },
      { path: '/c/accounts', title: '账号批量管理', perm: 'F-C13', icon: 'lock', impl: true,
        note: '基线导入后批量建号、重置密码、异常账号排查' },
      { path: '/c/compare', title: '村变化对比（全县）', perm: 'F-C14', icon: 'compare', impl: true,
        note: '全县按乡镇→村对比户数与面积，支持下钻单村、可导出' },
    ],
  },
]

/** 扁平化，供路由生成 */
export function flatMenu() {
  return MENU.flatMap((g) => g.items)
}

/** 角色默认落地页：按权限挑第一个已实现项 */
export function defaultPath(hasPerm) {
  const first = flatMenu().find((m) => m.impl && hasPerm(m.perm))
  return first ? first.path : '/dashboard'
}
