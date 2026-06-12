<template>
  <view class="page">
    <view class="container">
      <view class="card hero">
        <view class="heroTop">
          <view>
            <view class="heroLabel">筛选范围内合计</view>
            <view class="heroMoney">¥ {{ formatMoney(stats?.total_amount) }}</view>
          </view>
          <view class="heroBadge">{{ stats?.count ?? 0 }} 笔</view>
        </view>
        <view class="heroSub">本页展示 {{ list.length }} 条记录</view>
        <view class="rangeRow">
          <view :class="['rangePill', range === 'month' ? 'rangePill--on' : '']" @tap="setRange('month')">本月</view>
          <view :class="['rangePill', range === 'week' ? 'rangePill--on' : '']" @tap="setRange('week')">近 7 天</view>
          <view :class="['rangePill', range === 'all' ? 'rangePill--on' : '']" @tap="setRange('all')">全部</view>
        </view>
      </view>
      <view class="card cta" @tap="goCreate">
        <view>
          <view class="ctaTitle">创建新记账</view>
          <view class="ctaSub">渠道 + 多行商品（金额可为单价×数量）</view>
        </view>
        <view class="ctaPlus">+</view>
      </view>
      <view class="grid">
        <view class="metric card">
          <view class="metricLabel">笔数</view>
          <view class="metricValue">{{ stats?.count ?? 0 }}</view>
        </view>
        <view class="metric card">
          <view class="metricLabel">笔均金额</view>
          <view class="metricValue">¥ {{ avgStat }}</view>
        </view>
      </view>

      <view class="section-title">最近记录</view>
      <view class="list">
        <view v-if="!list.length" class="empty card">暂无记账数据</view>
        <view v-for="item in list" :key="item.id" class="row card" @tap="openDetail(item.id)">
          <view class="rowTop">
            <view class="rowMain">
              <view class="rowTitle">{{ item.account_no || `记账 #${item.id}` }}</view>
              <view class="rowSub">{{ channelLabel(item.channel) }} · {{ formatDay(item.account_date || item.created_at) }}
              </view>
            </view>
            <view class="amount amount--in">¥ {{ formatMoney(item.net_income_amount ?? item.total_amount) }}</view>
          </view>
          <view class="rowFoot">
            <view class="rowMeta">净收入 ¥{{ formatMoney(item.net_income_amount) }}</view>
            <view class="rowMeta">其他支出 ¥{{ formatMoney(item.other_expense_amount) }}</view>
            <view class="rowMeta">{{ item.item_count ?? item.items?.length ?? 0 }} 项商品</view>
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
  listDictDataByTypeCode,
  listStoreAccounts,
  type DictData,
  type StoreAccount
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()
const list = ref<StoreAccount[]>([])
const stats = ref<{ total_amount?: number; count?: number } | null>(null)
const range = ref<'month' | 'week' | 'all'>('month')
const channelDict = ref<Record<string, string>>({})

const queryRange = computed(() => {
  if (range.value === 'all') return {}
  const now = new Date()
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const end = `${y}-${pad(m)}-${pad(d)}`
  if (range.value === 'month') {
    return { start_date: `${y}-${pad(m)}-01`, end_date: end }
  }
  const startDt = new Date(now)
  startDt.setDate(startDt.getDate() - 6)
  const sy = startDt.getFullYear()
  const sm = startDt.getMonth() + 1
  const sd = startDt.getDate()
  return { start_date: `${sy}-${pad(sm)}-${pad(sd)}`, end_date: end }
})

const avgStat = computed(() => {
  const c = Number(stats.value?.count || 0)
  const t = Number(stats.value?.total_amount || 0)
  if (!c) return '0'
  return formatMoney(t / c)
})

function setRange(r: 'month' | 'week' | 'all') {
  range.value = r
  void refresh()
}

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function formatDay(v?: string) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

function mapDict(rows: DictData[]) {
  const map: Record<string, string> = {}
  rows.forEach((r) => {
    const value = String(r?.value || '').trim()
    if (!value) return
    map[value] = String(r?.label || r?.value || '').trim() || value
  })
  return map
}

function channelLabel(channel?: string) {
  const code = String(channel || '').trim()
  if (!code) return '—'
  return channelDict.value[code] || code
}

async function loadChannelDict() {
  if (!auth.token) return
  try {
    const rows = await listDictDataByTypeCode(auth.token, 'sales_channel')
    channelDict.value = mapDict(rows)
  } catch {
    channelDict.value = {}
  }
}

async function refresh() {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  const q = queryRange.value
  try {
    const [accounts, accountStats] = await Promise.all([
      listStoreAccounts(auth.token, {
        store_id: auth.storeId || undefined,
        start_date: q.start_date,
        end_date: q.end_date,
        page: 1,
        page_size: 40
      }),
      getStoreAccountStats(auth.token, {
        store_id: auth.storeId || undefined,
        start_date: q.start_date,
        end_date: q.end_date
      })
    ])
    list.value = accounts
    stats.value = accountStats
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

function openDetail(id: number) {
  Taro.navigateTo({ url: `/pages/accounting/detail?id=${id}` })
}

function goCreate() {
  Taro.navigateTo({ url: '/pages/accounting/create' })
}

useDidShow(() => refresh())
useDidShow(() => {
  void loadChannelDict()
})

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>
