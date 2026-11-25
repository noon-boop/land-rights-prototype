# 土地确权二轮延包线上确认系统 · 交互原型

纯前端高保真原型，**零后端依赖**，打开网页即可完整走通「农户填报 → 村级审核 → 乡镇复核组包 → 县级审批归档」四级流程。
业务页面与真实项目 `land_rights_system` 的 `pc-platform` 完全一致（46 页 / 89 个接口），只是把请求层换成本地 mock。

| 目录 | 端 | 技术栈 | 状态 |
|---|---|---|---|
| `pc/` | PC 端（村 / 镇 / 县 三端合一，角色驱动菜单） | Vue 3 + Vite + Vue Router + Pinia | ✅ 已完成并验证 |
| `farmer/` | 农户端（H5 / 微信小程序） | uni-app + Vue 3 | 🚧 mock 层已接，H5 构建待验证 |

---

## 一、演示账号

PC 端（`pc/`），密码统一 `123456`：

| 账号 | 角色 | 可见范围 | 演示看点 |
|---|---|---|---|
| `village_wang` | 村级 · 幸福村 | 本村 14 户 | 整村单已到「镇级已通过」，本村已锁定（两级锁演示） |
| `village_new` | 村级 · 新建村 | 本村 15 户 | 流程进行中：待审核 3 / 未通过 2 / 未申报 1，可实操审核 |
| `village_li` | 村级 · 和平村 | 本村 12 户 | 整村单已提交待镇审，锁定不可改户 |
| `town_wang` | 镇级 · 幸福镇 | 3 个村 | 上报单审批、组包（有村未完成时置灰） |
| `town_li` | 镇级 · 长胜镇 | 2 个村 | 上报包已提交县级待审 |
| `county_zhao` | 县级 · 幸福县 | 全县 2 镇 5 村 | 上报包审批 → 归档（GD-）全链路 |
| `admin` | 系统管理员 | 全部菜单 | 权限点最大的视角 |

农户端（`farmer/`）：身份证 `420123199003071234` / 密码 `123456`（户主张建国，幸福村二组，4 名成员 / 3 块地）。

**两种角色切换方式**：登录页直接换账号（推荐）；或地址栏加 `?mockReset=1` 重置全部演示数据，控制台执行 `__mockReset()` 同效。

---

## 二、数据与联动

- 数据规模：1 县 / 2 镇 / 5 村 / 62 户 / 200+ 地块，5 个村分别停在「未提交 / 待镇审 / 镇级已通过 / 已进上报包」不同阶段。
- **真正的跨页联动**：所有写操作（审核通过、退回、组包、审批、归档、销户、分割）都改同一份 localStorage 数据，因此「村级审核 → 镇级待审列表出现 → 组包 → 县级审批 → 归档」在同一浏览器里能连续走完，刷新不丢。
- 但**跨角色不共享数据**：mock 是浏览器本地的，甲电脑上村级提交的，乙电脑上的镇级看不到。演示多角色要同一个浏览器换账号登录。
- 矢量图斑是内存里临时生成的 WKT 多边形（`/gis/parcels/village/:code`），只画轮廓不接底图，用来演示配色/缩放/点选，不是真实坐标。
- Shapefile 上传、Excel 导出返回的是文件名 + 假成功，没有真文件。

---

## 三、本地运行

```bash
cd pc
npm install
npm run dev      # http://127.0.0.1:5180
npm run build    # 产物 dist/
```

## 四、切回真实后端

mock 开关只有一个：`pc/.env` 里的 `VITE_USE_MOCK`。

```ini
VITE_USE_MOCK=false
```

改完重启 dev server，请求就回到 `vite.config.js` 里代理的 `http://127.0.0.1:9000`（真实网关）。mock 代码在 `src/mock/`，业务代码与 `api/index.js` 的接口签名都没动过。

---

## 五、在线演示与部署

### 已上线（GitHub Pages）

**https://noon-boop.github.io/land-rights-prototype/**

- 源码在 `main` 分支的 `pc/` 目录
- 部署分支 `gh-pages` 存放构建产物（由 `pc/dist` 生成，含 `404.html` 与 `.nojekyll`）
- 更新方式：改完 `main` 的代码后重新构建，把 `dist` 推到 `gh-pages` 即可

### 另一种方式：Cloudflare Pages（可选）

国内网络访问 `dash.cloudflare.com` 常被 Turnstile 人机验证卡住（`challenges.cloudflare.com` 不通，验证框会一直转圈），需要代理才能进控制台。若能进，配置如下：

仓库是 monorepo（`pc/` + `farmer/`），创建项目时**必须设置 Root directory**：

| 配置项 | 值 |
|---|---|
| Framework preset | `Vue` （或 None，等价） |
| **Root directory** | `pc` |
| Build command | `npm run build` |
| Build output directory | `dist` |

要点说明：

- `vite.config.js` 里 `base` 在生产模式是 `'./'`，路由用 hash（`createWebHashHistory`），所以部署在根路径或任意子路径都能正常打开，不用配 404 重写。
- `.env` 已默认 `VITE_USE_MOCK=true` 并随仓库提交，无需在平台另配环境变量。
- Node 版本：仓库带 `pc/.nvmrc`（20）与 `package-lock.json`，本地已用 `npm ci` 在干净目录验证过构建可复现。

农户端（`farmer/`）若要单独部署：Root directory 填 `farmer`，Build command `npm run build:h5`，输出目录 `dist/build/h5`（未验证）。

---

## 六、目录结构（`pc/`）

```
pc/
├─ .env                    # VITE_USE_MOCK=true
├─ index.html
├─ vite.config.js          # base './'（生产）/ 端口 5180 / /api 代理到 9000
└─ src/
   ├─ api/
   │   ├─ request.js       # ★ 唯一请求出口：MOCK_ENABLED 分支
   │   └─ index.js         # 89 个业务接口
   ├─ mock/                # ★ 原型新增，真实项目没有这三个文件
   │   ├─ dataset.js       # 种子数据（县镇村户人地块 + 流程单据）
   │   ├─ store.js         # localStorage 持久化 + 登录会话
   │   ├─ handlers.js      # 按 method+path 分发，含状态机与校验
   │   └─ index.js         # mockFetch 入口
   ├─ menu.js              # 全量菜单 + 权限点（F-P/F-V/F-T/F-C）
   ├─ router/index.js
   ├─ store/auth.js
   ├─ components/          # ParcelMap（WKT 图斑 SVG 渲染）等
   ├─ layout/
   └─ views/               # 46 页：共用 10 / 村级 12 / 镇级 10 / 县级 14
```

---

## 七、与原项目的差异（仅这几处）

1. `src/api/request.js` — `http()` 开头加 mock 分支，`export const USE_MOCK`
2. `src/api/index.js` — `apiShapefileUploadPreview` 走 mock（原实现直接用 `fetch` + FormData，绕过请求层）
3. 新增 `src/mock/` 三个文件 + `pc/.env`
4. `vite.config.js` 端口 5174 → 5180（避免与原工程同时跑冲突）

业务视图、路由、菜单、权限、样式**一行未改**。

---

## 八、已知限制

- 跨角色数据不共享（浏览器本地 mock，见第二节）
- 上传 / 导出 / 下载模板是假成功，`public/templates/land-parcel-template.zip` 下载模板是真实文件
- 矢量图斑为程序生成的示意多边形，非真实坐标
- 农户端 H5 构建尚未验证

---

## 九、配色约定（别踩坑）

所有新增样式必须取自 `pc/src/styles/tokens.css`，**不要另造色值**：

| 用途 | 色值 | 令牌 |
|---|---|---|
| 主操作 / 角色徽标 | `#0e7a4f` | `--color-primary` |
| 浅绿底（徽标、hover） | `#e4f3ea` | `--color-primary-light` |
| 更浅绿底（面板） | `#f4faf6` | `--color-primary-lighter` |
| 深林绿（侧边栏、标题） | `#0a4a33` | `--color-navy` |
| 强调柔金 | `#c9a45c` | `--color-accent` |

**这套设计系统没有「角色主题色」。** 顶栏角色徽标 `.org-role`（`components/AppTopbar.vue`）对管理员、县级、镇级、村级用的是**同一个绿色**，角色差异只靠文字表达。登录页演示提示卡片里的账号徽标也遵守这条：四类角色统一绿色，不按角色分色。

另外，下面这些颜色在本系统里是**语义色，不能挪用**：

| 色值 | 语义 | 出现位置 |
|---|---|---|
| `#b26a00` / `#fff3e0` | 待审核、分割来源 | `.st-待审核`、`.src-分割` |
| `#c9302c` / `#fdeceb` | 未通过、退回 | `.st-bad`、`.st-I` |
| `#2b7a4b` / `#e8f5ed` | 已通过、已完成 | `.st-ok`、`.st-done`、`.st-G` |
| `#5e35b1` / `#ede7f6` | **已归档**、合户并入 | `.st-H`、`.src-合户并入` |

拿紫色标「管理员」、橙色标「镇级」这类做法会与状态语义冲突，不要这么做。
