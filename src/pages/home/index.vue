<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">早上好，{{ storeName }}</view>
      <view class="title">经营统计</view>

      <view class="hero card card-dark">
        <view class="heroTop">
          <view>
            <view class="heroLabel">净利润</view>
            <view class="heroTitle">¥ {{ formatMoney(overview?.net_profit_amount) }}</view>
          </view>
          <view class="heroTag">{{ dateRangeText }}</view>
        </view>
        <view class="heroSub">
          <text>毛利润 ¥{{ formatMoney(overview?.gross_profit_amount) }}</text>
          <text>出库成本 ¥{{ formatMoney(overview?.outbound_amount) }}</text>
        </view>
      </view>

      <view class="rangeRow">
        <view :class="['rangePill', range === 'today' ? 'rangePill--on' : '']" @tap="setRange('today')">今天</view>
        <view :class="['rangePill', range === 'week' ? 'rangePill--on' : '']" @tap="setRange('week')">近7天</view>
        <view :class="['rangePill', range === 'month' ? 'rangePill--on' : '']" @tap="setRange('month')">本月</view>
      </view>

      <view class="grid">
        <view class="metric card">
          <view class="metricLabel">销售额（售价）</view>
          <view class="metricValue">¥ {{ formatMoney(overview?.sales_amount) }}</view>
          <view class="metricHint">按销售价格汇总</view>
        </view>
        <view class="metric card">
          <view class="metricLabel">其他支出</view>
          <view class="metricValue">¥ {{ formatMoney(overview?.other_expense_amount) }}</view>
          <view class="metricHint">人工录入支出合计</view>
        </view>
        <view class="metric card">
          <view class="metricLabel">入库成本</view>
          <view class="metricValue">¥ {{ formatMoney(overview?.inbound_amount) }}</view>
          <view class="metricHint">按成本价估算</view>
        </view>
        <view class="metric card">
          <view class="metricLabel">出库成本</view>
          <view class="metricValue">¥ {{ formatMoney(overview?.outbound_amount) }}</view>
          <view class="metricHint">销售消耗对应成本</view>
        </view>
      </view>

      <view class="focus card">
        <view class="focusTitle">单据概览</view>
        <view class="focusGrid">
          <view class="focusItem">
            <view class="focusDot focusDot--dark" />
            <view>
            <view class="focusItemTitle">销售单数</view>
            <view class="focusItemSub">{{ overview?.sales_order_count ?? 0 }} 单</view>
            </view>
          </view>
          <view class="focusItem">
            <view class="focusDot focusDot--warn" />
            <view>
            <view class="focusItemTitle">入库单数</view>
            <view class="focusItemSub">{{ overview?.inventory_in_count ?? 0 }} 单</view>
            </view>
          </view>
          <view class="focusItem">
            <view class="focusDot focusDot--blue" />
            <view>
            <view class="focusItemTitle">出库单数</view>
            <view class="focusItemSub">{{ overview?.inventory_out_count ?? 0 }} 单</view>
            </view>
          </view>
        </view>
      </view>

      <view class="card categoryCard">
        <view class="sectionTitle">品类金额预览</view>
        <view v-if="!categoriesTop.length" class="emptyMini">暂无品类数据</view>
        <view v-for="(c, idx) in categoriesTop" :key="`${c.category_id || idx}`" class="categoryRow">
          <view class="categoryName">{{ c.category_name || `品类 #${c.category_id || idx + 1}` }}</view>
          <view class="categoryVals">
            <text>入 ¥{{ formatMoney(categoryInAmount(c)) }}</text>
            <text>出 ¥{{ formatMoney(categoryOutAmount(c)) }}</text>
            <text>净 ¥{{ formatMoney(c.net_amount) }}</text>
          </view>
        </view>
      </view>

      <view class="card chartCard">
        <view class="sectionTitle">销售趋势</view>
        <view v-if="!lineHasData" class="emptyMini">暂无趋势数据</view>
        <view v-else class="chartWrap">
          <canvas canvas-id="homeChartLine" class="chartCanvas" />
        </view>
      </view>

      <view class="card chartCard">
        <view class="sectionTitle">渠道占比</view>
        <view v-if="!pieHasData" class="emptyMini">暂无渠道数据</view>
        <view v-else class="chartWrap chartWrap--pie">
          <canvas canvas-id="homeChartPie" class="chartCanvas" />
        </view>
      </view>

      <view class="card chartCard">
        <view class="sectionTitle">经营雷达</view>
        <view v-if="!radarHasData" class="emptyMini">暂无雷达指标</view>
        <view v-else class="chartWrap chartWrap--radar">
          <canvas canvas-id="homeChartRadar" class="chartCanvas" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { getBusinessOverview, getHomeCharts, type BusinessOverview, type HomeCharts } from '../../services/api'
import { useAuthStore } from '../../stores/auth'

import './index.less'

const auth = useAuthStore()
const overview = ref<BusinessOverview | null>(null)
const charts = ref<HomeCharts | null>(null)
const range = ref<'today' | 'week' | 'month'>('today')

const storeName = computed(() => auth.user?.store?.name || auth.user?.nickname || '门店')
const categoriesTop = computed(() => (overview.value?.categories || []).slice(0, 5))

const queryRange = computed(() => {
  const now = new Date()
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const endDate = fmt(now)
  if (range.value === 'today') return { start_date: endDate, end_date: endDate }
  if (range.value === 'week') {
    const start = new Date(now)
    start.setDate(start.getDate() - 6)
    return { start_date: fmt(start), end_date: endDate }
  }
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return { start_date: fmt(monthStart), end_date: endDate }
})

const dateRangeText = computed(() => `${queryRange.value.start_date} ~ ${queryRange.value.end_date}`)
/** 后端 home-charts 仅支持 day / month；近 7 天按自然日聚合 */
const granularity = computed<'day' | 'month'>(() => (range.value === 'month' ? 'month' : 'day'))

const lineX = computed(() => (charts.value?.line || []).map((i) => i.date || ''))
const lineSales = computed(() => (charts.value?.line || []).map((i) => Number(i.amount || 0)))
const lineOrders = computed(() => (charts.value?.line || []).map((i) => Number(i.orders || 0)))

const lineHasData = computed(() => lineX.value.length > 0)
const pieHasData = computed(() => (charts.value?.pie || []).length > 0)
const radarHasData = computed(() => (charts.value?.radar || []).length > 0)

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '--'
}

function categoryInAmount(row: any) {
  return row?.inbound_amount ?? row?.in_amount
}

function categoryOutAmount(row: any) {
  return row?.outbound_amount ?? row?.out_amount
}

function setRange(v: 'today' | 'week' | 'month') {
  range.value = v
  void refresh()
}

async function renderCharts() {
  if (!charts.value) return
  await new Promise<void>((r) => setTimeout(() => r(), 80))
  drawLineChart()
  drawPieChart()
  drawRadarChart()
}

function drawLineChart() {
  if (!lineHasData.value) return
  const ctx = Taro.createCanvasContext('homeChartLine')
  const w = 300
  const h = 180
  const pl = 34
  const pr = 12
  const pt = 18
  const pb = 26
  ctx.clearRect(0, 0, w, h)
  const maxSales = Math.max(...lineSales.value, 1)
  const maxOrders = Math.max(...lineOrders.value, 1)
  const count = Math.max(lineX.value.length - 1, 1)
  const chartW = w - pl - pr
  const chartH = h - pt - pb

  ctx.setStrokeStyle('#d9dee8')
  ctx.setLineWidth(1)
  for (let i = 0; i <= 4; i++) {
    const y = pt + (chartH / 4) * i
    ctx.beginPath()
    ctx.moveTo(pl, y)
    ctx.lineTo(w - pr, y)
    ctx.stroke()
  }

  ctx.setStrokeStyle('#6176d8')
  ctx.setLineWidth(2)
  ctx.beginPath()
  lineSales.value.forEach((v, i) => {
    const x = pl + (chartW / count) * i
    const y = pt + chartH - (v / maxSales) * chartH
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  ctx.setStrokeStyle('#d06c4a')
  ctx.setLineWidth(2)
  ctx.beginPath()
  lineOrders.value.forEach((v, i) => {
    const x = pl + (chartW / count) * i
    const y = pt + chartH - (v / maxOrders) * chartH
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  ctx.setFillStyle('#7a8392')
  ctx.setFontSize(10)
  const picks = [0, Math.floor(count / 2), count]
  picks.forEach((p) => {
    const i = Math.min(Math.max(p, 0), lineX.value.length - 1)
    const x = pl + (chartW / count) * i
    const t = (lineX.value[i] || '').slice(5)
    ctx.fillText(t, x - 12, h - 6)
  })

  ctx.draw()
}

function drawPieChart() {
  const rows = charts.value?.pie || []
  if (!rows.length) return
  const ctx = Taro.createCanvasContext('homeChartPie')
  const w = 300
  const h = 200
  const cx = w / 2
  const cy = 85
  const r = 54
  const total = rows.reduce((s, i) => s + Number(i.amount || 0), 0) || 1
  const colors = ['#6176d8', '#4cbf8a', '#f0a54a', '#d06c4a', '#8f74ff', '#3aa0ff']

  ctx.clearRect(0, 0, w, h)
  let start = -Math.PI / 2
  rows.forEach((it, idx) => {
    const val = Number(it.amount || 0)
    const angle = (val / total) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.setFillStyle(colors[idx % colors.length])
    ctx.arc(cx, cy, r, start, start + angle)
    ctx.closePath()
    ctx.fill()
    start += angle
  })

  ctx.setFillStyle('#ffffff')
  ctx.beginPath()
  ctx.arc(cx, cy, 28, 0, Math.PI * 2)
  ctx.fill()

  ctx.setFillStyle('#6e7785')
  ctx.setFontSize(10)
  const top = rows.slice(0, 3)
  top.forEach((it, i) => {
    const c = colors[i % colors.length]
    const y = 150 + i * 16
    ctx.setFillStyle(c)
    ctx.fillRect(22, y - 7, 7, 7)
    ctx.setFillStyle('#6e7785')
    const pct = Number(it.percent || 0).toFixed(1)
    const label = `${it.channel_name || it.channel || '—'} ${pct}%`
    ctx.fillText(label, 34, y)
  })
  ctx.draw()
}

function drawRadarChart() {
  const rows = charts.value?.radar || []
  if (!rows.length) return
  const ctx = Taro.createCanvasContext('homeChartRadar')
  const w = 300
  const h = 200
  const cx = w / 2
  const cy = 98
  const radius = 62
  const n = rows.length
  const vals = rows.map((r) => Number(r.value || 0))
  const max = Math.max(...vals, 1)

  ctx.clearRect(0, 0, w, h)
  ctx.setStrokeStyle('#d9dee8')
  for (let level = 1; level <= 4; level++) {
    const rr = (radius * level) / 4
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = (-Math.PI / 2) + (Math.PI * 2 * i) / n
      const x = cx + Math.cos(a) * rr
      const y = cy + Math.sin(a) * rr
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }

  ctx.setStrokeStyle('#6176d8')
  ctx.setFillStyle('rgba(97,118,216,0.20)')
  ctx.beginPath()
  vals.forEach((v, i) => {
    const a = (-Math.PI / 2) + (Math.PI * 2 * i) / n
    const rr = (v / max) * radius
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.setFillStyle('#6e7785')
  ctx.setFontSize(10)
  rows.forEach((r, i) => {
    const a = (-Math.PI / 2) + (Math.PI * 2 * i) / n
    const x = cx + Math.cos(a) * (radius + 16)
    const y = cy + Math.sin(a) * (radius + 16)
    const t = String(r.name || '—')
    ctx.fillText(t, x - t.length * 5, y)
  })
  ctx.draw()
}

async function refresh() {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  try {
    const [ov, ch] = await Promise.all([
      getBusinessOverview(auth.token, {
        store_id: auth.storeId || undefined,
        start_date: queryRange.value.start_date,
        end_date: queryRange.value.end_date
      }),
      getHomeCharts(auth.token, {
        store_id: auth.storeId || undefined,
        start_date: queryRange.value.start_date,
        end_date: queryRange.value.end_date,
        granularity: granularity.value
      })
    ])
    overview.value = { ...ov, ...(ch?.overview || {}) }
    charts.value = ch
    void renderCharts()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  } finally {
    Taro.stopPullDownRefresh()
  }
}

useDidShow(() => {
  void refresh()
})

usePullDownRefresh(() => {
  void refresh()
})
</script>
