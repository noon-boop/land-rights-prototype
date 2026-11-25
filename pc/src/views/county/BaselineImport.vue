<script setup>
import { ref, reactive, onMounted } from 'vue'
import { apiShapefileImports, apiShapefileUploadPreview, apiShapefileExecute, apiFieldMapping } from '@/api'

/**
 * F-C04 基线数据导入
 * 上传预览 → 字段映射 → 校验 → 执行导入
 * 校验：身份证唯一性 / 非空 / 格式；错误与警告分列，支持仅导入正确行
 * 导入完成后批量生成初始账号
 */
const list = ref([])
const loading = ref(false)
const err = ref('')
const msg = ref('')
const step = ref(1)
const preview = ref(null)
const curId = ref(null)
const mappings = ref([])
const fileInput = ref(null)

const REQUIRED = ['household_code', 'householder', 'id_card', 'contract_no']

/* ---------------- 导入模板 ---------------- */
const TEMPLATE_URL = `${import.meta.env.BASE_URL || '/'}templates/land-parcel-template.zip`

function downloadTemplate() {
  const a = document.createElement('a')
  a.href = TEMPLATE_URL
  a.download = 'land-parcel-template.zip'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  msg.value = '模板已开始下载：含 land_parcel.shp（空面图层）+ 四张关联表 + 填写说明'
}

/** 预览计数（后端 preview.counts.*） */
function cnt(k) {
  const c = (preview.value && preview.value.counts) || {}
  const v = c[k]
  return v === undefined || v === null ? '—' : v
}

const TARGET_FIELDS = [
  { k: 'household_code', label: '户编码' }, { k: 'householder', label: '户主姓名' },
  { k: 'id_card', label: '身份证号' }, { k: 'phone', label: '联系电话' },
  { k: 'address', label: '户籍地址' }, { k: 'contract_no', label: '合同编号' },
  { k: 'plot_count', label: '地块数' }, { k: 'contract_area', label: '合同面积' },
  { k: 'plot_code', label: '地块编码' }, { k: 'plot_name', label: '地块名称' },
]

async function load() {
  loading.value = true
  err.value = ''
  try {
    const d = await apiShapefileImports({ page: 1, pageSize: 30 })
    list.value = (d && (d.list || d.records)) || []
  } catch (e) { list.value = [] }
  finally { loading.value = false }
}
onMounted(load)

async function doUpload(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  err.value = ''
  msg.value = ''
  try {
    const r = await apiShapefileUploadPreview(f)
    preview.value = r
    curId.value = r && (r.importId || r.id)
    // 字段映射必须与目标字段一一对齐，后端未给 suggestedMappings 时补空行，
    // 否则模板里 mappings[i] 为 undefined 会抛渲染错误、整页停止刷新
    const sug = (r && r.suggestedMappings) || []
    const srcFields = (r && r.sourceFields) || []
    mappings.value = TARGET_FIELDS.map((t) => {
      const hit = sug.find((m) => m && m.target === t.k)
      let source = (hit && hit.source) || ''
      if (!source) {
        // 后端未给建议时，按目标字段名的常见写法做一次同名匹配
        const guess = srcFields.find((s) => s && String(s).toLowerCase() === t.k.toLowerCase())
        source = guess || ''
      }
      return { target: t.k, source }
    })
    step.value = 2
    msg.value = '文件已预览，请核对字段映射后执行导入'
    await load()
  } catch (ex) {
    err.value = ex.message || '上传失败'
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function saveMapping() {
  if (!curId.value) { err.value = '未取得导入批次ID'; return }
  const miss = REQUIRED.filter((k) => !mappings.value.some((m) => m.target === k && m.source))
  if (miss.length) {
    err.value = '以下必填字段尚未映射：' + miss.map((k) => (TARGET_FIELDS.find((t) => t.k === k) || {}).label || k).join('、')
    return
  }
  try {
    await apiFieldMapping(curId.value, { mappings: mappings.value })
    step.value = 3
    msg.value = '字段映射已保存'
  } catch (ex) { err.value = ex.message || '保存映射失败' }
}

async function execute() {
  if (!curId.value) return
  try {
    const r = await apiShapefileExecute(curId.value)
    msg.value = `导入完成：户 ${r && r.households || 0} / 成员 ${r && r.members || 0} / 地块 ${r && r.parcels || 0}`
    step.value = 1
    preview.value = null
    await load()
  } catch (ex) { err.value = ex.message || '导入失败' }
}
</script>

<template>
  <div class="bi">
    <div v-if="err" class="err">{{ err }}</div>
    <div v-if="msg" class="ok">{{ msg }}</div>

    <div class="steps">
      <div class="step" :class="{ on: step >= 1 }"><span class="n">1</span>上传预览</div>
      <div class="step" :class="{ on: step >= 2 }"><span class="n">2</span>字段映射</div>
      <div class="step" :class="{ on: step >= 3 }"><span class="n">3</span>校验与执行</div>
      <div class="step" :class="{ on: step >= 4 }"><span class="n">4</span>批量建号</div>
    </div>

    <div class="panel">
      <div class="pt-row">
        <div class="pt">① 上传 2007 成果文件</div>
        <button class="btn dl" @click="downloadTemplate">
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" stroke="currentColor" stroke-width="1.5"
                  stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          下载模板
        </button>
      </div>
      <div class="up">
        <label class="file-btn" :class="{ busy: loading }">
          <input
            ref="fileInput"
            type="file"
            class="file-native"
            accept=".shp,.zip,.xlsx,.xls,.dbf"
            @change="doUpload"
          />
          <svg viewBox="0 0 20 20" fill="none">
            <path d="M10 14V4m0 0L6 8m4-4l4 4" stroke="currentColor" stroke-width="1.6"
                  stroke-linecap="round" stroke-linejoin="round" />
            <path d="M3 13v2.5A1.5 1.5 0 004.5 17h11a1.5 1.5 0 001.5-1.5V13"
                  stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <span>选择文件</span>
        </label>
        <span class="hint">支持 Shapefile 包（.zip）、Excel；上传后先预览校验，不直接写库</span>
      </div>
      <div v-if="preview" class="pv">
        <div class="pv-row">
          <span>解析结果：户 <b>{{ cnt('households') }}</b> / 成员 <b>{{ cnt('members') }}</b> / 地块 <b>{{ cnt('parcels') }}</b> / 几何 <b>{{ cnt('geometries') }}</b> / 待建号 <b>{{ cnt('users') }}</b></span>
        </div>
        <div v-if="preview.sourceFields && preview.sourceFields.length" class="pv-row dim2">
          源字段 {{ preview.sourceFields.length }} 个：{{ preview.sourceFields.join('、') }}
        </div>
        <div v-if="preview.warnings && preview.warnings.length" class="pv-row warn">
          警告 {{ preview.warnings.length }} 条：{{ String(preview.warnings[0]) }}
        </div>
      </div>
    </div>

    <div v-if="step >= 2 && preview" class="panel" style="margin-top:14px">
      <div class="pt">② 字段映射</div>
      <table class="tbl">
        <thead><tr><th>目标字段</th><th>源字段</th></tr></thead>
        <tbody>
          <tr v-for="(t, i) in TARGET_FIELDS" :key="t.k">
            <td class="strong">{{ t.label }}<span v-if="REQUIRED.includes(t.k)" class="req">*</span></td>
            <td>
              <input v-model="mappings[i].source" :placeholder="'对应源列名'" />
            </td>
          </tr>
        </tbody>
      </table>
      <button class="btn primary" @click="saveMapping">保存映射并校验</button>
    </div>

    <div v-if="step >= 3 && preview" class="panel" style="margin-top:14px">
      <div class="pt">③ 校验结果</div>
      <div v-if="preview.errors && preview.errors.length" class="issues">
        <div class="it-title">错误（整行拒收）</div>
        <div v-for="(e, i) in preview.errors.slice(0, 20)" :key="i" class="issue err-line">
          第 {{ e.row }} 行：{{ e.message }}
        </div>
      </div>
      <div v-if="preview.warnings && preview.warnings.length" class="issues">
        <div class="it-title warn-t">警告（不影响导入）</div>
        <div v-for="(w, i) in preview.warnings.slice(0, 20)" :key="i" class="issue warn-line">
          第 {{ w.row }} 行：{{ w.message }}
        </div>
      </div>
      <button class="btn primary" @click="execute">执行导入（仅导入正确行）</button>
      <div class="tip">校验内容：身份证唯一性 / 非空 / 格式；档案数据不修改基线库，导入后落业务库并逐字段留痕。</div>
    </div>

    <div class="panel" style="margin-top:14px">
      <div class="pt">导入批次</div>
      <table class="tbl">
        <thead><tr><th>批次号</th><th>文件名</th><th class="num">行数</th><th>状态</th><th>导入时间</th></tr></thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td class="mono small">{{ r.batchNo || r.id }}</td>
            <td class="small">{{ r.fileName || '—' }}</td>
            <td class="num">{{ r.totalRows ?? '—' }}</td>
            <td><span class="st">{{ r.status || '—' }}</span></td>
            <td class="small dim">{{ r.createdAt || '—' }}</td>
          </tr>
          <tr v-if="!list.length && !loading"><td colspan="5" class="empty">暂无导入记录</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.bi { padding: 18px 20px; }
.err { background: #fdeceb; color: #c9302c; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.ok { background: #e8f5ed; color: #2b7a4b; font-size: 13px; border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; }
.steps { display: flex; gap: 8px; margin-bottom: 14px; }
.step { flex: 1; background: #f7f9fa; border-radius: 8px; padding: 11px; font-size: 12.5px; color: #8a97a5; }
.step.on { background: #e4f3ea; color: #0e7a4f; }
.step .n { display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: #c8d0d8; color: #fff; font-size: 11px; text-align: center; line-height: 18px; margin-right: 6px; }
.step.on .n { background: #0e7a4f; }
.panel { background: #fff; border-radius: 10px; padding: 18px 20px; }
.pt { font-size: 14px; font-weight: 600; color: #1b2733; margin-bottom: 12px; }
.pt-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pt-row .pt { margin-bottom: 12px; }
.btn.dl { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 12px; border-color: #0e7a4f; color: #0e7a4f; background: #f4faf6; }
.btn.dl:hover { background: #e4f3ea; }
.btn.dl svg { width: 14px; height: 14px; }
.up { display: flex; align-items: center; gap: 10px 12px; flex-wrap: wrap; }
.up .hint { flex-basis: 100%; margin-top: 2px; }
.file-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  background: linear-gradient(115deg, #0b5c3e, #1b9a67);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.5px;
  cursor: pointer;
  user-select: none;
  transition: 0.2s;
  box-shadow: 0 6px 14px rgba(11, 92, 62, 0.22);
  position: relative;
  overflow: hidden;
}
.file-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 20px rgba(11, 92, 62, 0.3); }
.file-btn:active { transform: translateY(0); }
.file-btn.busy { opacity: 0.65; pointer-events: none; cursor: not-allowed; }
.file-btn svg { width: 16px; height: 16px; flex: none; }
.file-native {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.hint { font-size: 11.5px; color: #9aa6b2; }
.pv { margin-top: 12px; font-size: 12.5px; color: #0e7a4f; background: #e4f3ea; border-radius: 7px; padding: 10px 12px; line-height: 1.9; }
.pv-row b { color: #0b5c3e; }
.pv-row.dim2 { color: #5a6875; font-size: 12px; word-break: break-all; }
.pv-row.warn { color: #b26a00; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 14px; }
.tbl th { text-align: left; padding: 10px; background: #f7f9fa; color: #5a6875; font-weight: 500; font-size: 12px; }
.tbl td { padding: 10px; border-top: 1px solid #f0f3f5; color: #3d4b5a; }
.tbl input { height: 30px; border: 1px solid #dfe4ea; border-radius: 6px; padding: 0 9px; font-size: 13px; width: 180px; outline: none; }
.num { text-align: right; }
.mono { font-family: monospace; }
.small { font-size: 12px; }
.dim { color: #9aa6b2; }
.strong { font-weight: 500; color: #1b2733; }
.req { color: #c9302c; margin-left: 3px; }
.issues { margin-bottom: 14px; }
.it-title { font-size: 12.5px; font-weight: 600; color: #c9302c; margin-bottom: 6px; }
.warn-t { color: #b26a00; }
.issue { font-size: 12px; line-height: 1.9; padding: 2px 0; }
.err-line { color: #c9302c; }
.warn-line { color: #b26a00; }
.tip { font-size: 11.5px; color: #9aa6b2; margin-top: 12px; line-height: 1.8; }
.st { font-size: 11.5px; border-radius: 4px; padding: 2px 8px; background: #e4f3ea; color: #0e7a4f; }
.empty { text-align: center; color: #9aa6b2; padding: 26px 0; }
.btn { height: 34px; padding: 0 15px; border: 1px solid #dfe4ea; background: #fff; border-radius: 7px; font-size: 13px; color: #5a6875; cursor: pointer; }
.btn.primary { background: #0e7a4f; border-color: #0e7a4f; color: #fff; }
</style>
