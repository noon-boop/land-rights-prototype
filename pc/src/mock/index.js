/* ============================================================
   原型 mock 入口
   ------------------------------------------------------------
   VITE_USE_MOCK 未显式设为 'false' 时启用（本工程 .env 里已打开）。
   想接真实后端：把 .env 改成 VITE_USE_MOCK=false，请求就回到
   vite 代理指向的 http://127.0.0.1:9000。
   ============================================================ */

import { handle } from './handlers'

export const MOCK_ENABLED = String(import.meta.env.VITE_USE_MOCK || 'true') !== 'false'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

function parseQuery(path) {
  const i = path.indexOf('?')
  if (i < 0) return {}
  const q = {}
  new URLSearchParams(path.slice(i + 1)).forEach((v, k) => {
    if (v !== '' && v !== 'undefined' && v !== 'null') q[k] = v
  })
  return q
}

export async function mockFetch(method, path, body) {
  await delay(90 + Math.floor(Math.random() * 160))
  const query = parseQuery(path)
  return handle(method, path, query, body)
}

export { resetDb } from './store'
