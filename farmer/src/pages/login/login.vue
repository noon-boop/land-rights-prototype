<script setup>
import { ref, onMounted } from 'vue'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import Icon from '../../components/Icon.vue'
import { DEMO_ACCOUNTS } from '../../mock'
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight || 20
// 1=身份证+密码 2=绑定微信
const step = ref(1)
const idCard = ref('')
const password = ref('')
const binding = ref(false)
const submitting = ref(false)

/* ---------- 演示环境提示（与 PC 端同一套交互） ---------- */
const ACK_KEY = 'land:farmer-demo-ack'
const showNotice = ref(false)

/** 状态→色标类，取 tokens.css 的语义色 */
const STATUS_TONE = {
  待核实: 't-wait',
  待审核: 't-warn',
  待最终确认: 't-ok',
  已通过: 't-ok',
  已最终确认: 't-ok',
  已退回: 't-bad',
}

function hasAcked() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage.getItem(ACK_KEY) === '1'
    }
  } catch (e) { /* ignore */ }
  try { return uni.getStorageSync(ACK_KEY) === '1' } catch (e) { return false }
}

function closeNotice() {
  showNotice.value = false
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(ACK_KEY, '1')
    }
  } catch (e) { /* ignore */ }
  try { uni.setStorageSync(ACK_KEY, '1') } catch (e) { /* ignore */ }
}

/** 点一行：自动填入身份证号与密码 */
function pickAccount(a) {
  idCard.value = a.idCard
  password.value = a.password
  closeNotice()
  showToast(`已填入：${a.realName}（${a.villageName}${a.group}）`)
}

onMounted(() => {
  if (!hasAcked()) showNotice.value = true
})

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
      <div class="btn btn-text" @click="showNotice = true">查看演示账号</div>
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

    <!-- ================= 演示环境提示 ================= -->
    <div v-if="showNotice" class="dlg-mask" @click.self="closeNotice">
      <div class="dlg">
        <div class="dlg-icon">
          <Icon name="shield" :size="26" color="#0E7490" />
        </div>

        <div class="dlg-title">演示环境提示</div>
        <div class="dlg-lead">本系统仅供<b>演示学习</b>使用，请勿填写真实身份信息。</div>
        <div class="dlg-sub">
          系统内所有账号、农户、地块与矢量数据均为演示样例。因录入真实数据所产生的一切后果由操作者自行承担。
        </div>

        <div class="dlg-acc">
          <div class="dlg-acc-hd">
            <span>可登录演示账号</span>
            <span class="dlg-acc-tip">密码均为 123456 · 点一行自动填入</span>
          </div>
          <div
            v-for="a in DEMO_ACCOUNTS"
            :key="a.key"
            class="acc-row"
            @click="pickAccount(a)"
          >
            <div class="acc-l1">
              <span class="acc-name">{{ a.realName }}</span>
              <span class="acc-org">{{ a.villageName }}{{ a.group }}</span>
              <span class="acc-st" :class="STATUS_TONE[a.status] || 't-wait'">{{ a.status }}</span>
            </div>
            <div class="acc-l2">
              <span class="acc-id">{{ a.idCard }}</span>
              <span class="acc-pwd">{{ a.password }}</span>
            </div>
          </div>
        </div>

        <div class="dlg-btn" @click="closeNotice">我已知晓</div>
        <div class="dlg-foot">农村土地承包经营权确权登记 · 演示版</div>
      </div>
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

/* ================= 演示环境提示 ================= */
/* 配色全部取自 styles/tokens.css（青碧主色 #0E7490 体系），不另造色 */
.dlg-mask {
  position: fixed;
  top: 0; bottom: 0; left: 0; right: 0;
  z-index: 999;
  background: rgba(15, 42, 67, 0.46);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dlg {
  width: 100%;
  max-width: 360px;
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  background: #fff;
  border-radius: var(--radius-lg);
  padding: 18px 16px 14px;
  box-shadow: var(--shadow-lg);
  text-align: center;
}
.dlg-icon {
  width: 40px; height: 40px; border-radius: 50%;
  background: var(--color-primary-light);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 8px;
}
.dlg-title { font-size: 17px; font-weight: 700; color: var(--color-text-primary); }
.dlg-lead {
  font-size: 13.5px; line-height: 1.6; color: var(--color-primary);
  font-weight: 600; margin: 6px 0;
}
.dlg-lead b { color: var(--color-primary-dark); }
.dlg-sub {
  font-size: 11.5px; line-height: 1.6; color: var(--color-text-secondary);
  background: var(--color-primary-lighter);
  border-left: 3px solid var(--color-primary);
  border-radius: 0 8px 8px 0;
  padding: 7px 11px; text-align: left; margin: 0 0 10px;
}

/* ---------- 账号清单 ---------- */
.dlg-acc {
  border: 1px solid var(--color-primary-light);
  border-radius: 10px;
  padding: 7px 9px 8px;
  margin: 0 0 10px;
  background: var(--color-primary-lighter);
  text-align: left;
}
.dlg-acc-hd {
  display: flex; align-items: baseline; justify-content: space-between; gap: 6px;
  font-size: 12px; font-weight: 600; color: var(--color-primary-dark);
  padding: 0 2px 6px;
}
.dlg-acc-tip { font-size: 10px; font-weight: 400; color: var(--color-text-tertiary); }
.acc-row {
  background: #fff;
  border-radius: 8px;
  padding: 6px 9px;
  margin-bottom: 5px;
}
.acc-row:last-child { margin-bottom: 0; }
.acc-l1 { display: flex; align-items: center; gap: 6px; }
.acc-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.acc-org { font-size: 11px; color: var(--color-text-secondary); flex: 1; }
.acc-st { font-size: 10px; padding: 1px 6px; border-radius: 4px; }
.acc-l2 { display: flex; align-items: center; justify-content: space-between; margin-top: 3px; }
.acc-id {
  font-family: "SF Mono", Consolas, "Courier New", monospace;
  font-size: 11px; color: var(--color-text-secondary); letter-spacing: 0.2px;
}
.acc-pwd {
  font-family: "SF Mono", Consolas, "Courier New", monospace;
  font-size: 10px; color: var(--color-text-tertiary);
}
/* 状态色：语义色不挪用 */
.t-wait { background: var(--color-bg); color: var(--color-text-secondary); }
.t-warn { background: var(--color-warning-light); color: var(--color-warning); }
.t-ok { background: var(--color-success-light); color: var(--color-success); }
.t-bad { background: var(--color-danger-light); color: var(--color-danger); }

.dlg-btn {
  height: 44px; line-height: 44px; border-radius: 10px;
  background: var(--color-primary); color: #fff;
  font-size: 15px; font-weight: 600; letter-spacing: 1px;
}
.dlg-foot { font-size: 10px; color: var(--color-text-tertiary); margin-top: 8px; }

</style>
