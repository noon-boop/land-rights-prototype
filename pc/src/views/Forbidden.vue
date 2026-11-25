<script setup>
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()
</script>

<template>
  <div class="forbid">
    <div class="fb-icon">🚫</div>
    <div class="fb-title">无访问权限</div>
    <div class="fb-desc">
      当前角色未被授予该功能权限<template v-if="route.query.perm">（{{ route.query.perm }}）</template>。
    </div>
    <div class="fb-hint">如需使用请联系系统管理员授权。</div>
    <button class="fb-btn" @click="router.replace('/dashboard')">返回工作台</button>
  </div>
</template>

<style scoped>
.forbid { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; }
.fb-icon { font-size: 44px; margin-bottom: 14px; }
.fb-title { font-size: 18px; font-weight: 600; color: #1b2733; }
.fb-desc { font-size: 13.5px; color: #5a6875; margin-top: 10px; text-align: center; }
.fb-hint { font-size: 12.5px; color: #9aa6b2; margin-top: 6px; }
.fb-btn { margin-top: 22px; height: 36px; padding: 0 18px; border-radius: 7px; border: none; background: #0e7a4f; color: #fff; font-size: 13.5px; cursor: pointer; }
</style>
