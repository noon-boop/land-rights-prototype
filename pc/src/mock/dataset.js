/* ============================================================
   原型演示数据集（纯前端 mock 的种子数据）
   ------------------------------------------------------------
   一套完整的县级业务数据：1 县 / 2 镇 / 5 村 / 数十户 / 数百地块，
   并预置不同阶段的流程单据（村整村单、乡镇上报包、县级归档），
   让 46 个页面在任何角色登录后都有内容可看、有流程可点。
   ============================================================ */

const SURNAMES = ['张', '王', '李', '赵', '刘', '孙', '周', '吴', '郑', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨', '朱']
const GIVEN_M = ['建国', '德发', '桂芳', '老根', '长贵', '铁柱', '春生', '福来', '金山', '庆丰', '守义', '志强', '永胜', '明亮', '万山', '广财']
const GIVEN_F = ['秀英', '桂兰', '玉珍', '凤霞', '淑芬', '月娥', '春花', '小梅', '艳丽', '红梅']
const USES = ['耕地', '水田', '旱地', '园地', '林地']
const GRADES = ['一级', '二级', '三级']
const RELS = ['配偶', '子', '女', '父', '母', '儿媳', '孙']
const CATS = ['直接延包', '户主变更', '增加成员', '减少成员', '分户', '合户', '地块信息错误（户）', '征地', '整户消亡', '新增户', '无地户']

/* 稳定伪随机：同一个 seed 永远同一批数据，刷新不乱跳 */
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length]
const pad = (n, w = 2) => String(n).padStart(w, '0')

/* ---------------- 组织 ---------------- */
export const ORGS = {
  county: { id: 'C01', countyName: '幸福县', name: '幸福县', leaderName: '刘振华', contractorName: '幸福县农业农村局' },
  towns: [
    { id: 'T01', townId: 'T01', countyId: 'C01', townName: '幸福镇', name: '幸福镇', leaderName: '王守义' },
    { id: 'T02', townId: 'T02', countyId: 'C01', townName: '长胜镇', name: '长胜镇', leaderName: '李长胜' },
  ],
  villages: [
    { id: 'V01', villageId: 'V01', townId: 'T01', villageName: '幸福村', name: '幸福村', leaderName: '张建国', groups: ['一组', '二组', '三组'] },
    { id: 'V02', villageId: 'V02', townId: 'T01', villageName: '和平村', name: '和平村', leaderName: '王德发', groups: ['一组', '二组'] },
    { id: 'V03', villageId: 'V03', townId: 'T01', villageName: '新建村', name: '新建村', leaderName: '赵桂芳', groups: ['一组', '二组', '三组'] },
    { id: 'V04', villageId: 'V04', townId: 'T02', villageName: '长胜村', name: '长胜村', leaderName: '刘老根', groups: ['一组', '二组'] },
    { id: 'V05', villageId: 'V05', townId: 'T02', villageName: '永丰村', name: '永丰村', leaderName: '孙长贵', groups: ['一组', '二组', '三组'] },
  ],
}

/* ---------------- 账号 ---------------- */
export const ACCOUNTS = [
  { username: 'admin', password: '123456', realName: '系统管理员', userType: 'ADMIN', orgLabel: '平台管理', mustChangePassword: false },
  { username: 'county_zhao', password: '123456', realName: '赵立县', userType: 'COUNTY', countyId: 'C01', orgLabel: '幸福县', mustChangePassword: false },
  { username: 'town_wang', password: '123456', realName: '王守义', userType: 'TOWN', townId: 'T01', countyId: 'C01', orgLabel: '幸福镇', mustChangePassword: false },
  { username: 'town_li', password: '123456', realName: '李长胜', userType: 'TOWN', townId: 'T02', countyId: 'C01', orgLabel: '长胜镇', mustChangePassword: false },
  { username: 'village_wang', password: '123456', realName: '张建国', userType: 'VILLAGE', villageId: 'V01', townId: 'T01', countyId: 'C01', orgLabel: '幸福村', mustChangePassword: false },
  { username: 'village_li', password: '123456', realName: '王德发', userType: 'VILLAGE', villageId: 'V02', townId: 'T01', countyId: 'C01', orgLabel: '和平村', mustChangePassword: false },
  { username: 'village_new', password: '123456', realName: '赵桂芳', userType: 'VILLAGE', villageId: 'V03', townId: 'T01', countyId: 'C01', orgLabel: '新建村', mustChangePassword: false },
]

/* ---------------- 权限点 ---------------- */
const COMMON_PERMS = ['F-P01', 'F-P02', 'F-P03', 'F-P04', 'F-P05', 'F-P06', 'F-P07', 'F-P08', 'F-P09', 'F-P10', 'F-P11', 'F-P12']
const range = (p, a, b) => Array.from({ length: b - a + 1 }, (_, i) => `${p}${pad(a + i)}`)
export function permsOf(userType) {
  if (userType === 'ADMIN') return [...COMMON_PERMS, ...range('F-V', 1, 12), ...range('F-T', 1, 10), ...range('F-C', 1, 14)]
  if (userType === 'VILLAGE') return [...COMMON_PERMS, ...range('F-V', 1, 12)]
  if (userType === 'TOWN') return [...COMMON_PERMS, ...range('F-T', 1, 10)]
  if (userType === 'COUNTY') return [...COMMON_PERMS, ...range('F-C', 1, 14)]
  return COMMON_PERMS
}

/* ---------------- 造户 / 人 / 地块 ---------------- */
let seq = 0
const nextId = (p) => `${p}${pad(++seq, 4)}`

function makeIdCard(r) {
  const y = 1950 + Math.floor(r() * 45)
  const m = 1 + Math.floor(r() * 12)
  const d = 1 + Math.floor(r() * 28)
  const tail = Math.floor(r() * 9000 + 1000)
  return `420123${y}${pad(m)}${pad(d)}${tail}`
}
const maskId = (id) => (id ? id.replace(/^(.{6})(?:\d{8})(.{4})$/, '$1********$2') : '')

function makeMembers(r, householder, group) {
  const n = 3 + Math.floor(r() * 4)
  const out = []
  for (let i = 0; i < n; i++) {
    const isHead = i === 0
    const sex = isHead ? (r() > 0.35 ? '男' : '女') : (r() > 0.5 ? '男' : '女')
    const name = isHead
      ? householder
      : pick(r, SURNAMES) + pick(r, sex === '男' ? GIVEN_M : GIVEN_F)
    const idCard = makeIdCard(r)
    out.push({
      id: nextId('M'),
      name,
      sex,
      relation: isHead ? '户主' : pick(r, RELS),
      idCard,
      idCardMasked: maskId(idCard),
      isCollective: r() > 0.15,
      memberType: isHead ? '世居' : pick(r, ['世居', '婚迁', '出生', '投靠']),
      joinFrom: pick(r, ['', '本村', '幸福村二组', '外县']),
      changeType: isHead ? '保留' : pick(r, ['保留', '新增', '减少']),
      phone: `138****${pad(Math.floor(r() * 9000 + 1000), 4)}`,
      group,
    })
  }
  return out
}

function makeLands(r, householdId, group, contractTotal, n) {
  const out = []
  const each = contractTotal / n
  for (let i = 0; i < n; i++) {
    const contractArea = Math.round(each * (0.7 + r() * 0.6) * 100) / 100
    const measured = Math.round(contractArea * (0.94 + r() * 0.14) * 100) / 100
    const no = (n > 1 ? `-${i + 1}` : '')
    out.push({
      id: nextId('L'),
      householdId,
      plotCode: `420123${group.replace(/[^一二三四五]/g, '')}${pad(i + 1, 3)}${no}`.replace('', ''),
      plotName: `${group}${pick(r, ['东坡地', '西沟地', '南洼地', '北岭地', '大排田', '河沿地'])}`,
      name: '',
      landUse: pick(r, USES),
      landGrade: pick(r, GRADES),
      isBasicFarmland: r() > 0.35,
      isPendingVector: r() > 0.82,
      contractArea,
      measuredArea: measured,
      area: measured,
      confirmStatus: pick(r, ['已确权', '已确权', '已确权', '待确权']),
      source: pick(r, ['基线', '基线', '农户填报']),
      boundaryEast: pick(r, ['张建国地', '村道', '水渠', '王德发地']),
      boundarySouth: pick(r, ['生产路', '排水沟', '李桂芳地']),
      boundaryWest: pick(r, ['刘老根地', '机耕道', '林地']),
      boundaryNorth: pick(r, ['灌溉渠', '赵桂芳地', '村集体机动地']),
      adjustNote: '',
      remark: '',
    })
  }
  // plotCode 补齐：保证唯一且有业务感
  out.forEach((l, i) => {
    l.plotCode = `${group === '一组' ? '01' : group === '二组' ? '02' : '03'}-${pad(i + 1, 3)}`
  })
  return out
}

/* 状态配比：不同村处于不同阶段，让每个角色登录都有活可干 */
const VILLAGE_STAGE = {
  V01: { approved: 1.0, pending: 0, rejected: 0, unsubmitted: 0, submit: 'C' },      // 幸福村：全部通过 + 镇级已通过
  V02: { approved: 0.86, pending: 0.14, rejected: 0, unsubmitted: 0, submit: 'B' },  // 和平村：已提交待镇审
  V03: { approved: 0.6, pending: 0.26, rejected: 0.1, unsubmitted: 0.04, submit: 'A' }, // 新建村：进行中
  V04: { approved: 1.0, pending: 0, rejected: 0, unsubmitted: 0, submit: 'C' },      // 长胜村：已进上报包
  V05: { approved: 0.92, pending: 0.08, rejected: 0, unsubmitted: 0, submit: 'C' },  // 永丰村：已进上报包
}

const HH_COUNT = { V01: 14, V02: 12, V03: 15, V04: 10, V05: 11 }

export function buildSeed() {
  seq = 0
  const households = []
  const now = '2026-11-2'

  ORGS.villages.forEach((v, vi) => {
    const stage = VILLAGE_STAGE[v.villageId]
    const n = HH_COUNT[v.villageId]
    const r = rng(1000 + vi * 37)
    for (let i = 0; i < n; i++) {
      const group = v.groups[i % v.groups.length]
      const houseName = pick(r, SURNAMES) + pick(r, r() > 0.4 ? GIVEN_M : GIVEN_F)
      const idCard = makeIdCard(r)
      const id = nextId('H')
      const plotCount = 1 + Math.floor(r() * 4)
      const contractArea = Math.round((6 + r() * 16) * 100) / 100

      // 按配比分配状态（顺序错开，避免整村前几户同状态）
      const x = ((i * 7) % n) / n
      let status = '已通过'
      if (x < stage.rejected) status = '未通过'
      else if (x < stage.rejected + stage.unsubmitted) status = '未提交'
      else if (x < stage.rejected + stage.unsubmitted + stage.pending) status = '待审核'
      // 每个村固定放 1 户已注销，演示「销户单列」
      if (i === n - 1 && v.villageId === 'V01') status = '已注销'

      const members = makeMembers(r, houseName, group)
      const lands = makeLands(r, id, group, contractArea, plotCount)
      const measuredTotal = Math.round(lands.reduce((s, l) => s + l.measuredArea, 0) * 100) / 100
      const cat = status === '已通过' ? pick(r, CATS) : status === '未通过' ? '地块信息错误（户）' : ''

      households.push({
        id,
        householder: houseName,
        name: houseName,
        idCard,
        idCardMasked: maskId(idCard),
        sex: r() > 0.3 ? '男' : '女',
        countyId: 'C01',
        countyName: '幸福县',
        townId: v.townId,
        townName: ORGS.towns.find((t) => t.townId === v.townId).townName,
        villageId: v.villageId,
        villageName: v.villageName,
        villageGroup: group,
        groupName: group,
        contractorName: `${v.villageName}村民委员会`,
        leaderName: v.leaderName,
        address: `${ORGS.towns.find((t) => t.townId === v.townId).townName}${v.villageName}${group}`,
        contractNo: `XF-${v.villageId}-${pad(i + 1, 3)}`,
        contractStart: '1998-10-01',
        contractEnd: '2028-09-30',
        plotCount: lands.length,
        memberCount: members.length,
        contractArea,
        measuredArea: measuredTotal,
        vectorArea: status === '已通过' ? Math.round(measuredTotal * 1.01 * 100) / 100 : null,
        status,
        changeCategory: cat,
        fixCount: status === '未通过' ? 2 : 0,
        needFixCount: status === '未通过' ? 2 : 0,
        changeNote: status === '未通过' ? '地块四至与实测不一致，成员身份证号需核对' : '',
        adjustNote: status === '未通过' ? '二组地块实测面积小于合同面积，请补充面积调整说明' : '',
        reviewOpinion: status === '未通过' ? '四至填写有误，请村级重新核实后提交' : status === '已通过' ? '材料齐全，予以通过' : '',
        reviewedAt: status === '已通过' || status === '未通过' ? `${now}${pad(1 + (i % 8))} 10:${pad((i * 7) % 60)}` : '',
        submitTime: status === '未提交' ? '' : `${now}${pad(1 + (i % 8))} 09:${pad((i * 5) % 60)}`,
        source: i % 9 === 0 ? 'PROXY' : 'FARMER',
        isPendingVector: lands.some((l) => l.isPendingVector),
        deleted: status === '已注销',
        members,
        lands,
        changes: [
          { type: '信息核对', content: '农户确认承包信息与基线一致', at: `${now}03 14:20` },
          ...(i % 4 === 0 ? [{ type: '变更申请', content: '家庭成员信息修改：新增儿媳一名', at: `${now}04 09:35` }] : []),
        ],
      })
    }
  })

  /* ---------------- 整村上报单 ---------------- */
  const submissions = []
  let sNo = 0
  ORGS.villages.forEach((v) => {
    const stage = VILLAGE_STAGE[v.villageId]
    if (stage.submit === 'A') return
    const hs = households.filter((h) => h.villageId === v.villageId && h.status !== '已注销')
    const approved = hs.filter((h) => h.status === '已通过')
    sNo += 1
    const code = stage.submit
    submissions.push({
      id: nextId('S'),
      submitNo: `XF-2026-${pad(sNo, 3)}`,
      villageId: v.villageId,
      villageName: v.villageName,
      townId: v.townId,
      townName: ORGS.towns.find((t) => t.townId === v.townId).townName,
      householdCount: approved.length,
      totalArea: Math.round(approved.reduce((s, h) => s + h.contractArea, 0) * 100) / 100,
      measuredTotal: Math.round(approved.reduce((s, h) => s + h.measuredArea, 0) * 100) / 100,
      parcelCount: approved.reduce((s, h) => s + h.plotCount, 0),
      sealNo: `GD-2026-${pad(sNo, 4)}`,
      sealDate: '2026-11-20',
      statusCode: code,
      statusName: code === 'B' ? '待镇级审批' : code === 'C' ? '镇级已通过' : '已退回',
      submittedAt: '2026-11-20 16:30',
      remark: '',
      opinion: code === 'C' ? '整村材料齐全，同意通过' : '',
      items: approved.map((h) => ({
        householdId: h.id,
        householder: h.householder,
        idCardMasked: h.idCardMasked,
        villageGroup: h.villageGroup,
        plotCount: h.plotCount,
        contractArea: h.contractArea,
        changeCategory: h.changeCategory,
      })),
    })
  })

  /* ---------------- 乡镇上报包 ---------------- */
  const subT02 = submissions.filter((s) => s.townId === 'T02')
  const packages = [
    {
      id: nextId('P'),
      packageNo: 'XZ-2026-001',
      townId: 'T02',
      townName: '长胜镇',
      submissionIds: subT02.map((s) => s.id),
      villages: subT02.map((s) => ({ villageId: s.villageId, villageName: s.villageName, householdCount: s.householdCount, totalArea: s.totalArea, submitNo: s.submitNo })),
      villageCount: subT02.length,
      householdCount: subT02.reduce((s, x) => s + x.householdCount, 0),
      totalArea: Math.round(subT02.reduce((s, x) => s + x.totalArea, 0) * 100) / 100,
      statusCode: 'F',
      statusName: '已提交县级待审',
      createdAt: '2026-11-22 09:10',
      submittedAt: '2026-11-22 10:05',
      reviewedAt: '',
      opinion: '',
    },
    {
      id: nextId('P'),
      packageNo: 'XZ-2026-000',
      townId: 'T01',
      townName: '幸福镇',
      submissionIds: [],
      villages: [],
      villageCount: 0,
      householdCount: 0,
      totalArea: 0,
      statusCode: 'E',
      statusName: '待组包',
      createdAt: '2026-11-23 08:40',
      submittedAt: '',
      reviewedAt: '',
      opinion: '',
    },
  ]

  /* ---------------- 归档 ---------------- */
  const archives = []

  /* ---------------- 分户申请 ---------------- */
  const splitApps = []
  const splitBase = households.filter((h) => h.villageId === 'V01' && h.status === '已通过').slice(0, 2)
  splitBase.forEach((h, i) => {
    splitApps.push({
      id: nextId('SP'),
      householdId: h.id,
      householder: h.householder,
      idCardMasked: h.idCardMasked,
      villageId: h.villageId,
      villageName: h.villageName,
      villageGroup: h.villageGroup,
      memberCount: h.memberCount,
      plotCount: h.plotCount,
      contractArea: h.contractArea,
      headA: `${h.householder}`,
      headB: `${pick(rng(99 + i), SURNAMES)}${pick(rng(100 + i), GIVEN_M)}`,
      memberPicked: 2,
      landSplit: [[{ plotCode: h.lands[0].plotCode, plotName: h.lands[0].plotName, area: h.lands[0].contractArea, mode: '整块' }]],
      status: i === 0 ? '待审核' : '待审核',
      appliedAt: '2026-11-23 14:20',
      remark: '成年子女独立立户，协商分割承包地',
    })
  })

  /* ---------------- 二次意见 ---------------- */
  const opinions = [
    { id: nextId('O'), townId: 'T01', townName: '幸福镇', villageId: 'V01', villageName: '幸福村', householder: '赵桂芳', opinion: '承包地块实测面积与合同面积相差 0.6 亩，申请重新实测', villageNote: '已现场复核并附实测草图', townNote: '', status: '待上报', reportedAt: '2026-11-24 10:15' },
    { id: nextId('O'), townId: 'T01', townName: '幸福镇', villageId: 'V02', villageName: '和平村', householder: '孙长贵', opinion: '户主已故，家庭成员要求变更户主', villageNote: '材料齐全，建议同意变更', townNote: '', status: '待上报', reportedAt: '2026-11-24 15:40' },
    { id: nextId('O'), townId: 'T01', townName: '幸福镇', villageId: 'V01', villageName: '幸福村', householder: '张建国', opinion: '实测面积比合同面积少 0.3 亩，希望核实', villageNote: '已现场复核，属测量误差，按实测登记', townNote: '', status: '已上报', reportedAt: '2026-11-21 15:20' },
    { id: nextId('O'), townId: 'T01', townName: '幸福镇', villageId: 'V01', villageName: '幸福村', householder: '王德发', opinion: '二轮延包后新增人口希望纳入成员', villageNote: '符合条件，已补录成员 1 名', townNote: '同意村级处理意见', status: '已上报', reportedAt: '2026-11-22 09:40' },
    { id: nextId('O'), townId: 'T02', townName: '长胜镇', villageId: 'V04', villageName: '长胜村', householder: '刘老根', opinion: '地块被征用部分面积未核减', villageNote: '已上报镇级', townNote: '待县级口径确认', status: '已上报', reportedAt: '2026-11-22 16:05' },
  ]

  /* ---------------- 合户 / 销户留痕 ---------------- */
  const deleteRecords = [
    { id: nextId('DR'), householdId: households[0].id, householder: households[0].householder, villageName: households[0].villageName, reason: '整户消亡', paperNo: 'ZX-2026-007', opDate: '2026-11-19', operator: '张建国', status: '已生效' },
  ]
  const mergeRecords = [
    { id: nextId('MR'), fromName: '李桂芳', toName: '李国强', villageName: '幸福村', reason: '父子共同生活合户', mergedAt: '2026-11-18 10:20', operator: '张建国', status: '已生效' },
  ]

  /* ---------------- 基线导入批次 ---------------- */
  const imports = [
    { id: nextId('IM'), batchNo: 'JC-2026-001', fileName: '2007成果_幸福镇.zip', totalRows: 1284, households: 412, members: 1686, parcels: 1284, status: '已导入', createdAt: '2026-11-10 09:20', warn: '3 条地块缺编码，已自动补号' },
    { id: nextId('IM'), batchNo: 'JC-2026-002', fileName: '2007成果_长胜镇.zip', totalRows: 968, households: 286, members: 1102, parcels: 968, status: '待执行', createdAt: '2026-11-11 14:35', warn: '' },
  ]

  /* ---------------- 导出记录 ---------------- */
  const exports = [
    { id: nextId('EX'), exportNo: 'DC-2026-0001', exportType: 'DB', type: 'DB', scopeType: '全县', scope: '幸福县', fileType: 'EXCEL', format: 'EXCEL', fileName: '全县户信息台账_20261122.xlsx', rowCount: 1204, status: '已完成', createdAt: '2026-11-22 11:20', operator: '赵立县' },
    { id: nextId('EX'), exportNo: 'DC-2026-0002', exportType: 'DC', type: 'DC', scopeType: '乡镇', scope: '幸福镇', fileType: 'EXCEL', format: 'EXCEL', fileName: '幸福镇统计表_20261123.xlsx', rowCount: 62, status: '已完成', createdAt: '2026-11-23 10:05', operator: '赵立县' },
  ]

  /* ---------------- 数据下发批次 ---------------- */
  const distributions = [
    { id: nextId('D'), batchNo: 'XF-DATA-2026-001', scopeType: 'TOWN', scopeTypeName: '按乡镇', townCount: 2, villageCount: 5, householdCount: 62, status: '已下发', createdAt: '2026-11-12 09:30', distributedAt: '2026-11-12 09:31', operator: '赵立县' },
    { id: nextId('D'), batchNo: 'XF-DATA-2026-002', scopeType: 'VILLAGE', scopeTypeName: '按村', townCount: 1, villageCount: 1, householdCount: 14, status: '已撤销', createdAt: '2026-11-13 15:10', distributedAt: '2026-11-13 15:10', operator: '赵立县' },
  ]

  /* ---------------- 矢量回传 ---------------- */
  const vectorReturns = [
    { id: nextId('VR'), returnNo: 'HT-2026-001', returnName: '幸福镇实测矢量成果', villageCount: 3, affected: 38, totalHouseholds: 41, operator: '赵立县', createdAt: '2026-11-21 17:40', status: '已完成', remark: '含 38 个地块几何更新', statusDistribution: { 已更新: 30, 待复核: 8, 无变化: 3 } },
    { id: nextId('VR'), returnNo: 'HT-2026-002', returnName: '长胜镇实测矢量成果', villageCount: 2, affected: 21, totalHouseholds: 21, operator: '赵立县', createdAt: '2026-11-23 09:15', status: '待同步', remark: '待县级确认后同步', statusDistribution: { 已更新: 0, 待复核: 21, 无变化: 0 } },
  ]

  /* ---------------- 二次审查截止日期 ---------------- */
  const deadlines = ORGS.villages.map((v, i) => ({
    id: nextId('DL'),
    villageId: v.villageId,
    villageName: v.villageName,
    townId: v.townId,
    deadline: `2026-12-${pad(5 + i)}`,
    reviewDeadline: `2026-12-${pad(10 + i)}`,
  }))

  /* ---------------- 账号异常 ---------------- */
  const abnormalAccounts = [
    { id: nextId('AC'), username: 'zhangjianguo', realName: '张建国', householdId: households[0].id, issue: '手机号重复', abnormalType: '手机号重复', status: '待处理' },
    { id: nextId('AC'), username: 'wangdefa', realName: '王德发', householdId: households[14].id, issue: '未绑定手机号', abnormalType: '未绑定', status: '待处理' },
    { id: nextId('AC'), username: 'zhaoguifang', realName: '赵桂芳', householdId: households[26].id, issue: '身份证号与基线不一致', abnormalType: '信息不一致', status: '待处理' },
  ]

  return {
    version: 3,
    households,
    submissions,
    packages,
    archives,
    splitApps,
    opinions,
    deleteRecords,
    mergeRecords,
    imports,
    exports,
    distributions,
    vectorReturns,
    deadlines,
    abnormalAccounts,
    seeding: true,
  }
}

export const META = { CATS, ORGS, ACCOUNTS }
