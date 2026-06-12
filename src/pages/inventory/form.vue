<template>
  <view class="page formPage">
    <view class="container formContainer">
      <view class="formTopbar">
        <view>
          <view class="eyebrow">库存单据</view>
          <view class="title">登记出入库</view>
        </view>
        <view class="selectedBadge">已选 {{ selectedCount }}</view>
      </view>

      <view class="section-head">
        <view class="section-title">选择商品</view>
        <view class="section-meta">已选 {{ selectedCount }} 项 · 共 {{ products.length }} 个</view>
      </view>

      <view v-if="loading" class="card hintCard">正在加载商品…</view>
      <view v-else-if="!products.length" class="card hintCard">
        暂无可登记商品，请先在后台维护商品后再创建出入库单。
      </view>
      <view v-else class="productList">
        <view class="productScrollInner">
          <view v-for="p in products" :key="p.id" :class="['productRow', isSelected(p.id) ? 'productRow--on' : '']">
            <view class="productRowTop">
              <view class="productRowMain" @tap="toggleSelect(p.id)">
                <view :class="['check', isSelected(p.id) ? 'check--on' : '']">
                  <text v-if="isSelected(p.id)" class="checkMark">✓</text>
                </view>
                <view class="productText">
                  <view class="productName">{{ p.name || `商品 #${p.id}` }}</view>
                  <view class="productSub">{{ productMeta(p) }}</view>
                  <view class="productSub">¥{{ formatMoney(displayPrice(p)) }} · 默认单位 {{ p.unit || '-' }}</view>
                </view>
              </view>
              <view v-if="isSelected(p.id)" class="stepper" @tap.stop>
                <view class="stepBtn" @tap="decQty(p.id)">−</view>
                <view class="stepVal">{{ formatQty(selection[p.id]?.quantity) }} {{ selectedUnitLabel(p.id) }}</view>
                <view class="stepBtn" @tap="incQty(p.id)">+</view>
              </view>
            </view>
            <view v-if="isSelected(p.id)" class="unitPills">
              <view class="unitLabel">单位</view>
              <view
                v-for="u in selectedUnitOptions(p.id)"
                :key="u.value"
                :class="['unitPill', selection[p.id]?.unit === u.value ? 'unitPill--on' : '']"
                @tap="selectUnit(p.id, u)"
              >
                {{ u.label }}
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottomSpacer" />
      <view class="submitBar">
        <view class="submitMeta">
          <view class="submitCount">{{ selectedCount }} 项商品</view>
          <view class="submitHint">选择商品后填写单据信息并提交</view>
        </view>
        <view :class="['btn submitBtn', submitting ? 'btn--disabled' : '']" @tap="openSubmitSheet">{{ submitting ? '提交中…' : '提交单据' }}
        </view>
      </view>

      <view v-if="submitSheetOpen" class="submitMask" @tap="closeSubmitSheet">
        <view class="submitSheet" @tap.stop>
          <view class="sheetHandle" />
          <view class="sheetTitle">提交单据</view>
          <view class="sheetSub">请补全单据信息，以下均为必填项</view>

          <view class="sheetField">
            <view class="fieldLabel">出入库类型</view>
            <picker mode="selector" :range="typeOptions" range-key="label" :value="typeIndex" @change="onTypeChange">
              <view class="pickerRow">
                <text>{{ typeLabel }}</text>
                <text class="pickerArrow">›</text>
              </view>
            </picker>
          </view>

          <view class="sheetField">
            <view class="fieldLabel">原因</view>
            <view v-if="reasonDictLoading" class="reasonHint">正在加载原因选项...</view>
            <view v-else-if="!reasonOptions.length" class="reasonHint reasonHint--warn">
              未配置出入库原因字典，请联系管理员维护
            </view>
            <picker v-else mode="selector" :range="reasonOptions" range-key="label" :value="reasonIndex" @change="onReasonChange">
              <view class="pickerRow">
                <text>{{ reasonLabel }}</text>
                <text class="pickerArrow">›</text>
              </view>
            </picker>
          </view>

          <view class="sheetField">
            <view class="fieldLabel">整单备注</view>
            <textarea class="textarea" :value="remark" placeholder="必填，例如盘点修正、日常销售出库" @input="onRemark" />
          </view>

          <view class="sheetActions">
            <view class="btn btn--ghost sheetBtn" @tap="closeSubmitSheet">取消</view>
            <view :class="['btn', 'sheetBtn', submitting ? 'btn--disabled' : '']" @tap="submit">{{ submitting ? '提交中...' : '确认提交' }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, reactive, ref } from 'vue'
import {
  createInventoryOrder,
  listDictDataByTypeCode,
  listProductUnitSpecs,
  listStoreSupplierProducts
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './form.less'

const auth = useAuthStore()
const type = ref(1)
const reason = ref('')
const remark = ref('')
const reasonOptions = ref([])
const reasonDictLoading = ref(false)
const products = ref([])
const loading = ref(false)
const submitting = ref(false)
const submitSheetOpen = ref(false)
const typeOptions = [
  { label: '入库', value: 1 },
  { label: '出库', value: 2 }
]

/** 已选商品 id -> 数量与单位（步进器维护，最小为 1） */
const selection = reactive({})

const selectedCount = computed(() => Object.keys(selection).length)
const typeIndex = computed(() => {
  const i = typeOptions.findIndex((o) => o.value === type.value)
  return i >= 0 ? i : 0
})
const typeLabel = computed(() => typeOptions[typeIndex.value]?.label || '请选择')
const reasonIndex = computed(() => {
  const i = reasonOptions.value.findIndex((o) => o.value === reason.value)
  return i >= 0 ? i : 0
})
const reasonLabel = computed(() => reasonOptions.value[reasonIndex.value]?.label || '请选择原因')

function onRemark(e) {
  remark.value = String(e?.detail?.value || '')
}

function onTypeChange(e) {
  const idx = Number(e?.detail?.value || 0)
  type.value = typeOptions[idx]?.value || 1
}

function onReasonChange(e) {
  const idx = Number(e?.detail?.value || 0)
  reason.value = reasonOptions.value[idx]?.value || ''
}

function openSubmitSheet() {
  if (!selectedCount.value) {
    Taro.showToast({ title: '请先选择商品', icon: 'none' })
    return
  }
  submitSheetOpen.value = true
}

function closeSubmitSheet() {
  if (submitting.value) return
  submitSheetOpen.value = false
}

function isSelected(id) {
  return selection[id] != null
}

function toggleSelect(id) {
  if (selection[id]) {
    delete selection[id]
  } else {
    const p = products.value.find((x) => x.id === id)
    const fallback = String(p?.unit || '').trim() || '件'
    selection[id] = {
      quantity: 1,
      unit: fallback,
      unitLabel: fallback,
      unitOptions: [{ label: fallback, value: fallback }]
    }
    void loadUnitOptionsForProduct(id, fallback)
  }
}

function incQty(id) {
  const row = selection[id]
  if (!row) return
  row.quantity = roundQty(row.quantity + 1)
}

function decQty(id) {
  const row = selection[id]
  if (!row) return
  if (row.quantity <= 1) {
    delete selection[id]
  } else {
    row.quantity = roundQty(row.quantity - 1)
  }
}

function roundQty(n) {
  return Math.round(n * 100) / 100
}

function formatQty(n) {
  if (n == null || !Number.isFinite(n)) return '1'
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

function selectedUnitLabel(id) {
  return selection[id]?.unitLabel || selection[id]?.unit || '件'
}

function selectedUnitOptions(id) {
  return selection[id]?.unitOptions || []
}

function selectUnit(id, option) {
  const row = selection[id]
  if (!row) return
  row.unit = String(option?.value || '').trim()
  row.unitLabel = String(option?.label || option?.value || '').trim()
}

function formatMoney(v) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function displayPrice(p) {
  const cands = [Number(p.price || 0), Number(p.bottle_price || 0), Number(p.case_price || 0)]
  const valid = cands.find((v) => Number.isFinite(v) && v > 0)
  return valid || 0
}

function productMeta(p) {
  const supplierName = String(p?.supplier?.supplier_name || '').trim()
  const categoryName = String(p?.category?.name || '').trim()
  const spec = String(p?.spec || '').trim()
  return [supplierName, categoryName, spec].filter(Boolean).join(' · ') || `商品ID ${p.id}`
}

function mapReasonOptions(rows) {
  return rows
    .map((r) => ({
      label: String(r.label || r.value || '').trim() || String(r.value || ''),
      value: String(r.value || '').trim()
    }))
    .filter((o) => o.value)
}

function mapSpecUnits(specs) {
  return specs
    .filter((s) => s?.is_enabled !== false)
    .map((s) => {
      const unitCode = String(s?.unit_code || '').trim()
      const unitName = String(s?.unit_name || unitCode || '').trim()
      const factor = Number(s?.factor_to_base || 1)
      return {
        label: factor > 1 ? `${unitName} x${factor}` : unitName,
        value: unitCode || unitName,
        factor
      }
    })
    .filter((u) => u.value)
    .sort((a, b) => a.factor - b.factor)
}

async function loadUnitOptionsForProduct(productId, fallbackUnit) {
  if (!auth.token || !selection[productId]) return
  try {
    const specs = await listProductUnitSpecs(auth.token, productId)
    const units = mapSpecUnits(specs)
    if (units.length) {
      selection[productId].unitOptions = units
      const exists = units.some((u) => u.value === selection[productId].unit)
      if (!exists) {
        selection[productId].unit = units[0].value
        selection[productId].unitLabel = units[0].label
      } else {
        const selected = units.find((u) => u.value === selection[productId].unit)
        selection[productId].unitLabel = selected?.label || selection[productId].unit
      }
      return
    }
  } catch {
    // ignore and use fallback
  }
  selection[productId].unitOptions = [{ label: fallbackUnit, value: fallbackUnit }]
  selection[productId].unit = fallbackUnit
  selection[productId].unitLabel = fallbackUnit
}

async function loadReasonDict() {
  if (!auth.token) return
  reasonDictLoading.value = true
  try {
    const rows = await listDictDataByTypeCode(auth.token, 'inventory_reason')
    reasonOptions.value = mapReasonOptions(rows)
    const allowed = new Set(reasonOptions.value.map((o) => o.value))
    if (!reason.value || !allowed.has(reason.value)) {
      const def = rows.find((r) => r.is_default)
      reason.value = String(def?.value || rows[0]?.value || '').trim()
    }
  } catch (err) {
    reasonOptions.value = []
    Taro.showToast({ title: err?.message || '加载原因字典失败', icon: 'none' })
  } finally {
    reasonDictLoading.value = false
  }
}

async function loadAllProducts() {
  if (!auth.token) return
  loading.value = true
  try {
    const storeId = auth.storeId || 999
    products.value = await listStoreSupplierProducts(auth.token, {
      store_id: storeId
    })
  } catch (err) {
    Taro.showToast({ title: err?.message || '加载商品失败', icon: 'none' })
    products.value = []
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!auth.token) return
  const r = reason.value.trim()
  if (!r) {
    Taro.showToast({ title: '请选择原因', icon: 'none' })
    return
  }
  if (!remark.value.trim()) {
    Taro.showToast({ title: '请填写整单备注', icon: 'none' })
    return
  }
  const items = Object.entries(selection)
    .map(([pid, v]) => ({
      product_id: Number(pid),
      quantity: v.quantity,
      unit: String(v.unit || '').trim() || '件',
      remark: undefined
    }))
    .filter((it) => it.product_id > 0 && it.quantity > 0 && Boolean(it.unit))
  if (!items.length) {
    Taro.showToast({ title: '请至少选择一种商品', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const order = await createInventoryOrder(auth.token, {
      type: type.value,
      reason: r,
      remark: remark.value.trim(),
      items
    })
    Taro.showToast({ title: '已提交', icon: 'success' })
    setTimeout(() => {
      Taro.redirectTo({ url: `/pages/inventory/order-detail?id=${order.id}` })
    }, 400)
  } catch (err) {
    Taro.showToast({ title: err?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

useDidShow(() => {
  void Promise.all([loadReasonDict(), loadAllProducts()])
})
</script>
