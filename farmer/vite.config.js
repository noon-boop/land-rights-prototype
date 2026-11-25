import { defineConfig } from 'vite'
import uniModule from '@dcloudio/vite-plugin-uni'

// CJS 插件经 ESM import 后函数在 .default 上（Node 24 + npm 11 实测）
const uni = typeof uniModule === 'function' ? uniModule : uniModule.default

export default defineConfig({
  plugins: [uni()],
})
