<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
const router = useRouter()
const form = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const err = ref('')
const loading = ref(false)

function validate() {
  const p = form.newPassword
  if (!form.oldPassword) return '请输入原密码'
  if (!p || p.length < 8) return '新密码长度不能少于 8 位'
  let kinds = 0
  if (/[A-Z]/.test(p)) kinds++
  if (/[a-z]/.test(p)) kinds++
  if (/\d/.test(p)) kinds++
  if (/[^A-Za-z0-9]/.test(p)) kinds++
  if (kinds < 3) return '需包含大写、小写、数字、符号中的至少 3 类'
  if (p === form.oldPassword) return '新密码不能与原密码相同'
  if (form.confirm !== p) return '两次输入不一致'
  return ''
}

async function submit() {
  err.value = ''
  const m = validate()
  if (m) { err.value = m; return }
  loading.value = true
  try {
    await auth.changePassword(form.oldPassword, form.newPassword)
    router.replace('/dashboard')
  } catch (e) {
    err.value = e.message || '修改失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="cp-page">
    <div class="cp-card">
      <div class="cp-title">修改密码</div>
      <div class="cp-sub">{{ auth.mustChangePassword ? '首次登录，请先修改初始密码后使用系统功能' : '定期更换密码以保障账号安全' }}</div>

      <div class="f"><label>原密码</label><input v-model="form.oldPassword" type="password" placeholder="初始密码或当前密码" /></div>
      <div class="f"><label>新密码</label><input v-model="form.newPassword" type="password" placeholder="至少 8 位，含大小写/数字/符号中 3 类" /></div>
      <div class="f"><label>确认新密码</label><input v-model="form.confirm" type="password" placeholder="再次输入新密码" /></div>

      <div v-if="err" class="err">{{ err }}</div>
      <button class="btn" :disabled="loading" @click="submit">{{ loading ? '提交中…' : '确认修改' }}</button>
      <div class="hint">密码不能与身份证号相同；连续 5 次输错将锁定 15 分钟</div>
    </div>
  </div>
</template>

<style scoped>
.cp-page { min-height: 100vh; background: #f4f6f8; display: flex; align-items: center; justify-content: center; padding: 24px; }
.cp-card { width: 100%; max-width: 400px; background: #fff; border-radius: 12px; padding: 28px 26px; box-shadow: 0 6px 24px rgba(10,74,51,.08); }
.cp-title { font-size: 18px; font-weight: 600; color: #1b2733; }
.cp-sub { font-size: 12.5px; color: #8a97a5; margin: 7px 0 20px; line-height: 1.6; }
.f { margin-bottom: 14px; }
.f label { display: block; font-size: 12.5px; color: #5a6875; margin-bottom: 6px; }
.f input { width: 100%; height: 38px; border: 1px solid #dfe4ea; border-radius: 8px; padding: 0 12px; font-size: 14px; box-sizing: border-box; outline: none; }
.f input:focus { border-color: #0e7a4f; }
.err { background: #fdeceb; color: #c9302c; font-size: 12.5px; border-radius: 7px; padding: 8px 11px; margin-bottom: 12px; }
.btn { width: 100%; height: 40px; border: none; border-radius: 8px; background: #0e7a4f; color: #fff; font-size: 14.5px; cursor: pointer; }
.btn:disabled { opacity: .6; }
.hint { font-size: 11.5px; color: #9aa6b2; margin-top: 14px; text-align: center; line-height: 1.7; }
</style>
