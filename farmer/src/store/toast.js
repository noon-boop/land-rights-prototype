// Toast：uni-app 小程序用原生 uni.showToast（替代 H5 自绘 Toast 组件）
export function showToast(message, duration = 1800) {
  uni.showToast({
    title: message,
    icon: 'none',
    duration,
  })
}
