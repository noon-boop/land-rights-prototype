<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const perm = computed(() => route.meta.perm || '')
const title = computed(() => route.meta.title || '功能')
const note = computed(() => route.meta.note || '')
</script>

<template>
  <div class="pending-page">
    <div class="card">
      <div class="ph-head">
        <span class="tag">待建设</span>
        <span class="ph-title">{{ title }}</span>
        <span v-if="perm" class="perm">{{ perm }}</span>
      </div>
      <div v-if="note" class="ph-note">{{ note }}</div>
      <div class="ph-meta">
        <div>该功能已在菜单与路由中挂载（权限点 <b>{{ perm }}</b>），业务实现尚未接入。</div>
        <div>页面骨架、权限校验、菜单渲染链路均已就绪，补齐后即可使用。</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pending-page { padding: 20px; }
.card { background: #fff; border-radius: 12px; padding: 26px 24px; border: 1px dashed #cdd6df; }
.ph-head { display: flex; align-items: center; gap: 10px; }
.tag { font-size: 11px; color: #b26a00; background: #fff3e0; border-radius: 5px; padding: 2px 8px; }
.ph-title { font-size: 17px; font-weight: 600; color: #1b2733; }
.perm { font-size: 11.5px; color: #0e7a4f; background: #e4f3ea; border-radius: 5px; padding: 2px 8px; font-family: monospace; }
.ph-note { margin-top: 14px; font-size: 13px; color: #3d4b5a; line-height: 1.75; background: #f7f9fa; border-left: 3px solid #c9a45c; border-radius: 6px; padding: 12px 14px; }
.ph-meta { margin-top: 16px; font-size: 12.5px; color: #8a97a5; line-height: 1.9; }
</style>
