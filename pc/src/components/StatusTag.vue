<template>
  <span class="tag" :class="tagClass">{{ status }}</span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: String, default: '' },
})

const tagClass = computed(() => {
  switch (props.status) {
    case '已通过':
      return 'tag-approved'
    case '待审核':
      return 'tag-pending'
    case '未通过':
      return 'tag-rejected'
    case '未提交':
      return 'tag-unsubmitted'
    case '已撤销':
      return 'tag-canceled'
    case '已新增':
      return 'tag-added'
    case '已合户':
      return 'tag-added'
    case '已分户':
      return 'tag-added'
    case '已销户':
      return 'tag-added'
    default:
      return 'tag-default'
  }
})
</script>
