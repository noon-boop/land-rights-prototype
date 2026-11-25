<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { store } from '../../store'
import { showToast } from '../../store/toast'
import Icon from '../../components/Icon.vue'
import StepBar from '../../components/StepBar.vue'
import MiniParcelMap from '../../components/MiniParcelMap.vue'
import { fetchParcelGeometries } from '../../api/farmer'
const keyword = ref('')
const filter = ref('全部')

const steps = ['基本信息', '家庭成员', '承包地', '变更诉求', '确认提交']

// 进入地块列表即视为已核实承包地情况
onMounted(() => {
  store.markSection('land', 'done')
  loadGeometries()
})

/* ---------- 地块分布图（矢量图斑） ---------- */
const geoFeatures = ref([])
const geoLoading = ref(false)
const geoErr = ref('')
const focusCode = ref('')

async function loadGeometries() {
  const codes = store.state.lands.filter((l) => !l.deleted).map((l) => l.code).filter(Boolean)
  if (!codes.length) return
  geoLoading.value = true
  geoErr.value = ''
  try {
    const d = await fetchParcelGeometries(codes)
    geoFeatures.value = (d && d.features) || []
  } catch (e) {
    geoErr.value = '图斑加载失败'
    geoFeatures.value = []
  } finally {
    geoLoading.value = false
  }
}

/** 点图斑 → 高亮对应卡片并滚动到位 */
function onParcelSelect(f) {
  if (!f) { focusCode.value = ''; return }
  focusCode.value = f.plotCode || ''
  uni.pageScrollTo({ selector: '#land-' + f.plotCode, duration: 280 })
}

const filters = ['全部', '基本农田', '一般农田', '待核实']

const filtered = computed(() => {
  return store.state.lands.filter((l) => {
    const matchK = !keyword.value || l.name.includes(keyword.value) || l.code.toLowerCase().includes(keyword.value.toLowerCase())
    const matchF = filter.value === '全部' ||
      (filter.value === '待核实' ? l.status === '待核实' : l.badge === filter.value)
    return matchK && matchF
  })
})
// 仅列表展示未删除地块；已删除单独归入「已删除」区，便于恢复
const activeLands = computed(() => filtered.value.filter((l) => !l.deleted))
const deletedLands = computed(() => filtered.value.filter((l) => l.deleted))

function open(id) {
  uni.navigateTo({ url: '/pages/land-detail/land-detail?id=' + id })
}
function addLand() {
  uni.navigateTo({ url: '/pages/land-edit/land-edit?id=0' })
}

/* ---------- 删除须填原因（B-A13） ---------- */
const delTarget = ref(null)
const delReason = ref('')
const showDelDialog = computed({
  get: () => !!delTarget.value,
  set: (v) => { if (!v) delTarget.value = null },
})
function askDelete(l) {
  if (!store.state.canEdit) { showToast('当前状态不可修改'); return }
  delReason.value = ''
  delTarget.value = l
}
async function confirmDelete() {
  if (!delReason.value.trim()) { showToast('请填写删除原因'); return }
  const ok = await store.softDeleteLand(delTarget.value.id, delReason.value.trim())
  if (ok) {
    delTarget.value = null
    showToast('已删除该地块（可恢复）')
  }
}

async function restore(l) {
  if (!store.state.canEdit) { showToast('当前状态不可修改'); return }
  const ok = await store.restoreLand(l.id)
  if (ok) showToast('已恢复该地块')
}
async function onCard(l) {
  if (l.deleted) await restore(l)
  else open(l.id)
}

function saveDraft() {
  showToast('草稿已保存')
  uni.switchTab({ url: '/pages/home/home' })
}
function next() {
  showToast('已保存承包地情况')
  uni.navigateTo({ url: '/pages/changes/changes' })
}
</script>

<template>
  <div class="page">
    <StepBar :current="3" :steps="steps" />

    <div class="page-body">
      <!-- 汇总 -->
      <div class="summary-banner">
        <div>
          <div class="sb-sub">共 {{ store.landsActive.value.length }} 块承包地</div>
          <div class="sb-num">合同面积 {{ store.totalArea.value }} 亩</div>
          <div class="sb-num sb-measured">实测面积 {{ store.totalMeasured.value }} 亩</div>
        </div>
        <div class="sb-ico"><Icon name="field" :size="28" color="#0E7490" /></div>
      </div>

      <!-- 地块分布图（矢量图斑） -->
      <div v-if="geoLoading" class="geo-loading">图斑加载中…</div>
      <MiniParcelMap v-else :features="geoFeatures" :height="220" @select="onParcelSelect" />
      <div v-if="geoErr" class="geo-err">{{ geoErr }}</div>

      <!-- 待划矢量提示 -->
      <view v-if="store.pendingVectorLands.value.length" class="vec-tip">
        <Icon name="warning" :size="14" color="#B26A00" />
        <text>{{ store.pendingVectorLands.value.length }} 块待线下实测划矢量（分割/分户/新增产生）</text>
      </view>

      <div class="search-bar">
        <div class="search-input-wrap">
          <Icon name="search" :size="16" color="#999999" />
          <input v-model="keyword" type="text" placeholder="搜索地块名称或编号">
        </div>
      </div>

      <div class="filter-row">
        <div v-for="f in filters" :key="f" class="filter-chip" :class="{ active: filter === f }" @click="filter = f">{{ f }}</div>
      </div>

      <div class="plot-list">
        <div v-for="l in activeLands" :key="l.id" :id="'land-' + l.code"
          class="plot-card" :class="{ 'geo-focus': focusCode && focusCode === l.code }"
          @click="open(l.id)">
          <div class="plot-image-wrapper">
            <div class="plot-image-placeholder">
              <Icon name="field" :size="48" color="#0E7490" />
            </div>
            <div class="plot-status-badge">{{ l.badge }}</div>
            <div class="plot-del" @click.stop="askDelete(l)"><Icon name="trash" :size="16" color="#FFFFFF" /></div>
          </div>
          <div class="plot-body">
            <div class="plot-name-row">
              <div class="plot-name">{{ l.name }}</div>
              <div class="plot-code">{{ l.code }}</div>
            </div>

            <!-- 来源标记 + 待划矢量 -->
            <div class="badge-row">
              <span class="src-tag" :class="'src-' + l.source">{{ l.source }}</span>
              <span v-if="l.isPendingVector" class="pend-tag">待线下划矢量</span>
            </div>

            <!-- 合同面积 / 实测面积：置顶双色突出显示（只读） -->
            <div class="plot-areas">
              <div class="area-pill">
                <div class="a-label">合同面积</div>
                <div class="a-val">{{ l.area }} <span class="a-unit">亩</span></div>
              </div>
              <div class="area-pill measured">
                <div class="a-label">实测面积</div>
                <div class="a-val">{{ l.measuredArea }} <span class="a-unit">亩</span></div>
              </div>
            </div>
            <div class="plot-info-grid">
              <div class="plot-info-item"><span class="label">土地用途:</span><span class="value">{{ l.use }}</span></div>
              <!-- 质量等级无值不展示 -->
              <div v-if="l.quality" class="plot-info-item"><span class="label">质量等级:</span><span class="value">{{ l.quality }}</span></div>
            </div>
            <div v-if="l.splitNote" class="split-note">{{ l.splitNote }}</div>
          </div>
        </div>

        <!-- 已删除地块（变暗，点击可恢复） -->
        <div v-for="l in deletedLands" :key="l.id" class="plot-card deleted" @click="onCard(l)">
          <div class="plot-image-wrapper">
            <div class="plot-image-placeholder">
              <Icon name="field" :size="48" color="#0E7490" />
            </div>
            <div class="plot-status-badge">{{ l.badge }}</div>
            <div class="plot-del restore" @click.stop="restore(l)"><Icon name="refresh" :size="16" color="#FFFFFF" /></div>
          </div>
          <div class="plot-body">
            <div class="plot-name-row">
              <div class="plot-name">{{ l.name }}<span class="deleted-tag">已删除</span></div>
              <div class="plot-code">{{ l.code }}</div>
            </div>
            <div class="plot-areas">
              <div class="area-pill">
                <div class="a-label">合同面积</div>
                <div class="a-val">{{ l.area }} <span class="a-unit">亩</span></div>
              </div>
              <div class="area-pill measured">
                <div class="a-label">实测面积</div>
                <div class="a-val">{{ l.measuredArea }} <span class="a-unit">亩</span></div>
              </div>
            </div>
            <div class="restore-hint">已删除{{ l.deletedReason ? '：' + l.deletedReason : '' }} · 点击卡片可恢复</div>
          </div>
        </div>

        <!-- 添加地块 -->
        <div class="add-plot-btn" @click="addLand">
          <Icon name="plus" :size="18" color="#0E7490" />
          添加地块
        </div>

        <div v-if="activeLands.length === 0 && deletedLands.length === 0" class="empty">未找到匹配的地块</div>
      </div>
    </div>

    <div class="bottom-action">
      <div class="btn btn-outline flex-half" @click="saveDraft">保存草稿</div>
      <div class="btn btn-primary" @click="next">下一步：变更与诉求</div>
    </div>

    <!-- 删除原因弹窗 -->
    <view v-if="showDelDialog" class="dialog-mask" @click="delTarget = null">
      <view class="dialog" @click.stop>
        <view class="dialog-title">删除地块</view>
        <view class="dialog-desc">{{ delTarget ? delTarget.name + '（' + delTarget.code + '）' : '' }}<br>删除后可恢复，请填写删除原因</view>
        <textarea maxlength="-1" v-model="delReason" class="form-textarea dialog-input" placeholder="如：重复录入、地块已并入其他地块"></textarea>
        <view class="dialog-actions">
          <view class="dialog-btn cancel" @click="delTarget = null">取消</view>
          <view class="dialog-btn danger" @click="confirmDelete">确认删除</view>
        </view>
      </view>
    </view>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; position: relative; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }
.summary-banner { margin: 12px 16px 0; background: var(--color-primary-lighter); border-radius: var(--radius-md); padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; }
.sb-sub { font-size: 13px; color: var(--color-text-secondary); }
.sb-num { font-size: 18px; font-weight: 700; color: var(--color-primary); margin-top: 2px; }
.sb-measured { color: var(--color-accent); font-size: 14px; font-weight: 600; margin-top: 4px; }
.sb-ico { color: var(--color-primary); opacity: 0.5; }
.vec-tip { margin: 10px 16px 0; background: #FFF8E6; border-radius: var(--radius-sm); padding: 8px 12px; display: flex; align-items: center; gap: 6px; font-size: 12px; color: #B26A00; border-left: 3px solid var(--color-accent); }
.plot-list { padding: 0 16px 16px; }
.empty { text-align: center; color: var(--color-text-tertiary); font-size: 13px; padding: 40px 0; }
.plot-del {
  position: absolute; top: 10px; right: 10px;
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.plot-del:active { background: var(--color-danger); }
.plot-del.restore { background: var(--color-primary); }
.plot-del.restore:active { background: var(--color-primary-dark); }
.badge-row { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.src-tag { font-size: 10px; border-radius: 4px; padding: 1px 6px; background: var(--color-primary-light); color: var(--color-primary); }
.src-tag.src-新增 { background: #E8F5ED; color: #2B7A4B; }
.src-tag.src-分割 { background: #FFF3E0; color: #B26A00; }
.src-tag.src-合户并入 { background: #EDE7F6; color: #5E35B1; }
.pend-tag { font-size: 10px; border-radius: 4px; padding: 1px 6px; background: #FFF8E6; color: #B26A00; }
.split-note { font-size: 11px; color: var(--color-accent); background: #FFF8E6; border-radius: var(--radius-sm); padding: 6px 8px; margin-top: 8px; line-height: 1.5; }
/* 合同/实测面积：置顶双色药丸 */
.plot-areas { display: flex; gap: 8px; margin: 10px 0 6px; }
.area-pill { flex: 1; background: var(--color-primary-lighter); border-radius: var(--radius-sm); padding: 8px 10px; }
.area-pill.measured { background: #FFF8E6; }
.area-pill .a-label { font-size: 11px; color: var(--color-text-secondary); }
.area-pill .a-val { font-size: 16px; font-weight: 700; color: var(--color-primary); margin-top: 2px; }
.area-pill.measured .a-val { color: var(--color-accent); }
.area-pill .a-unit { font-size: 11px; font-weight: 400; }
/* 已删除地块：变暗 */
.plot-card.deleted { opacity: 0.55; background: #F2F2F2; }
.plot-card.deleted .plot-image-placeholder { background: #E3E3E3; }
.plot-card.geo-focus { border: 2px solid #0E7490; box-shadow: 0 0 0 3px rgba(14,116,144,.12); }
.geo-loading { background: #F7FBFC; border-radius: 12px; padding: 34px 0; text-align: center;
  font-size: 12px; color: #9AA6B2; margin-bottom: 12px; }
.geo-err { background: #FDECEB; color: #C9302C; font-size: 12px; border-radius: 8px;
  padding: 8px 12px; margin-bottom: 12px; }
.deleted-tag { font-size: 11px; color: #fff; background: var(--color-text-tertiary); border-radius: 8px; padding: 1px 6px; margin-left: 6px; }
.restore-hint { font-size: 12px; color: var(--color-primary); text-align: center; padding-top: 8px; margin-top: 8px; border-top: 1px dashed var(--color-border); }
.add-plot-btn {
  display: flex; align-items: center; justify-content: center; gap: 6px; padding: 14px;
  border: 1.5px dashed var(--color-border-strong); border-radius: var(--radius-lg);
  color: var(--color-primary); font-size: 14px; font-weight: 500; cursor: pointer; margin-bottom: 12px;
  transition: var(--transition);
}
.add-plot-btn:active { background: var(--color-primary-lighter); }
.dialog-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 0 32px; }
.dialog { width: 100%; background: #fff; border-radius: var(--radius-lg); padding: 20px 18px; }
.dialog-title { font-size: 16px; font-weight: 600; text-align: center; color: var(--color-text-primary); }
.dialog-desc { font-size: 12px; color: var(--color-text-secondary); text-align: center; margin: 8px 0 12px; line-height: 1.6; }
.dialog-input { background: var(--color-bg); min-height: 80px; }
.dialog-actions { display: flex; gap: 10px; margin-top: 16px; }
.dialog-btn { flex: 1; text-align: center; padding: 11px; border-radius: var(--radius-md); font-size: 14px; font-weight: 500; }
.dialog-btn.cancel { background: var(--color-bg); color: var(--color-text-secondary); }
.dialog-btn.danger { background: var(--color-danger); color: #fff; }
</style>
