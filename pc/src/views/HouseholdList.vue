<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import { apiHouseholdList, get } from '@/api'

const auth = useAuthStore()
const router = useRouter()
const rows = ref([])
const total = ref(0)
const summary = ref({})
const loading = ref(false)
const err = ref('')

const q = reactive({ keyword: '', status: 'all', page: 1, pageSize: 20 })

const STATUSES = [
  { k: 'all', v: '全部' }, { k: '未提交', v: '未提交' }, { k: '待审核', v: '待审核' },
  { k: '已通过', v: '已通过' }, { k: '未通过', v: '未通过' },
  { k: '待最终确认', v: '待最终确认' }, { k: '已最终确认', v: '已最终确认' },
]

/** 三种角色走各自辖域接口（单客户端按角色切换数据源） */
function endpoint() {
  const t = auth.userType
  if (t === 'TOWN') return '/township/households'
  if (t === 'COUNTY') return '/county/households'
  return '/village/households'
}

async function load() {
  loading.value = true
  err.value = ''
  try {
    const path = endpoint()
    let d
    if (path === '/village/households') {
      d = await apiHouseholdList(q)
    } else {
      d = await get(path, q)
    }
    rows.value = (d && (d.list || d.records)) || []
    total.value = (d && d.total) || 0
    summary.value = (d && d.summary) || {}
  } catch (e) {
    err.value = e.message || '加载失败'
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}
onMounted(load)
watch(() => [q.status, q.page, q.pageSize], load)

function search() {
  q.page = 1
  load()
}

const pages = () => Math.max(1, Math.ceil(total.value / q.pageSize))
function go(p) {
  if (p < 1 || p > pages()) return
  q.page = p
}

function open(r) {
  router.push(`/households/${r.id}`)
}

function srcTag(s) {
  return s || '原有'
}
</script>

<template>
  <div class="hl">
    <div class="toolbar">
      <div class="search">
        <input v-model="q.keyword" placeholder="姓名 / 身份证 / 地块编码 / 合同号" @keyup.enter="search" />
        <button class="btn primary" @click="search">搜索</button>
      </div>
      <div class="chips">
        <span
          v-for="s in STATUSES"
          :key="s.k"
          class="chip"
          :class="{ on: q.status === s.k }"
          @click="q.status = s.k; q.page = 1"
        >{{ s.v }}</span>
      </div>
      <div class="count">共 <b>{{ total }}</b> 户</div>
    </div>

    <div v-if="err" class="err">{{ err }}</div>

    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th style="width:56px">户号</th>
            <th>户主</th>
            <th>身份证（脱敏）</th>
            <th>村组</th>
            <th class="num">地块</th>
            <th class="num">合同面积</th>
            <th>业务分类</th>
            <th>状态</th>
            <th>需修改</th>
            <th style="width:76px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" @click="open(r)">
            <td class="mono">{{ r.id }}</td>
            <td class="strong">{{ r.householder }}</td>
            <td class="mono small">{{ r.idCard || r.idCardMasked }}</td>
            <td class="small">{{ r.villageGroup || r.groupName || '—' }}</td>
            <td class="num">{{ r.plotCount ?? '—' }}</td>
            <td class="num">{{ r.contractArea ?? '—' }}</td>
            <td class="small">
              <span v-if="r.changeCategory" class="cat">{{ r.changeCategory }}</span>
              <span v-else class="dim">—</span>
            </td>
            <td><span class="st" :class="'st-' + r.status">{{ r.status }}</span></td>
            <td class="num small">{{ r.fixCount ?? r.needFixCount ?? 0 }}</td>
            <td><span class="link">详情</span></td>
          </tr>
          <tr v-if="!rows.length && !loading">
            <td colspan="10" class="empty">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pager">
      <span class="pg-info">第 {{ q.page }} / {{ pages() }} 页</span>
      <button class="btn" :disabled="q.page <= 1" @click="go(q.page - 1)">上一页</button>
      <button class="btn" :disabled="q.page >= pages()" @click="go(q.page + 1)">下一页</button>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.hl { padding: 18px 20px; }
.toolbar { background: #fff; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.search { display: flex; gap: 8px; }
.search input { width: 260px; height: 34px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 11px; font-size: 13px; outline: none; }
.search input:focus { border-color: #0e7a4f; }
.btn { height: 34px; padding: 0 14px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { font-size: 12.5px; padding: 5px 11px; border-radius: 14px; background: #f4f6f8; color: #5a6875; cursor: pointer; }
.chip.on { background: #0e7a4f; color: #fff; }
.count { margin-left: auto; font-size: 12.5px; color: #8a97a5; }
.count b { color: #0e7a4f; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-top: 12px; }
.table-wrap { background: #fff; border-radius: 10px; margin-top: 12px; overflow: auto; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 11px 12px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12.5px; white-space: nowrap; }
.tbl td { padding: 11px 12px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.tbl tbody tr { cursor: pointer; }
.tbl tbody tr:hover { background: #f4faf6; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.dim { color: #b8c2cc; }
.cat { font-size: 11.5px; background: #e4f3ea; color: #0e7a4f; border-radius: 4px; padding: 2px 7px; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #f4f6f8; color: #5a6875; }
.st-已通过, .st-已最终确认 { background: #e8f5ed; color: #2b7a4b; }
.st-待审核, .st-待最终确认 { background: #fff3e0; color: #b26a00; }
.st-未通过 { background: #fdeceb; color: #c9302c; }
.link { color: #0e7a4f; font-size: 12.5px; }
.empty { text-align: center; color: #9aa6b2; padding: 40px 0; }
.pager { display: flex; align-items: center; gap: 10px; justify-content: flex-end; margin-top: 12px; }
.pg-info { font-size: 12.5px; color: #8a97a5; margin-right: auto; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
