<template>
  <router-view />

  <!-- 演示环境提示弹框：打开网页时弹出 -->
  <Teleport to="body">
    <div v-if="showNotice" class="dlg-mask" @click.self="close">
        <div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
          <div class="dlg-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3l7.5 3.2v5.3c0 4.6-3.1 7.9-7.5 9.5-4.4-1.6-7.5-4.9-7.5-9.5V6.2L12 3z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
              <path d="M12 8.4v4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <circle cx="12" cy="15.6" r="1" fill="currentColor" />
            </svg>
          </div>

          <h3 id="dlg-title" class="dlg-title">演示环境提示</h3>

          <p class="dlg-text">本系统仅供<b>演示学习</b>使用，<br />请勿上传真实数据。</p>

          <p class="dlg-sub">
            系统内所有账号、农户、地块与矢量数据均为演示样例，请勿录入真实身份信息、承包合同或地块坐标。
            因违规录入真实数据所产生的一切后果由操作者自行承担。
          </p>

          <button class="dlg-btn" type="button" @click="close">我已知晓</button>
          <div class="dlg-foot">农村土地承包经营权确权登记 · 演示版</div>
        </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

/* ============================================================
   演示环境提示
   ------------------------------------------------------------
   - 每次「打开网页」（新标签页 / 新会话）弹一次，同一会话内刷新不重复打扰
   - 若要每次刷新都弹：删掉 sessionStorage 的判断与写入即可
   ============================================================ */
const SESSION_KEY = 'land:demo-notice-ack'
const showNotice = ref(false)

function close() {
  showNotice.value = false
  document.body.style.overflow = ''
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch (e) {
    /* 隐私模式下 sessionStorage 不可用，忽略即可 */
  }
}

function onKeydown(e) {
  if (e.key === 'Escape' && showNotice.value) close()
}

onMounted(() => {
  let acked = false
  try {
    acked = sessionStorage.getItem(SESSION_KEY) === '1'
  } catch (e) {
    acked = false
  }
  if (!acked) {
    showNotice.value = true
    document.body.style.overflow = 'hidden'
  }
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style>
/* 非 scoped：弹框 Teleport 到 body 后仍要生效 */
/* ============================================================
   进场动画用 CSS animation，不用 <transition>：
   v-if 关闭时节点立即移除，不会因标签页隐藏导致 transitionend 不触发而残留遮罩
   ============================================================ */
.dlg-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(10, 74, 51, 0.42);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: dlg-mask-in 0.2s ease;
}

@keyframes dlg-mask-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.dlg {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 30px 30px 22px;
  text-align: center;
  box-shadow: 0 24px 60px rgba(10, 74, 51, 0.22), 0 4px 14px rgba(10, 74, 51, 0.08);
  font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  animation: dlg-pop 0.26s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

@keyframes dlg-pop {
  from {
    transform: translateY(10px) scale(0.97);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.dlg-icon {
  width: 54px;
  height: 54px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e4f3ea;
  color: #0e7a4f;
}
.dlg-icon svg {
  width: 28px;
  height: 28px;
}

.dlg-title {
  font-size: 19px;
  font-weight: 700;
  color: #152a21;
  letter-spacing: 0.5px;
  margin: 0 0 12px;
}

.dlg-text {
  font-size: 15px;
  line-height: 1.9;
  color: #0e7a4f;
  font-weight: 600;
  margin: 0 0 12px;
}
.dlg-text b {
  color: #0a4a33;
  background: linear-gradient(transparent 62%, #cfe9d8 62%);
  padding: 0 2px;
}

.dlg-sub {
  font-size: 12.5px;
  line-height: 1.85;
  color: #71857a;
  background: #f4faf6;
  border-left: 3px solid #38b57f;
  border-radius: 0 8px 8px 0;
  padding: 10px 14px;
  text-align: left;
  margin: 0 0 22px;
}

.dlg-btn {
  width: 100%;
  height: 46px;
  border: 0;
  border-radius: 10px;
  background: linear-gradient(115deg, #0e7a4f, #1b9a67);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 2px;
  font-family: inherit;
  cursor: pointer;
  transition: 0.22s;
  box-shadow: 0 10px 22px rgba(14, 122, 79, 0.22);
}
.dlg-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(14, 122, 79, 0.3);
}
.dlg-btn:active {
  transform: translateY(0);
}

.dlg-foot {
  margin-top: 14px;
  font-size: 11px;
  color: #afbdb4;
  letter-spacing: 0.5px;
}

@media (max-width: 480px) {
  .dlg {
    padding: 24px 20px 18px;
    border-radius: 14px;
  }
  .dlg-title {
    font-size: 17px;
  }
  .dlg-text {
    font-size: 14px;
  }
}
</style>
