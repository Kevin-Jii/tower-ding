<template>
  <view class="page">
    <view class="container workspace">
      <view class="eyebrow">{{ greeting }}，{{ storeName }}</view>
      <view class="title">门店工作台</view>
      <view class="subtitle">常用业务入口</view>

      <view class="card primaryAction" @tap="go('/pages/accounting/create?mode=quick')">
        <view>
          <view class="primaryTitle">快速记账</view>
          <view class="primarySub">系统商品自动算价、自动扣库存</view>
        </view>
        <view class="primaryMark">+</view>
      </view>

      <view class="moduleGrid">
        <view v-for="item in modules" :key="item.url" class="moduleCard" @tap="go(item.url)">
          <view :class="['moduleIcon', item.tone]" />
          <view class="moduleTitle">{{ item.title }}</view>
          <view class="moduleSub">{{ item.sub }}</view>
        </view>
      </view>

      <view class="section-title">今日常用</view>
      <view class="quickList">
        <view class="quickRow" @tap="go('/pages/accounting/create?mode=custom')">
          <view>
            <view class="quickTitle">自定义记账</view>
            <view class="quickSub">临时商品、服务收入等手写明细</view>
          </view>
          <view class="quickArrow">›</view>
        </view>
        <view class="quickRow" @tap="go('/pages/store-return/index?create=1')">
          <view>
            <view class="quickTitle">新增返厂记录</view>
            <view class="quickSub">只登记返厂，不提供编辑和删除入口</view>
          </view>
          <view class="quickArrow">›</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro from '@tarojs/taro'
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()
const storeName = computed(() => auth.user?.store?.name || auth.user?.nickname || '门店')
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const modules = [
  { title: '会员模块', sub: '会员资料与新增会员', url: '/pages/member/index', tone: 'moduleIcon--member' },
  { title: '门店记账', sub: '列表、统计、编辑与耗材绑定', url: '/pages/accounting/index', tone: 'moduleIcon--account' },
  { title: 'B2B供货单', sub: '新增供货单，当天可改状态', url: '/pages/b2b/supply-orders', tone: 'moduleIcon--b2b' },
  { title: '门店返厂', sub: '新增返厂记录和查看明细', url: '/pages/store-return/index', tone: 'moduleIcon--return' },
  { title: '库存中心', sub: '库存明细与出入库单据', url: '/pages/inventory/index', tone: 'moduleIcon--stock' }
]

function go(url: string) {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  Taro.navigateTo({ url })
}
</script>
