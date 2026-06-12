<template>
  <view class="page">
    <view class="container dashboard-wrapper">
      <view class="eyebrow">库存中心</view>
      <view class="title">库存工作台</view>
      <view class="subtitle">常用库存操作入口</view>

      <view class="card action-banner" @tap="goForm">
        <view class="banner-content">
          <view class="banner-title"><text class="banner-icon-plus">+</text> 新建出入库单</view>
          <view class="banner-sub">按业务原因快速登记商品入库或出库</view>
        </view>
        <view class="banner-btn">去登记</view>
      </view>

      <view class="feature-list">
        <view class="feature-card" @tap="goStockList">
          <view class="feature-icon feature-icon--stock" />
          <view class="feature-main">
            <view class="feature-title">库存明细</view>
            <view class="feature-sub">查看当前门店各商品实时数量</view>
          </view>
          <view class="feature-arrow">›</view>
        </view>
        <view class="feature-card" @tap="goOrders">
          <view class="feature-icon feature-icon--orders" />
          <view class="feature-main">
            <view class="feature-title">单据记录</view>
            <view class="feature-sub">查看出入库单据、业务原因与操作人</view>
          </view>
          <view class="feature-arrow">›</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro from '@tarojs/taro'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()

function goOrders() {
  if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
  Taro.navigateTo({ url: '/pages/inventory/orders' })
}

function goForm() {
  if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
  Taro.navigateTo({ url: '/pages/inventory/form' })
}

function goStockList() {
  if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
  Taro.navigateTo({ url: '/pages/inventory/stock-list' })
}
</script>
