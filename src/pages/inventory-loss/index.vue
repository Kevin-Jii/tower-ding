<template>
  <view class="page lossPage">
    <view class="container lossContainer">
      <view class="reasonCard card">
        <view class="fieldLabel">业务类型</view>
        <picker mode="selector" :range="typeOptions" range-key="label" :value="typeIndex" @change="onTypeChange">
          <view class="typePicker">
            <text>{{ typeLabel }}</text>
            <text class="pickerArrow">›</text>
          </view>
        </picker>

        <view class="fieldLabel">原因说明</view>
        <picker mode="selector" :range="reasonOptions" range-key="label" :value="reasonIndex" @change="onReasonChange">
          <view :class="['reasonPicker', reason ? '' : 'reasonPicker--empty']">
            <text>{{ selectedReasonLabel || '请选择原因说明' }}</text>
            <text class="pickerArrow">›</text>
          </view>
        </picker>
      </view>

      <view v-if="formType === 'gift'" class="accountCard card">
        <view class="fieldLabel">绑定记账订单</view>
        <view class="searchRow">
          <input class="accountSearchInput" :value="accountKeyword" placeholder="输入订单号 / 会员手机号 / 姓名"
            @input="onAccountKeywordInput" @confirm="searchAccounts" />
          <view class="searchBtn" @tap="searchAccounts">搜索</view>
        </view>
        <picker mode="selector" :range="accountOptions" range-key="label" :value="accountIndex"
          @change="onAccountChange">
          <view :class="['accountPicker', selectedAccountID ? '' : 'accountPicker--empty']">
            <text>{{ selectedAccountLabel || '请选择要绑定的记账订单' }}</text>
            <text class="pickerArrow">›</text>
          </view>
        </picker>
        <view class="accountHint">赠送需要绑定对应的记账订单，并使用订单里的会员。</view>
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
            <view v-for="p in group.items" :key="p.id"
              :class="['productRow', isSelected(p.id) ? 'productRow--on' : '']">
              <view class="productRowTop">
                <view class="productRowMain" @tap="toggleSelect(p.id)">
                  <view :class="['check', isSelected(p.id) ? 'check--on' : '']">
                    <text v-if="isSelected(p.id)" class="checkMark">✓</text>
                  </view>
                  <view class="productText">
                    <view class="productName">{{ p.name || `商品 #${p.id}` }}</view>
                    <view class="productSub">{{ productMeta(p) }}</view>
                    <view class="productSub">默认单位 {{ p.unit || '-' }}</view>
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
                <view v-for="u in selectedUnitOptions(p.id)" :key="u.value"
                  :class="['unitPill', selection[p.id]?.unit === u.value ? 'unitPill--on' : '']"
                  @tap="selectUnit(p.id, u)">
                  {{ u.label }}
                </view>
              </view>
              <view v-if="isSelected(p.id)" class="remarkLine">
                <input class="remarkInput" :value="selection[p.id]?.remark || ''" placeholder="单品备注，可选"
                  @input="onLineRemarkInput(p.id, $event)" />
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="bottomSpacer" />
      <view class="submitBar">
        <view class="submitMeta">
          <view class="submitCount">{{ selectedCount }} 项商品</view>
          <view class="submitHint">{{ typeLabel }}将扣减库存</view>
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
  listDictDataByTypeCode,
  listProductUnitSpecs,
  listStoreAccounts,
  listStoreSupplierProducts,
  type DictData,
  type InventoryLossType,
  type ProductUnitSpec,
  type StoreAccount,
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
const reasonDict = ref<DictData[]>([])
const accounts = ref<StoreAccount[]>([])
const loading = ref(false)
const submitting = ref(false)
const formType = ref<InventoryLossType>('loss')
const reason = ref('')
const accountKeyword = ref('')
const selectedAccountID = ref(0)
const selection = reactive<Record<number, LossSelection>>({})

const typeOptions: Array<{ label: string; value: InventoryLossType }> = [
  { label: '报损', value: 'loss' },
  { label: '自用', value: 'self_use' },
  { label: '赠送', value: 'gift' }
]

const selectedCount = computed(() => Object.keys(selection).length)
const typeLabel = computed(() => typeOptions.find((item) => item.value === formType.value)?.label || '报损')
const typeIndex = computed(() => {
  const idx = typeOptions.findIndex((item) => item.value === formType.value)
  return idx >= 0 ? idx : 0
})
const reasonOptions = computed(() =>
  reasonDict.value
    .filter((item) => item.status !== 0)
    .map((item) => ({
      label: String(item.label || item.value || '').trim(),
      value: String(item.value || item.label || '').trim()
    }))
    .filter((item) => item.label && item.value)
)
const reasonIndex = computed(() => {
  const idx = reasonOptions.value.findIndex((item) => item.value === reason.value)
  return idx >= 0 ? idx : 0
})
const selectedReasonLabel = computed(() => reasonOptions.value.find((item) => item.value === reason.value)?.label || '')
const accountOptions = computed(() =>
  accounts.value.map((item) => ({
    label: accountLabel(item),
    value: Number(item.id || 0)
  }))
)
const accountIndex = computed(() => {
  const idx = accountOptions.value.findIndex((item) => item.value === selectedAccountID.value)
  return idx >= 0 ? idx : 0
})
const selectedAccount = computed(() => accounts.value.find((item) => Number(item.id || 0) === selectedAccountID.value) || null)
const selectedAccountLabel = computed(() => selectedAccount.value ? accountLabel(selectedAccount.value) : '')
const groupedProducts = computed(() => {
  const map = new Map<string, SupplierProduct[]>()
  products.value.forEach((p) => {
    const name = productCategoryName(p)
    if (!map.has(name)) map.set(name, [])
    map.get(name)!.push(p)
  })
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }))
})

function onTypeChange(e: any) {
  const idx = Number(e?.detail?.value || 0)
  const nextType = typeOptions[idx]?.value || 'loss'
  if (nextType === formType.value) return
  formType.value = nextType
  resetFormData()
}

function onReasonChange(e: any) {
  const idx = Number(e?.detail?.value || 0)
  reason.value = reasonOptions.value[idx]?.value || ''
}

function onAccountKeywordInput(e: any) {
  accountKeyword.value = String(e?.detail?.value || '')
}

function onAccountChange(e: any) {
  const idx = Number(e?.detail?.value || 0)
  selectedAccountID.value = accountOptions.value[idx]?.value || 0
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

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function formatDate(v?: string) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

function accountLabel(item: StoreAccount) {
  const no = String(item.account_no || item.order_no || `记账 #${item.id}`).trim()
  const member = accountMemberLabel(item)
  const amount = formatMoney(item.gross_total_amount ?? item.total_amount ?? item.income_amount ?? item.amount)
  const date = formatDate(item.account_date || item.created_at)
  return `${no} · ${member} · ¥${amount} · ${date}`
}

function accountMemberLabel(item: StoreAccount) {
  const memberName = String(item.member?.name || '').trim()
  const memberPhone = String(item.member?.phone || '').trim()
  if (memberName && memberPhone) return `${memberName}/${memberPhone}`
  return memberName || memberPhone || '散客'
}

function resetFormData() {
  reason.value = ''
  accountKeyword.value = ''
  selectedAccountID.value = 0
  Object.keys(selection).forEach((key) => {
    delete selection[Number(key)]
  })
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
      return {
        label: [unitName, factor > 1 ? `扣${formatQty(factor)}` : '']
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

async function loadReasonOptions() {
  if (!auth.token) return
  try {
    reasonDict.value = await listDictDataByTypeCode(auth.token, 'EXPENDITURECLASS')
    if (!reason.value && reasonOptions.value.length === 1) {
      reason.value = reasonOptions.value[0].value
    }
  } catch (err: any) {
    reasonDict.value = []
    Taro.showToast({ title: err?.message || '加载原因分类失败', icon: 'none' })
  }
}

async function loadAccounts(keyword = '') {
  if (!auth.token) return
  try {
    const kw = String(keyword || '').trim()
    const baseParams: Parameters<typeof listStoreAccounts>[1] = {
      store_id: auth.storeId || undefined,
      page: 1,
      page_size: 50
    }
    let rows: StoreAccount[]
    if (kw) {
      rows = await listStoreAccounts(auth.token, { ...baseParams, order_no: kw })
      if (!rows.length) {
        rows = await listStoreAccounts(auth.token, { ...baseParams, member_keyword: kw })
      }
    } else {
      rows = await listStoreAccounts(auth.token, baseParams)
    }
    accounts.value = rows
    if (selectedAccountID.value && !rows.some((item) => Number(item.id || 0) === selectedAccountID.value)) {
      selectedAccountID.value = 0
    }
  } catch (err: any) {
    accounts.value = []
    selectedAccountID.value = 0
    Taro.showToast({ title: err?.message || '加载记账订单失败', icon: 'none' })
  }
}

function searchAccounts() {
  void loadAccounts(accountKeyword.value)
}

async function submit() {
  if (!auth.token || submitting.value) return
  if (formType.value === 'gift' && !selectedAccountID.value) {
    Taro.showToast({ title: '请选择绑定的记账订单', icon: 'none' })
    return
  }
  if (formType.value === 'gift' && !Number(selectedAccount.value?.member_id || 0)) {
    Taro.showToast({ title: '赠送单需绑定有会员的记账订单', icon: 'none' })
    return
  }
  const r = reason.value.trim()
  if (!r) {
    Taro.showToast({ title: '请选择原因说明', icon: 'none' })
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
      account_id: formType.value === 'gift' ? selectedAccountID.value : undefined,
      type: formType.value,
      member_id: formType.value === 'gift' ? Number(selectedAccount.value?.member_id || 0) || undefined : undefined,
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
  void loadReasonOptions()
  void loadAccounts(accountKeyword.value)
})
</script>
