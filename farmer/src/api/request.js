/* ============================================================
   农户端 · 请求层（uni.request 封装）
   ------------------------------------------------------------
   - 统一网关入口，后端统一返回 { code, data, message }
   - code=0 或 200 视为成功；401 清 token；403/500 抛业务错误
   - 自动携带 JWT（存 uni storage，key=lr_token）
   - 网关地址：开发者工具（需关闭 urlCheck）用 127.0.0.1:9000
             真机预览请改为电脑局域网 IP，如 http://192.168.1.100:9000
   ============================================================ */

import { mockRequest, MOCK_ENABLED } from '@/mock'

export const BASE_URL = 'http://127.0.0.1:9000'
export const TOKEN_KEY = 'lr_token'
export const USER_KEY = 'lr_user'

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token) {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function setUser(user) {
  uni.setStorageSync(USER_KEY, user)
}

export function getUser() {
  return uni.getStorageSync(USER_KEY) || null
}

export function clearAuth() {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
}

/**
 * 基础请求
 * @param {string} path 网关路径，如 '/village/households/me'
 * @param {object} opts { method, data }
 */
export function request(path, opts = {}) {
  const method = opts.method || 'GET'
  /* ---------- 原型模式：本地 mock，不发网络请求 ---------- */
  if (MOCK_ENABLED) {
    return mockRequest(method, path, opts.data).catch((e) => {
      if (e && e.code === 401) clearAuth()
      throw e
    })
  }
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) header.Authorization = 'Bearer ' + token

    uni.request({
      url: BASE_URL + path,
      method,
      data: opts.data || null,
      header,
      timeout: 10000,
      success(res) {
        const body = res.data || {}
        if (res.statusCode === 401) {
          clearAuth()
          reject(new Error('登录已过期，请重新登录'))
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(body.message || '请求失败(HTTP ' + res.statusCode + ')'))
          return
        }
        // 后端成功码 0；兼容 200
        if (body.code === 0 || body.code === 200) {
          resolve(body.data)
        } else {
          reject(new Error(body.message || '请求失败'))
        }
      },
      fail() {
        reject(new Error('网络请求失败，请确认网关服务已启动'))
      },
    })
  })
}

export const get = (path) => request(path, { method: 'GET' })
export const post = (path, data) => request(path, { method: 'POST', data })
export const put = (path, data) => request(path, { method: 'PUT', data })
export const del = (path) => request(path, { method: 'DELETE' })
