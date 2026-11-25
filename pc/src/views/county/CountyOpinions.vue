<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiCountyOpinions, apiCountyOpinionBack } from '@/api'

/**
 * F-C10 二次审查意见查看（县级）
 * 仅显示已上报至县级的意见，含村级、镇级两级处理意见；按乡镇/村/户列出原文
 * 可退回镇级重新上报
 */
const data = ref(null)
const loading = ref(false)
const err = ref('')
const msg = ref('')
const townId = ref('')

async function load() {
  loading.value = true
  err.value = ''
  try {
    data.value = await apiCountyOpinions({ townId: townId.value || undefined })
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const list = computed(() => {
  const d = data.value || {}
  return d.list || d.records || (Array.isArray(d) ? d : [])
})

async function back(r) {
  const note = window.prompt('退回镇级重新上报，请填写原因（不少于 10 字）')
  if (!note) return
  if (note.trim().length < 10) { err.value = '退回原因不少于 10 个字'; return }
  try {
    await apiCountyOpinionBack({ id: r.id, opinion: note.trim() })
    msg.value = '已退回镇级重新上报'
    await load()
  } catch (e) { err.value = e.message || '退回失败' }
}
</script>

<template>
  <div class="co">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      仅显示<b>已上报至县级</b>的问题意见，含村级与镇级两级处理意见，按原文列出（不分类）。
      二次审查阶段只统计问题意见，不改任何业务数据。
    </div>

    <div class="panel">
      <div class="head">
        <div class="pt">二次审查意见（{{ list.length }} 条）</div>
        <button class="btn" @click="load">刷新</button>
      </div>
      <table class="tbl">
        <thead>
          <tr><th>乡镇</th><th>村</th><th>户主</th><th>问题意见原文</th>
            <th>村级处理意见</th><th>镇级处理意见</th><th>状态</th><th style="width:80px">操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td class="small">{{ r.townName || '—' }}</td>
            <td class="small">{{ r.villageName || '—' }}</td>
            <td class="strong">{{ r.householder || '—' }}</td>
            <td class="op">{{ r.opinion || '—' }}</td>
            <td class="op dim2">{{ r.villageNote || '—' }}</td>
            <td class="op dim2">{{ r.townNote || '—' }}</td>
            <td><span class="st">{{ r.status || '—' }}</span></td>
            <td><span class="link" @click="back(r)">退回镇级</span></td>
          </tr>
          <tr v-if="!list.length && !loading"><td colspan="8" class="empty">暂无已上报至县级的意见</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.co { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.op { max-width: 220px; font-size: 12.5px; line-height: 1.6; }
.dim2 { color: #8a97a5; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #e8f5ed; color: #2b7a4b; }
.link { color: #c9302c; font-size: 12.5px; cursor: pointer; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.btn { height: 32px; padding: 0 13px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
