<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { get } from '@/api'

/**
 * F-T05 辖区户与地块查阅（跨村只读）
 * 含需修改内容、问题意见
 */
const router = useRouter()
const rows = ref([])
const total = ref(0)
const villages = ref([])
const loading = ref(false)
const err = ref('')
const q = reactive({ villageId: '', keyword: '', page: 1, pageSize: 20 })

async function loadVillages() {
  try {
    const d = await get('/township/villages')
    villages.value = (d && (d.list || d.records)) || []
  } catch (e) { villages.value = [] }
}

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await get('/township/households', {
      villageId: q.villageId || undefined, keyword: q.keyword || undefined,
      page: q.page, pageSize: q.pageSize,
    })
    rows.value = (d && (d.list || d.records)) || []
    total.value = (d && d.total) || rows.value.length
  } catch (e) {
    err.value = e.message || '加载失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}
onMounted(() => { loadVillages(); load() })
watch(() => [q.villageId, q.page], load)

function search() { q.page = 1; load() }
function open(r) { router.push(`/households/${r.id}`) }
</script>

<template>
  <div class="th">
    <div v-if="err" class="err">{{ err }}</div>
    <div class="panel">
      <div class="bar">
        <select v-model="q.villageId">
          <option value="">全部村</option>
          <option v-for="v in villages" :key="v.villageId || v.id" :value="v.villageId || v.id">
            {{ v.villageName || v.name }}
          </option>
        </select>
        <input v-model="q.keyword" placeholder="姓名 / 身份证 / 合同号" @keyup.enter="search" />
        <button class="btn primary" @click="search">搜索</button>
        <span class="cnt">共 {{ total }} 户</span>
      </div>
      <table class="tbl">
        <thead>
          <tr><th style="width:52px">户号</th><th>户主</th><th>身份证</th><th>村组</th>
            <th class="num">地块</th><th class="num">面积</th><th>分类</th><th>状态</th><th style="width:56px">操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" @click="open(r)">
            <td class="mono">{{ r.id }}</td>
            <td class="strong">{{ r.householder }}</td>
            <td class="mono small">{{ r.idCard || r.idCardMasked }}</td>
            <td class="small">{{ r.villageGroup || r.groupName || '—' }}</td>
            <td class="num">{{ r.plotCount ?? '—' }}</td>
            <td class="num">{{ r.contractArea ?? '—' }}</td>
            <td class="small">{{ r.changeCategory || '—' }}</td>
            <td><span class="st" :class="'st-' + r.status">{{ r.status }}</span></td>
            <td><span class="link">详情</span></td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="9" class="empty">暂无数据</td></tr>
        </tbody>
      </table>
      <div class="pager">
        <span class="pg">第 {{ q.page }} 页</span>
        <button class="btn" :disabled="q.page <= 1" @click="q.page--">上一页</button>
        <button class="btn" :disabled="rows.length < q.pageSize" @click="q.page++">下一页</button>
      </div>
    </div>
    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.th { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.bar input, .bar select { height: 34px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 11px; font-size: 13px; outline: none; }
.bar input { width: 240px; }
.cnt { margin-left: auto; font-size: 12.5px; color: #8a97a5; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.tbl tbody tr { cursor: pointer; }
.tbl tbody tr:hover { background: #f4faf6; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #f4f6f8; color: #5a6875; }
.st-已通过, .st-已最终确认 { background: #e8f5ed; color: #2b7a4b; }
.st-待审核, .st-待最终确认 { background: #fff3e0; color: #b26a00; }
.st-未通过 { background: #fdeceb; color: #c9302c; }
.link { color: #0e7a4f; font-size: 12.5px; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.pager { display: flex; align-items: center; gap: 10px; justify-content: flex-end; margin-top: 12px; }
.pg { font-size: 12.5px; color: #8a97a5; margin-right: auto; }
.btn { height: 32px; padding: 0 13px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.btn:disabled { opacity: .5; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
