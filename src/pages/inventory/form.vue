<template>
  <view class="page">
    <view class="container">
      <view class="card">
        <view class="fieldLabel">类型</view>
        <view class="seg">
          <view :class="['segItem', type === 1 ? 'segItem--on' : '']" @tap="type = 1">入库</view>
          <view :class="['segItem', type === 2 ? 'segItem--on' : '']" @tap="type = 2">出库</view>
        </view>
        <view class="fieldLabel mt">原因</view>
        <view v-if="reasonDictLoading" class="reasonHint">正在加载原因选项…</view>
        <view v-else-if="!reasonOptions.length" class="reasonHint reasonHint--warn">
          未配置「出入库原因」字典，请联系管理员维护 dict：inventory_reason
        </view>
        <view v-else class="chips">
          <view v-for="o in reasonOptions" :key="o.value" :class="['chip', reason === o.value ? 'chip--on' : '']"
            @tap="reason = o.value">
            {{ o.label }}
          </view>
        </view>
        <view class="fieldLabel mt">整单备注</view>
        <textarea class="textarea" :value="remark" placeholder="选填" @input="onRemark" />
      </view>

      <view class="section-head">
        <view class="section-title">选择商品</view>
        <view class="section-meta">已选 {{ selectedCount }} 项 · 共 {{ products.length }} 个</view>
      </view>

      <view v-if="loading" class="card hintCard">正在加载商品…</view>
      <view v-else-if="!products.length" class="card hintCard">
        暂无商品，请先在「库存 → 供应商绑定」中绑定供应商并维护商品。
      </view>
      <scroll-view v-else scroll-y class="productScroll" :show-scrollbar="true">
        <view class="productScrollInner">
          <view v-for="p in products" :key="p.id" :class="['productRow', isSelected(p.id) ? 'productRow--on' : '']">
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
          <view v-if="isSelected(p.id)" class="unitPills">
            <view
              v-for="u in selectedUnitOptions(p.id)"
              :key="u"
              :class="['unitPill', selectedUnitLabel(p.id) === u ? 'unitPill--on' : '']"
              @tap="selectUnit(p.id, u)"
            >
              {{ u }}
            </view>
          </view>
        </view>
        </view>
      </scroll-view>

      <view class="btnRow">
        <view :class="['btn', submitting ? 'btn--disabled' : '']" @tap="submit">{{ submitting ? '提交中…' : '提交单据' }}
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

/** 已选商品 id -> 数量与单位（步进器维护，最小为 1） */
const selection = reactive({})

const selectedCount = computed(() => Object.keys(selection).length)

function onRemark(e) {
  remark.value = String(e?.detail?.value || '')
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
    selection[id] = { quantity: 1, unit: fallback, unitOptions: [fallback] }
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
  return selection[id]?.unit || '件'
}

function selectedUnitOptions(id) {
  return selection[id]?.unitOptions || []
}

function selectUnit(id, unit) {
  const row = selection[id]
  if (!row) return
  row.unit = unit
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
    .map((s) => String(s.unit_name || s.unit_code || '').trim())
    .filter((u) => u)
}

async function loadUnitOptionsForProduct(productId, fallbackUnit) {
  if (!auth.token || !selection[productId]) return
  try {
    const specs = await listProductUnitSpecs(auth.token, productId)
    const units = mapSpecUnits(specs)
    if (units.length) {
      selection[productId].unitOptions = units
      if (!units.includes(selection[productId].unit)) selection[productId].unit = units[0]
      return
    }
  } catch {
    // ignore and use fallback
  }
  selection[productId].unitOptions = [fallbackUnit]
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
    products.value = await listStoreSupplierProducts(auth.token, {
      store_id: auth.storeId || undefined
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
      remark: remark.value.trim() || undefined,
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
