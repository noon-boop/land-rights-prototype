<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { MENU } from '@/menu'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
const route = useRoute()

/** F-P03 动态菜单：只渲染当前角色有权访问的功能 */
const groups = computed(() =>
  MENU.map((g) => ({
    group: g.group,
    items: g.items.filter((it) => auth.hasPerm(it.perm)),
  })).filter((g) => g.items.length > 0),
)

const ICN = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  field: 'M12 2L2 7v2h20V7L12 2zM4 10v9h2v-9H4zm5 0v9h2v-9H9zm5 0v9h2v-9h-2zm5 0v9h2v-9h-2z',
  chart: 'M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z',
  bell: 'M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5a6 6 0 0 0-5-5.9V4a1 1 0 1 0-2 0v1.1A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z',
  check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  people: 'M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zm-8 0c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zm0 2c-2.7 0-6 1.3-6 3v2h12v-2c0-1.7-3.3-3-6-3zm8 0c-.3 0-.7 0-1 .1 1.1.8 1.5 1.8 1.5 2.9v2H22v-2c0-1.7-3.3-3-6-3z',
  split: 'M12 2v8H4v2h8v10h2V12h8v-2h-8V2z',
  merge: 'M8 2v6H4v2h8V2H8zm10 10v2h-4v8h-2v-8H8v-2h10z',
  user: 'M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z',
  trash: 'M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2zM4 7h16v2H4z',
  warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  lock: 'M18 8h-1V6A5 5 0 0 0 7 6v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zM9 6a3 3 0 0 1 6 0v2H9V6z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  submit: 'M2 21l21-9L2 3v7l15 2-15 2v7z',
  compare: 'M9 3L5 7h3v6h2V7h3L9 3zm6 18l4-4h-3V9h-2v8h-3l4 4z',
  message: 'M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z',
  list: 'M3 5h18v2H3zm0 6h18v2H3zm0 6h18v2H3z',
  search: 'M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z',
  package: 'M12 2l9 4.5v11L12 22l-9-4.5v-11L12 2zm0 2.2L5.6 7.4 12 10.6l6.4-3.2L12 4.2z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5h-2v6l5 3 1-1.7-4-2.3V7z',
  upload: 'M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z',
  send: 'M2 21l21-9L2 3v7l15 2-15 2v7z',
  export: 'M14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7zM5 5h5V3H3v18h18v-7h-2v5H5V5z',
  archive: 'M4 3h16v4H4V3zm1 6h14v12H5V9zm4 3v2h6v-2H9z',
}

function icon(name) {
  return ICN[name] || ICN.doc
}
function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">土</div>
      <div class="brand-text">
        <div class="brand-title">土地确权</div>
        <div class="brand-sub">线上确认平台</div>
      </div>
    </div>

    <nav class="nav">
      <div v-for="g in groups" :key="g.group" class="nav-group">
        <div class="nav-group-title">{{ g.group }}</div>
        <router-link
          v-for="it in g.items"
          :key="it.path"
          :to="it.path"
          class="nav-item"
          :class="{ active: isActive(it.path), pending: !it.impl }"
        >
          <svg class="nav-ic" viewBox="0 0 24 24" width="17" height="17">
            <path :d="icon(it.icon)" fill="currentColor" />
          </svg>
          <span class="nav-label">{{ it.title }}</span>
          <span v-if="!it.impl" class="nav-dot" title="页面待建设"></span>
        </router-link>
      </div>
    </nav>

    <div class="sidebar-foot">
      <span class="ver">v2.8</span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 216px;
  flex-shrink: 0;
  background: #0a4a33;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #0e7a4f;
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.brand-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  line-height: 1.2;
}
.brand-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 2px;
}
.nav {
  flex: 1;
  overflow-y: auto;
  padding: 10px 8px 16px;
}
.nav::-webkit-scrollbar {
  width: 4px;
}
.nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 2px;
}
.nav-group + .nav-group {
  margin-top: 8px;
}
.nav-group-title {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  padding: 8px 10px 6px;
  letter-spacing: 0.5px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 10px;
  border-radius: 7px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13.5px;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
  position: relative;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}
.nav-item.active {
  background: #0e7a4f;
  color: #fff;
  font-weight: 500;
}
.nav-ic {
  flex-shrink: 0;
  opacity: 0.9;
}
.nav-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c9a45c;
  flex-shrink: 0;
}
.sidebar-foot {
  padding: 10px 16px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.ver {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
}
</style>
