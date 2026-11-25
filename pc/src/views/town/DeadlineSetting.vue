<script setup>
import { ref, onMounted } from 'vue'
import { apiDeadlines, apiSetDeadlines } from '@/api'

/**
 * F-T09 二次审查截止日期设置
 * 按村设置或批量设置（精确到年月日）；到期不锁死，仅向镇/村提示超期
 */
const rows = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const batchDate = ref('')
const editing = ref({})

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiDeadlines()
    const list = (d && (d.list || d.records)) || (Array.isArray(d) ? d : [])
    rows.value = list
    const m = {}
    list.forEach((r) => { m[r.villageId || r.id] = r.deadline || r.reviewDeadline || '' })
    editing.value = m
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function save(v) {
  const vid = v.villageId || v.id
  const date = editing.value[vid]
  if (!date) { err.value = '请选择截止日期'; return }
  try {
    await apiSetDeadlines({ villageIds: [vid], deadline: date })
    msg.value = `「${v.name || v.villageName}」截止日期已设为 ${date}`
    await load()
  } catch (e) {
    err.value = e.message || '保存失败'
  }
}

async function saveBatch() {
  if (!batchDate.value) { err.value = '请选择批量截止日期'; return }
  const ids = rows.value.map((r) => r.villageId || r.id)
  try {
    await apiSetDeadlines({ villageIds: ids, deadline: batchDate.value })
    msg.value = `已批量设置 ${ids.length} 个村的截止日期为 ${batchDate.value}`
    await load()
  } catch (e) {
    err.value = e.message || '批量设置失败'
  }
}

function isOverdue(v) {
  const vid = v.villageId || v.id
  const d = editing.value[vid] || v.deadline
  if (!d) return false
  return new Date(d) < new Date(new Date().toDateString())
}
</script>

<template>
  <div class="dl">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      按村设置二次审查截止日期（精确到年月日）。<b>到期不锁死</b>，仅向镇/村提示超期；支持批量调整与撤销，操作留痕。
    </div>

    <div class="panel">
      <div class="head">
        <div class="pt">批量设置</div>
        <div class="acts">
          <input v-model="batchDate" type="date" />
          <button class="btn primary" @click="saveBatch">应用到全部 {{ rows.length }} 个村</button>
        </div>
      </div>
      <table class="tbl">
        <thead><tr><th>村</th><th class="num">总户数</th><th class="num">完成率</th><th>当前截止日期</th><th>调整</th><th style="width:60px">操作</th></tr></thead>
        <tbody>
          <tr v-for="v in rows" :key="v.villageId || v.id">
            <td class="strong">{{ v.name || v.villageName }}</td>
            <td class="num">{{ v.totalHouseholds ?? '—' }}</td>
            <td class="num">{{ v.progress ?? '—' }}%</td>
            <td>
              <span v-if="v.deadline || v.reviewDeadline"
                :class="isOverdue(v) ? 'overdue' : ''">
                {{ v.deadline || v.reviewDeadline }}
                <span v-if="isOverdue(v)" class="tag-over">已超期</span>
              </span>
              <span v-else class="dim">未设置</span>
            </td>
            <td><input v-model="editing[v.villageId || v.id]" type="date" class="date-in" /></td>
            <td><span class="link" @click="save(v)">保存</span></td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="6" class="empty">辖区暂无村</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.dl { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 12px; flex-wrap: wrap; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; }
.acts { display: flex; gap: 10px; align-items: center; }
.acts input, .date-in { height: 32px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 9px; font-size: 13px; outline: none; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.strong { font-weight: 500; color: #1b2733; }
.dim { color: #9aa6b2; }
.overdue { color: #c9302c; }
.tag-over { font-size: 10.5px; background: #fdeceb; color: #c9302c; border-radius: 3px; padding: 1px 5px; margin-left: 6px; }
.link { color: #0e7a4f; font-size: 12.5px; cursor: pointer; }
.empty { text-align: center; color: #9aa6b2; padding: 28px 0; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
