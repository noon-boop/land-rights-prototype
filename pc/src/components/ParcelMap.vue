<script setup>
import { ref, computed, watch } from 'vue'

/**
 * 图斑矢量渲染（纯 SVG，不依赖地图库/瓦片）
 *
 * 输入 features 来自 gis-service /gis/parcels/village/{adminCode}：
 *   [{ plotCode, plotName, householdCode, areaMu, landTypeCode, geometry: "POLYGON((lon lat,...))" }]
 *
 * 坐标处理：经纬度 → 等距圆柱投影（x 乘 cos(中心纬度) 修正），y 轴翻转以匹配屏幕坐标。
 */
const props = defineProps({
  features: { type: Array, default: () => [] },
  colorBy: { type: String, default: 'qualityGrade' }, // qualityGrade | landTypeCode | householdCode | none
  height: { type: Number, default: 560 },
  selectedCode: { type: String, default: '' },
})
const emit = defineEmits(['select'])

const hover = ref(null)
const boxW = 900

/* 缩放与平移：村域约 5km，图斑多在地块级（十几米），必须能放大看 */
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)
const dragging = ref(false)
let dragStart = null

const ZOOM_MIN = 1
const ZOOM_MAX = 20

function onWheel(e) {
  e.preventDefault()
  const svg = e.currentTarget
  const rect = svg.getBoundingClientRect()
  // 鼠标点对应的 SVG 坐标
  const mx = ((e.clientX - rect.left) / rect.width) * canvas.value.w
  const my = ((e.clientY - rect.top) / rect.height) * canvas.value.h
  const dir = e.deltaY < 0 ? 1 : -1
  const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom.value * (dir > 0 ? 1.25 : 0.8)))
  if (next === zoom.value) return
  // 以鼠标为锚点缩放：保持鼠标下的点不动
  const k = next / zoom.value
  panX.value = mx - (mx - panX.value) * k
  panY.value = my - (my - panY.value) * k
  zoom.value = next
}

function onDown(e) {
  dragging.value = true
  dragStart = {
    x: e.clientX, y: e.clientY,
    px: panX.value, py: panY.value,
  }
}

function onMove(e) {
  if (!dragging.value || !dragStart) return
  const rect = e.currentTarget.getBoundingClientRect()
  const kx = canvas.value.w / rect.width
  const ky = canvas.value.h / rect.height
  panX.value = dragStart.px + (e.clientX - dragStart.x) * kx
  panY.value = dragStart.py + (e.clientY - dragStart.y) * ky
}

function onUp() { dragging.value = false; dragStart = null }

function zoomIn() { zoom.value = Math.min(ZOOM_MAX, zoom.value * 1.5) }
function zoomOut() { zoom.value = Math.max(ZOOM_MIN, zoom.value / 1.5) }
function resetView() { zoom.value = 1; panX.value = 0; panY.value = 0 }

const viewTransform = computed(
  () => `translate(${panX.value.toFixed(2)} ${panY.value.toFixed(2)}) scale(${zoom.value.toFixed(3)})`,
)

/** 解析 WKT POLYGON → 环数组 */
function parseWkt(wkt) {
  if (!wkt) return []
  const rings = []
  const s = String(wkt).trim()
  const lp = s.indexOf('(')
  const rp = s.lastIndexOf(')')
  if (lp < 0 || rp <= lp) return rings
  let body = s.slice(lp + 1, rp).trim()
  if (body.startsWith('(')) body = body.slice(1)
  if (body.endsWith(')')) body = body.slice(0, -1)
  for (const ringStr of body.split(/\)\s*,\s*\(/)) {
    const ring = []
    for (const chunk of ringStr.split(',')) {
      const nums = chunk.trim().split(/\s+/).map(Number)
      for (let k = 0; k + 1 < nums.length; k += 2) {
        if (Number.isFinite(nums[k]) && Number.isFinite(nums[k + 1])) {
          ring.push([nums[k], nums[k + 1]])
        }
      }
    }
    if (ring.length >= 3) rings.push(ring)
  }
  return rings
}

/** 全部要素的点集 → 范围 */
const extent = computed(() => {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
  for (const f of props.features) {
    for (const ring of parseWkt(f.geometry)) {
      for (const [x, y] of ring) {
        if (x < minLon) minLon = x
        if (x > maxLon) maxLon = x
        if (y < minLat) minLat = y
        if (y > maxLat) maxLat = y
      }
    }
  }
  if (!Number.isFinite(minLon)) return null
  return { minLon, minLat, maxLon, maxLat }
})

/**
 * 画布 + 等比投影
 *
 * 关键点：X/Y 必须用同一个比例尺，否则图斑会被拉扁成条状。
 * kx = cos(中心纬度) 把经度差换算成与纬度差同量纲的「等效度」。
 */
const PAD = 24

const canvas = computed(() => {
  const e = extent.value
  if (!e) return { w: boxW, h: props.height, scale: 1, kx: 1, offX: 0, offY: 0 }
  const midLat = (e.minLat + e.maxLat) / 2
  const kx = Math.cos((midLat * Math.PI) / 180) || 1e-9
  const spanX = (e.maxLon - e.minLon) * kx || 1e-9
  const spanY = e.maxLat - e.minLat || 1e-9

  // 等比：取能同时装下两个跨度的较小比例尺
  const availW = boxW - PAD * 2
  const availH = props.height - PAD * 2
  const scale = Math.min(availW / spanX, availH / spanY)

  // 居中
  const drawW = spanX * scale
  const drawH = spanY * scale
  const offX = PAD + (availW - drawW) / 2
  const offY = PAD + (availH - drawH) / 2

  return { w: boxW, h: props.height, scale, kx, offX, offY }
})

/** 经纬度 → SVG 坐标（等比 + 居中） */
function project(lon, lat) {
  const e = extent.value
  if (!e) return [0, 0]
  const c = canvas.value
  const x = c.offX + (lon - e.minLon) * c.kx * c.scale
  const y = c.offY + (e.maxLat - lat) * c.scale
  return [x, y]
}

/** 一条环 → path d */
function ringPath(ring) {
  return ring.map(([lon, lat], i) => {
    const [x, y] = project(lon, lat)
    return (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2)
  }).join(' ') + ' Z'
}

/** 要素渲染数据 */
const shapes = computed(() => {
  return props.features.map((f) => {
    const rings = parseWkt(f.geometry)
    const d = rings.map(ringPath).join(' ')
    return {
      key: f.plotCode || String(f.id),
      code: f.plotCode,
      name: f.plotName,
      hh: f.householdCode,
      area: f.areaMu,
      measured: f.measuredArea,
      grade: f.qualityGrade,
      landType: f.landTypeCode,
      basicFarm: f.isBasicFarm,
      d,
      fill: colorOf(f),
    }
  }).filter((s) => s.d)
})

/* 配色：地力等级 / 地类 / 按户 / 单色 */
const GRADE_COLORS = ['#0e7a4f', '#2B7A4B', '#c9a45c', '#8E5BB5', '#3A7BD5', '#D2691E']
const LAND_COLORS = ['#0e7a4f', '#2B7A4B', '#c9a45c', '#8E5BB5', '#3A7BD5', '#B23A48']

function hashColor(key, palette) {
  let h = 0
  const s = String(key || '')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}

function colorOf(f) {
  if (props.colorBy === 'none') return '#0e7a4f'
  if (props.colorBy === 'landTypeCode') return hashColor(f.landTypeCode, LAND_COLORS)
  if (props.colorBy === 'householdCode') return hashColor(f.householdCode, GRADE_COLORS)
  return hashColor(f.qualityGrade, GRADE_COLORS)
}

/** 图例 */
const legend = computed(() => {
  if (props.colorBy === 'none') return []
  const map = new Map()
  for (const f of props.features) {
    const k = props.colorBy === 'landTypeCode' ? f.landTypeCode
      : props.colorBy === 'householdCode' ? (f.householdCode || '').slice(-4)
        : f.qualityGrade
    if (!k) continue
    if (!map.has(k)) map.set(k, colorOf(f))
  }
  const label = props.colorBy === 'landTypeCode' ? '地类'
    : props.colorBy === 'householdCode' ? '户主（身份证后4位）' : '地力等级'
  return { label, items: [...map.entries()].slice(0, 8).map(([k, c]) => ({ k, c })) }
})

const hoverInfo = computed(() => {
  const s = shapes.value.find((x) => x.key === hover.value)
  return s || null
})

function onEnter(s) { hover.value = s.key }
function onLeave() { hover.value = null }
function onClick(s) { emit('select', s) }

watch(() => props.features, () => { hover.value = null })
</script>

<template>
  <div class="pmap">
    <div v-if="!features.length" class="empty">
      该范围内暂无矢量图斑
      <span class="sub">（分割/分户新增的地块需线下实测划矢量后才能上图）</span>
    </div>

    <div v-else class="wrap">
      <svg :viewBox="`0 0 ${canvas.w} ${canvas.h}`" :style="{ height: canvas.h + 'px' }"
        class="svg" :class="{ dragging }"
        @wheel="onWheel" @mousedown="onDown" @mousemove="onMove"
        @mouseup="onUp" @mouseleave="onUp">
        <g :transform="viewTransform">
          <path v-for="s in shapes" :key="s.key" :d="s.d"
            :fill="s.fill"
            :fill-opacity="hover === s.key || selectedCode === s.code ? 0.88 : 0.6"
            :stroke="selectedCode === s.code ? '#C9302C' : '#ffffff'"
            :stroke-width="(selectedCode === s.code ? 2 : 0.8) / zoom"
            class="parcel"
            @mouseenter="onEnter(s)" @mouseleave="onLeave" @click="onClick(s)" />
        </g>
      </svg>

      <div class="zoomctl">
        <span class="zb" @click="zoomIn" title="放大">＋</span>
        <span class="zl">{{ Math.round(zoom * 100) }}%</span>
        <span class="zb" @click="zoomOut" title="缩小">－</span>
        <span class="zb reset" @click="resetView" title="复位">复位</span>
      </div>

      <div v-if="hoverInfo" class="tip">
        <div class="t-code">{{ hoverInfo.code }}</div>
        <div class="t-name">{{ hoverInfo.name || '未命名地块' }}</div>
        <div class="t-row">合同 {{ hoverInfo.area ?? '—' }} 亩
          <span v-if="hoverInfo.measured"> · 实测 {{ hoverInfo.measured }} 亩</span>
        </div>
        <div class="t-row">地力等级 {{ hoverInfo.grade || '—' }} · 地类 {{ hoverInfo.landType || '—' }}
          <span v-if="hoverInfo.basicFarm === '1'"> · 基本农田</span>
        </div>
        <div class="t-row dim">户 {{ hoverInfo.hh || '—' }}</div>
      </div>

      <div v-if="legend.items.length" class="legend">
        <div class="lg-title">{{ legend.label }}</div>
        <div v-for="it in legend.items" :key="it.k" class="lg-item">
          <span class="dot" :style="{ background: it.c }"></span>{{ it.k }}
        </div>
      </div>

      <div class="stat">
        {{ shapes.length }} 块 · 合计
        {{ features.reduce((a, f) => a + (Number(f.areaMu) || 0), 0).toFixed(2) }} 亩
      </div>
    </div>
  </div>
</template>

<style scoped>
.pmap { position: relative; }
.wrap { position: relative; }
.svg { width: 100%; display: block; background: #f4faf6; border-radius: 8px; cursor: grab; touch-action: none; }
.svg.dragging { cursor: grabbing; }
.zoomctl { position: absolute; right: 12px; top: 12px; display: flex; align-items: center; gap: 2px;
  background: rgba(255,255,255,.96); border: 1px solid #e3e9ee; border-radius: 8px; padding: 3px 4px;
  font-size: 12px; box-shadow: 0 2px 8px rgba(10,74,51,.07); }
.zb { padding: 3px 9px; color: #0e7a4f; cursor: pointer; border-radius: 5px; user-select: none; }
.zb:hover { background: #e4f3ea; }
.zb.reset { color: #5a6875; font-size: 11.5px; }
.zl { color: #8a97a5; font-size: 11px; min-width: 42px; text-align: center; }
.parcel { cursor: pointer; transition: fill-opacity .12s; }
.parcel:hover { stroke: #0e7a4f; stroke-width: 1.6; }
.empty { text-align: center; color: #9aa6b2; font-size: 13px; padding: 46px 0; line-height: 1.9; }
.empty .sub { font-size: 11.5px; }
.tip { position: absolute; left: 12px; top: 12px; background: rgba(255,255,255,.97);
  border: 1px solid #e3e9ee; border-radius: 8px; padding: 10px 13px; font-size: 12px;
  color: #3d4b5a; box-shadow: 0 3px 12px rgba(10,74,51,.09); pointer-events: none; max-width: 260px; }
.t-code { font-family: monospace; font-size: 11.5px; color: #8a97a5; }
.t-name { font-size: 13px; font-weight: 600; color: #1b2733; margin: 2px 0 6px; }
.t-row { line-height: 1.75; }
.t-row.dim { color: #8a97a5; font-size: 11px; }
.legend { position: absolute; right: 12px; bottom: 12px; background: rgba(255,255,255,.96);
  border: 1px solid #e3e9ee; border-radius: 8px; padding: 9px 12px; font-size: 11.5px; }
.lg-title { color: #8a97a5; margin-bottom: 6px; font-size: 11px; }
.lg-item { display: flex; align-items: center; gap: 6px; line-height: 1.85; color: #3d4b5a; }
.dot { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
.stat { position: absolute; left: 12px; bottom: 12px; font-size: 11.5px; color: #5a6875;
  background: rgba(255,255,255,.94); border-radius: 6px; padding: 5px 10px; }
</style>
