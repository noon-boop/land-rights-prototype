<template>
  <div class="tdt-map" :class="{ 'is-dragging': isDragging }" @mousedown="onDown">
    <div class="tdt-canvas" :style="canvasStyle">
      <div v-for="(row, rIdx) in tiles" :key="rIdx" class="tdt-row">
        <div v-for="t in row" :key="t.key" class="tdt-cell">
          <template v-if="t.valid">
            <img class="tdt-tile" :src="t.img" alt="" @error="onErr" />
            <img class="tdt-tile tdt-label" :src="t.label" alt="" @error="onErr" />
            <img v-if="showRoad" class="tdt-tile tdt-road" :src="t.road" alt="" @error="onErr" />
            <img v-if="showRoad" class="tdt-tile tdt-overlay" :src="t.roadLabel" alt="" @error="onErr" />
            <img v-if="showBoundary" class="tdt-tile tdt-overlay" :src="t.boundary" alt="" @error="onErr" />
          </template>
        </div>
      </div>
      <div
        v-for="(m, i) in markers"
        :key="'m' + i"
        class="tdt-marker"
        :style="markerStyle(m)"
        :title="m.name + (m.status ? ' · ' + m.status : '')"
      >
        <span class="tdt-dot" :style="{ background: m.color || '#0e7a4f' }"></span>
      </div>

      <!-- 地块面 (GeoJSON Polygon) -->
      <svg
        v-if="polygons && polygons.features && polygons.features.length"
        class="tdt-polygons"
        :width="canvasW"
        :height="canvasH"
        @click.self="selectedCode = null"
      >
        <path
          v-for="pg in polyShapes"
          :key="pg.code"
          class="tdt-polygon"
          :class="{ 'tdt-polygon-selected': selectedCode === pg.code }"
          :d="pathD(pg.rings)"
          :fill="pg.badge === '基本农田' ? '#0e7a4f44' : '#c9a45c33'"
          :stroke="selectedCode === pg.code ? '#F59E0B' : (pg.badge === '基本农田' ? '#0e7a4f' : '#c9a45c')"
          :stroke-width="selectedCode === pg.code ? 2.5 : 1"
          @click.stop="selectedCode = pg.code"
        />
      </svg>

      <!-- 地块信息浮窗 -->
      <div v-if="selectedPoly" class="tdt-poly-tip">
        <div class="tdt-poly-tip-name">{{ selectedPoly.name || '未命名地块' }}</div>
        <div class="tdt-poly-tip-row">编码 <span class="mono">{{ selectedPoly.code }}</span></div>
        <div class="tdt-poly-tip-row">面积 {{ selectedPoly.area }} 亩 · {{ selectedPoly.badge }}</div>
        <div class="tdt-poly-tip-row">承包方 <span class="mono">{{ selectedPoly.hh }}</span></div>
      </div>
    </div>

    <!-- 指北针 -->
    <div class="tdt-compass">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M12 3 L15 13 L12 11 L9 13 Z" fill="#E5483D" />
        <path d="M12 21 L9 11 L12 13 L15 11 Z" fill="#8C8C8C" />
      </svg>
      <span>N</span>
    </div>

    <!-- 比例尺 -->
    <div class="tdt-scale">
      <span class="tdt-scale-bar"></span>
      <span class="tdt-scale-text">{{ scaleText }}</span>
    </div>

    <!-- 图层切换 -->
    <div class="tdt-layers">
      <button class="tdt-layer-btn" :class="{ active: showRoad }" @mousedown.stop @click="toggleRoad">路网</button>
      <button class="tdt-layer-btn" :class="{ active: showBoundary }" @mousedown.stop @click="toggleBoundary">行政界线</button>
    </div>

    <!-- 缩放 -->
    <div class="tdt-zoom">
      <button class="tdt-zoom-btn" @mousedown.stop @click="zoomIn" :disabled="z >= MAX_ZOOM" title="放大">+</button>
      <button class="tdt-zoom-btn" @mousedown.stop @click="zoomOut" :disabled="z <= MIN_ZOOM" title="缩小">−</button>
    </div>

    <div class="tdt-credit">© 天地图 GS(2023)337号</div>
    <div class="tdt-tip">天地图影像底图 · 地块点位为示意</div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps({
  // 天地图 WMTS 服务地址（含 tk），默认国家天地图影像底图
  baseUrl: { type: String, default: 'http://t0.tianditu.gov.cn/img_w/wmts?tk=36da2a775b04355fa094d6283502b366' },
  // 中心经纬度 [lon, lat]
  center: { type: Array, default: () => [116.4039, 39.9149] }, // 默认北京
  // 瓦片层级
  zoom: { type: Number, default: 14 },
  // 标注点 [{ lon, lat, name, status, color }]
  markers: { type: Array, default: () => [] },
  // 地块面: GeoJSON FeatureCollection (Polygon), 属性含 code/name/hh/area/badge
  polygons: { type: Object, default: () => null },
})

const W = 680
const H = 320
const TILE = 256
const SPAN = 3 // 中心向四周扩展 3 格 -> 7x7
const MIN_ZOOM = 3
const MAX_ZOOM = 18
const canvasW = (2 * SPAN + 1) * TILE
const canvasH = canvasW

const z = ref(props.zoom)
const showBoundary = ref(true) // 行政界线图层
const showRoad = ref(true) // 路网/注记图层
const pan = ref({ lon: 0, lat: 0 })
const liveOffset = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const effCenter = computed(() => [props.center[0] + pan.value.lon, props.center[1] + pan.value.lat])

// 球面墨卡托投影（Web Mercator），层级 z 列数 = 行数 = 2^z
const n = computed(() => Math.pow(2, z.value))
const centerCol = computed(() => Math.floor(((effCenter.value[0] + 180) / 360) * n.value))
const centerRow = computed(() => {
  const latRad = (effCenter.value[1] * Math.PI) / 180
  const merc = Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI
  return Math.floor(((1 - merc) / 2) * n.value)
})

// 从 baseUrl 中解析 tk（兼容默认地址）
const tk = computed(() => {
  const m = props.baseUrl.match(/tk=([^&]+)/)
  return m ? m[1] : '36da2a775b04355fa094d6283502b366'
})

// 国家天地图 WMTS：球面墨卡托投影 _w，TileRow 与 Web Mercator 方向一致，无需翻转
function buildUrl(layer, c, r) {
  return `http://t0.tianditu.gov.cn/${layer}_w/wmts?tk=${tk.value}&SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&FORMAT=tiles&TILEMATRIXSET=w&TILEMATRIX=${z.value}&TILEROW=${r}&TILECOL=${c}`
}

function zoomIn() { if (z.value < MAX_ZOOM) z.value++ }
function zoomOut() { if (z.value > MIN_ZOOM) z.value-- }
function toggleBoundary() { showBoundary.value = !showBoundary.value }
function toggleRoad() { showRoad.value = !showRoad.value }

const tiles = computed(() => {
  const rows = []
  for (let dr = -SPAN; dr <= SPAN; dr++) {
    const rowArr = []
    for (let dc = -SPAN; dc <= SPAN; dc++) {
      const c = centerCol.value + dc
      const r = centerRow.value + dr
      const valid = c >= 0 && c < n.value && r >= 0 && r < n.value
      rowArr.push({
        key: `${r}-${c}`,
        valid,
        img: valid ? buildUrl('img', c, r) : '',
        label: valid ? buildUrl('cia', c, r) : '',
        boundary: valid ? buildUrl('ibo', c, r) : '',
        road: valid ? buildUrl('vec', c, r) : '',
        roadLabel: valid ? buildUrl('cva', c, r) : '',
      })
    }
    rows.push(rowArr)
  }
  return rows
})

// canvas 左上角对应的瓦片行列 = 中心 ± SPAN；把中心瓦片对齐到容器中心即可
const canvasStyle = computed(() => ({
  position: 'absolute',
  left: `${W / 2 - (SPAN + 0.5) * TILE + liveOffset.value.x}px`,
  top: `${H / 2 - (SPAN + 0.5) * TILE + liveOffset.value.y}px`,
  width: `${(2 * SPAN + 1) * TILE}px`,
  height: `${(2 * SPAN + 1) * TILE}px`,
}))

function markerStyle(m) {
  const col = Math.floor(((m.lon + 180) / 360) * n.value)
  const latRad = (m.lat * Math.PI) / 180
  const merc = Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI
  const row = Math.floor(((1 - merc) / 2) * n.value)
  const x = (col - (centerCol.value - SPAN) + 0.5) * TILE + liveOffset.value.x
  const y = (row - (centerRow.value - SPAN) + 0.5) * TILE + liveOffset.value.y
  return { left: `${x}px`, top: `${y}px` }
}

// ---- 地块面 (Polygon) 渲染 ----
// 经纬度 → canvas 内像素坐标 (SVG 在 canvas 内, 无需加 liveOffset)
function lonLatToPx(lon, lat) {
  const col = ((lon + 180) / 360) * n.value
  const latRad = (lat * Math.PI) / 180
  const merc = Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI
  const row = ((1 - merc) / 2) * n.value
  return [(col - (centerCol.value - SPAN)) * TILE, (row - (centerRow.value - SPAN)) * TILE]
}

const selectedCode = ref(null)
const selectedPoly = computed(() => polyShapes.value.find((p) => p.code === selectedCode.value) || null)

// 每块地: 环点像素化 + 视口裁剪(粗略, 全部在 1792^2 外才跳过)
const polyShapes = computed(() => {
  const feats = (props.polygons && props.polygons.features) || []
  const out = []
  for (const f of feats) {
    const rings = []
    let inView = false
    for (const ring of f.geometry.coordinates) {
      const pts = []
      for (const [lon, lat] of ring) {
        const [x, y] = lonLatToPx(lon, lat)
        pts.push([x, y])
        if (x > -150 && x < canvasW + 150 && y > -150 && y < canvasH + 150) inView = true
      }
      rings.push(pts)
    }
    if (inView) {
      out.push({
        code: f.properties.code,
        name: f.properties.name,
        hh: f.properties.hh,
        area: f.properties.area,
        badge: f.properties.badge,
        rings,
      })
    }
  }
  return out
})

// 多环 Polygon → SVG path d (每环 M...Z)
function pathD(rings) {
  return rings
    .map((ring) => 'M' + ring.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z')
    .join(' ')
}

// 1 个瓦片对应经度跨度 = 360 / n 度；1 度约 111km（中纬度），取中纬度估算比例尺
const scaleText = computed(() => `${(360 / n.value * 111 * SPAN).toFixed(1)} km`)

// 鼠标拖拽平移：拖拽中仅移动像素（流畅），释放后折算为经纬度偏移并重新加载瓦片
let dragSX = 0
let dragSY = 0
function onDown(e) {
  if (e.button !== 0) return
  isDragging.value = true
  dragSX = e.clientX
  dragSY = e.clientY
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
function onMove(e) {
  if (!isDragging.value) return
  liveOffset.value = { x: e.clientX - dragSX, y: e.clientY - dragSY }
}
function onUp() {
  if (!isDragging.value) return
  isDragging.value = false
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('mouseup', onUp)
  const ox = liveOffset.value.x
  const oy = liveOffset.value.y
  liveOffset.value = { x: 0, y: 0 }
  if (ox === 0 && oy === 0) return
  const dLon = -(ox / TILE) * (360 / n.value)
  const dLat = -(oy / TILE) * (360 / n.value)
  pan.value = { lon: pan.value.lon + dLon, lat: pan.value.lat + dLat }
}
onUnmounted(() => {
  document.removeEventListener('mousemove', onMove)
  document.removeEventListener('mouseup', onUp)
})

// 单个瓦片加载失败时隐藏该图块（不阻塞其余瓦片显示）
function onErr(e) {
  e.target.style.visibility = 'hidden'
}
</script>

<style scoped>
.tdt-map {
  position: relative;
  width: 680px;
  max-width: 100%;
  height: 320px;
  margin: 0 auto;
  border-radius: 8px;
  overflow: hidden;
  background: #e8eef0;
  border: 1px solid var(--color-divider);
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
}
.tdt-map.is-dragging {
  cursor: grabbing;
}
.tdt-canvas {
  position: absolute;
}
.tdt-row {
  display: flex;
}
.tdt-cell {
  position: relative;
  width: 256px;
  height: 256px;
  flex: 0 0 256px;
}
.tdt-tile {
  width: 256px;
  height: 256px;
  display: block;
  user-drag: none;
  -webkit-user-drag: none;
  pointer-events: none;
}
.tdt-label,
.tdt-overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
}
.tdt-road {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  pointer-events: none;
  opacity: 0.5;
}
.tdt-layers {
  position: absolute;
  left: 12px;
  top: 44px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 10;
}
.tdt-layer-btn {
  border: 1px solid rgba(14, 122, 79, 0.35);
  background: #ffffffd9;
  color: #0e7a4f;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  min-width: 64px;
  text-align: center;
  box-shadow: 0 1px 4px #0000001f;
}
.tdt-layer-btn:hover {
  background: #fff;
}
.tdt-layer-btn.active {
  background: #0e7a4f;
  color: #fff;
  border-color: #0e7a4f;
}
.tdt-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 5;
}
.tdt-polygons {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 4;
  pointer-events: none;
}
.tdt-polygon {
  pointer-events: auto;
  cursor: pointer;
}
.tdt-polygon:hover {
  stroke-width: 2px !important;
}
.tdt-poly-tip {
  position: absolute;
  left: 12px;
  bottom: 56px;
  z-index: 12;
  background: #fffffff2;
  border: 1px solid var(--color-divider, #e5e7eb);
  border-radius: 8px;
  box-shadow: 0 4px 12px #00000026;
  padding: 8px 12px;
  font-size: 12px;
  color: #333;
  min-width: 200px;
}
.tdt-poly-tip-name {
  font-weight: 600;
  color: var(--color-primary-mid, #0e7a4f);
  margin-bottom: 4px;
  font-size: 13px;
}
.tdt-poly-tip-row {
  line-height: 1.7;
  color: #555;
}
.tdt-poly-tip .mono {
  font-family: 'SF Mono', Consolas, monospace;
  font-size: 11px;
  color: #333;
}
.tdt-dot {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px #0006;
}
.tdt-compass {
  position: absolute;
  right: 12px;
  top: 12px;
  width: 30px;
  height: 38px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fffc;
  border-radius: 6px;
  padding: 2px 0;
}
.tdt-compass span {
  font-size: 11px;
  font-weight: 700;
  color: #595959;
  margin-top: -2px;
}
.tdt-scale {
  position: absolute;
  left: 12px;
  bottom: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tdt-scale-bar {
  width: 80px;
  height: 4px;
  background: #595959;
  border-left: 1px solid #595959;
  border-right: 1px solid #595959;
}
.tdt-scale-text {
  font-size: 10px;
  color: #595959;
  margin-top: 2px;
}
.tdt-credit {
  position: absolute;
  right: 6px;
  bottom: 4px;
  font-size: 10px;
  color: #00000073;
}
.tdt-tip {
  position: absolute;
  left: 12px;
  top: 10px;
  font-size: 11px;
  color: #fff;
  background: #0a4a33b3;
  padding: 2px 8px;
  border-radius: 10px;
}
.tdt-zoom {
  position: absolute;
  right: 12px;
  bottom: 28px;
  display: flex;
  flex-direction: column;
  background: #ffffffd9;
  border-radius: 6px;
  box-shadow: 0 1px 4px #00000026;
  overflow: hidden;
  z-index: 10;
}
.tdt-zoom-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #333;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
.tdt-zoom-btn:hover:not(:disabled) {
  background: #f0f0f0;
}
.tdt-zoom-btn:disabled {
  color: #bbb;
  cursor: not-allowed;
}
.tdt-zoom-btn + .tdt-zoom-btn {
  border-top: 1px solid #e0e0e0;
}
</style>
