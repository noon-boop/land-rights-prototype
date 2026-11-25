<script>
import { store } from './store'
import { getToken } from './api/request'

export default {
  async onLaunch() {
    // 冷启动：若本地已有 token，则恢复会话并拉取户数据（免重复登录）
    if (getToken()) {
      try {
        const u = store.getUser()
        if (u && u.mustChangePassword) {
          // 首登未改密：后端会拦业务接口，直接回登录页强制改密
          uni.reLaunch({ url: '/pages/login/login' })
          return
        }
        await store.loadAll()
        store.state.loggedIn = true
        store.state.wechatBound = !!(u && u.wechatBound)
      } catch (e) {
        console.warn('会话恢复失败，需重新登录', e)
      }
    }
  },
}
</script>

<style>
@import './styles/tokens.css';
@import './styles/base.css';
</style>
