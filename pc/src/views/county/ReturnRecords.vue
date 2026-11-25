<script setup>
import { ref, onMounted } from 'vue'
import { apiVectorReturns } from '@/api'

const rows = ref([])
const loading = ref(false)
const err = ref('')
const detail = ref(null)

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiVectorReturns({ page: 1, pageSize: 100 })
    rows.value = (d && d.list) || []
  } catch (e) {
    err.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
}
onMounted(load)

function open(r) { detail.value = r }
function close() { detail.value = null }

function parseDist(s) {
  if (!s) return null
  if (typeof s === 'object') return s
  try { return JSON.parse(s) } catch (e) { return null }
}
</script>

<template>
  <div class="rr">
    <div v-if="err" class="err">{{ err }}</div>

    <div class="panel">
      <div class="pt">回传记录（HC-）</div>
      <table class="tbl">
        <thead>
          <tr>
            <th>回传编号</th><th>回传名称</th><th class="num">覆盖村</th>
            <th class="num">置位户数</th><th class="num">范围内总户数</th>
            <th>提交人</th><th>提交时间</th><th style="width:64px">明细</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id" @click="open(r)">
            <td class="mono small">{{ r.returnNo }}</td>
            <td>{{ r.returnName }}</td>
            <td class="num">{{ r.villageCount }}</td>
            <td class="num strong">{{ r.affected }}</td>
            <td class="num">{{ r.totalHouseholds }}</td>
            <td class="small">{{ r.operator || '—' }}</td>
            <td class="small dim">{{ r.createdAt }}</td>
            <td><span class="link">查看</span></td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="8" class="empty">暂无回传记录</td></tr>
        </tbody>
      </table>
    </div>

    <div class="note">
      回执文件下载依赖文件服务与 GIS 成果包（本期留空），当前记录已包含置位户数与提交时状态分布快照，可用于对账。
    </div>

    <div v-if="detail" class="mask" @click.self="close">
      <div class="dlg">
        <div class="dlg-t">{{ detail.returnNo }} · {{ detail.returnName }}</div>
        <div class="kv">
          <div><span class="k">覆盖村数</span>{{ detail.villageCount }}</div>
          <div><span class="k">置位户数</span>{{ detail.affected }}</div>
          <div><span class="k">范围内总户数</span>{{ detail.totalHouseholds }}</div>
          <div><span class="k">提交人</span>{{ detail.operator || '—' }}</div>
          <div><span class="k">提交时间</span>{{ detail.createdAt }}</div>
        </div>
        <div class="sub">提交时状态分布快照</div>
        <div class="dist">
          <div v-for="(v, k) in (parseDist(detail.statusDistribution) || {})" :key="k" class="drow">
            <span class="dn">{{ k }}</span><span class="dv">{{ v }}</span>
          </div>
          <div v-if="!parseDist(detail.statusDistribution)" class="dim">无快照</div>
        </div>
        <div v-if="detail.remark" class="rm">备注：{{ detail.remark }}</div>
        <div class="dlg-actions"><button class="btn" @click="close">关闭</button></div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.rr { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; white-space: nowrap; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.tbl tbody tr { cursor: pointer; }
.tbl tbody tr:hover { background: #f4faf6; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.strong { font-weight: 700; color: #0e7a4f; }
.link { color: #0e7a4f; font-size: 12.5px; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; }
.note { background: #fff3e0; color: #b26a00; font-size: 12px; border-radius: 8px; padding: 9px 13px; margin-top: 12px; border-left: 3px solid #c9a45c; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 440px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.kv { display: flex; flex-direction: column; gap: 8px; font-size: 12.5px; color: #3d4b5a; }
.kv .k { color: #9aa6b2; display: inline-block; width: 100px; }
.sub { margin-top: 16px; font-size: 12.5px; color: #5a6875; margin-bottom: 8px; }
.dist { background: #f7f9fa; border-radius: 8px; padding: 12px; }
.drow { display: flex; justify-content: space-between; font-size: 12.5px; color: #3d4b5a; padding: 3px 0; }
.dn { color: #5a6875; }
.dv { font-weight: 600; }
.rm { margin-top: 12px; font-size: 12.5px; color: #5a6875; }
.dlg-actions { display: flex; justify-content: flex-end; margin-top: 18px; }
.btn { height: 34px; padding: 0 16px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
