<script setup>
import { computed } from 'vue'
import { store } from '../../store'
import Icon from '../../components/Icon.vue'

const landCount = computed(() => store.landsActive.value.length)
const basicFarmCount = computed(() => store.landsActive.value.filter((l) => l.badge === '基本农田').length)

// 仅展示未删除地块
const activeLands = computed(() => store.state.lands.filter((l) => !l.deleted))

// 左侧面积块底色：基本农田取主色浅底，一般农田取米色
function blockClass(l) {
  return l.badge === '基本农田' ? 'area-block primary' : 'area-block beige'
}

// 我的地块：详情为只读，走独立路径 /my-land/:id（与承包地情况 /land/:id 区分）
function open(id) {
  uni.navigateTo({ url: '/pages/my-land-detail/my-land-detail?id=' + id })
}
</script>

<template>
  <div class="page">

    <div class="page-body">
      <!-- 统计卡（参照用户端.html 我的地块：地块数 / 合同面积 / 基本农田） -->
      <div class="stat-row">
        <div class="stat-card">
          <div class="stat-num">{{ landCount }}</div>
          <div class="stat-lab">地块数</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ store.totalArea.value }}</div>
          <div class="stat-lab">合同面积(亩)</div>
        </div>
        <div class="stat-card">
          <div class="stat-num accent">{{ basicFarmCount }}</div>
          <div class="stat-lab">基本农田</div>
        </div>
      </div>

      <!-- 地块清单（仅展示地块信息，无分布图） -->
      <div class="list-head">地块清单</div>
      <div class="plot-list">
        <div v-for="l in activeLands" :key="l.id" class="plot-card" @click="open(l.id)">
          <div :class="blockClass(l)">
            <div class="ab-num">{{ l.area }}</div>
            <div class="ab-unit">亩</div>
          </div>
          <div class="plot-main">
            <div class="plot-top">
              <div class="plot-name">{{ l.name }}</div>
              <div class="plot-badge" :class="{ plain: l.badge !== '基本农田' }">{{ l.badge }}</div>
            </div>
            <div class="plot-sub">{{ l.code }} · {{ l.use }} · {{ l.quality }}</div>
            <div class="plot-measured">实测面积：{{ l.measuredArea }} 亩</div>
          </div>
          <div class="plot-arrow"><Icon name="right" :size="16" color="#999999" /></div>
        </div>

        <div v-if="activeLands.length === 0" class="empty">暂无地块信息</div>
      </div>

      <!-- 提示（参照用户端.html：增加承包地块由村级账号办理） -->
      <div class="info-banner">
        <Icon name="info" :size="18" />
        <span>增加承包地块由村级账号办理</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; height: 100%; }
.page-body { flex: 1; overflow-y: auto; background: var(--color-bg); padding-bottom: 16px; -webkit-overflow-scrolling: touch; }
.page-body::-webkit-scrollbar { display: none; }

/* 统计卡 */
.stat-row { display: flex; gap: 10px; margin: 12px 16px 0; }
.stat-card { flex: 1; background: #fff; border-radius: var(--radius-md); padding: 14px; text-align: center; box-shadow: var(--shadow-sm); }
.stat-num { font-size: 22px; font-weight: 700; color: var(--color-primary); }
.stat-num.accent { color: var(--color-accent); }
.stat-lab { font-size: 11px; color: var(--color-text-secondary); margin-top: 2px; }

.list-head { font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin: 18px 16px 10px; }
.plot-list { padding: 0 16px 16px; }

/* 地块卡（参照用户端.html：左侧面积块 + 右侧信息） */
.plot-card { background: #fff; border-radius: var(--radius-lg); overflow: hidden; box-shadow: var(--shadow-sm); margin-bottom: 10px; display: flex; align-items: stretch; cursor: pointer; }
.plot-card:active { transform: scale(0.98); }
.area-block { width: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
.area-block.primary { background: var(--color-primary-lighter); }
.area-block.beige { background: #F5F0EB; }
.ab-num { font-size: 24px; font-weight: 700; color: var(--color-primary); }
.area-block.beige .ab-num { color: #8D6E63; }
.ab-unit { font-size: 10px; color: var(--color-text-secondary); }

.plot-main { flex: 1; padding: 12px 10px 12px 14px; min-width: 0; }
.plot-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.plot-name { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
.plot-badge { background: var(--color-primary-light); color: var(--color-primary); font-size: 10px; padding: 2px 8px; border-radius: 8px; font-weight: 500; flex-shrink: 0; }
.plot-badge.plain { background: #F0F0F0; color: var(--color-text-secondary); }
.plot-sub { font-size: 12px; color: var(--color-text-secondary); margin-top: 4px; }
.plot-measured { font-size: 12px; color: var(--color-accent); margin-top: 4px; }
.plot-arrow { display: flex; align-items: center; padding-right: 14px; }

.empty { text-align: center; color: var(--color-text-tertiary); font-size: 13px; padding: 40px 0; }

/* 底部提示：复用全局 .info-banner（外部已定义，无需重复） */
</style>
