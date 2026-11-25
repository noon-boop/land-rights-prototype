<template>
  <div class="mwrap">
    <canvas
      class="mcanvas"
      canvas-id="landMap"
      id="landMap"
      :style="{ width: w + 'px', height: h + 'px' }"
      @touchend="onTap"
    ></canvas>

    <div v-if="!features.length" class="mempty">
      暂无可显示的矢量图斑
      <div class="msub">分割 / 分户 / 新增的地块需线下实测划矢量后才会出现</div>
    </div>

    <div v-if="tip" class="mtip">{{ tip }}</div>

    <div v-if="features.length" class="mstat">
      {{ features.length }} 块 · 合计 {{ totalArea }} 亩 · 点图斑可定位
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'

/**
 * 农户端地块分布图（微信小程序 canvas）
 *
 * 小程序不支持 SVG，因此用 canvas 2d 绘制。
 * 投影与 PC 端一致：X 乘 cos(中心纬度) 后与 Y 用同一比例尺，保证形状不变形。
 */
const props = defineProps({
  features: { type: Array, default: () => [] },
  height: { type: Number, default: 220 },
})
const emit = defineEmits(['select'])

const w = ref(320)
const h = computed(() => props.height)
const tip = ref('')
let geo = null // 预计算的投影参数

const COLORS = ['#0E7490', '#2B7A4B', '#C9932B', '#8E5BB5', '#3A7BD5', '#B23A48']
const totalArea = computed(
  () => props.features.reduce((a, f) => a + (Number(f.areaMu) || 0), 0).toFixed(2),
)

/** 解析 WKT POLYGON → 环数组 */
function parseWkt(wkt) {
  const rings = []
  if (!wkt) return rings
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

/** 算范围 + 等比投影参数 */
function buildGeo() {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity
  const parsed = []
  for (const f of props.features) {
    const rings = parseWkt(f.geometry)
    if (!rings.length) continue
    parsed.push({ f, rings })
    for (const ring of rings) {
      for (const [x, y] of ring) {
        if (x < minLon) minLon = x
        if (x > maxLon) maxLon = x
        if (y < minLat) minLat = y
        if (y > maxLat) maxLat = y
      }
    }
  }
  if (!parsed.length) return null
  const pad = 14
  const midLat = (minLat + maxLat) / 2
  const kx = Math.cos((midLat * Math.PI) / 180) || 1e-9
  const spanX = (maxLon - minLon) * kx || 1e-9
  const spanY = maxLat - minLat || 1e-9
  const availW = w.value - pad * 2
  const availH = h.value - pad * 2
  const scale = Math.min(availW / spanX, availH / spanY)
  const offX = pad + (availW - spanX * scale) / 2
  const offY = pad + (availH - spanY * scale) / 2
  return { parsed, minLon, maxLat, kx, scale, offX, offY }
}

function project(lon, lat) {
  const g = geo
  return [g.offX + (lon - g.minLon) * g.kx * g.scale, g.offY + (g.maxLat - lat) * g.scale]
}

function draw() {
  geo = buildGeo()
  const ctx = uni.createCanvasContext('landMap')
  ctx.setFillStyle('#F7FBFC')
  ctx.fillRect(0, 0, w.value, h.value)

  if (!geo) return
  geo.parsed.forEach((item, i) => {
    const color = COLORS[i % COLORS.length]
    const ring = item.rings[0]
    ctx.beginPath()
    ring.forEach(([lon, lat], k) => {
      const [x, y] = project(lon, lat)
      if (k === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.setFillStyle(color)
    ctx.setGlobalAlpha(0.62)
    ctx.fill()
    ctx.setGlobalAlpha(1)
    ctx.setStrokeStyle('#FFFFFF')
    ctx.setLineWidth(1)
    ctx.stroke()
  })
  // 序号标注，便于和下方卡片对应
  geo.parsed.forEach((item, i) => {
    const ring = item.rings[0]
    let cx = 0, cy = 0
    for (const [lon, lat] of ring) {
      const [x, y] = project(lon, lat)
      cx += x
      cy += y
    }
    cx /= ring.length
    cy /= ring.length
    ctx.setFillStyle('#FFFFFF')
    ctx.setFontSize(10)
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    ctx.fillText(String(i + 1), cx, cy)
  })
  ctx.draw()
}

/** 射线法判断点是否在多边形内 */
function inRing(px, py, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-12) + xi) {
      inside = !inside
    }
  }
  return inside
}

function onTap(e) {
  if (!geo) return
  const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0])
  if (!t) return
  const rect = e.currentTarget
  // 小程序里 x/y 已是相对 canvas 的坐标
  const px = t.x
  const py = t.y
  for (const item of geo.parsed) {
    for (const ring of item.rings) {
      const proj = ring.map(([lon, lat]) => project(lon, lat))
      if (inRing(px, py, proj)) {
        tip.value = `${item.f.plotName || '未命名地块'} · ${item.f.plotCode} · ${item.f.areaMu ?? '—'} 亩`
        emit('select', item.f)
        return
      }
    }
  }
  tip.value = ''
  emit('select', null)
}

function redraw() {
  nextTick(() => draw())
}

onMounted(() => {
  const info = uni.getSystemInfoSync()
  w.value = Math.min(info.windowWidth, 750) - 40
  redraw()
})

watch(() => props.features, redraw, { deep: false })
</script>

<style scoped>
.mwrap { position: relative; background: #F7FBFC; border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
.mcanvas { display: block; }
.mempty { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; font-size: 13px; color: #9AA6B2; }
.msub { font-size: 11px; color: #B4BCC4; margin-top: 6px; text-align: center; padding: 0 24px; }
.mtip { position: absolute; left: 10px; top: 10px; background: rgba(255,255,255,.96);
  border-radius: 8px; padding: 6px 10px; font-size: 11px; color: #1B2733;
  box-shadow: 0 2px 8px rgba(15,42,67,.1); max-width: 78%; }
.mstat { position: absolute; left: 10px; bottom: 10px; background: rgba(255,255,255,.94);
  border-radius: 6px; padding: 4px 9px; font-size: 10.5px; color: #5A6875; }
</style>
