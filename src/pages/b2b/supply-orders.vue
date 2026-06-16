<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">B2B模块</view>
      <view class="title">供货单</view>
      <view class="subtitle">供货价仅展示，不提供修改和删除</view>

      <view class="card createCard">
        <view class="formTitle">新增供货单</view>
        <picker mode="selector" :range="customerOptions" range-key="label" :value="customerIndex" @change="onCustomerChange">
          <view class="pickerFake">{{ selectedCustomerLabel }} <text>›</text></view>
        </picker>
        <picker mode="selector" :range="priceOptions" range-key="label" :value="priceIndex" @change="onPriceChange">
          <view class="pickerFake mt">{{ selectedPriceLabel }} <text>›</text></view>
        </picker>
        <view class="qtyRow">
          <input class="input qtyInput" type="digit" :value="quantity" placeholder="数量" @input="onQtyInput" />
          <input class="input qtyInput" type="digit" :value="paidAmount" placeholder="已收金额" @input="onPaidInput" />
        </view>
        <input class="input mt" :value="remark" placeholder="备注（选填）" @input="onRemarkInput" />
        <view class="btn mt" @tap="submitOrder">保存供货单</view>
      </view>

      <view class="section-title">供货价</view>
      <view class="priceList">
        <view v-if="!prices.length" class="empty card">暂无供货价</view>
        <view v-for="p in prices.slice(0, 6)" :key="p.id" class="priceRow">
          <view>
            <view class="priceTitle">{{ p.product?.name || p.product?.product_name || `商品 #${p.product_id}` }}</view>
            <view class="priceSub">{{ p.unit_name || p.unit_spec?.unit_name || '-' }} · 起订 {{ p.min_quantity ?? 1 }}</view>
          </view>
          <view class="priceAmount">¥{{ formatMoney(p.supply_price) }}</view>
        </view>
      </view>

      <view class="section-title">供货单列表</view>
      <view class="list">
        <view v-if="!orders.length" class="empty card">暂无供货单</view>
        <view v-for="o in orders" :key="o.id" class="row card" @tap="openDetail(o.id)">
          <view class="rowTop">
            <view>
              <view class="rowTitle">{{ o.order_no || `供货单 #${o.id}` }}</view>
              <view class="rowSub">{{ o.customer_name || o.customer?.name || '-' }} · {{ formatDate(o.order_date || o.created_at) }}</view>
            </view>
            <view class="amount">¥{{ formatMoney(o.total_amount) }}</view>
          </view>
          <view class="rowFoot">
            <view class="tag">{{ paymentLabel(o.payment_status) }}</view>
            <view class="tag">{{ deliveryLabel(o.delivery_status) }}</view>
            <view class="tag">利润 ¥{{ formatMoney(o.profit_amount) }}</view>
          </view>
          <view v-if="canEditToday(o)" class="actions" @tap.stop>
            <view class="miniBtn" @tap="markDelivered(o)">已配送</view>
            <view class="miniBtn" @tap="markPaid(o)">已收款</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { computed, ref } from 'vue'
import {
  createB2BSupplyOrder,
  listB2BCustomers,
  listB2BPrices,
  listB2BSupplyOrders,
  updateB2BSupplyOrderDeliveryStatus,
  updateB2BSupplyOrderPaymentStatus,
  type B2BCustomer,
  type B2BPrice,
  type B2BSupplyOrder
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './supply-orders.less'

const auth = useAuthStore()
const customers = ref<B2BCustomer[]>([])
const prices = ref<B2BPrice[]>([])
const orders = ref<B2BSupplyOrder[]>([])
const customerId = ref(0)
const priceId = ref(0)
const quantity = ref('1')
const paidAmount = ref('')
const remark = ref('')
const saving = ref(false)

const customerOptions = computed(() => customers.value.map((c) => ({ label: c.name || `客户 #${c.id}`, value: c.id })))
const customerIndex = computed(() => Math.max(0, customerOptions.value.findIndex((c) => c.value === customerId.value)))
const selectedCustomerLabel = computed(() => customerOptions.value[customerIndex.value]?.label || '请选择客户')
const visiblePrices = computed(() => prices.value.filter((p) => !customerId.value || !p.customer_id || Number(p.customer_id) === customerId.value))
const priceOptions = computed(() =>
  visiblePrices.value.map((p) => ({
    label: `${p.product?.name || p.product?.product_name || `商品 #${p.product_id}`} / ${p.unit_name || p.unit_spec?.unit_name || '-'} / ¥${formatMoney(p.supply_price)}`,
    value: p.id
  }))
)
const priceIndex = computed(() => Math.max(0, priceOptions.value.findIndex((p) => p.value === priceId.value)))
const selectedPriceLabel = computed(() => priceOptions.value[priceIndex.value]?.label || '请选择供货价')
const selectedPrice = computed(() => visiblePrices.value.find((p) => p.id === priceId.value))

function onCustomerChange(e: any) {
  const idx = Number(e?.detail?.value ?? 0)
  customerId.value = Number(customerOptions.value[idx]?.value || 0)
  priceId.value = 0
}

function onPriceChange(e: any) {
  const idx = Number(e?.detail?.value ?? 0)
  priceId.value = Number(priceOptions.value[idx]?.value || 0)
}

function moneyInputValue(e: any) {
  const raw = String(e?.detail?.value || '').replace(/[^\d.]/g, '')
  const [head, ...tail] = raw.split('.')
  return tail.length ? `${head}.${tail.join('').slice(0, 2)}` : head
}

function onQtyInput(e: any) {
  quantity.value = moneyInputValue(e)
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

function formatDate(v?: string) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

function paymentLabel(v?: number) {
  if (Number(v) === 3) return '已收款'
  if (Number(v) === 2) return '部分收款'
  return '未收款'
}

function deliveryLabel(v?: number) {
  if (Number(v) === 2) return '已配送'
  if (Number(v) === 3) return '已取消'
  return '待配送'
}

function canEditToday(row: B2BSupplyOrder) {
  const s = String(row.created_at || '').trim()
  if (!s) return false
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

async function refresh() {
  if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
  try {
    const [cs, ps, os] = await Promise.all([
      listB2BCustomers(auth.token, { store_id: auth.storeId || undefined, status: 1, page: 1, page_size: 100 }),
      listB2BPrices(auth.token, { store_id: auth.storeId || undefined, page: 1, page_size: 100 }),
      listB2BSupplyOrders(auth.token, { store_id: auth.storeId || undefined, page: 1, page_size: 50 })
    ])
    customers.value = cs
    prices.value = ps
    orders.value = os
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

async function submitOrder() {
  if (!auth.token || saving.value) return
  const price = selectedPrice.value
  if (!customerId.value || !price) {
    Taro.showToast({ title: '请选择客户和供货价', icon: 'none' })
    return
  }
  const qty = Number(quantity.value || 0)
  if (!(qty > 0)) {
    Taro.showToast({ title: '请填写数量', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await createB2BSupplyOrder(auth.token, {
      store_id: auth.storeId || undefined,
      customer_id: customerId.value,
      paid_amount: Number(paidAmount.value || 0),
      remark: remark.value.trim(),
      items: [
        {
          product_id: price.product_id,
          unit_spec_id: price.unit_spec_id,
          quantity: qty,
          supply_price: price.supply_price,
          remark: ''
        }
      ]
    })
    Taro.showToast({ title: '已保存', icon: 'success' })
    quantity.value = '1'
    paidAmount.value = ''
    remark.value = ''
    await refresh()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function markDelivered(row: B2BSupplyOrder) {
  if (!auth.token) return
  try {
    await updateB2BSupplyOrderDeliveryStatus(auth.token, row.id, { delivery_status: 2 })
    await refresh()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '操作失败', icon: 'none' })
  }
}

async function markPaid(row: B2BSupplyOrder) {
  if (!auth.token) return
  try {
    await updateB2BSupplyOrderPaymentStatus(auth.token, row.id, {
      payment_status: 3,
      paid_amount: Number(row.total_amount || 0)
    })
    await refresh()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '操作失败', icon: 'none' })
  }
}

function openDetail(id: number) {
  Taro.navigateTo({ url: `/pages/b2b/supply-order-detail?id=${id}` })
}

useDidShow(() => refresh())

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>
