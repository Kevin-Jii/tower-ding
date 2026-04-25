<template>
  <view class="page">
    <view class="container">
      <view class="title">采购单</view>
      <view class="subtitle">统一管理待审核、待到货和已完成订单</view>

      <view class="filters">
        <view :class="['pill', status === undefined ? 'pill--active' : '']" @tap="setStatus(undefined)">全部订单</view>
        <view :class="['pill', status === 1 ? 'pill--active' : '']" @tap="setStatus(1)">待审核</view>
        <view :class="['pill', status === 2 ? 'pill--active' : '']" @tap="setStatus(2)">待到货</view>
        <view :class="['pill', status === 3 ? 'pill--active' : '']" @tap="setStatus(3)">已完成</view>
      </view>

      <view class="card tip card-dark">
        <view class="tipTitle">本周采购</view>
        <view class="tipBig">{{ list.length }} 笔单据待处理</view>
        <view class="tipSub">优先处理已超 24 小时未审核的订单</view>
      </view>

      <view class="list">
        <view v-for="item in list" :key="item.id" class="row card" @tap="openDetail(item.id)">
          <view class="rowTop">
            <view class="rowTitle">{{ item.order_no || `采购单 #${item.id}` }}</view>
            <view :class="['badge', badgeClass(item.status)]">{{ formatStatus(item.status) }}</view>
          </view>
          <view class="rowSub">供应商：{{ item.supplier_name || item.supplier_id || '-' }}</view>
          <view class="rowSub">创建时间：{{ item.created_at || '-' }}</view>
          <view class="rowMoney">合计 ¥ {{ formatMoney(item.total_amount) }}</view>
        </view>
      </view>

      <view class="card quickCreate">
        <view>
          <view class="quickCreateTitle">快速新建采购单</view>
          <view class="quickCreateSub">从低库存商品自动带出推荐数量和供应商</view>
        </view>
        <view class="quickCreateBtn">新建订单</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { ref } from 'vue'
import { listPurchaseOrders, type PurchaseOrder } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

import './index.less'

const auth = useAuthStore()
const list = ref<PurchaseOrder[]>([])
const status = ref<number | undefined>(1)

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(0) : '0'
}
function formatStatus(v: any) {
  if (v === 1 || v === '1') return '待审核'
  if (v === 2 || v === '2') return '待到货'
  if (v === 3 || v === '3') return '已完成'
  return '全部'
}

function badgeClass(v: any) {
  if (v === 1 || v === '1') return 'badge--pending'
  if (v === 2 || v === '2') return 'badge--arriving'
  if (v === 3 || v === '3') return 'badge--done'
  return 'badge--default'
}

async function refresh() {
  if (!auth.token) return
  try {
    list.value = await listPurchaseOrders(auth.token, {
      store_id: auth.storeId || undefined,
      status: status.value,
      page: 1,
      page_size: 50
    })
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  } finally {
    Taro.stopPullDownRefresh()
  }
}

function setStatus(v: number | undefined) {
  status.value = v
  refresh()
}

function openDetail(id: number) {
  Taro.navigateTo({ url: `/pages/purchase/detail?id=${id}` })
}

useDidShow(() => refresh())
usePullDownRefresh(() => refresh())
</script>
