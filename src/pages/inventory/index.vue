<template>
  <view class="page">
    <view class="container dashboard-wrapper">
      <view class="eyebrow">库存中心</view>
      <view class="title">库存工作台</view>
      <view class="subtitle">登记出入库、查看实时库存数量和单据记录</view>

      <view class="card action-banner" @tap="goForm">
        <view class="banner-content">
          <view class="banner-title"><text class="banner-icon-plus">+</text> 新建出入库单</view>
          <view class="banner-sub">按业务原因快速登记商品入库或出库</view>
        </view>
        <view class="banner-btn">去登记</view>
      </view>

      <view class="quick-grid">
        <view class="quick-card" @tap="goStockList">
          <view class="quick-icon quick-icon--stock" />
          <view class="quick-title">库存明细</view>
          <view class="quick-sub">实时数量</view>
        </view>
        <view class="quick-card" @tap="goOrders">
          <view class="quick-icon quick-icon--orders" />
          <view class="quick-title">单据记录</view>
          <view class="quick-sub">累计 {{ formatInt(stats?.total_records) }} 条</view>
        </view>
      </view>

      <view class="stats-grid">
        <view class="stat-card stat-card--main" @tap="goStockList">
          <view class="stat-header">
            <text class="stat-label">当前总库存量</text>
            <text class="stat-arrow">查看明细 ›</text>
          </view>
          <view class="stat-value text-primary">{{ formatQty(stats?.total_quantity) }}</view>
        </view>
        <view class="stat-card">
          <text class="stat-label">库存 SKU 数</text>
          <view class="stat-value text-slate">{{ formatInt(stats?.total_products) }}</view>
        </view>
        <view class="stat-card">
          <text class="stat-label">今日入库量</text>
          <view class="stat-value text-success">+{{ formatQty(stats?.today_in) }}</view>
        </view>
        <view class="stat-card">
          <text class="stat-label">今日出库量</text>
          <view class="stat-value text-warning">-{{ formatQty(stats?.today_out) }}</view>
        </view>
      </view>
      <view class="card entry-card" @tap="goOrders">
        <view class="entry-icon-box"><view class="icon-file"></view></view>
        <view class="entry-main">
          <view class="entry-title-row">
            <text class="entry-title">出入库单据记录</text>
            <text class="entry-count">累计 {{ formatInt(stats?.total_records) }} 条</text>
          </view>
          <view class="entry-sub">查看单据明细、业务原因与具体操作人</view>
        </view>
        <view class="entry-arrow">›</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { ref } from 'vue'
import {
  getInventoryStats,
  listInventories,
  type InventoryStats,
  type InventoryWithProduct
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()
const stats = ref<InventoryStats | null>(null)
const list = ref<InventoryWithProduct[]>([])

function formatQty(v: any) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function formatInt(v: any) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  return String(Math.round(n))
}

async function refresh() {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  try {
    const [s, rows] = await Promise.all([
      getInventoryStats(auth.token, { store_id: auth.storeId || undefined }),
      listInventories(auth.token, {
        store_id: auth.storeId || undefined,
        page: 1,
        page_size: 100
      })
    ])
    stats.value = s
    list.value = rows
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

function goOrders() {
  Taro.navigateTo({ url: '/pages/inventory/orders' })
}

function goForm() {
  Taro.navigateTo({ url: '/pages/inventory/form' })
}

function goStockList() {
  Taro.navigateTo({ url: '/pages/inventory/stock-list' })
}

useDidShow(() => refresh())

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>
