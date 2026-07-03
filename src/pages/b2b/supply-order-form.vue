<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">B2B模块</view>
      <view class="title">新增供货单</view>

      <view class="card createCard">
        <view class="formTitle">供货信息</view>
        <picker mode="selector" :range="customerOptions" range-key="label" :value="customerIndex" @change="onCustomerChange">
          <view class="pickerFake">{{ selectedCustomerLabel }} <text>›</text></view>
        </picker>

        <view class="lineSection">
          <view class="lineSectionHead">
            <view class="lineSectionTitle">商品明细</view>
            <view class="lineAddBtn" @tap="addLine">+ 添加商品</view>
          </view>
          <view v-if="customerId && !visiblePrices.length" class="lineHint">该客户暂无可用供货价</view>
          <view v-for="(line, idx) in lines" :key="idx" class="orderLine">
            <view class="orderLineHead">
              <view class="orderLineTitle">商品 {{ idx + 1 }}</view>
              <view v-if="lines.length > 1" class="orderLineRemove" @tap="removeLine(idx)">删除</view>
            </view>
            <picker mode="selector" :range="priceOptions" range-key="label" :value="linePriceIndex(line)" @change="onLinePriceChange(idx, $event)">
              <view class="pickerFake">{{ linePriceLabel(line) }} <text>›</text></view>
            </picker>
            <view v-if="selectedLinePrice(line)" class="readonlyPrice">
              <view>
                <view class="readonlyLabel">供货价</view>
                <view class="readonlyValue">¥{{ formatMoney(selectedLinePrice(line)?.supply_price) }}</view>
              </view>
              <view>
                <view class="readonlyLabel">起订数量</view>
                <view class="readonlyValue">{{ selectedLinePrice(line)?.min_quantity ?? 1 }}</view>
              </view>
            </view>
            <input class="input mt" type="digit" :value="line.quantity" placeholder="数量" @input="onLineQtyInput(idx, $event)" />
          </view>
        </view>

        <view class="readonlyPrice orderTotal">
          <view>
            <view class="readonlyLabel">商品合计</view>
            <view class="readonlyValue">¥{{ formatMoney(orderTotalAmount) }}</view>
          </view>
          <view>
            <view class="readonlyLabel">商品数量</view>
            <view class="readonlyValue">{{ lines.length }} 项</view>
          </view>
        </view>
        <input class="input mt" type="digit" :value="paidAmount" placeholder="已收金额" @input="onPaidInput" />
        <input class="input mt" :value="remark" placeholder="备注（选填）" @input="onRemarkInput" />
        <view :class="['btn', 'mt', saving ? 'btn--disabled' : '']" @tap="submitOrder">
          {{ saving ? '提交中…' : '提交供货单' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { computed, ref } from 'vue'
import {
  createB2BSupplyOrder,
  listB2BCustomers,
  listB2BPrices,
  type B2BCustomer,
  type B2BPrice
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './supply-orders.less'

const auth = useAuthStore()
const router = useRouter()
const initialCustomerId = Number(router.params?.customer_id || 0)
const customers = ref<B2BCustomer[]>([])
const prices = ref<B2BPrice[]>([])
const customerId = ref(initialCustomerId)
const lines = ref([newOrderLine()])
const paidAmount = ref('')
const remark = ref('')
const saving = ref(false)

function newOrderLine() {
  return { price_id: 0, quantity: '1' }
}

const customerOptions = computed(() => customers.value.map((c) => ({ label: c.name || `客户 #${c.id}`, value: c.id })))
const customerIndex = computed(() => Math.max(0, customerOptions.value.findIndex((c) => c.value === customerId.value)))
const selectedCustomerLabel = computed(() => customerOptions.value[customerIndex.value]?.label || '请选择客户')
const selectedCustomer = computed(() => customers.value.find((c) => Number(c.id || 0) === customerId.value) || null)
const visiblePrices = computed(() => {
  const customer = selectedCustomer.value
  if (!customer) return []
  return prices.value.filter((p) => priceMatchesCustomer(p, customer))
})
const priceOptions = computed(() =>
  visiblePrices.value.map((p) => ({
    label: `${p.product?.name || p.product?.product_name || `商品 #${p.product_id}`} / ${p.unit_name || p.unit_spec?.unit_name || '-'} / ¥${formatMoney(p.supply_price)}`,
    value: p.id
  }))
)
const orderTotalAmount = computed(() => lines.value.reduce((sum, line) => {
  const price = selectedLinePrice(line)
  return sum + Number(price?.supply_price || 0) * Number(line.quantity || 0)
}, 0))

function onCustomerChange(e: any) {
  const idx = Number(e?.detail?.value ?? 0)
  customerId.value = Number(customerOptions.value[idx]?.value || 0)
  lines.value = [newOrderLine()]
}

function linePriceIndex(line: { price_id: number }) {
  const idx = priceOptions.value.findIndex((p) => p.value === line.price_id)
  return idx >= 0 ? idx : 0
}

function selectedLinePrice(line: { price_id: number }) {
  return visiblePrices.value.find((p) => p.id === line.price_id)
}

function linePriceLabel(line: { price_id: number }) {
  const idx = linePriceIndex(line)
  return priceOptions.value[idx]?.value === line.price_id ? priceOptions.value[idx]?.label : '请选择供货价'
}

function onLinePriceChange(lineIdx: number, e: any) {
  const idx = Number(e?.detail?.value ?? 0)
  const line = lines.value[lineIdx]
  if (!line) return
  line.price_id = Number(priceOptions.value[idx]?.value || 0)
}

function moneyInputValue(e: any) {
  const raw = String(e?.detail?.value || '').replace(/[^\d.]/g, '')
  const [head, ...tail] = raw.split('.')
  return tail.length ? `${head}.${tail.join('').slice(0, 2)}` : head
}

function onLineQtyInput(lineIdx: number, e: any) {
  const line = lines.value[lineIdx]
  if (!line) return
  line.quantity = moneyInputValue(e)
}

function onPaidInput(e: any) {
  paidAmount.value = moneyInputValue(e)
}

function onRemarkInput(e: any) {
  remark.value = String(e?.detail?.value || '')
}

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function priceMatchesCustomer(price: B2BPrice, customer: B2BCustomer) {
  if (Number(price.customer_id || 0) > 0) return Number(price.customer_id || 0) === Number(customer.id || 0)
  const level = String(customer.price_level || '').trim()
  return !level || String(price.price_level || '').trim() === level
}

function addLine() {
  lines.value.push(newOrderLine())
}

function removeLine(idx: number) {
  if (lines.value.length <= 1) return
  lines.value.splice(idx, 1)
}

async function refresh() {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  try {
    const [cs, ps] = await Promise.all([
      listB2BCustomers(auth.token, { store_id: auth.storeId || undefined, status: 1, page: 1, page_size: 100 }),
      listB2BPrices(auth.token, { store_id: auth.storeId || undefined, page: 1, page_size: 100 })
    ])
    customers.value = cs
    prices.value = ps
    const hasSelectedCustomer = customers.value.some((c) => Number(c.id || 0) === customerId.value)
    if (customers.value.length && !hasSelectedCustomer) {
      customerId.value = Number(customers.value[0]?.id || 0)
      lines.value = [newOrderLine()]
    } else if (!customers.value.length) {
      customerId.value = 0
    }
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

async function submitOrder() {
  if (!auth.token || saving.value) return
  if (!customerId.value) {
    Taro.showToast({ title: '请选择客户', icon: 'none' })
    return
  }
  if (!visiblePrices.value.length) {
    Taro.showToast({ title: '该客户暂无可用供货价', icon: 'none' })
    return
  }
  const items = []
  for (let i = 0; i < lines.value.length; i += 1) {
    const line = lines.value[i]
    const price = selectedLinePrice(line)
    if (!price) {
      Taro.showToast({ title: `请选择商品 ${i + 1} 的供货价`, icon: 'none' })
      return
    }
    const qty = Number(line.quantity || 0)
    if (!(qty > 0)) {
      Taro.showToast({ title: `请填写商品 ${i + 1} 的数量`, icon: 'none' })
      return
    }
    items.push({
      product_id: price.product_id,
      unit_spec_id: price.unit_spec_id,
      quantity: qty,
      supply_price: price.supply_price,
      remark: ''
    })
  }
  if (!items.length) {
    Taro.showToast({ title: '请至少添加一个商品', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await createB2BSupplyOrder(auth.token, {
      store_id: auth.storeId || undefined,
      customer_id: customerId.value,
      paid_amount: Number(paidAmount.value || 0),
      remark: remark.value.trim(),
      items
    })
    Taro.showToast({ title: '已提交', icon: 'success' })
    setTimeout(() => {
      Taro.navigateBack().catch(() => Taro.redirectTo({ url: '/pages/b2b/supply-orders' }))
    }, 400)
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

useDidShow(() => refresh())
</script>
