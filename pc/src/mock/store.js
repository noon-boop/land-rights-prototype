/* ============================================================
   mock 状态层：localStorage 持久化 + 登录会话
   ------------------------------------------------------------
   - 种子数据首次访问写入 localStorage，之后所有变更都落盘，
     所以「村级审核 → 镇级看到 → 组包 → 县级审批」这种跨页/跨角色
     流程在同一浏览器里能真正走通（关掉页面重进也不会丢）。
   - 想恢复初始数据：地址栏加 ?mockReset=1，或在控制台执行
     __mockReset()。
   ============================================================ */

import { buildSeed, ACCOUNTS, permsOf } from './dataset'

const DB_KEY = 'lp_mock_db_v3'
const SESSION_KEY = 'lp_mock_session_v1'

function emptyDb() {
  return buildSeed()
}

export function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) {
      const db = JSON.parse(raw)
      if (db && db.version === 3) return db
    }
  } catch (e) {
    /* 损坏则重建 */
  }
  const db = emptyDb()
  saveDb(db)
  return db
}

let cache = null
export function db() {
  if (!cache) cache = loadDb()
  return cache
}

export function saveDb(next) {
  cache = next
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(next))
  } catch (e) {
    /* 超出配额时不持久化，仅内存生效 */
  }
  return next
}

export function resetDb() {
  try {
    localStorage.removeItem(DB_KEY)
    localStorage.removeItem(SESSION_KEY)
  } catch (e) { /* ignore */ }
  cache = null
  return db()
}

if (typeof window !== 'undefined') {
  window.__mockReset = () => {
    resetDb()
    window.location.hash = '#/login'
    window.location.reload()
  }
  try {
    if (new URLSearchParams(window.location.search).get('mockReset') === '1') {
      localStorage.removeItem(DB_KEY)
      localStorage.removeItem(SESSION_KEY)
    }
  } catch (e) { /* ignore */ }
}

/* ---------------- 会话 ---------------- */
export function currentUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    const acc = ACCOUNTS.find((a) => a.username === s.username)
    if (!acc) return null
    return { ...acc, permissions: permsOf(acc.userType).map((code) => ({ code, level: 'W' })) }
  } catch (e) {
    return null
  }
}

export function setSession(username) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username, at: Date.now() }))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export const nextSeq = (() => {
  let n = 9000
  return () => ++n
})()
