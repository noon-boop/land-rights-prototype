<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/store/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

/** F-P05 顶栏身份：组织名 + 角色名 + 退出 */
const orgName = computed(() => auth.orgLabel || auth.roleName)
const roleName = computed(() => auth.roleName)
const userName = computed(() => (auth.user && auth.user.realName) || '')
const initial = computed(() => (userName.value || '用')[0])

function logout() {
  auth.logout()
  router.replace('/login')
}
</script>

<template>
  <header class="topbar">
    <div class="tb-left">
      <div class="tb-title">{{ route.meta.title || '工作台' }}</div>
      <div v-if="route.meta.group" class="tb-group">{{ route.meta.group }}</div>
    </div>

    <div class="tb-right">
      <div class="tb-org">
        <span class="org-name">{{ orgName }}</span>
        <span v-if="roleName" class="org-role">{{ roleName }}</span>
      </div>
      <div class="tb-user">
        <div class="avatar">{{ initial }}</div>
        <span class="uname">{{ userName }}</span>
      </div>
      <button class="btn-quiet" @click="router.push('/password')">改密</button>
      <button class="btn-quiet danger" @click="logout">退出</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: 56px;
  flex-shrink: 0;
  background: #fff;
  border-bottom: 1px solid #e8ebef;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 20;
}
.tb-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}
.tb-title {
  font-size: 16px;
  font-weight: 600;
  color: #1b2733;
}
.tb-group {
  font-size: 12px;
  color: #8a97a5;
  background: #f4f6f8;
  border-radius: 4px;
  padding: 2px 7px;
}
.tb-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.tb-org {
  display: flex;
  align-items: center;
  gap: 7px;
  padding-right: 14px;
  border-right: 1px solid #e8ebef;
}
.org-name {
  font-size: 13px;
  color: #3d4b5a;
  font-weight: 500;
}
.org-role {
  font-size: 11px;
  color: #0e7a4f;
  background: #e4f3ea;
  border-radius: 4px;
  padding: 2px 6px;
}
.tb-user {
  display: flex;
  align-items: center;
  gap: 7px;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #0e7a4f;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.uname {
  font-size: 13px;
  color: #3d4b5a;
}
.btn-quiet {
  border: 1px solid #dfe4ea;
  background: #fff;
  color: #5a6875;
  font-size: 12.5px;
  padding: 5px 11px;
  border-radius: 6px;
  cursor: pointer;
}
.btn-quiet:hover {
  border-color: #0e7a4f;
  color: #0e7a4f;
}
.btn-quiet.danger:hover {
  border-color: #d33;
  color: #d33;
}
</style>
