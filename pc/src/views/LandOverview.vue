<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { apiLandList, get } from '@/api'
import { useAuthStore } from '@/store/auth'
import ParcelMap from '@/components/ParcelMap.vue'

/**
 * F-P09 地块总览
 * 两个视图：矢量图斑（走 gis-service）/ 地块清单（走各端 lands 接口）
 */
const auth = useAuthStore()
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const err = ref('')
const q = reactive({ keyword: '', badge: 'all', page: 1, pageSize: 20 })

/* ---------- 矢量视图 ---------- */
const view = ref('vector')
const villages = ref([])
const adminCode = ref('')
const features = ref([])
const vLoading = ref(false)
const vErr = ref('')
const colorBy = ref('qualityGrade')
const selected = ref(null)
const overview = ref(null)

function endpoint() {
  const t = auth.userType
  if (t === 'TOWN') return '/township/lands'
  if (t === 'COUNTY') return '/county/lands'
  return '/village/lands'
}

async function load() {
  loading.value = true
  err.value = ''
  try {
    const p = endpoint()
    const d = p === '/village/lands' ? await apiLandList(q) : await get(p, q)
    rows.value = (d && (d.list || d.records)) || []
    total.value = (d && d.total) || 0
  } catch (e) {
    err.value = e.message || '加载失败'
    rows.value = []
  } finally {
    loading.value = false
  }
}

/** 村列表取自 GIS 行政区划表，各角色统一口径 */
async function loadVillages() {
  try {
    // level: 2=县 3=镇 4=村
    const list = await get('/gis/admin-regions', { level: 4 })
    villages.value = (list || []).map((r) => ({ code: r.adminCode || r.code, name: r.name }))
  } catch (e) {
    villages.value = []
  }
  // 村级账号锁定本村
  if (auth.userType === 'VILLAGE') {
    try {
      const sc = await get('/village/scope')
      if (sc && sc.adminCode) adminCode.value = sc.adminCode
    } catch (e) { /* 忽略 */ }
  }
  if (!adminCode.value && villages.value.length) adminCode.value = villages.value[0].code
  await loadFeatures()
}

async function loadFeatures() {
  if (!adminCode.value) return
  vLoading.value = true
  vErr.value = ''
  selected.value = null
  try {
    const d = await get('/gis/parcels/village/' + adminCode.value)
    features.value = (d && d.features) || []
    try { overview.value = await get('/gis/village/' + adminCode.value + '/overview') } catch (e) { overview.value = null }
  } catch (e) {
    vErr.value = e.message || '矢量数据加载失败（GIS 服务未启动？）'
    features.value = []
  } finally {
    vLoading.value = false
  }
}

function onSelect(s) { selected.value = s }

function locateInList(s) {
  q.keyword = s.code || ''
  q.page = 1
  view.value = 'list'
  load()
}

onMounted(async () => { await Promise.all([load(), loadVillages()]) })
watch(() => [q.badge, q.page], load)
watch(adminCode, (nv, ov) => { if (ov !== undefined && nv !== ov) loadFeatures() })

const pendCount = computed(() => rows.value.filter((r) => r.isPendingVector).length)
const sumArea = computed(() => rows.value.reduce((a, r) => a + Number(r.contractArea || r.area || 0), 0).toFixed(2))
const vectorArea = computed(() => features.value.reduce((a, f) => a + (Number(f.areaMu) || 0), 0).toFixed(2))
</script>

<template>
  <div class="lo">
    <div class="toolbar">
      <div class="tabs">
        <span class="tab" :class="{ on: view === 'vector' }" @click="view = 'vector'">矢量图斑</span>
        <span class="tab" :class="{ on: view === 'list' }" @click="view = 'list'">地块清单</span>
      </div>
      <template v-if="view === 'vector'">
        <select v-model="adminCode" :disabled="auth.userType === 'VILLAGE'">
          <option v-for="v in villages" :key="v.code" :value="v.code">{{ v.name }}</option>
        </select>
        <select v-model="colorBy">
          <option value="qualityGrade">按地力等级着色</option>
          <option value="landTypeCode">按地类着色</option>
          <option value="householdCode">按所属户着色</option>
          <option value="none">单色</option>
        </select>
        <button class="btn" @click="loadFeatures">刷新</button>
        <div class="sum">
          <span v-if="overview">村内 <b>{{ overview.parcelCount }}</b> 块 · <b>{{ overview.totalAreaMu }}</b> 亩 · <b>{{ overview.householdCount }}</b> 户</span>
        </div>
      </template>
      <template v-else>
        <input v-model="q.keyword" placeholder="地块名称 / 编码 / 户主" @keyup.enter="q.page = 1; load()" />
        <select v-model="q.badge">
          <option value="all">全部地类</option>
          <option value="基本农田">基本农田</option>
          <option value="一般农田">一般农田</option>
        </select>
        <button class="btn primary" @click="q.page = 1; load()">搜索</button>
        <div class="sum">共 <b>{{ total }}</b> 块 · 本页合计 <b>{{ sumArea }}</b> 亩<span v-if="pendCount"> · 待划矢量 <b class="warn">{{ pendCount }}</b></span></div>
      </template>
    </div>

    <div v-if="err" class="err">{{ err }}</div>

    <div v-if="view === 'vector'" class="map-panel">
      <div v-if="vErr" class="err" style="margin:0 0 10px">{{ vErr }}</div>
      <div v-if="vLoading" class="loading">图斑加载中…</div>
      <ParcelMap v-else :features="features" :color-by="colorBy"
        :selected-code="selected ? selected.code : ''" @select="onSelect" />
      <div v-if="selected" class="sel">
        <span class="sel-code">{{ selected.code }}</span>
        <span class="sel-name">{{ selected.name || '未命名地块' }}</span>
        <span>{{ selected.area ?? '—' }} 亩</span>
        <span class="dim">户 {{ selected.hh || '—' }}</span>
        <span class="link" @click="locateInList(selected)">在清单中定位</span>
        <span class="close" @click="selected = null">×</span>
      </div>
      <div class="hint">
        图斑为 CGCS2000 3 度带投影反算后的经纬度矢量轮廓，只画轮廓、不接瓦片底图。
        合计 {{ features.length }} 块 / {{ vectorArea }} 亩。分割与分户新增的地块需线下实测划矢量后才会出现在图上。
      </div>
    </div>

    <template v-else>
      <div class="table-wrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>地块编码</th><th>地块名称</th><th>所属户</th><th class="num">合同面积</th>
              <th class="num">实测面积</th><th>用途</th><th>等级</th><th>地类</th><th>来源</th><th>四至</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td class="mono small">{{ r.plotCode || r.code }}</td>
              <td>
                {{ r.plotName || r.name }}
                <span v-if="r.isPendingVector" class="vtag">待划矢量</span>
              </td>
              <td class="small">{{ r.householder || '—' }}</td>
              <td class="num">{{ r.contractArea ?? r.area }}</td>
              <td class="num">{{ r.measuredArea ?? '—' }}</td>
              <td class="small">{{ r.landUse || r.use }}</td>
              <td class="small">{{ r.landGrade || r.quality || '—' }}</td>
              <td class="small">{{ r.badge }}</td>
              <td class="small"><span class="src" :class="'src-' + (r.source || '原有')">{{ r.source || '原有' }}</span></td>
              <td class="small dim2">
                {{ typeof r.boundary === 'object' && r.boundary
                    ? [r.boundary['东'], r.boundary['南'], r.boundary['西'], r.boundary['北']].filter(Boolean).join(' / ')
                    : [r.boundaryEast, r.boundarySouth, r.boundaryWest, r.boundaryNorth].filter(Boolean).join(' / ') || '—' }}
              </td>
            </tr>
            <tr v-if="!rows.length && !loading"><td colspan="10" class="empty">暂无数据</td></tr>
          </tbody>
        </table>
      </div>

      <div class="pager">
        <span class="pg-info">第 {{ q.page }} 页</span>
        <button class="btn" :disabled="q.page <= 1" @click="q.page--">上一页</button>
        <button class="btn" :disabled="rows.length < q.pageSize" @click="q.page++">下一页</button>
      </div>
    </template>

    <div v-if="loading" class="loading">加载中…</div>
  </div>
</template>

<style scoped>
.lo { padding: 18px 20px; }
.toolbar { background: #fff; border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.toolbar input, .toolbar select { height: 34px; border: 1px solid #dfe4ea; border-radius: 7px; padding: 0 11px; font-size: 13px; outline: none; }
.toolbar input { width: 240px; }
.tabs { display: flex; gap: 6px; }
.tab { font-size: 13px; padding: 6px 14px; border-radius: 16px; background: #f4f6f8; color: #5a6875; cursor: pointer; }
.tab.on { background: #0e7a4f; color: #fff; }
.btn { height: 34px; padding: 0 14px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
.btn:disabled { opacity: .5; }
.sum { margin-left: auto; font-size: 12.5px; color: #8a97a5; }
.sum b { color: #0e7a4f; }
.sum b.warn { color: #b26a00; }
.map-panel { background: #fff; border-radius: 10px; margin-top: 12px; padding: 14px 16px; }
.hint { font-size: 11.5px; color: #9aa6b2; margin-top: 10px; line-height: 1.9; }
.sel { display: flex; align-items: center; gap: 12px; background: #e4f3ea; border-radius: 8px;
  padding: 9px 13px; margin-top: 10px; font-size: 12.5px; color: #3d4b5a; flex-wrap: wrap; }
.sel-code { font-family: monospace; color: #0e7a4f; }
.sel-name { font-weight: 600; color: #1b2733; }
.sel .dim { color: #8a97a5; }
.sel .link { color: #0e7a4f; cursor: pointer; text-decoration: underline; }
.sel .close { margin-left: auto; cursor: pointer; color: #8a97a5; font-size: 16px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-top: 12px; }
.table-wrap { background: #fff; border-radius: 10px; margin-top: 12px; overflow: auto; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; padding: 10px 12px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; white-space: nowrap; }
.tbl td { padding: 10px 12px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim2 { color: #8a97a5; }
.vtag { font-size: 10.5px; background: #fff3e0; color: #b26a00; border-radius: 3px; padding: 1px 5px; margin-left: 6px; }
.src { font-size: 11px; border-radius: 4px; padding: 1px 6px; background: #e4f3ea; color: #0e7a4f; }
.src-新增 { background: #e8f5ed; color: #2b7a4b; }
.src-分割 { background: #fff3e0; color: #b26a00; }
.src-合户并入 { background: #ede7f6; color: #5e35b1; }
.empty { text-align: center; color: #9aa6b2; padding: 36px 0; }
.pager { display: flex; align-items: center; gap: 10px; justify-content: flex-end; margin-top: 12px; }
.pg-info { font-size: 12.5px; color: #8a97a5; margin-right: auto; }
.loading { text-align: center; color: #9aa6b2; font-size: 13px; padding: 16px; }
</style>
