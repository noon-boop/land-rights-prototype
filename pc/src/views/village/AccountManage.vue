<script setup>
import { ref, reactive, onMounted } from 'vue'
import { apiHouseholdList, apiResetPassword, apiUnbindWechat, apiBindWechat } from '@/api'

/**
 * F-V08 建户 / 建号 / 手机号维护
 * 维护本村户手机号；重置密码申请；解绑/换绑微信（留痕：原 openid 后四位、新绑定时间、操作人）
 */
const keyword = ref('')
const rows = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const dialog = ref(false)
const current = ref(null)
const action = ref('')
const form = reactive({ phone: '', newPassword: '', openid: '', bindBy: '' })

async function search() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiHouseholdList({ keyword: keyword.value.trim(), status: 'all', page: 1, pageSize: 50 })
    rows.value = (d && (d.list || d.records)) || []
  } catch (e) {
    err.value = e.message || '加载失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}
onMounted(search)

function open(r, act) {
  current.value = r
  action.value = act
  form.phone = r.phone || ''
  form.newPassword = ''
  form.openid = ''
  form.bindBy = ''
  dialog.value = true
}

async function submit() {
  try {
    if (action.value === 'reset') {
      if (!form.newPassword || form.newPassword.length < 8) {
        err.value = '新密码不少于 8 位'; return
      }
      await apiResetPassword({ username: current.value.idCard, newPassword: form.newPassword })
      msg.value = `「${current.value.householder}」密码已重置，须提醒农户首登改密`
    } else if (action.value === 'unbind') {
      await apiUnbindWechat({ householdId: current.value.id, bindBy: form.bindBy.trim() })
      msg.value = `「${current.value.householder}」微信已解绑（已留痕）`
    } else if (action.value === 'bind') {
      if (!form.openid.trim()) { err.value = '请填写 openid'; return }
      await apiBindWechat({ openid: form.openid.trim(), bindBy: form.bindBy.trim() })
      msg.value = `「${current.value.householder}」微信已换绑（已留痕）`
    }
    dialog.value = false
    err.value = ''
    await search()
  } catch (e) {
    err.value = e.message || '操作失败'
  }
}
</script>

<template>
  <div class="am">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="intro">
      维护本村户账号：重置密码、解绑 / 换绑微信。<b>所有操作留痕</b>（原 openid 后四位、新绑定时间、操作人）。
      户主变更与手机号维护同样需经本页留痕；身份证号不允许村级直接修改。
    </div>

    <div class="panel">
      <div class="bar">
        <input v-model="keyword" placeholder="户主姓名 / 身份证" @keyup.enter="search" />
        <button class="btn primary" @click="search">搜索</button>
        <span class="cnt">{{ rows.length }} 户</span>
      </div>
      <table class="tbl">
        <thead><tr><th style="width:52px">户号</th><th>户主</th><th>身份证（账号）</th><th>联系电话</th><th>状态</th><th style="width:190px">操作</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td class="mono">{{ r.id }}</td>
            <td class="strong">{{ r.householder }}</td>
            <td class="mono small">{{ r.idCard || r.idCardMasked }}</td>
            <td class="small">{{ r.phone || '—' }}</td>
            <td class="small"><span class="st" :class="'st-' + r.status">{{ r.status }}</span></td>
            <td>
              <span class="link" @click="open(r, 'reset')">重置密码</span>
              <span class="link" @click="open(r, 'unbind')">解绑微信</span>
              <span class="link" @click="open(r, 'bind')">换绑</span>
            </td>
          </tr>
          <tr v-if="!rows.length && !loading"><td colspan="6" class="empty">无匹配户</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="dialog" class="mask" @click.self="dialog = false">
      <div class="dlg">
        <div class="dlg-t">
          {{ action === 'reset' ? '重置密码' : action === 'unbind' ? '解绑微信' : '换绑微信' }}
          · {{ current && current.householder }}
        </div>
        <div v-if="action === 'reset'" class="fld">
          <label>新密码（不少于 8 位）*</label>
          <input v-model="form.newPassword" placeholder="重置后农户首登须再次修改" />
        </div>
        <div v-if="action === 'bind'" class="fld">
          <label>新 openid *</label>
          <input v-model="form.openid" placeholder="微信 openid" />
        </div>
        <div v-if="action !== 'reset'" class="fld">
          <label>办理说明 / 依据</label>
          <input v-model="form.bindBy" placeholder="如：农户携身份证到村委会申请换绑" />
        </div>
        <div class="warn">本操作将写入留痕（操作人、时间、原 openid 后四位）。</div>
        <div class="dlg-actions">
          <button class="btn" @click="dialog = false">取消</button>
          <button class="btn primary" @click="submit">确认</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.am { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.intro { background: #fff; border-radius: 10px; padding: 14px 16px; font-size: 12.5px; color: #5a6875; line-height: 1.8; border-left: 3px solid #0e7a4f; margin-bottom: 12px; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.bar input { width: 260px; height: 34px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 11px; font-size: 13px; outline: none; }
.cnt { margin-left: auto; font-size: 12.5px; color: #8a97a5; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.strong { font-weight: 500; color: #1b2733; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #f4f6f8; color: #5a6875; }
.st-已通过, .st-已最终确认 { background: #e8f5ed; color: #2b7a4b; }
.st-待审核, .st-待最终确认 { background: #fff3e0; color: #b26a00; }
.st-未通过 { background: #fdeceb; color: #c9302c; }
.link { color: #0e7a4f; font-size: 12.5px; cursor: pointer; margin-right: 10px; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.mask { position: fixed; inset: 0; background: rgba(10,74,51,.35); display: flex; align-items: center; justify-content: center; z-index: 100; }
.dlg { width: 440px; background: #fff; border-radius: 12px; padding: 22px; }
.dlg-t { font-size: 15px; font-weight: 600; color: #1b2733; margin-bottom: 16px; }
.fld { margin-bottom: 13px; }
.fld label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.fld input { width: 100%; border: 1px solid #dfe4ea; border-radius: 7px; padding: 8px 11px; font-size: 13px; box-sizing: border-box; outline: none; }
.warn { background: #fff3e0; color: #b26a00; font-size: 12px; border-radius: 7px; padding: 10px 12px; line-height: 1.7; margin-bottom: 14px; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 10px; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
