<script setup>
import { ref } from 'vue'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import Icon from '../../components/Icon.vue'
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
// 1=身份证+密码 2=绑定微信
const step = ref(1)
const idCard = ref('')
const password = ref('')
const binding = ref(false)
const submitting = ref(false)

// F-A01：身份证号（=账号）+ 密码登录；首登强制改密后再进入微信绑定
async function verify() {
  if (!idCard.value.trim()) {
    showToast('请输入户主身份证号')
    return
  }
  if (!password.value) {
    showToast('请输入密码')
    return
  }
  if (submitting.value) return
  submitting.value = true
  const r = await store.login(idCard.value, password.value)
  submitting.value = false
  if (!r.ok) {
    showToast(r.message || '登录失败，请核对身份证号与密码')
    return
  }
  if (r.mustChangePassword) {
    // 首登：强制改密（改密页成功后回跳登录页的绑定步骤）
    uni.navigateTo({ url: '/pages/password/password?from=first-login' })
    return
  }
  step.value = 2
  autoBindIfPossible()
}

async function autoBindIfPossible() {
  const r = await store.bindWechat()
  if (r.ok) {
    showToast('微信绑定成功')
    uni.switchTab({ url: '/pages/home/home' })
  }
}

function bind() {
  if (binding.value) return
  binding.value = true
  setTimeout(async () => {
    const r = await store.bindWechat()
    binding.value = false
    if (r.ok) {
      showToast('微信绑定成功')
      uni.switchTab({ url: '/pages/home/home' })
    }
  }, 400)
}

function backToLogin() {
  step.value = 1
}
</script>

<template>
  <div class="login-page" :style="{ paddingTop: (statusBarHeight + 40) + 'px' }">
    <div class="login-hero">
      <div class="logo"><Icon name="field" :size="40" color="#FFFFFF" /></div>
      <div class="app-title">土地确权线上确认</div>
      <div class="app-sub">农村土地承包延期确权 · 用户端</div>
    </div>

    <!-- 步骤一：身份证号 + 密码 -->
    <div v-if="step === 1" class="login-card">
      <div class="lc-title">户主登录</div>
      <div class="lc-desc">账号为户主身份证号，初始密码由村委会告知</div>
      <div class="form-card" style="margin:0;">
        <div class="form-row">
          <div class="form-label"><span class="required">*</span>身份证号</div>
          <div class="form-value"><input v-model="idCard" class="form-input form-mono" maxlength="18" placeholder="请输入户主身份证号"></div>
        </div>
        <div class="form-row">
          <div class="form-label"><span class="required">*</span>密码</div>
          <div class="form-value"><input v-model="password" class="form-input" password type="text" placeholder="请输入密码"></div>
        </div>
      </div>
      <div class="hint">首次登录需修改初始密码；忘记密码请到村委会凭身份证办理重置</div>
      <div class="btn btn-primary" :class="{ disabled: submitting }" @click="verify">
        {{ submitting ? '登录中…' : '登录' }}
      </div>
    </div>

    <!-- 步骤二：绑定微信（强绑定：一户一 openid） -->
    <div v-else class="login-card">
      <div class="lc-title">绑定微信账号</div>
      <div class="lc-desc">身份核验通过，请绑定微信；绑定后仅本微信可登录本户</div>
      <div class="wx-box">
        <div class="wx-icon"><Icon name="wechat" :size="44" color="#07C160" /></div>
        <div class="wx-status">{{ store.state.wechatBound ? '已绑定' : '微信未绑定' }}</div>
        <div class="wx-tip">一户一微信；换微信须由村委会办理并留痕</div>
      </div>
      <div class="btn btn-primary" :class="{ disabled: binding }" @click="bind">
        {{ binding ? '绑定中…' : '绑定微信并进入' }}
      </div>
      <div class="btn btn-text" @click="backToLogin">返回重新登录</div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  height: 100%;
  background: linear-gradient(160deg, #0E7490 0%, #0B5E75 55%, #0F2A43 100%);
  display: flex; flex-direction: column; align-items: center;
  padding: 40px 24px calc(24px + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
}
.login-page::-webkit-scrollbar { display: none; }
.login-hero { text-align: center; color: #fff; margin-bottom: 36px; }
.logo {
  width: 76px; height: 76px; border-radius: 22px; background: rgba(255,255,255,0.16);
  display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
}
.app-title { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
.app-sub { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 6px; }

.login-card {
  width: 100%; max-width: 360px; background: #fff; border-radius: var(--radius-lg);
  padding: 22px 18px; box-shadow: var(--shadow-lg);
}
.lc-title { font-size: 18px; font-weight: 700; color: var(--color-text-primary); text-align: center; }
.lc-desc { font-size: 13px; color: var(--color-text-secondary); text-align: center; margin: 6px 0 16px; }
.form-card { box-shadow: none; border: 0.5px solid var(--color-divider); }
.hint { font-size: 12px; color: var(--color-text-tertiary); text-align: center; margin: 12px 0 16px; line-height: 1.6; }

.wx-box {
  background: var(--color-primary-lighter); border-radius: var(--radius-md);
  padding: 24px 16px; text-align: center; margin-bottom: 18px;
}
.wx-icon {
  width: 64px; height: 64px; border-radius: 50%; background: #fff;
  display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
  box-shadow: var(--shadow-sm);
}
.wx-status { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
.wx-tip { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.btn.disabled { opacity: 0.6; }
.btn-text { background: transparent; color: var(--color-text-secondary); font-size: 13px; margin-top: 10px; }
</style>
