<template>
  <view class="page lossPage">
    <view class="container lossContainer">
      <view class="typeSwitch card">
        <view
          v-for="item in typeOptions"
          :key="item.value"
          :class="['typeOption', formType === item.value ? 'typeOption--on' : '']"
          @tap="selectType(item.value)"
        >
          {{ item.label }}
        </view>
      </view>

      <view class="reasonCard card">
        <view class="fieldLabel">原因说明</view>
        <input class="reasonInput" :value="reason" :placeholder="reasonPlaceholder" @input="onReasonInput" />
      </view>

      <view class="section-head">
        <view class="section-title">选择商品</view>
        <view class="section-meta">已选 {{ selectedCount }} 项 · 共 {{ products.length }} 个</view>
      </view>

      <view v-if="loading" class="card hintCard">正在加载商品…</view>
      <view v-else-if="!products.length" class="card hintCard">暂无可操作商品，请先维护门店商品。</view>
      <view v-else class="productList">
        <view class="productScrollInner">
          <view v-for="group in groupedProducts" :key="group.name" class="categoryGroup">
            <view class="categoryHead">
              <view class="categoryName">{{ group.name }}</view>
              <view class="categoryCount">{{ group.items.length }} 个</view>
            </view>
            <view v-for="p in group.items" :key="p.id" :class="['productRow', isSelected(p.id) ? 'productRow--on' : '']">
              <view class="productRowTop">
                <view class="productRowMain" @tap="toggleSelect(p.id)">
                  <view :class="['check', isSelected(p.id) ? 'check--on' : '']">
                    <text v-if="isSelected(p.id)" class="checkMark">✓</text>
                  </view>
                  <view class="productText">
                    <view class="productName">{{ p.name || `商品 #${p.id}` }}</view>
                    <view class="productSub">{{ productMeta(p) }}</view>
                    <view class="productSub">成本 ¥{{ formatMoney(displayCost(p)) }} · 默认单位 {{ p.unit || '-' }}</view>
                  </view>
                </view>
                <view v-if="isSelected(p.id)" class="stepper" @tap.stop>
                  <view class="stepBtn" @tap="decQty(p.id)">−</view>
                  <view class="stepVal">{{ formatQty(selection[p.id]?.quantity) }} {{ selectedUnitLabel(p.id) }}</view>
                  <view class="stepBtn" @tap="incQty(p.id)">+</view>
                </view>
              </view>
              <view v-if="isSelected(p.id)" class="unitPills">
                <view class="unitLabel">规格</view>
                <view
                  v-for="u in selectedUnitOptions(p.id)"
                  :key="u.value"
                  :class="['unitPill', selection[p.id]?.unit === u.value ? 'unitPill--on' : '']"
                  @tap="selectUnit(p.id, u)"
                >
                  {{ u.label }}
                </view>
              </view>
              <view v-if="isSelected(p.id)" class="remarkLine">
                <input
                  class="remarkInput"
                  :value="selection[p.id]?.remark || ''"
                  placeholder="单品备注，可选"
                  @input="onLineRemarkInput(p.id, $event)"
                />
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottomSpacer" />
      <view class="submitBar">
        <view class="submitMeta">
          <view class="submitCount">{{ selectedCount }} 项商品</view>
          <view class="submitHint">{{ typeLabel }}只扣库存并计入成本</view>
        </view>
        <view :class="['btn submitBtn', submitting ? 'btn--disabled' : '']" @tap="submit">
          {{ submitting ? '提交中…' : `提交${typeLabel}` }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, reactive, ref } from 'vue'
import {
  createInventoryLossOrder,
  listProductUnitSpecs,
  listStoreSupplierProducts,
  type InventoryLossType,
  type ProductUnitSpec,
  type SupplierProduct
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './index.less'

type LossSelection = {
  quantity: number
  unit: string
  unitLabel: string
  unitOptions: Array<{ label: string; value: string }>
  remark: string
}

const auth = useAuthStore()
const products = ref<SupplierProduct[]>([])
const loading = ref(false)
const submitting = ref(false)
const formType = ref<Exclude<InventoryLossType, 'gift'>>('loss')
const reason = ref('')
const selection = reactive<Record<number, LossSelection>>({})

const typeOptions: Array<{ label: string; value: Exclude<InventoryLossType, 'gift'> }> = [
  { label: '报损', value: 'loss' },
  { label: '自用', value: 'self_use' }
]

const selectedCount = computed(() => Object.keys(selection).length)
const typeLabel = computed(() => typeOptions.find((item) => item.value === formType.value)?.label || '报损')
const reasonPlaceholder = computed(() => formType.value === 'loss' ? '例如：破损、过期、漏液' : '例如：内部招待、员工自用')
const groupedProducts = computed(() => {
  const map = new Map<string, SupplierProduct[]>()
  products.value.forEach((p) => {
    const name = productCategoryName(p)
    if (!map.has(name)) map.set(name, [])
    map.get(name)!.push(p)
  })
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
})

function selectType(value: Exclude<InventoryLossType, 'gift'>) {
  formType.value = value
}

function onReasonInput(e: any) {
  reason.value = String(e?.detail?.value || '')
}

function onLineRemarkInput(id: number, e: any) {
  if (!selection[id]) return
  selection[id].remark = String(e?.detail?.value || '')
}

function productCategoryName(p: SupplierProduct) {
  return String(
    p?.category?.name ||
    p?.category_name ||
    p?.product?.category?.name ||
    p?.product?.category_name ||
    ''
  ).trim() || '未分类商品'
}

function productMeta(p: SupplierProduct) {
  const supplierName = String((p as any)?.supplier?.supplier_name || '').trim()
  const categoryName = productCategoryName(p)
  const spec = String(p?.spec || '').trim()
  return [supplierName, categoryName, spec].filter(Boolean).join(' · ') || `商品ID ${p.id}`
}

function displayCost(p: SupplierProduct) {
  const cands = [Number(p.bottle_price || 0), Number(p.price || 0), Number(p.case_price || 0)]
  return cands.find((v) => Number.isFinite(v) && v > 0) || 0
}

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function formatQty(n: any) {
  const v = Number(n || 0)
  if (!Number.isFinite(v) || v <= 0) return '1'
  return Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '')
}

function isSelected(id: number) {
  return selection[id] != null
}

function toggleSelect(id: number) {
  if (selection[id]) {
    delete selection[id]
    return
  }
  const p = products.value.find((x) => x.id === id)
  const fallback = String(p?.unit || '').trim() || '件'
  selection[id] = {
    quantity: 1,
    unit: fallback,
    unitLabel: fallback,
    unitOptions: [{ label: fallback, value: fallback }],
    remark: ''
  }
  void loadUnitOptionsForProduct(id, fallback)
}

function incQty(id: number) {
  const row = selection[id]
  if (!row) return
  row.quantity = roundQty(row.quantity + 1)
}

function decQty(id: number) {
  const row = selection[id]
  if (!row) return
  if (row.quantity <= 1) {
    delete selection[id]
  } else {
    row.quantity = roundQty(row.quantity - 1)
  }
}

function roundQty(n: number) {
  return Math.round(n * 100) / 100
}

function selectedUnitLabel(id: number) {
  return selection[id]?.unitLabel || selection[id]?.unit || '件'
}

function selectedUnitOptions(id: number) {
  return selection[id]?.unitOptions || []
}

function selectUnit(id: number, option: { label?: string; value?: string }) {
  const row = selection[id]
  if (!row) return
  row.unit = String(option?.value || '').trim()
  row.unitLabel = String(option?.label || option?.value || '').trim()
}

function mapSpecUnits(specs: ProductUnitSpec[]) {
  return specs
    .filter((s) => s?.is_enabled !== false)
    .map((s) => {
      const unitCode = String(s?.unit_code || '').trim()
      const unitName = String(s?.unit_name || unitCode || '').trim()
      const factor = Number(s?.factor_to_base || 1)
      const cost = Number(s?.cost_price || 0)
      return {
        label: [unitName, factor > 1 ? `扣${formatQty(factor)}` : '', cost > 0 ? `成本${formatMoney(cost)}` : '']
          .filter(Boolean)
          .join(' / '),
        value: unitName || unitCode
      }
    })
    .filter((u) => u.value)
}

async function loadUnitOptionsForProduct(productId: number, fallbackUnit: string) {
  if (!auth.token || !selection[productId]) return
  try {
    const specs = await listProductUnitSpecs(auth.token, productId)
    const units = mapSpecUnits(specs)
    if (units.length) {
      selection[productId].unitOptions = units
      selection[productId].unit = units[0].value
      selection[productId].unitLabel = units[0].label
      return
    }
  } catch {
    // use fallback
  }
  selection[productId].unitOptions = [{ label: fallbackUnit, value: fallbackUnit }]
  selection[productId].unit = fallbackUnit
  selection[productId].unitLabel = fallbackUnit
}

async function loadProducts() {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  loading.value = true
  try {
    products.value = await listStoreSupplierProducts(auth.token, {
      store_id: auth.storeId || undefined
    })
  } catch (err: any) {
    products.value = []
    Taro.showToast({ title: err?.message || '加载商品失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!auth.token || submitting.value) return
  const r = reason.value.trim()
  if (!r) {
    Taro.showToast({ title: '请填写原因说明', icon: 'none' })
    return
  }
  const items = Object.entries(selection)
    .map(([pid, row]) => ({
      product_id: Number(pid),
      unit: String(row.unit || '').trim(),
      quantity: Number(row.quantity || 0),
      remark: String(row.remark || '').trim() || undefined
    }))
    .filter((item) => item.product_id > 0 && item.unit && item.quantity > 0)
  if (!items.length) {
    Taro.showToast({ title: '请先选择商品', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await createInventoryLossOrder(auth.token, {
      store_id: auth.storeId || undefined,
      type: formType.value,
      reason: r,
      items
    })
    Taro.showToast({ title: '已提交', icon: 'success' })
    setTimeout(() => {
      Taro.navigateBack().catch(() => Taro.redirectTo({ url: '/pages/home/index' }))
    }, 400)
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

useDidShow(() => {
  void loadProducts()
})
</script>
