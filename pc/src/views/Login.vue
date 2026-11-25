<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'
import terraces from '@/assets/login-terraces.jpg'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const form = reactive({ username: '', password: '' })
const err = ref('')
const loading = ref(false)
const showPwd = ref(false)
const remember = ref(true)

const REMEMBER_KEY = 'land:remember-username'

/* ---------------- toast（与参考稿一致的轻提示） ---------------- */
const toast = ref('')
let toastTimer = null
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2000)
}

onMounted(() => {
  const saved = localStorage.getItem(REMEMBER_KEY)
  if (saved) form.username = saved
})

/* ---------------- 登录 ---------------- */
async function submit() {
  err.value = ''
  if (!form.username.trim()) return showToast('请输入账号')
  if (!form.password.trim()) return showToast('请输入密码')

  loading.value = true
  try {
    const r = await auth.login(form.username.trim(), form.password)
    if (remember.value) localStorage.setItem(REMEMBER_KEY, form.username.trim())
    else localStorage.removeItem(REMEMBER_KEY)

    if (r.mustChangePassword) {
      router.replace('/password')
      return
    }
    const redirect = route.query.redirect
    router.replace(typeof redirect === 'string' && redirect ? redirect : '/dashboard')
  } catch (e) {
    err.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <!-- ===== 左侧：实景照片 ===== -->
    <aside class="visual">
      <img class="photo" :src="terraces" alt="绿色梯田航拍" />
      <div class="veil"></div>

      <div class="visual-in">
        <div class="brand">
          <div class="logo">
            <svg viewBox="0 0 48 48" fill="none">
              <path d="M14 14h20v20H14z" stroke="#F0DCA9" stroke-width="1.6" opacity=".8" />
              <path d="M24 14v20M14 24h20" stroke="#F0DCA9" stroke-width="1.6" opacity=".7" />
              <rect x="19" y="19" width="10" height="10" rx="2" fill="#F0DCA9" />
            </svg>
          </div>
          <div>
            <b>土地确权二轮延包线上确认平台</b>
            <span>RURAL LAND CONFIRMATION PLATFORM</span>
          </div>
        </div>

        <div class="hero">
          <span class="chip">二轮延包 · 线上确认</span>
          <h1>守护每一寸土地<br />确认<em>每一份权益</em></h1>
          <div class="line"></div>
          <p>
            以数字化方式贯通农户申报、村级审核、乡镇复核与县级备案，让土地承包关系稳定并长久不变，让每一块地都有据可查、有权可依。
          </p>
          <div class="points">
            <div class="pt">
              <i><svg viewBox="0 0 20 20"><path d="M4 10l4 4 8-8" /></svg></i>公平公开
            </div>
            <div class="pt">
              <i><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l3 2" /></svg></i>高效便捷
            </div>
            <div class="pt">
              <i><svg viewBox="0 0 20 20"><path d="M10 2l6 3v5c0 4-3 6-6 8-3-2-6-4-6-8V5z" /></svg></i>数据安全
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- ===== 右侧：玻璃拟态登录卡片 ===== -->
    <main class="form">
      <div class="fx">
        <div class="blob b1"></div>
        <div class="blob b2"></div>
        <div class="blob b3"></div>
        <div class="rings"></div>
      </div>

      <div class="glass">
        <div class="head">
          <div class="en">WELCOME BACK</div>
          <h2>账号登录</h2>
          <p>请输入账号与密码，进入确认平台</p>
        </div>

        <form autocomplete="off" @submit.prevent="submit">
          <div class="field">
            <label>账号</label>
            <div class="inp">
              <span class="ic">
                <svg viewBox="0 0 20 20">
                  <circle cx="10" cy="7" r="3.2" />
                  <path d="M4 17c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4" />
                </svg>
              </span>
              <input
                v-model="form.username"
                type="text"
                placeholder="请输入账号"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="field">
            <label>登录密码</label>
            <div class="inp">
              <span class="ic">
                <svg viewBox="0 0 20 20">
                  <rect x="4" y="9" width="12" height="9" rx="2" />
                  <path d="M7 9V6a3 3 0 016 0v3" />
                </svg>
              </span>
              <input
                v-model="form.password"
                :type="showPwd ? 'text' : 'password'"
                placeholder="请输入登录密码"
                autocomplete="current-password"
              />
              <span class="eye" title="显示/隐藏密码" @click="showPwd = !showPwd">
                <svg v-if="!showPwd" viewBox="0 0 20 20">
                  <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" />
                  <circle cx="10" cy="10" r="2.5" />
                </svg>
                <svg v-else viewBox="0 0 20 20">
                  <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5z" />
                  <circle cx="10" cy="10" r="2.5" />
                  <path d="M3 3l14 14" />
                </svg>
              </span>
            </div>
          </div>

          <div class="opts">
            <label class="remember">
              <input v-model="remember" type="checkbox" />记住账号
            </label>
            <a href="#" @click.prevent="showToast('请联系乡镇经管站或系统管理员重置密码')">忘记密码？</a>
          </div>

          <div v-if="err" class="err">{{ err }}</div>

          <button class="login" type="submit" :disabled="loading">
            {{ loading ? '登录中…' : '登 录' }}
          </button>
        </form>

        <div class="copy">
          © 2026 农村土地承包经营权确权登记 ·
          <a href="#" @click.prevent="showToast('使用帮助：请联系系统管理员')">使用帮助</a>
        </div>
      </div>
    </main>

    <div class="toast" :class="{ show: !!toast }">{{ toast }}</div>
  </div>
</template>

<style scoped>
.page {
  --g900: #083c29;
  --g800: #0b5c3e;
  --g700: #0e7a4f;
  --g600: #12885a;
  --g500: #1b9a67;
  --g400: #38b57f;
  --gold: #e4c079;
  --ink: #12261d;
  --muted: #5f7568;
  --line: rgba(14, 122, 79, 0.16);

  display: flex;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
}
.page,
.page *,
.page *::before,
.page *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ---------- 左侧：实景照片 ---------- */
.visual {
  position: relative;
  flex: 0 0 54%;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #0b5c3e;
}
.photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  animation: slowzoom 24s ease-in-out infinite alternate;
}
@keyframes slowzoom {
  from {
    transform: scale(1.02);
  }
  to {
    transform: scale(1.1);
  }
}
.veil {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(4, 44, 29, 0.78) 0%, rgba(4, 44, 29, 0.5) 42%, rgba(4, 44, 29, 0.12) 100%),
    linear-gradient(180deg, rgba(4, 44, 29, 0.42) 0%, transparent 30%, transparent 62%, rgba(4, 44, 29, 0.72) 100%);
}
.visual-in {
  position: relative;
  z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 46px 54px 40px;
  color: #fff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  flex: none;
}
.logo svg {
  width: 24px;
  height: 24px;
}
.brand b {
  display: block;
  font-size: 15px;
  letter-spacing: 0.8px;
  font-weight: 600;
}
.brand span {
  display: block;
  font-size: 9.5px;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.66);
  margin-top: 3px;
}

.hero {
  max-width: 530px;
  margin: auto 0;
  padding: 30px 0;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  letter-spacing: 2px;
  color: #f0dca9;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(240, 220, 169, 0.32);
  border-radius: 24px;
  padding: 8px 16px;
  backdrop-filter: blur(8px);
  margin-bottom: 28px;
}
.chip::before {
  content: "";
  width: 5px;
  height: 5px;
  background: var(--gold);
  border-radius: 50%;
}
.hero h1 {
  font-size: clamp(38px, 3.8vw, 56px);
  line-height: 1.28;
  font-weight: 600;
  letter-spacing: 2px;
  text-shadow: 0 3px 20px rgba(0, 0, 0, 0.28);
}
.hero h1 em {
  font-style: normal;
  color: var(--gold);
}
.line {
  width: 52px;
  height: 3px;
  background: var(--gold);
  border-radius: 2px;
  margin: 26px 0 22px;
}
.hero p {
  font-size: 13.5px;
  line-height: 2;
  color: rgba(255, 255, 255, 0.86);
  max-width: 430px;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.25);
}
.points {
  display: flex;
  gap: 30px;
  margin-top: 36px;
}
.pt {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.92);
}
.pt i {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.32);
  display: grid;
  place-items: center;
  font-style: normal;
  backdrop-filter: blur(6px);
}
.pt i svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: var(--gold);
  stroke-width: 1.7;
}

/* ---------- 右侧：玻璃拟态 ---------- */
.form {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 44px;
  position: relative;
  overflow: hidden auto;
  background: linear-gradient(140deg, #eaf6ee 0%, #dcefe2 48%, #cfe8d8 100%);
}
.fx {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(2px);
  opacity: 0.7;
  pointer-events: none;
}
.b1 {
  width: 340px;
  height: 340px;
  background: radial-gradient(circle at 35% 35%, rgba(56, 181, 127, 0.4), transparent 70%);
  top: -90px;
  right: -90px;
}
.b2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle at 60% 60%, rgba(228, 192, 121, 0.3), transparent 70%);
  bottom: -100px;
  left: -70px;
}
.b3 {
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(14, 122, 79, 0.18), transparent 70%);
  top: 40%;
  left: 8%;
}
.rings {
  position: absolute;
  right: -60px;
  bottom: -60px;
  width: 280px;
  height: 280px;
  border: 1px solid rgba(14, 122, 79, 0.12);
  border-radius: 50%;
  pointer-events: none;
}
.rings::after {
  content: "";
  position: absolute;
  inset: 38px;
  border: 1px solid rgba(14, 122, 79, 0.1);
  border-radius: 50%;
}

.glass {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 408px;
  margin: auto;
  padding: 36px 36px 30px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(11, 92, 62, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(22px) saturate(140%);
  -webkit-backdrop-filter: blur(22px) saturate(140%);
}

.head {
  margin-bottom: 24px;
}
.head .en {
  font-size: 10.5px;
  letter-spacing: 3px;
  color: var(--g600);
  font-weight: 600;
  text-transform: uppercase;
}
.head h2 {
  font-size: 27px;
  font-weight: 600;
  margin: 8px 0 7px;
  letter-spacing: 1px;
  color: var(--ink);
}
.head p {
  font-size: 12.5px;
  color: var(--muted);
}

.field {
  margin-bottom: 16px;
}
.field label {
  display: block;
  font-size: 11.5px;
  color: var(--muted);
  margin-bottom: 7px;
  letter-spacing: 0.4px;
}
.inp {
  display: flex;
  align-items: center;
  height: 46px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 1px 4px rgba(11, 92, 62, 0.05);
  transition: 0.22s;
  overflow: hidden;
}
.inp:focus-within {
  background: #fff;
  border-color: var(--g400);
  box-shadow: 0 0 0 4px rgba(27, 154, 103, 0.12);
}
.inp .ic {
  width: 40px;
  display: grid;
  place-items: center;
  flex: none;
}
.inp .ic svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: #93a99b;
  stroke-width: 1.6;
  transition: 0.2s;
}
.inp:focus-within .ic svg {
  stroke: var(--g600);
}
.inp input {
  flex: 1;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 13.5px;
  color: var(--ink);
  font-family: inherit;
  min-width: 0;
}
.inp input::placeholder {
  color: #a9b9ae;
}
.eye {
  padding: 0 13px;
  cursor: pointer;
  color: #93a99b;
  display: grid;
  place-items: center;
}
.eye svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
}
.eye:hover {
  color: var(--g600);
}

.opts {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 2px 0 22px;
  font-size: 12px;
}
.remember {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
}
.remember input {
  appearance: none;
  width: 15px;
  height: 15px;
  border: 1.5px solid #b9cdbf;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  position: relative;
  transition: 0.2s;
}
.remember input:checked {
  background: var(--g600);
  border-color: var(--g600);
}
.remember input:checked::after {
  content: "";
  position: absolute;
  left: 4px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.opts a {
  color: var(--g700);
  text-decoration: none;
}
.opts a:hover {
  text-decoration: underline;
}

.err {
  margin: -10px 0 16px;
  padding: 9px 12px;
  background: #fdeceb;
  border-left: 3px solid #c9302c;
  border-radius: 0 8px 8px 0;
  font-size: 12px;
  color: #b91c1c;
  line-height: 1.6;
}

.login {
  width: 100%;
  height: 48px;
  border: 0;
  border-radius: 11px;
  background: linear-gradient(115deg, var(--g800), var(--g500));
  color: #fff;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: 4px;
  text-indent: 4px;
  font-family: inherit;
  cursor: pointer;
  transition: 0.25s;
  box-shadow: 0 12px 24px rgba(11, 92, 62, 0.28);
  position: relative;
  overflow: hidden;
}
.login:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 18px 32px rgba(11, 92, 62, 0.36);
}
.login:active:not(:disabled) {
  transform: translateY(0);
}
.login:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}
.login::after {
  content: "";
  position: absolute;
  top: 0;
  left: -55%;
  width: 35%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.28), transparent);
  transform: skewX(-20deg);
  transition: 0.6s;
}
.login:hover:not(:disabled)::after {
  left: 130%;
}

.copy {
  text-align: center;
  font-size: 10.5px;
  color: #83998b;
  margin-top: 24px;
}
.copy a {
  color: var(--g600);
  text-decoration: none;
}

.toast {
  position: fixed;
  left: 50%;
  top: 26px;
  transform: translate(-50%, -16px);
  background: var(--g900);
  color: #fff;
  padding: 11px 22px;
  border-radius: 8px;
  font-size: 13px;
  opacity: 0;
  pointer-events: none;
  transition: 0.3s;
  z-index: 99;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}
.toast.show {
  opacity: 1;
  transform: translate(-50%, 0);
}

@media (max-width: 900px) {
  .visual {
    display: none;
  }
  .form {
    padding: 30px 22px;
    min-height: 100vh;
  }
}

@media (max-height: 760px) {
  .form {
    padding: 24px;
  }
  .glass {
    padding: 26px 28px 22px;
  }
  .head {
    margin-bottom: 18px;
  }
  .head h2 {
    font-size: 24px;
    margin: 6px 0 6px;
  }
  .field {
    margin-bottom: 12px;
  }
  .inp {
    height: 42px;
  }
  .opts {
    margin: 2px 0 16px;
  }
  .login {
    height: 44px;
  }
  .copy {
    margin-top: 14px;
  }
  .hero {
    padding: 16px 0;
  }
  .points {
    margin-top: 24px;
  }
}
</style>
