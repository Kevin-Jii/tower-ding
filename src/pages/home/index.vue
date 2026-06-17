<template>
  <view class="page">
    <view class="container workspace">
      <view class="eyebrow">{{ greeting }}，{{ storeName }}</view>
      <view class="title">门店工作台</view>

      <view class="overview card">
        <view class="sectionHead">
          <view class="sectionName">今日概览</view>
          <view class="sectionMeta">{{ today }}</view>
        </view>
        <view class="overviewGrid">
          <view class="overviewItem">
            <view class="overviewLabel">今日记账金额</view>
            <view class="overviewValue">¥{{ formatMoney(todayAmount) }}</view>
          </view>
          <view class="overviewItem">
            <view class="overviewLabel">未支付订单数</view>
            <view class="overviewValue">{{ unpaidCount }}</view>
          </view>
          <view class="overviewItem">
            <view class="overviewLabel">库存预警</view>
            <view class="overviewValue">{{ lowStockCount }}</view>
          </view>
          <view class="overviewItem">
            <view class="overviewLabel">待处理返厂</view>
            <view class="overviewValue">{{ pendingReturnCount }}</view>
          </view>
        </view>
      </view>

      <view v-for="group in moduleGroups" :key="group.title" class="group">
        <view class="groupTitle">{{ group.title }}</view>
        <view class="moduleList">
          <view v-for="item in group.items" :key="item.url" class="moduleCard" @tap="go(item.url)">
            <view :class="['moduleIcon', item.tone]">{{ item.badge }}</view>
            <view class="moduleMain">
              <view class="moduleTitle">{{ item.title }}</view>
              <view class="moduleDesc">{{ item.desc }}</view>
            </view>
            <view class="moduleArrow">›</view>
          </view>
        </view>
      </view>

      <view class="todo card">
        <view class="sectionHead">
          <view class="sectionName">待办提醒</view>
        </view>
        <view class="todoList">
          <view v-for="todo in todos" :key="todo.text" :class="['todoItem', todo.warn ? 'todoItem--warn' : '']">
            <view class="todoDot" />
            <view class="todoText">{{ todo.text }}</view>
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
  getStoreAccountStats,
  listAllInventories,
  listStoreAccounts,
  listStoreReturns,
  type StoreAccount,
  type StoreReturn
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()
const today = businessDateStr()
const todayAmount = ref(0)
const unpaidCount = ref(0)
const lowStockCount = ref(0)
const pendingReturnCount = ref(0)

const storeName = computed(() => auth.user?.store?.name || auth.user?.nickname || '门店')
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const moduleGroups = [
  {
    title: '经营管理',
    items: [
      { title: '会员模块', desc: '会员资料、搜索与新增', badge: '会', url: '/pages/member/index', tone: 'moduleTone--member' },
      { title: 'B2B供货单', desc: '供货单新增与状态查看', badge: 'B', url: '/pages/b2b/supply-orders', tone: 'moduleTone--b2b' }
    ]
  },
  {
    title: '门店业务',
    items: [
      { title: '门店返厂', desc: '查看返厂列表与新增记录', badge: '返', url: '/pages/store-return/index', tone: 'moduleTone--return' },
      { title: '快速记账', desc: '系统商品自动算价扣库存', badge: '¥', url: '/pages/accounting/create?mode=quick', tone: 'moduleTone--quick' }
    ]
  },
  {
    title: '库存工具',
    items: [
      { title: '库存查询', desc: '查看实时库存和低库存商品', badge: '库', url: '/pages/inventory/stock-list', tone: 'moduleTone--stock' },
      { title: '入库/出库', desc: '登记商品入库或出库单据', badge: '入', url: '/pages/inventory/form', tone: 'moduleTone--inventory' }
    ]
  }
]

const todos = computed(() => [
  {
    text: unpaidCount.value > 0 ? `有 ${unpaidCount.value} 笔未支付账单` : '暂无未支付账单',
    warn: unpaidCount.value > 0
  },
  {
    text: lowStockCount.value > 0 ? `有 ${lowStockCount.value} 个商品库存偏低` : '暂无库存预警',
    warn: lowStockCount.value > 0
  },
  {
    text: pendingReturnCount.value > 0 ? `今日有 ${pendingReturnCount.value} 条返厂记录` : '今日暂无返厂记录',
    warn: pendingReturnCount.value > 0
  }
])

const tabPages = new Set(['/pages/home/index', '/pages/inventory/index', '/pages/accounting/index', '/pages/mine/index'])

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function businessDate() {
  const now = new Date()
  if (now.getHours() < 5) now.setDate(now.getDate() - 1)
  now.setHours(0, 0, 0, 0)
  return now
}

function businessDateStr() {
  const now = businessDate()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function isLowStock(row: any) {
  const qty = Number(row?.quantity || 0)
  return Number.isFinite(qty) && qty < 3
}

function countUnpaid(rows: StoreAccount[]) {
  return rows.filter((row) => Number(row.payment_status || 1) === 2).length
}

async function refresh() {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  const storeID = auth.storeId || undefined
  try {
    const [accountStats, unpaidRows, inventories, returnRows] = await Promise.all([
      getStoreAccountStats(auth.token, { store_id: storeID, start_date: today, end_date: today }),
      listStoreAccounts(auth.token, {
        store_id: storeID,
        start_date: today,
        end_date: today,
        payment_status: 2,
        page: 1,
        page_size: 100
      }),
      listAllInventories(auth.token, { store_id: storeID }),
      listStoreReturns(auth.token, { store_id: storeID, start_date: today, end_date: today, page: 1, page_size: 100 })
    ])
    todayAmount.value = Number(accountStats?.total_amount || 0)
    unpaidCount.value = countUnpaid(unpaidRows)
    lowStockCount.value = inventories.filter(isLowStock).length
    pendingReturnCount.value = (returnRows as StoreReturn[]).length
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '首页数据加载失败', icon: 'none' })
  }
}

function go(url: string) {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  if (tabPages.has(url)) {
    Taro.switchTab({ url })
    return
  }
  Taro.navigateTo({ url })
}

useDidShow(() => {
  void refresh()
})

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>
