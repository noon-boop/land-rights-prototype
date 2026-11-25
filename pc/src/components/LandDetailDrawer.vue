<template>
  <div v-if="visible" class="drawer-mask" @click.self="$emit('close')">
    <div class="drawer" role="dialog" aria-label="地块详情">
      <div class="drawer-header">
        <span>地块详情 — {{ land?.name }}<span v-if="householder" style="font-weight:400;color:var(--color-text-tertiary);font-size: 16px;">（{{ householder }}）</span></span>
        <span class="close-btn" @click="$emit('close')">&times;</span>
      </div>
      <div class="drawer-body" v-if="land">
        <!-- 地块矢量图（天地图） -->
        <div class="mb-20">
          <div class="section-title">地块矢量图</div>
          <TdtMap v-if="!isNewAlloc" :center="landCenter" :zoom="15" :markers="landMarkers" />
          <div v-else class="map-pending">
            <div class="map-pending-icon">📍</div>
            <div class="map-pending-text">该地块为新增发包，矢量图待测绘成果录入后展示</div>
          </div>
          <div class="text-tertiary" style="font-size: 14px;margin-top:6px;">
            * {{ isNewAlloc ? '该地块为新增发包，矢量图待测绘成果录入后展示' : '天地图影像底图 · 地块点位为示意，实际以测绘成果为准' }}
          </div>
        </div>

        <div class="mb-20">
          <div class="section-title">基本信息</div>
          <div class="form-grid">
            <div class="info-row"><div class="info-label">地块名称</div><div class="info-value font-bold">{{ land.name }}</div></div>
            <div class="info-row"><div class="info-label">地块编码</div><div class="info-value" style="font-family:'SF Mono',monospace;">{{ land.code }}</div></div>
            <div class="info-row"><div class="info-label">合同面积</div><div class="info-value text-primary font-bold">{{ land.area }} 亩</div></div>
            <div class="info-row"><div class="info-label">实测面积</div><div class="info-value" :class="{ 'text-accent': measuredDiff }">{{ land.measuredArea }} 亩</div></div>
          </div>
        </div>

        <div class="mb-20">
          <div class="section-title">用途与等级</div>
          <div class="form-grid">
            <div class="info-row"><div class="info-label">土地用途</div><div class="info-value"><span class="tag" :class="useTagClass">{{ land.use }}</span></div></div>
            <div class="info-row"><div class="info-label">质量等级</div><div class="info-value">{{ land.quality }}</div></div>
            <div class="info-row"><div class="info-label">是否基本农田</div><div class="info-value"><span class="tag" :class="land.badge === '基本农田' ? 'tag-approved' : 'tag-default'">{{ land.badge }}</span></div></div>
          </div>
        </div>

        <div class="mb-20" v-if="isChanged">
          <div class="section-title">变更信息</div>
          <div class="change-reason">
            <span class="tag tag-info">变更原因</span>
            <span class="change-reason-text">{{ land.changeInfo.reason }}</span>
          </div>
          <div class="form-grid" style="margin-top:12px;">
            <template v-if="land.changeInfo.reason === '分户地块切割'">
              <div class="info-row"><div class="info-label">原承包方</div><div class="info-value">{{ land.changeInfo.splitFrom }}</div></div>
              <div class="info-row"><div class="info-label">新分户</div><div class="info-value">{{ land.changeInfo.newHousehold }}</div></div>
              <div class="info-row"><div class="info-label">划出面积</div><div class="info-value text-accent">{{ land.changeInfo.splitArea }} 亩</div></div>
              <div class="info-row"><div class="info-label">剩余面积</div><div class="info-value">{{ land.changeInfo.remainArea }} 亩</div></div>
              <div class="info-row"><div class="info-label">切割时间</div><div class="info-value">{{ land.changeInfo.splitDate }}</div></div>
            </template>
            <template v-else-if="land.changeInfo.reason === '征地'">
              <div class="info-row"><div class="info-label">征收面积</div><div class="info-value text-accent">{{ land.changeInfo.acquireArea }} 亩</div></div>
              <div class="info-row"><div class="info-label">剩余面积</div><div class="info-value">{{ land.changeInfo.remainArea }} 亩</div></div>
              <div class="info-row"><div class="info-label">征收时间</div><div class="info-value">{{ land.changeInfo.acquireDate }}</div></div>
              <div class="info-row"><div class="info-label">征收用途</div><div class="info-value">{{ land.changeInfo.purpose }}</div></div>
            </template>
            <template v-else>
              <div class="info-row"><div class="info-label">合同面积</div><div class="info-value">{{ land.changeInfo.contractArea }} 亩</div></div>
              <div class="info-row"><div class="info-label">实测面积</div><div class="info-value text-accent">{{ land.changeInfo.measuredArea }} 亩</div></div>
              <div class="info-row"><div class="info-label">差异</div><div class="info-value text-accent">{{ land.changeInfo.diff > 0 ? '+' : '' }}{{ land.changeInfo.diff }} 亩</div></div>
              <div class="info-row"><div class="info-label">调整说明</div><div class="info-value">{{ land.changeInfo.note }}</div></div>
            </template>
          </div>
        </div>

        <div class="mb-20" v-if="measuredDiff && !isChanged">
          <div class="section-title">面积调整说明</div>
          <div class="info-row"><div class="info-label">实测与合同差异</div><div class="info-value text-accent">实测面积较合同{{ diffText }}，差异 {{ diffAbs }} 亩</div></div>
          <div class="info-row" v-if="land.adjustNote"><div class="info-label">调整备注</div><div class="info-value">{{ land.adjustNote }}</div></div>
        </div>

        <div>
          <div class="section-title">地块四至</div>
          <div class="boundary-grid">
            <div class="boundary-cell"><div class="dir-badge dir-e">东</div><div class="boundary-text">{{ land.boundary?.东 || '—' }}</div></div>
            <div class="boundary-cell"><div class="dir-badge dir-s">南</div><div class="boundary-text">{{ land.boundary?.南 || '—' }}</div></div>
            <div class="boundary-cell"><div class="dir-badge dir-w">西</div><div class="boundary-text">{{ land.boundary?.西 || '—' }}</div></div>
            <div class="boundary-cell"><div class="dir-badge dir-n">北</div><div class="boundary-text">{{ land.boundary?.北 || '—' }}</div></div>
          </div>
        </div>
      </div>
      <div class="drawer-footer">
        <button class="btn btn-gray" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import TdtMap from '@/components/TdtMap.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  land: { type: Object, default: null },
  householder: { type: String, default: '' },
})
defineEmits(['close'])

const measuredDiff = computed(() => {
  if (!props.land) return false
  return Math.abs(Number(props.land.measuredArea) - Number(props.land.area)) > 0.0001
})
const diffAbs = computed(() => {
  if (!props.land) return 0
  return Math.abs(Number(props.land.measuredArea) - Number(props.land.area)).toFixed(1)
})
const diffText = computed(() => {
  if (!props.land) return ''
  return Number(props.land.measuredArea) > Number(props.land.area) ? '增加' : '减少'
})
const useTagClass = computed(() => {
  const u = props.land?.use
  if (u === '水田') return 'tag-approved'
  if (u === '旱地') return 'tag-default'
  return 'tag-info'
})
const isNewAlloc = computed(() => props.land?.bizStatus === '新增发包')
const isChanged = computed(() => props.land?.bizStatus === '变更' && !!props.land?.changeInfo)

// 地块矢量图（天地图）：以全村示意中心为基准，按地块 id 生成稳定偏移定位（点位为示意，非真实测绘坐标）
const villageCenter = [109.4981, 36.5966] // 延安市示意中心经纬度
function hashOffset(id) {
  let h = 0
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const a = (h % 1000) / 1000
  const b = ((h >> 10) % 1000) / 1000
  return [(a - 0.5) * 0.03, (b - 0.5) * 0.03]
}
const landCenter = computed(() => {
  if (!props.land) return villageCenter
  const [dlon, dlat] = hashOffset(props.land.id)
  return [villageCenter[0] + dlon, villageCenter[1] + dlat]
})
function statusColor(s) {
  return (
    { 延包: '#0e7a4f', 变更: '#2563EB', 收回: '#DC2626', 征收: '#c9a45c', 新增发包: '#8C8C8C' }[s] ||
    '#0e7a4f'
  )
}
const landMarkers = computed(() => {
  if (!props.land || isNewAlloc.value) return []
  return [
    {
      lon: landCenter.value[0],
      lat: landCenter.value[1],
      name: props.land.name,
      status: props.land.bizStatus,
      color: statusColor(props.land.bizStatus),
    },
  ]
})
</script>

<style scoped>
.map-pending {
  height: 260px;
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-accent);
  background: var(--color-accent-light);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 24px;
}
.map-pending-icon { font-size: 32px; }
.map-pending-text { font-size: 15px; color: var(--color-accent); text-align: center; }
.boundary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.boundary-cell {
  display: flex; align-items: center; gap: 8px;
  background: var(--color-bg); border-radius: var(--radius-sm); padding: 8px 12px;
}
.dir-badge { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; flex-shrink: 0; }
.dir-e { background: #FFF3E0; color: #E65100; }
.dir-s { background: #FDEBEB; color: #DC2626; }
.dir-w { background: #E3F2FD; color: #1565C0; }
.dir-n { background: var(--color-primary-light); color: var(--color-primary-mid); }
.boundary-text { font-size: 16px; color: var(--color-text-primary); }
.change-reason { display: flex; align-items: center; gap: 8px; }
.change-reason-text { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
</style>
