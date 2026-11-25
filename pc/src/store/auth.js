import { defineStore } from 'pinia'
import {
  apiLogin,
  apiUserInfo,
  apiChangePassword,
  apiOrg,
  apiTownOrg,
  apiCountyOrg,
} from '@/api'
import { setToken, getToken, clearAuth, setStoredUser, getStoredUser } from '@/api/request'

/* ============================================================
   用户上下文（F-P02）+ 登录态（F-P01）
   ------------------------------------------------------------
   - permissions：后端 /auth/user/info 返回 [{code, level}]，level = W/R
   - 菜单与路由都按 perm code 过滤，页面无权即不可达（F-P03/F-P04）
   - 一人一角色：userType ∈ VILLAGE / TOWN / COUNTY / ADMIN
   ============================================================ */

const ROLE_NAME = {
  VILLAGE: '村级用户',
  TOWN: '镇级用户',
  COUNTY: '县级用户',
  ADMIN: '系统管理员',
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    user: getStoredUser(),
    /** { 'F-P01': 'W', 'F-V01': 'R' } */
    perms: {},
    dataScope: '',
    org: { name: '', contractorName: '', leaderName: '' },
    loading: false,
  }),

  getters: {
    isLoggedIn: (s) => !!s.token,
    userType: (s) => (s.user && s.user.userType) || '',
    roleName: (s) => ROLE_NAME[(s.user && s.user.userType) || ''] || '',
    /** 顶栏展示：组织名 · 角色名 */
    orgLabel: (s) => s.org.name || '',
    mustChangePassword: (s) => !!(s.user && s.user.mustChangePassword),
    /** 是否拥有某权限点（ADMIN 视为全量） */
    hasPerm: (s) => (code) => {
      if (!code) return true
      if ((s.user && s.user.userType) === 'ADMIN') return true
      return Object.prototype.hasOwnProperty.call(s.perms, code)
    },
    /** 是否可写（W），用于按钮置灰 */
    canWrite: (s) => (code) => {
      if (!code) return true
      if ((s.user && s.user.userType) === 'ADMIN') return true
      return s.perms[code] === 'W'
    },
  },

  actions: {
    async login(username, password) {
      const d = await apiLogin(username, password)
      this.token = d.token
      setToken(d.token)
      this.user = d.user
      setStoredUser(d.user)
      this.dataScope = d.dataScope || ''
      this.perms = toPermMap(d.permissions)
      if (!d.mustChangePassword) {
        await this.loadContext()
      }
      return { mustChangePassword: !!d.mustChangePassword }
    },

    /** 首登强制改密 / 主动改密 */
    async changePassword(oldPassword, newPassword) {
      await apiChangePassword(oldPassword, newPassword)
      if (this.user) {
        this.user = { ...this.user, mustChangePassword: false }
        setStoredUser(this.user)
      }
      await this.loadContext()
    },

    /** 拉用户信息 + 组织信息（刷新页面后重建上下文） */
    async loadContext() {
      this.loading = true
      try {
        const info = await apiUserInfo()
        this.user = {
          userId: info.id,
          username: info.username,
          realName: info.realName,
          userType: info.userType,
          villageId: info.villageId,
          townId: info.townId,
          countyId: info.countyId,
          householdId: info.householdId,
          mustChangePassword: info.mustChangePassword,
        }
        setStoredUser(this.user)
        this.perms = toPermMap(info.permissions)
        this.dataScope = info.dataScope || ''
        await this.loadOrg()
      } finally {
        this.loading = false
      }
    },

    /** 顶栏身份：按角色取对应组织信息（F-P05） */
    async loadOrg() {
      const t = this.userType
      try {
        if (t === 'VILLAGE') {
          const o = await apiOrg()
          this.org = {
            name: o.villageName || o.name || '',
            contractorName: o.contractorName || '',
            leaderName: o.leaderName || '',
          }
        } else if (t === 'TOWN') {
          const o = await apiTownOrg()
          this.org = {
            name: o.townName || o.name || '',
            contractorName: '',
            leaderName: o.leaderName || '',
          }
        } else if (t === 'COUNTY') {
          const o = await apiCountyOrg()
          this.org = {
            name: o.countyName || o.name || '',
            contractorName: '',
            leaderName: o.leaderName || '',
          }
        } else {
          this.org = { name: '平台管理', contractorName: '', leaderName: '' }
        }
      } catch (e) {
        // 组织信息失败不阻断（顶栏退化为角色名）
        this.org = { name: '', contractorName: '', leaderName: '' }
      }
    },

    logout() {
      this.token = ''
      this.user = null
      this.perms = {}
      this.org = { name: '', contractorName: '', leaderName: '' }
      clearAuth()
    },
  },
})

/** [{code,level}] → { code: level } */
function toPermMap(list) {
  const m = {}
  if (Array.isArray(list)) {
    for (const p of list) {
      if (p && p.code) m[p.code] = p.level === 'R' ? 'R' : 'W'
    }
  }
  return m
}
