<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">门店返厂管理</view>
      <view class="title">返厂记录</view>

      <view class="card statCard">
        <view>
          <view class="statLabel">押金合计</view>
          <view class="statValue">¥ {{ formatMoney(stats?.total_deposit) }}</view>
        </view>
        <view>
          <view class="statLabel">物流费用</view>
          <view class="statValue">¥ {{ formatMoney(stats?.logistics_fee) }}</view>
        </view>
      </view>

      <view class="btn createBtn" @tap="openCreate">新增返厂记录</view>

      <view class="section-title">返厂列表</view>
      <view class="list">
        <view v-if="!returns.length" class="empty card">暂无返厂记录</view>
        <view v-for="row in returns" :key="row.id" class="row card" @tap="openDetail(row.id)">
          <view class="rowTop">
            <view>
              <view class="rowTitle">{{ row.return_no || `返厂 #${row.id}` }}</view>
              <view class="rowSub">{{ formatDate(row.return_date || row.created_at) }} · {{ row.operator_name || '-' }}</view>
            </view>
            <view class="amount">¥{{ formatMoney(row.total_deposit) }}</view>
          </view>
          <view class="rowFoot">
            <view class="tag">{{ row.item_count ?? row.items?.length ?? 0 }} 项</view>
            <view class="tag">物流 ¥{{ formatMoney(row.logistics_fee) }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { ref } from 'vue'
import { getStoreReturnStats, listStoreReturns, type StoreReturn, type StoreReturnStats } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()
const returns = ref<StoreReturn[]>([])
const stats = ref<StoreReturnStats | null>(null)

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function formatDate(v?: string) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

async function refresh() {
  if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
  try {
    const [rs, st] = await Promise.all([
      listStoreReturns(auth.token, { store_id: auth.storeId || undefined, page: 1, page_size: 50 }),
      getStoreReturnStats(auth.token, { store_id: auth.storeId || undefined })
    ])
    returns.value = rs
    stats.value = st
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

function openCreate() {
  Taro.navigateTo({ url: '/pages/store-return/form' })
}

function openDetail(id: number) {
  Taro.navigateTo({ url: `/pages/store-return/detail?id=${id}` })
}

useDidShow(() => {
  void refresh()
})

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>
