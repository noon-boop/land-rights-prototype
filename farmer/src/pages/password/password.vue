<script setup>
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import Icon from '../../components/Icon.vue'

const from = ref('')
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
const submitting = ref(false)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const errors = reactive({})

onLoad((options) => {
  from.value = (options && options.from) || ''
  uni.setNavigationBarTitle({ title: from.value === 'first-login' ? '首次登录 · 修改密码' : '修改密码' })
})

/** 与后端 PasswordPolicy 对齐：长度≥8，四类取三，不等于身份证号，不能继续用初始密码 */
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])
  const p = form.newPassword
  let ok = true
  if (!form.oldPassword) { errors.oldPassword = '请输入原密码'; ok = false }
  if (!p || p.length < 8) { errors.newPassword = '密码长度不能少于 8 位'; ok = false }
  else {
    let kinds = 0
    if (/[A-Z]/.test(p)) kinds++
    if (/[a-z]/.test(p)) kinds++
    if (/\d/.test(p)) kinds++
    if (/[^A-Za-z0-9]/.test(p)) kinds++
    if (kinds < 3) { errors.newPassword = '需包含大写、小写、数字、符号中的至少 3 类'; ok = false }
  }
  if (p && p === form.oldPassword) { errors.confirmPassword = '新密码不能与原密码相同'; ok = false }
  if (form.confirmPassword !== p) { errors.confirmPassword = '两次输入不一致'; ok = false }
  return ok
}

async function submit() {
  if (submitting.value) return
  if (!validate()) {
    const first = Object.values(errors)[0]
    if (first) showToast(first)
    return
  }
  submitting.value = true
  const ok = await store.changePassword(form.oldPassword, form.newPassword)
  submitting.value = false
  if (!ok) return
  showToast('密码已修改')
  if (from.value === 'first-login') {
    // 改密后回到登录页走微信绑定
    setTimeout(() => uni.reLaunch({ url: '/pages/login/login' }), 600)
  } else {
    setTimeout(() => uni.navigateBack(), 600)
  }
}
</script>

<template>
  <div class="page">
    <div class="hero" :style="{ paddingTop: (statusBarHeight + 16) + 'px' }">
      <div class="hero-title">{{ from === 'first-login' ? '首次登录，请修改初始密码' : '修改密码' }}</div>
      <div class="hero-sub">初始密码由村委会告知，须修改后才能使用业务功能</div>
    </div>

    <div class="page-body">
      <div class="form-card">
        <div class="form-card-title">密码设置</div>
        <div class="form-row" :class="{ error: errors.oldPassword }">
          <div class="form-label"><span class="required">*</span>原密码</div>
          <div class="form-value"><input v-model="form.oldPassword" class="form-input" password placeholder="初始密码或当前密码"></div>
        </div>
        <div class="form-row" :class="{ error: errors.newPassword }">
          <div class="form-label"><span class="required">*</span>新密码</div>
          <div class="form-value"><input v-model="form.newPassword" class="form-input" password placeholder="至少 8 位，含大小写/数字/符号中 3 类"></div>
        </div>
        <div class="form-row" :class="{ error: errors.confirmPassword }">
          <div class="form-label"><span class="required">*</span>确认新密码</div>
          <div class="form-value"><input v-model="form.confirmPassword" class="form-input" password placeholder="再次输入新密码"></div>
        </div>
      </div>

      <div class="info-banner">
        <Icon name="info" :size="18" color="#C9932B" />
        <text>密码不能与身份证号相同；连续 5 次输错将锁定 15 分钟</text>
      </div>
    </div>

    <div class="bottom-action">
      <div class="btn btn-primary" :class="{ disabled: submitting }" @click="submit">
        {{ submitting ? '提交中…' : '确认修改' }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.hero {
  background: linear-gradient(135deg, #0E7490 0%, #0B5E75 100%);
  color: #fff; padding: 16px 20px 24px;
}
.hero-title { font-size: 17px; font-weight: 600; }
.hero-sub { font-size: 12px; color: rgba(255,255,255,0.82); margin-top: 6px; line-height: 1.6; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding: 12px 0 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.form-row.error { background: var(--color-danger-light); }
.btn.disabled { opacity: 0.6; }
</style>
