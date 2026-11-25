<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { store } from '../../store'
import Icon from '../../components/Icon.vue'

const id = ref(0)
const land = computed(() => store.state.lands.find((l) => l.id === id.value) || store.state.lands[0])

onLoad((options) => {
  id.value = Number(options.id || 0)
  uni.setNavigationBarTitle({ title: land.value.name })
})
</script>

<template>
  <div class="page">

    <div class="page-body">
      <!-- 封面（示意图） -->
      <div class="cover">
        <div class="plot-image-placeholder" style="height:180px;">
          <Icon name="field" :size="56" color="#0E7490" />
        </div>
        <div class="plot-badge">地块示意图</div>
        <div class="plot-status-badge">{{ land.badge }}</div>
      </div>

      <!-- 基本信息（只读） -->
      <div class="form-card" style="margin-top:16px;">
        <div class="form-card-title">地块基本信息</div>
        <div class="form-row"><div class="form-label">地块编号</div><div class="form-value form-mono">{{ land.code }}</div></div>
        <div class="form-row"><div class="form-label">地块名称</div><div class="form-value">{{ land.name }}</div></div>
        <div class="form-row">
          <div class="form-label">合同面积</div>
          <div class="form-value"><span class="primary-text fw600">{{ land.area }}</span> 亩</div>
        </div>
        <div class="form-row">
          <div class="form-label">实测面积</div>
          <div class="form-value"><span class="primary-text fw600">{{ land.measuredArea }}</span> 亩</div>
        </div>
        <div class="form-row"><div class="form-label">土地用途</div><div class="form-value">{{ land.use }}</div></div>
        <div class="form-row"><div class="form-label">质量等级</div><div class="form-value">{{ land.quality }}</div></div>
      </div>

      <!-- 四至界限（只读） -->
      <div class="form-card">
        <div class="form-card-title">四至界限</div>
        <div class="boundary-box">
          <div v-for="dir in ['东','南','西','北']" :key="dir" class="boundary-item">
            <span class="boundary-dir">{{ dir }}</span>
            <span class="boundary-value">{{ land.boundary[dir] || '—' }}</span>
          </div>
        </div>
      </div>

      <div class="readonly-tip">
        <Icon name="info" :size="16" color="#999999" />
        <span>该信息由承包方填报、村级审核后展示，不可修改</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.cover { position: relative; }
.cover .plot-image-placeholder { width: 100%; }
.plot-image-placeholder { display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #E0F2F5 0%, #D4E9D8 100%); }
.readonly-tip {
  display: flex; align-items: center; gap: 6px; justify-content: center;
  font-size: 12px; color: var(--color-text-tertiary); margin: 4px 16px 0;
}
</style>
