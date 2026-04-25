<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">库存管理</view>
      <view class="title">出入库记录</view>
      <view class="subtitle">按类型筛选单据，点击查看明细</view>

      <view class="tabs">
        <view :class="['pill', typeFilter === undefined ? 'pill--active' : '']" @tap="setType(undefined)">全部</view>
        <view :class="['pill', typeFilter === 1 ? 'pill--active' : '']" @tap="setType(1)">入库</view>
        <view :class="['pill', typeFilter === 2 ? 'pill--active' : '']" @tap="setType(2)">出库</view>
      </view>

      <view class="list">
        <view v-if="!list.length" class="empty card">暂无单据</view>
        <view v-for="row in list" :key="row.id" class="row card" @tap="openDetail(row.id)">
          <view class="rowTop">
            <view>
              <view class="rowTitle">{{ row.order_no || `单号 #${row.id}` }}</view>
              <view class="rowSub">{{ row.store_name || '-' }} · {{ formatDate(row.created_at) }}</view>
            </view>
            <view :class="['typeTag', row.type === 2 ? 'typeTag--out' : 'typeTag--in']">
              {{ row.type === 2 ? '出库' : '入库' }}
            </view>
          </view>
          <view class="rowReason">{{ row.reason || '—' }}</view>
          <view class="rowFoot">
            <view class="rowMeta">共 {{ formatQty(row.total_quantity) }} · {{ row.item_count ?? row.items?.length ?? 0 }} 种</view>
            <view class="rowMeta">{{ row.operator_name || '—' }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { ref } from 'vue'
import { listInventoryOrders, type InventoryOrder } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './orders.less'

const auth = useAuthStore()
const list = ref<InventoryOrder[]>([])
const typeFilter = ref<number | undefined>(undefined)

function setType(t: number | undefined) {
  typeFilter.value = t
  void refresh()
}

function formatQty(v: any) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function formatDate(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 16)
}

async function refresh() {
  if (!auth.token) return
  try {
    const params: {
      store_id?: number
      type?: number
      page: number
      page_size: number
    } = { page: 1, page_size: 50 }
    if (auth.storeId) params.store_id = auth.storeId
    if (typeFilter.value !== undefined) params.type = typeFilter.value
    list.value = await listInventoryOrders(auth.token, params)
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

function openDetail(id: number) {
  Taro.navigateTo({ url: `/pages/inventory/order-detail?id=${id}` })
}

useDidShow(() => refresh())

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>