<template>
  <view class="page">
    <view class="container">
      <!-- <input class="input search" placeholder="搜索商品名称" :value="keyword" confirm-type="search" @input="onKeywordInput"
        @confirm="refresh" /> -->
      <view class="card card-dark alert" @tap="goOrders">
        <view class="alertRow">
          <view class="alertMain">
            <view class="alertLabel">出入库单据</view>
            <view class="alertBig">累计 {{ formatInt(stats?.total_records) }} 条记录</view>
            <view class="alertSub">查看入库 / 出库单明细、原因与操作人</view>
            <view class="alertLink">进入记录 →</view>
          </view>
          <view class="alertIconWrap">
            <text class="alertIcon">📋</text>
          </view>
        </view>
      </view>
      <view class="card suggest" @tap="goForm">
        <view>
          <view class="suggestTitle">新建出入库单</view>
          <view class="suggestSub">按原因登记入库或出库，需填写商品与数量</view>
        </view>
        <view class="suggestBtn">去登记</view>
      </view>
      <view class="statsGrid">
        <view class="stat card">
          <view class="statLabel">SKU 数</view>
          <view class="statValue">{{ formatInt(stats?.total_products) }}</view>
        </view>
        <view class="stat card stat--tap" @tap="goStockList">
          <view class="statLabel">总库存量</view>
          <view class="statValue">{{ formatQty(stats?.total_quantity) }}</view>
          <view class="statHint">全部明细 ›</view>
        </view>
        <view class="stat card">
          <view class="statLabel">今日入库</view>
          <view class="statValue statValue--in">+{{ formatQty(stats?.today_in) }}</view>
        </view>
        <view class="stat card">
          <view class="statLabel">今日出库</view>
          <view class="statValue statValue--out">-{{ formatQty(stats?.today_out) }}</view>
        </view>
      </view>
      <view class="card supplierEntry" @tap="goSuppliers">
        <view class="supplierEntryRow">
          <view class="supplierEntryIconWrap">
            <text class="supplierEntryIcon">🏭</text>
          </view>
          <view class="supplierEntryMain">
            <view class="supplierEntryTitle">供应商绑定</view>
            <view class="supplierEntrySub">已绑定 {{ boundCount }} 家 </view>
          </view>
          <text class="supplierEntryArrow">›</text>
        </view>
      </view>

      <view class="card supplierEntry" @tap="goProductPricing">
        <view class="supplierEntryRow">
          <view class="supplierEntryIconWrap">
            <text class="supplierEntryIcon">📦</text>
          </view>
          <view class="supplierEntryMain">
            <view class="supplierEntryTitle">商品单位与价格</view>
            <view class="supplierEntrySub">当前门店绑定供应商商品 · 编辑单位/瓶价/箱价</view>
          </view>
          <text class="supplierEntryArrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { computed, ref, watch } from 'vue'
import {
  getInventoryStats,
  listInventories,
  listStoreBoundSuppliers,
  type InventoryStats,
  type InventoryWithProduct,
  type StoreSupplierBinding
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()
const keyword = ref('')
const stats = ref<InventoryStats | null>(null)
const list = ref<InventoryWithProduct[]>([])
const bound = ref<StoreSupplierBinding[]>([])
const tab = ref<'all' | 'short' | 'ok'>('all')

const boundCount = computed(() => bound.value.length)

let searchTimer: ReturnType<typeof setTimeout> | null = null

function onKeywordInput(e: any) {
  keyword.value = String(e?.detail?.value || '')
}

watch(keyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchTimer = null
    void refresh()
  }, 400)
})

const filteredList = computed(() => {
  const rows = list.value
  if (tab.value === 'all') return rows
  if (tab.value === 'short') return rows.filter((i) => isShort(i))
  return rows.filter((i) => !isShort(i))
})

function isShort(inv: InventoryWithProduct) {
  const q = Number(inv?.quantity)
  return Number.isFinite(q) && q <= 0
}

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
    const [s, rows, b] = await Promise.all([
      getInventoryStats(auth.token, { store_id: auth.storeId || undefined }),
      listInventories(auth.token, {
        store_id: auth.storeId || undefined,
        keyword: keyword.value.trim() || undefined,
        page: 1,
        page_size: 100
      }),
      listStoreBoundSuppliers(auth.token, { store_id: auth.storeId || undefined }).catch(() => [] as StoreSupplierBinding[])
    ])
    stats.value = s
    list.value = rows
    bound.value = b
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

function goSuppliers() {
  Taro.navigateTo({ url: '/pages/inventory/suppliers' })
}

function goProductPricing() {
  Taro.navigateTo({ url: '/pages/inventory/product-pricing' })
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
