/* ============================================================
   请求层（pc-platform 统一）
   - JWT 自动携带
   - 统一解包 { code, data, message }（code=0/200 成功）
   - 401 清登录态跳登录；403 抛出「无权限」由页面提示
   ============================================================ */

import { mockFetch, MOCK_ENABLED } from '@/mock'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const TOKEN_KEY = 'lp_token'
const USER_KEY = 'lp_user'
/** 原型演示开关：VITE_USE_MOCK 未设为 false 时走本地 mock（见 src/mock） */
export const USE_MOCK = MOCK_ENABLED


export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}
export function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t)
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}
export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch (e) {
    return null
  }
}
export function setStoredUser(u) {
  localStorage.setItem(USER_KEY, JSON.stringify(u || null))
}

export async function http(method, path, body) {
  /* ---------- 原型模式：本地 mock，不发网络请求 ---------- */
  if (MOCK_ENABLED) {
    try {
      return await mockFetch(method, path, body)
    } catch (e) {
      if (e && e.code === 401) {
        clearAuth()
        const redirect = window.location.hash.replace(/^#/, '') || '/'
        if (!window.location.hash.includes('/login')) {
          window.location.hash = `#/login?redirect=${encodeURIComponent(redirect)}`
        }
      }
      throw e
    }
  }

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
  }
  if (body !== undefined) options.body = JSON.stringify(body)

  const res = await fetch(`${BASE_URL}${path}`, options)
  let data = null
  try {
    data = await res.json()
  } catch (e) {
    data = null
  }

  if (res.status === 401) {
    clearAuth()
    const redirect = window.location.hash.replace(/^#/, '') || '/'
    if (!window.location.hash.includes('/login')) {
      window.location.hash = `#/login?redirect=${encodeURIComponent(redirect)}`
    }
    throw new Error((data && data.message) || '登录已过期，请重新登录')
  }

  if (!res.ok) {
    throw new Error((data && (data.message || data.msg)) || `请求失败（${res.status}）`)
  }

  if (data && typeof data === 'object' && 'code' in data) {
    if (data.code !== 0 && data.code !== 200) {
      const err = new Error(data.message || '业务处理失败')
      err.code = data.code
      throw err
    }
    return data.data
  }
  return data
}

export const get = (path, params) => {
  if (!params) return http('GET', path)
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ).toString()
  return http('GET', qs ? `${path}?${qs}` : path)
}
export const post = (path, body) => http('POST', path, body)
export const put = (path, body) => http('PUT', path, body)
export const del = (path, body) => http('DELETE', path, body)

export { BASE_URL }
