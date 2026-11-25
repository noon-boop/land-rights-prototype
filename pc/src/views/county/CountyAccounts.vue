<script setup>
import { ref, reactive, onMounted } from 'vue'
import { apiResetPassword, apiAccountCheck, get } from '@/api'

/**
 * F-C13 账号批量管理
 * 基线导入后批量建号、重置密码、异常账号排查（如户主变更后遗留账号）
 */
const list = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const tab = ref('异常账号')
const form = reactive({ newPassword: '' })

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiAccountCheck()
    list.value = (d && (d.list || d.records)) || (Array.isArray(d) ? d : [])
  } catch (e) {
    err.value = ''
    list.value = []
  } finally { loading.value = false }
}
onMounted(load)

const shown = ref([])

async function reset(p) {
  const pw = window.prompt('输入临时密码（不少于 8 位，由操作方线下告知农户）')
  if (!pw) return
  if (pw.length < 8) { err.value = '密码不少于 8 位'; return }
  try {
    await apiResetPassword({ username: p.username })
    msg.value = `「${p.realName || p.username}」密码已重置`
  } catch (e) { err.value = e.message || '重置失败' }
}
</script>

<template>
  <div class="ca">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      账号批量管理：基线导入后<b>批量建号</b>、重置密码、<b>异常账号排查</b>。
      典型异常：户主变更后原户主账号未停用、销户后账号仍可登录、分户新户未建号。
    </div>

    <div class="panel">
      <div class="head">
        <div class="pt">异常账号排查</div>
        <button class="btn" @click="load">刷新</button>
      </div>
      <table class="tbl">
        <thead><tr><th>账号（身份证）</th><th>姓名</th><th>户</th><th>状态</th><th>异常类型</th><th style="width:80px">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in list" :key="r.id || r.username">
            <td class="mono small">{{ r.username }}</td>
            <td class="strong">{{ r.realName || '—' }}</td>
            <td class="small">{{ r.householdId ?? '—' }}</td>
            <td><span class="st" :class="r.status === '正常' ? 'st-ok' : 'st-bad'">{{ r.status || '—' }}</span></td>
            <td class="small dim2">{{ r.issue || r.abnormalType || '—' }}</td>
            <td><span class="link" @click="reset(r)">重置密码</span></td>
          </tr>
          <tr v-if="!list.length && !loading">
            <td colspan="6" class="empty">
              暂无异常账号数据（该能力需后端 /auth/import 账号巡检接口支撑，当前未接入时此处为空）
            </td>
          </tr>
        </tbody>
      </table>
      <div class="tip">
        批量建号在「基线数据导入」完成后自动执行；本页负责后续排查与补救。
        重置密码后须提醒农户首登改密。
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.ca { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim2 { color: #8a97a5; }
.strong { font-weight: 500; color: #1b2733; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; }
.st-ok { background: #e8f5ed; color: #2b7a4b; }
.st-bad { background: #fdeceb; color: #c9302c; }
.link { color: #0e7a4f; font-size: 12.5px; cursor: pointer; }
.empty { text-align: center; color: #9aa6b2; padding: 30px 0; line-height: 1.8; }
.tip { font-size: 11.5px; color: #9aa6b2; margin-top: 12px; line-height: 1.9; }
.btn { height: 32px; padding: 0 13px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
