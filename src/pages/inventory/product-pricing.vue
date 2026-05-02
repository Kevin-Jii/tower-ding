<template>
  <view class="page">
    <view class="container">
      <view class="toolbar">
        <input class="input kwInput" :value="keyword" placeholder="搜索商品名" @input="onKwInput" />
      </view>

      <view class="list">
        <view v-if="loading" class="card empty">加载中…</view>
        <view v-else-if="!filteredRows.length" class="card empty">暂无商品</view>
        <product-unit-card v-for="row in filteredRows" :key="row.id" :row="row" :draft="ensureDraft(row.id)"
          :unit-options="unitOptions" :big-options="bigUnitOptions(row.id)" :base-index="baseIndex(row.id)"
          :big-index="bigIndex(row.id)" :saving="savingId === row.id"
          :on-toggle-big="(enabled) => toggleBig(row.id, enabled)"
          :on-select-base="(idx) => onSelectUnit(row.id, 'base', idx)"
          :on-select-big="(idx) => onSelectUnit(row.id, 'big', idx)"
          :on-base-number="(key, value) => onUnitNum(row.id, 'base', key, value)"
          :on-big-number="(key, value) => onUnitNum(row.id, 'big', key, value)"
          :on-base-precision="(value) => onPrecision(row.id, 'base', value)"
          :on-big-precision="(value) => onPrecision(row.id, 'big', value)" :on-save="() => saveRow(row.id)" />
      </view>
    </view>
  </view>
</template>

<script setup>
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, reactive, ref } from 'vue'
import {
  batchUpsertProductUnitSpecs,
  listProductUnitSpecs,
  listStoreSupplierProducts
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import ProductUnitCard from './product-pricing/components/product-unit-card.vue'
import { useUnitDict } from './product-pricing/use-unit-dict'
import './product-pricing.less'

const auth = useAuthStore()
const loading = ref(false)
const savingId = ref(0)
const keyword = ref('')
const rows = ref([])
const draftMap = reactive({})
const { unitOptions, loadUnitOptions } = useUnitDict()

const filteredRows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return rows.value
  return rows.value.filter((r) => String(r.name || '').toLowerCase().includes(kw))
})

function onKwInput(e) {
  keyword.value = String(e?.detail?.value || '')
}

function parseNum(v) {
  const n = Number(String(v || '').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

function normalizePrecision(n) {
  return Math.max(0, Math.min(6, Math.floor(Number.isFinite(n) ? n : 0)))
}

function defaultUnitRow() {
  return {
    unit_code: '',
    unit_name: '',
    factor_to_base: 1,
    precision: 0,
    cost_price: 0,
    sale_price: 0,
    is_enabled: true
  }
}

function createProductDraft() {
  return {
    base: defaultUnitRow(),
    big_enabled: false,
    big: { ...defaultUnitRow(), factor_to_base: 2 }
  }
}

function ensureDraft(productId) {
  if (!draftMap[productId]) draftMap[productId] = createProductDraft()
  return draftMap[productId]
}

function baseIndex(productId) {
  const code = ensureDraft(productId).base.unit_code
  const idx = unitOptions.value.findIndex((o) => o.value === code)
  return idx >= 0 ? idx : 0
}

function bigUnitOptions(productId) {
  const baseCode = ensureDraft(productId).base.unit_code
  return unitOptions.value.filter((o) => o.value !== baseCode)
}

function bigIndex(productId) {
  const code = ensureDraft(productId).big.unit_code
  const options = bigUnitOptions(productId)
  const idx = options.findIndex((o) => o.value === code)
  return idx >= 0 ? idx : 0
}

function onSelectUnit(productId, part, idx) {
  const draft = ensureDraft(productId)
  const list = part === 'big' ? bigUnitOptions(productId) : unitOptions.value
  if (!list.length) return
  const selected = list[Math.max(0, Math.min(list.length - 1, idx))]
  if (!selected) return
  draft[part].unit_code = selected.value
  draft[part].unit_name = selected.label
  if (part === 'base' && draft.big.unit_code === selected.value) {
    draft.big.unit_code = ''
    draft.big.unit_name = ''
  }
}

function onUnitNum(
  productId,
  part,
  key,
  rawValue
) {
  const draft = ensureDraft(productId)
  const val = parseNum(rawValue)
  if (key === 'cost_price' || key === 'sale_price') {
    draft[part][key] = Math.max(0, val)
    return
  }
  draft[part][key] = val
}

function onPrecision(productId, part, rawValue) {
  ensureDraft(productId)[part].precision = normalizePrecision(parseNum(rawValue))
}

function toggleBig(productId, enabled) {
  const draft = ensureDraft(productId)
  draft.big_enabled = enabled
  draft.big.is_enabled = enabled
}

function normalizeSpec(spec) {
  return {
    unit_code: String(spec?.unit_code || '').trim(),
    unit_name: String(spec?.unit_name || '').trim(),
    factor_to_base: Number(spec?.factor_to_base || 1),
    precision: normalizePrecision(Number(spec?.precision || 0)),
    cost_price: Number(spec?.cost_price || 0),
    sale_price: Number(spec?.sale_price || 0),
    is_enabled: spec?.is_enabled !== false
  }
}

async function loadOneDraft(productId) {
  if (!auth.token) return
  const specs = await listProductUnitSpecs(auth.token, productId)
  const d = createProductDraft()
  const base = specs.find((s) => Number(s.factor_to_base || 0) <= 1.000001)
  const bigList = specs.filter((s) => Number(s.factor_to_base || 0) > 1.000001)

  if (base) d.base = { ...normalizeSpec(base), factor_to_base: 1 }
  else if (specs[0]) d.base = { ...normalizeSpec(specs[0]), factor_to_base: 1 }

  if (bigList.length) {
    d.big_enabled = true
    d.big = normalizeSpec(bigList[0])
  }
  if (bigList.length > 1) {
    d.warn = `检测到 ${bigList.length} 个大规格，保存后将只保留一个。`
  }

  if (!d.base.unit_name && d.base.unit_code) {
    const m = unitOptions.value.find((it) => it.value === d.base.unit_code)
    if (m) d.base.unit_name = m.label
  }
  if (!d.big.unit_name && d.big.unit_code) {
    const m = unitOptions.value.find((it) => it.value === d.big.unit_code)
    if (m) d.big.unit_name = m.label
  }

  draftMap[productId] = d
}

async function loadRows() {
  if (!auth.token) return
  loading.value = true
  try {
    const storeId = auth.storeId || 999
    await loadUnitOptions(auth.token)
    rows.value = await listStoreSupplierProducts(auth.token, {
      store_id: storeId
    })
    rows.value.forEach((p) => {
      ensureDraft(p.id)
    })
    await Promise.all(
      rows.value.map(async (p) => {
        try {
          await loadOneDraft(p.id)
        } catch {
          draftMap[p.id] = createProductDraft()
        }
      })
    )
  } catch (err) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
    rows.value = []
  } finally {
    loading.value = false
  }
}

function validateDraft(productId) {
  const d = draftMap[productId]
  if (!d) return '未找到商品配置'

  const base = d.base
  if (!base.unit_code) return '基础单位不能为空'
  if (!base.unit_name) return '基础单位名称缺失'
  if (normalizePrecision(base.precision) !== Number(base.precision)) return '基础单位精度必须在 0~6'
  if (Number(base.cost_price) < 0 || Number(base.sale_price) < 0) return '基础单位价格不能小于 0'

  if (!d.big_enabled) return ''

  const big = d.big
  if (!big.unit_code) return '已开启大规格，请选择大规格单位'
  if (!big.unit_name) return '大规格单位名称缺失'
  if (big.unit_code === base.unit_code) return '基础单位和大规格单位不能相同'
  if (!(Number(big.factor_to_base) > 1)) return '大规格 factor_to_base 必须大于 1'
  if (normalizePrecision(big.precision) !== Number(big.precision)) return '大规格精度必须在 0~6'
  if (Number(big.cost_price) < 0 || Number(big.sale_price) < 0) return '大规格价格不能小于 0'

  return ''
}

async function saveRow(productId) {
  if (!auth.token || savingId.value) return
  const d = draftMap[productId]
  if (!d) return

  d.base.factor_to_base = 1
  d.base.precision = normalizePrecision(d.base.precision)
  d.big.precision = normalizePrecision(d.big.precision)

  const errText = validateDraft(productId)
  if (errText) {
    Taro.showToast({ title: errText, icon: 'none' })
    return
  }

  const units = [
    {
      unit_code: d.base.unit_code,
      unit_name: d.base.unit_name,
      factor_to_base: 1,
      precision: normalizePrecision(d.base.precision),
      cost_price: Number(d.base.cost_price || 0),
      sale_price: Number(d.base.sale_price || 0),
      is_enabled: true
    }
  ]

  if (d.big_enabled) {
    units.push({
      unit_code: d.big.unit_code,
      unit_name: d.big.unit_name,
      factor_to_base: Number(d.big.factor_to_base || 0),
      precision: normalizePrecision(d.big.precision),
      cost_price: Number(d.big.cost_price || 0),
      sale_price: Number(d.big.sale_price || 0),
      is_enabled: true
    })
  }

  savingId.value = productId
  try {
    await batchUpsertProductUnitSpecs(auth.token, { product_id: productId, units })
    await loadOneDraft(productId)
    Taro.showToast({ title: '保存成功', icon: 'success' })
  } catch (err) {
    Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    savingId.value = 0
  }
}

useDidShow(() => {
  void loadRows()
})
</script>
