<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">当前门店</view>
      <view class="title">库存数量明细</view>
      <view class="subtitle">汇总全部 SKU 的实时数量；低于 3 会以醒目样式提示</view>

      <view v-if="lowStockCount > 0" class="banner banner--warn">
        <view class="bannerIcon">⚠</view>
        <view class="bannerText">
          <view class="bannerTitle">库存偏低提醒</view>
          <view class="bannerSub">有 {{ lowStockCount }} 个 SKU 数量 &lt; 3，建议优先补货或登记入库</view>
        </view>
      </view>

      <view class="summary card">
        <view class="sumItem">
          <view class="sumLabel">SKU 数</view>
          <view class="sumVal">{{ list.length }}</view>
        </view>
        <view class="sumDivider" />
        <view class="sumItem">
          <view class="sumLabel">数量合计</view>
          <view class="sumVal">{{ formatQty(totalQty) }}</view>
        </view>
        <view class="sumDivider" />
        <view class="sumItem">
          <view class="sumLabel">&lt;3 预警</view>
          <view class="sumVal sumVal--warn">{{ lowStockCount }}</view>
        </view>
      </view>

      <view class="section-title">全部列表</view>
      <view v-if="loading" class="hint card">加载中…</view>
      <view v-else-if="!list.length" class="hint card">暂无库存数据</view>
      <scroll-view v-else scroll-y class="stockScroll" :show-scrollbar="true">
        <view class="stockScrollInner">
          <view v-for="inv in sortedList" :key="inv.id" :class="['stockRow', isLowStock(inv) ? 'stockRow--warn' : '']">
          <view class="stockRowInner">
            <view v-if="isLowStock(inv)" class="stockAccent" />
            <view class="stockMain">
              <view class="stockName">{{ inv.product_name || `商品 #${inv.product_id || ''}` }}</view>
              <view class="stockMeta">{{ inv.store_name || '—' }} · ID {{ inv.product_id || '-' }}</view>
            </view>
            <view class="stockRight">
              <view v-if="isLowStock(inv)" class="pillWarn">偏低</view>
              <view :class="['stockQty', isLowStock(inv) ? 'stockQty--warn' : '']">
                {{ formatQty(inv.quantity) }}
                <text class="stockUnit">{{ inv.unit || '' }}</text>
              </view>
            </view>
          </view>
        </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { listInventories } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './stock-list.less'

const auth = useAuthStore()
const list = ref([])
const loading = ref(false)

function qtyNum(inv) {
  const n = Number(inv?.quantity)
  return Number.isFinite(n) ? n : NaN
}

function isLowStock(inv) {
  const n = qtyNum(inv)
  return Number.isFinite(n) && n < 3
}

const lowStockCount = computed(() => list.value.filter((i) => isLowStock(i)).length)

const totalQty = computed(() =>
  list.value.reduce((acc, i) => {
    const n = qtyNum(i)
    return acc + (Number.isFinite(n) ? n : 0)
  }, 0)
)

const sortedList = computed(() => {
  const rows = [...list.value]
  rows.sort((a, b) => {
    const wa = isLowStock(a) ? 0 : 1
    const wb = isLowStock(b) ? 0 : 1
    if (wa !== wb) return wa - wb
    return qtyNum(a) - qtyNum(b)
  })
  return rows
})

function formatQty(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

async function refresh() {
  if (!auth.token) return
  loading.value = true
  try {
    list.value = await listInventories(auth.token, {
      store_id: auth.storeId || undefined,
      page: 1,
      page_size: 100
    })
  } catch (err) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

useDidShow(() => refresh())

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>
