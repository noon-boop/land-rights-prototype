import { createRouter, createWebHashHistory } from 'vue-router'
import DefaultLayout from '@/layout/DefaultLayout.vue'
import { flatMenu, defaultPath } from '@/menu'
import { useAuthStore } from '@/store/auth'

/* ============================================================
   路由表（F-P04 路由权限）
   ------------------------------------------------------------
   - 路由由菜单表生成，meta.perm 与功能编号一一对应
   - 守卫：未登录 → 登录页；无该功能权限 → 无权限页（F-P11）
   - 首登未改密 → 强制进改密页
   ============================================================ */

const SHARED = {
  '/dashboard': () => import('@/views/Dashboard.vue'),
  '/households': () => import('@/views/HouseholdList.vue'),
  '/lands': () => import('@/views/LandOverview.vue'),
  '/stats': () => import('@/views/ReviewStats.vue'),
  '/notify': () => import('@/views/Notify.vue'),
  // 村级已实现页
  '/v/review': () => import('@/views/village/VillageReview.vue'),
  '/v/split-review': () => import('@/views/village/SplitReview.vue'),
  '/v/change-head': () => import('@/views/village/ChangeHead.vue'),
  '/v/opinions': () => import('@/views/village/VillageOpinions.vue'),
  '/v/members': () => import('@/views/village/MemberManage.vue'),
  '/v/merge': () => import('@/views/village/MergeHousehold.vue'),
  '/v/cancel': () => import('@/views/village/CancelHousehold.vue'),
  '/v/fix-list': () => import('@/views/village/FixList.vue'),
  '/v/accounts': () => import('@/views/village/AccountManage.vue'),
  '/v/proxy': () => import('@/views/village/ProxyCollect.vue'),
  '/v/submission': () => import('@/views/village/SubmissionAssemble.vue'),
  '/v/compare': () => import('@/views/village/VillageCompare.vue'),
  // 镇级已实现页
  '/t/villages': () => import('@/views/town/VillageProgress.vue'),
  '/t/reports': () => import('@/views/town/SubmissionReview.vue'),
  '/t/packages': () => import('@/views/town/PackageAssemble.vue'),
  '/t/deadlines': () => import('@/views/town/DeadlineSetting.vue'),
  '/t/opinions': () => import('@/views/town/TownOpinions.vue'),
  '/t/report-detail': () => import('@/views/town/ReportDetail.vue'),
  '/t/compare': () => import('@/views/town/TownCompare.vue'),
  '/t/households': () => import('@/views/town/TownHouseholds.vue'),
  '/t/fix-list': () => import('@/views/town/TownFixList.vue'),
  '/t/stats': () => import('@/views/town/TownStatsExport.vue'),
  // 县级已实现页
  '/c/packages': () => import('@/views/county/PackageReview.vue'),
  '/c/towns': () => import('@/views/county/TownProgress.vue'),
  '/c/households': () => import('@/views/county/CountyHouseholds.vue'),
  '/c/import': () => import('@/views/county/BaselineImport.vue'),
  '/c/distribute': () => import('@/views/county/Distribution.vue'),
  '/c/fix-stats': () => import('@/views/county/CountyFixStats.vue'),
  '/c/land-list': () => import('@/views/county/LandListOutput.vue'),
  '/c/opinions': () => import('@/views/county/CountyOpinions.vue'),
  '/c/reports': () => import('@/views/county/CountyReports.vue'),
  '/c/archive': () => import('@/views/county/ArchiveManage.vue'),
  '/c/accounts': () => import('@/views/county/CountyAccounts.vue'),
  '/c/compare': () => import('@/views/county/CountyCompare.vue'),
  '/c/vector-return': () => import('@/views/county/VectorReturn.vue'),
  '/c/return-records': () => import('@/views/county/ReturnRecords.vue'),
}

const menuRoutes = flatMenu().map((m) => ({
  path: m.path.replace(/^\//, ''),
  name: m.path,
  component: SHARED[m.path] || (() => import('@/views/FeaturePending.vue')),
  meta: { title: m.title, perm: m.perm, group: m.group, note: m.note || '' },
}))

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/password',
    name: 'password',
    component: () => import('@/views/ChangePassword.vue'),
    meta: { title: '修改密码' },
  },
  {
    path: '/',
    component: DefaultLayout,
    children: [
      { path: '', redirect: '/dashboard' },
      ...menuRoutes,
      {
        path: 'households/:id',
        name: 'household-detail',
        component: () => import('@/views/HouseholdDetail.vue'),
        meta: { title: '户详情', perm: 'F-P08' },
      },
      {
        path: '403',
        name: 'forbidden',
        component: () => import('@/views/Forbidden.vue'),
        meta: { title: '无权限' },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    // 已登录访问登录页 → 回工作台
    if (auth.isLoggedIn && auth.user) return '/dashboard'
    return true
  }

  if (!auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  // 刷新后上下文丢失 → 重建（含权限）
  if (!auth.user || Object.keys(auth.perms).length === 0) {
    try {
      await auth.loadContext()
    } catch (e) {
      auth.logout()
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }

  // 首登强制改密（F-P01）
  if (auth.mustChangePassword && to.path !== '/password') {
    return '/password'
  }

  // 路由权限（F-P04）
  if (to.meta.perm && !auth.hasPerm(to.meta.perm)) {
    return { path: '/403', query: { from: to.fullPath, perm: to.meta.perm } }
  }

  return true
})

router.afterEach((to) => {
  const base = '土地确权线上确认系统'
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export { defaultPath }
export default router
