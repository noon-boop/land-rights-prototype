<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="main-wrap">
      <AppTopbar />
      <div class="content-area">
        <!--
          不用 <transition mode="out-in">：组件根节点若含多个顶层元素（fragment），
          Vue 无法对其施加过渡，out-in 会卡在 leave 阶段，导致新页面永不挂载
          （表现为地址与标题已切换、内容区仍是上一页）。
        -->
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import AppSidebar from '@/components/AppSidebar.vue'
import AppTopbar from '@/components/AppTopbar.vue'
</script>
