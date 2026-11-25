<script setup>
import { store } from '../../store'
import { showToast } from '../../store/toast'
import Icon from '../../components/Icon.vue'
const h = store.state.household

const menus = [
  { icon: 'doc', label: '我的调查', desc: '查看与编辑承包信息', to: '/pages/home/home' },
  { icon: 'field', label: '我的地块', desc: `${store.landsActive.value.length}块 · ${store.totalArea.value}亩`, to: '/pages/lands/lands' },
  { icon: 'lock', label: '修改密码', desc: '定期更换，保障账号安全', action: 'password' },
  { icon: 'info', label: '填报须知', desc: '如实核对，提交后信息锁定', action: 'notice' },
  { icon: 'shield', label: '隐私与授权', desc: '本机数据仅用于演示原型', action: 'privacy' },
]

const PAGE_MAP = {
  '/pages/home/home': 'switchTab',
  '/pages/lands/lands': 'navigateTo',
}
function navigateMenu(to) {
  const mode = PAGE_MAP[to] || 'navigateTo'
  uni[mode]({ url: to })
}

function confirmLogout() {
  uni.showModal({
    title: '退出登录',
    content: '退出后需重新输入身份证号与密码登录，是否继续？',
    confirmText: '退出',
    success: (res) => {
      if (!res.confirm) return
      store.logout()
      uni.reLaunch({ url: '/pages/login/login' })
    },
  })
}

function onTap(m) {
  if (m.to) navigateMenu(m.to)
  else if (m.action === 'password') uni.navigateTo({ url: '/pages/password/password' })
  else if (m.action === 'notice') showToast('填报须知：如实核对，提交后信息锁定，须等村级审核')
  else if (m.action === 'privacy') showToast('演示原型，数据仅保存在本地')
}
</script>

<template>
  <div class="page">

    <div class="page-body">
      <!-- 个人信息卡 -->
      <div class="profile-card">
        <div class="avatar">{{ h.initial }}</div>
        <div style="flex:1;min-width:0;">
          <div class="p-name">{{ h.name }}</div>
          <div class="p-sub">{{ h.villageGroup }}</div>
          <div class="p-id form-mono">{{ h.idMasked }}</div>
        </div>
        <div class="p-status">{{ h.status }}</div>
      </div>

      <!-- 进度概览 -->
      <div class="progress-card">
        <div class="row-between" style="margin-bottom:10px;">
          <span class="pc-title">整体进度</span>
          <span class="pc-num">{{ store.progress.value }}%</span>
        </div>
        <div class="progress-track"><div class="progress-fill" :style="{ width: store.progress.value + '%' }"></div></div>
      </div>

      <!-- 菜单 -->
      <div class="menu">
        <div v-for="m in menus" :key="m.label" class="menu-item" @click="onTap(m)">
          <div class="menu-ico"><Icon :name="m.icon" :size="20" color="#0E7490" /></div>
          <div class="menu-main">
            <div class="menu-label">{{ m.label }}</div>
            <div class="menu-desc">{{ m.desc }}</div>
          </div>
          <Icon name="right" :size="14" color="#999999" class="menu-arrow" />
        </div>
      </div>

      <div class="logout-btn" @click="confirmLogout">退出登录</div>

      <div class="version">土地确权线上确认系统 · 用户端 v2.8.0</div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; min-height: 100%; background: var(--color-bg); }
.page-body { padding: 16px; }
.profile-card { background: linear-gradient(135deg, #0E7490 0%, #0B5E75 100%); border-radius: var(--radius-lg); padding: 18px; display: flex; align-items: center; gap: 14px; color: #fff; }
.avatar { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; flex-shrink: 0; }
.p-name { font-size: 18px; font-weight: 600; }
.p-sub { font-size: 12px; color: rgba(255,255,255,0.85); margin-top: 2px; }
.p-id { font-size: 12px; color: rgba(255,255,255,0.7); margin-top: 2px; }
.p-status { background: rgba(255,255,255,0.2); border-radius: 16px; padding: 4px 12px; font-size: 12px; flex-shrink: 0; }
.progress-card { background: #fff; border-radius: var(--radius-lg); padding: 16px; margin-top: 12px; box-shadow: var(--shadow-sm); }
.pc-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.pc-num { font-size: 18px; font-weight: 700; color: var(--color-primary); }
.menu { background: #fff; border-radius: var(--radius-lg); margin-top: 12px; overflow: hidden; box-shadow: var(--shadow-sm); }
.menu-item { display: flex; align-items: center; gap: 12px; padding: 14px 16px; cursor: pointer; transition: var(--transition); border-bottom: 0.5px solid var(--color-divider); }
.menu-item:last-child { border-bottom: none; }
.menu-item:active { background: var(--color-primary-lighter); }
.menu-ico { width: 38px; height: 38px; border-radius: 10px; background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.menu-main { flex: 1; min-width: 0; }
.menu-label { font-size: 15px; font-weight: 500; color: var(--color-text-primary); }
.menu-desc { font-size: 12px; color: var(--color-text-secondary); margin-top: 1px; }
.menu-arrow { color: var(--color-text-tertiary); }
.logout-btn { margin-top: 20px; text-align: center; padding: 14px; background: #fff; border-radius: var(--radius-lg); color: var(--color-danger); font-size: 14px; font-weight: 500; box-shadow: var(--shadow-sm); }
.logout-btn:active { background: var(--color-danger-light); }
.version { text-align: center; font-size: 12px; color: var(--color-text-tertiary); margin-top: 20px; }
</style>
