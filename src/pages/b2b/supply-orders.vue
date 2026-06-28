<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">B2B模块</view>
      <view class="title">供货客户</view>

      <view v-if="loading" class="empty card">正在加载供货客户…</view>
      <view v-else-if="!customers.length" class="empty card">暂无供货客户</view>
      <view v-else class="customerList">
        <view v-for="customer in customers" :key="customer.id" class="customerCard card" @tap="openCustomerOrders(customer)">
          <view class="customerTop">
            <view>
              <view class="customerName">{{ customer.name || `客户 #${customer.id}` }}</view>
              <view class="customerSub">{{ customer.contact_person || '-' }} · {{ customer.phone || '-' }}</view>
            </view>
            <view class="customerAmount">¥{{ formatMoney(customer.receivable) }}</view>
          </view>
          <view class="customerMeta">
            <view class="tag">{{ customer.price_level || '默认等级' }}</view>
            <view class="tag">{{ customer.settlement || '默认结算' }}</view>
          </view>
          <view class="customerActions" @tap.stop>
            <view class="miniBtn miniBtn--ghost" @tap="openPriceDialog(customer)">供货价格列表</view>
            <view class="miniBtn" @tap="openCreate(customer)">新增供货单</view>
          </view>
        </view>
      </view>

      <view v-if="priceDialogOpen" class="dialogMask" @tap="closePriceDialog" @touchmove.stop.prevent="noopTouchMove">
        <view class="priceSheet" @tap.stop @touchmove.stop.prevent="noopTouchMove">
          <view class="sheetHead">
            <view>
              <view class="sheetTitle">供货价格列表</view>
              <view class="sheetSub">{{ activeCustomer?.name || '-' }}</view>
            </view>
            <view class="sheetCloseIcon" @tap="closePriceDialog">×</view>
          </view>
          <scroll-view scroll-y enhanced :bounces="false" class="priceSheetList" :show-scrollbar="false" @touchmove.stop>
            <view v-if="priceLoading" class="empty">正在加载供货价…</view>
            <view v-else-if="!activePrices.length" class="empty">暂无供货价</view>
            <view v-for="p in activePrices" :key="p.id" class="priceRow">
              <view>
                <view class="priceTitle">{{ productName(p) }}</view>
                <view class="priceSub">{{ p.unit_name || p.unit_spec?.unit_name || '-' }} · 起订 {{ p.min_quantity ?? 1 }}</view>
              </view>
              <view class="priceAmount">¥{{ formatMoney(p.supply_price) }}</view>
            </view>
          </scroll-view>
          <view class="sheetCloseBtn" @tap="closePriceDialog">关闭</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { ref } from 'vue'
import {
  listB2BCustomers,
  listB2BPrices,
  type B2BCustomer,
  type B2BPrice
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './supply-orders.less'

const auth = useAuthStore()
const customers = ref<B2BCustomer[]>([])
const activeCustomer = ref<B2BCustomer | null>(null)
const activePrices = ref<B2BPrice[]>([])
const loading = ref(false)
const priceLoading = ref(false)
const priceDialogOpen = ref(false)

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function productName(row: B2BPrice) {
  return row.product?.name || row.product?.product_name || `商品 #${row.product_id}`
}

function priceMatchesCustomer(price: B2BPrice, customer: B2BCustomer) {
  if (Number(price.customer_id || 0) > 0) return Number(price.customer_id || 0) === Number(customer.id || 0)
  const level = String(customer.price_level || '').trim()
  return !level || String(price.price_level || '').trim() === level
}

async function refresh() {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  loading.value = true
  try {
    customers.value = await listB2BCustomers(auth.token, {
      store_id: auth.storeId || undefined,
      status: 1,
      page: 1,
      page_size: 100
    })
  } catch (err: any) {
    customers.value = []
    Taro.showToast({ title: err?.message || '加载客户失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function openPriceDialog(customer: B2BCustomer) {
  if (!auth.token) return
  activeCustomer.value = customer
  activePrices.value = []
  priceDialogOpen.value = true
  priceLoading.value = true
  try {
    const rows = await listB2BPrices(auth.token, {
      store_id: auth.storeId || undefined,
      page: 1,
      page_size: 100
    })
    activePrices.value = rows.filter((item) => priceMatchesCustomer(item, customer))
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载供货价失败', icon: 'none' })
  } finally {
    priceLoading.value = false
  }
}

function closePriceDialog() {
  priceDialogOpen.value = false
}

function openCreate(customer: B2BCustomer) {
  Taro.navigateTo({ url: `/pages/b2b/supply-order-form?customer_id=${customer.id}` })
}

function openCustomerOrders(customer: B2BCustomer) {
  Taro.navigateTo({ url: `/pages/b2b/supply-order-list?customer_id=${customer.id}&customer_name=${encodeURIComponent(customer.name || '')}` })
}

function noopTouchMove() {}

useDidShow(() => refresh())

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>
