<template>
  <view class="page">
    <view class="container workspace">
      <view class="topBar">
        <view>
          <view class="eyebrow">{{ greeting }}，{{ userName }}</view>
          <view class="title">Tower工作台</view>
        </view>
        <view class="avatarBtn" @tap="go('/pages/mine/index')">{{ initials }}</view>
      </view>

      <view class="heroGrid">
        <view class="salesCard bentoCard" @tap="go('/pages/accounting/index')">
          <view class="salesTop">
            <view class="cardLabel">今日销售额</view>
            <view>
              <view class="miniLabel">未支付订单</view>
              <view class="miniValue">{{ unpaidCount }}笔</view>
            </view>
          </view>
          <view class="salesAmount">¥{{ formatMoney(todayAmount) }}</view>
          <view class="salesTrend">
            <canvas id="salesTrendCanvas" canvas-id="salesTrendCanvas" class="trendCanvas" />
          </view>
        </view>

        <view class="stockAlertCard bentoCard" @tap="go('/pages/inventory/stock-list')">
          <view class="alertHead">
            <view class="redDot" />
            <view class="cardLabel">库存预警</view>
          </view>
          <view class="stockAlertNum">{{ lowStockCount }}</view>
          <view class="stockAlertText">{{ lowStockCount }}件商品低于预警线</view>
        </view>
      </view>

      <view class="bentoGrid">
        <view class="wineSmall bentoCard" @tap="go('/pages/member-wine/index')">
          <view class="cardTitleRow">
            <view class="iconBox moduleTone--wine">酒</view>
            <view>
              <view class="moduleTitle">会员存取</view>
              <view class="moduleDesc">存酒取酒与流水</view>
            </view>
          </view>
        </view>

        <view class="quickCard bentoCard" @tap="go('/pages/accounting/create?mode=quick')">
          <view class="iconBox moduleTone--quick">¥</view>
          <view>
            <view class="moduleTitle">快速记账</view>
            <view class="moduleDesc">快速记录支出/收入</view>
          </view>
        </view>

        <view class="memberCard bentoCard" @tap="go('/pages/member/index')">
          <view class="cardTitleRow">
            <view class="iconBox moduleTone--member">会</view>
            <view class="moduleTitle">会员管理</view>
          </view>
          <view class="miniStats">
            <view>
              <view class="miniLabel">会员总数</view>
              <view class="miniValue">{{ memberTotal }}人</view>
            </view>
            <view>
              <view class="miniLabel">新增会员</view>
              <view class="miniValue">{{ monthNewMembers }}人</view>
            </view>
          </view>
        </view>

        <view class="businessCard bentoCard" @tap="go('/pages/b2b/supply-orders')">
          <view class="cardLabel">经营管理</view>
          <view class="inlineEntry">
            <view class="iconBox moduleTone--b2b">B</view>
            <view>
              <view class="moduleTitle">B2B供货单</view>
            </view>
          </view>
        </view>

        <view class="storeBizCard bentoCard">
          <view class="cardLabel">门店业务</view>
          <view class="entryRow" @tap="go('/pages/store-return/index')">
            <view class="iconBox moduleTone--return">返</view>
            <view>
              <view class="entryTitle">门店返厂</view>
            </view>
          </view>
          <view class="entryDivider" />
          <view class="entryRow" @tap="go('/pages/inventory-loss/index')">
            <view class="iconBox moduleTone--loss">损</view>
            <view>
              <view class="entryTitle">报损自用</view>
              <view class="entryDesc">登记报损与自用出库</view>
            </view>
          </view>
        </view>

        <view class="inventoryCard bentoCard">
          <view class="cardLabel">库存工具</view>
          <view class="entryRow" @tap="go('/pages/inventory/stock-list')">
            <view class="iconBox moduleTone--stock">库</view>
            <view>
              <view class="entryTitle">库存查询</view>
              <view class="entryDesc">查看实时查询低库存</view>
            </view>
          </view>
          <view class="entryDivider" />
          <view class="entryRow" @tap="go('/pages/inventory/form')">
            <view class="iconBox moduleTone--inventory">入</view>
            <view>
              <view class="entryTitle">入库/出库</view>
              <view class="entryDesc">登记出入库单据</view>
            </view>
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
import { computed, nextTick, ref } from 'vue'
import {
  getHomeCharts,
  getStoreAccountStats,
  getMemberPage,
  listAllInventories,
  listStoreAccounts,
  listStoreReturns,
  type Member,
  type HomeChartLinePoint,
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
const salesTrend = ref<HomeChartLinePoint[]>([])

const storeName = computed(() => auth.user?.store?.name || auth.user?.nickname || '门店')
const userName = computed(() => auth.user?.nickname || auth.user?.nickname || '姓')
const initials = computed(() => {
  const text = auth.user?.nickname || auth.user?.username || auth.user?.phone || '我'
  return String(text).slice(0, 1).toUpperCase()
})
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 11) return '早上好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const memberTotal = ref(0)
const monthNewMembers = ref(0)

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

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function isThisMonth(dateText?: string) {
  if (!dateText) return false
  const date = new Date(dateText)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

async function loadMemberStats() {
  if (!auth.token) return { total: 0, monthNew: 0 }
  let total = 0
  let monthNew = 0
  for (let page = 1; page <= 20; page += 1) {
    const data = await getMemberPage(auth.token, { page, page_size: 100 })
    const rows = data.list as Member[]
    if (page === 1) total = Number(data.total || rows.length || 0)
    monthNew += rows.filter((row) => isThisMonth(row.created_at)).length
    if (rows.length < 100 || page * 100 >= total) break
  }
  return { total, monthNew }
}

function getTrendValues() {
  const rows = salesTrend.value.length > 1
    ? salesTrend.value
    : [
      { amount: Math.max(todayAmount.value * 0.46, 20) },
      { amount: Math.max(todayAmount.value * 0.58, 28) },
      { amount: Math.max(todayAmount.value * 0.52, 24) },
      { amount: Math.max(todayAmount.value * 0.76, 36) },
      { amount: Math.max(todayAmount.value * 0.68, 32) },
      { amount: Math.max(todayAmount.value, 42) }
    ]
  return rows.map((row) => Number(row.amount || 0))
}

function drawSalesTrend() {
  void nextTick(() => {
    Taro.createSelectorQuery()
      .select('.salesTrend')
      .boundingClientRect((rect) => {
        const box = Array.isArray(rect) ? rect[0] : rect
        const width = Number(box?.width || 142)
        const height = Number(box?.height || 48)
        const values = getTrendValues()
        const max = Math.max(...values, 1)
        const min = Math.min(...values, 0)
        const range = Math.max(max - min, 1)
        const paddingX = 8
        const paddingY = 9
        const usableW = width - paddingX * 2
        const usableH = height - paddingY * 2
        const points = values.map((value, index) => {
          const x = paddingX + (values.length === 1 ? 0 : (index / (values.length - 1)) * usableW)
          const ratio = (value - min) / range
          const y = paddingY + (1 - ratio) * usableH
          return { x, y }
        })
        const ctx = Taro.createCanvasContext('salesTrendCanvas')
        ctx.clearRect(0, 0, width, height)
        if (points.length < 2) {
          ctx.draw()
          return
        }
        ctx.setLineCap('round')
        ctx.setLineJoin('round')
        ctx.setStrokeStyle('#3b82f6')
        ctx.setLineWidth(3)
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 0; i < points.length - 1; i += 1) {
          const current = points[i]
          const next = points[i + 1]
          const midX = (current.x + next.x) / 2
          ctx.bezierCurveTo(midX, current.y, midX, next.y, next.x, next.y)
        }
        ctx.stroke()
        ctx.draw()
      })
      .exec()
  })
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
  const startDate = formatDate(addDays(businessDate(), -6))
  try {
    const [accountStats, unpaidRows, inventories, returnRows, chartRows, memberStats] = await Promise.all([
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
      listStoreReturns(auth.token, { store_id: storeID, start_date: today, end_date: today, page: 1, page_size: 100 }),
      getHomeCharts(auth.token, {
        store_id: storeID,
        start_date: startDate,
        end_date: today,
        granularity: 'day'
      }).catch(() => null),
      loadMemberStats()
    ])
    todayAmount.value = Number(accountStats?.total_amount || 0)
    unpaidCount.value = countUnpaid(unpaidRows)
    lowStockCount.value = inventories.filter(isLowStock).length
    pendingReturnCount.value = (returnRows as StoreReturn[]).length
    salesTrend.value = Array.isArray(chartRows?.line) ? chartRows.line : []
    memberTotal.value = Number(memberStats.total || 0)
    monthNewMembers.value = Number(memberStats.monthNew || 0)
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '首页数据加载失败', icon: 'none' })
  } finally {
    drawSalesTrend()
  }
}

function go(url: string) {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
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
