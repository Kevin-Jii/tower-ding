<template>
  <view class="page stockPage">
    <view class="container stockContainer">
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
          <view class="sumVal">{{ filteredList.length }}</view>
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

      <view
        v-if="categoryTabs.length > 1"
        class="categoryTabs"
      >
        <view
          v-for="tab in categoryTabs"
          :key="tab.value"
          :class="['categoryTab', activeCategory === tab.value ? 'categoryTab--on' : '']"
          @tap="activeCategory = tab.value"
        >
          {{ tab.label }}
        </view>
      </view>

      <view class="stockListPanel">
        <view class="section-title">{{ activeCategoryLabel }}列表</view>
        <view v-if="loading" class="hint card">加载中…</view>
        <view v-else-if="!sortedList.length" class="hint card">当前分类暂无库存数据</view>
        <view v-else class="stockList">
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
      </view>
    </view>
  </view>
</template>

<script setup>
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { listAllInventories, listAllStoreSupplierProducts } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './stock-list.less'

const auth = useAuthStore()
const list = ref([])
const loading = ref(false)
const activeCategory = ref('all')
const categorySource = ref([])

function qtyNum(inv) {
  const n = Number(inv?.quantity)
  return Number.isFinite(n) ? n : NaN
}

function isLowStock(inv) {
  const n = qtyNum(inv)
  return Number.isFinite(n) && n < 3
}

const categoryTabs = computed(() => {
  const seen = new Map()
  categorySource.value.forEach((i) => {
    const id = Number(i?.category_id || 0)
    const name = String(i?.category_name || '').trim()
    if (id > 0 && name && !seen.has(id)) seen.set(id, name)
  })
  const tabs = [{ label: '全部', value: 'all' }]
  seen.forEach((label, id) => {
    tabs.push({ label, value: String(id) })
  })
  return tabs
})

const activeCategoryLabel = computed(() => {
  const hit = categoryTabs.value.find((tab) => tab.value === activeCategory.value)
  return hit?.label || '全部'
})

const filteredList = computed(() => {
  if (activeCategory.value === 'all') return list.value
  return list.value.filter((i) => String(Number(i?.category_id || 0)) === activeCategory.value)
})

const lowStockCount = computed(() => filteredList.value.filter((i) => isLowStock(i)).length)

const totalQty = computed(() =>
  filteredList.value.reduce((acc, i) => {
    const n = qtyNum(i)
    return acc + (Number.isFinite(n) ? n : 0)
  }, 0)
)

const sortedList = computed(() => {
  const rows = [...filteredList.value]
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

function getProductCategoryId(product) {
  return Number(product?.category_id || product?.category?.id || product?.product?.category_id || product?.product?.category?.id || 0)
}

function getProductCategoryName(product) {
  return String(product?.category?.name || product?.category_name || product?.product?.category?.name || product?.product?.category_name || '').trim()
}

function getSupplierProductId(product) {
  return Number(product?.product_id || product?.product?.id || product?.id || 0)
}

function getSupplierProductName(product, fallback) {
  return String(product?.product_name || product?.name || product?.product?.product_name || product?.product?.name || fallback || '').trim()
}

function getSupplierProductUnit(product, fallback) {
  return String(product?.unit || product?.product?.unit || fallback || '').trim()
}

async function refresh() {
  if (!auth.token) return
  loading.value = true
  try {
    const storeId = auth.storeId || 999
    const [inventories, products] = await Promise.all([
      listAllInventories(auth.token, { store_id: storeId }),
      listAllStoreSupplierProducts(auth.token, { store_id: storeId })
    ])

    const inventoryByProductId = new Map()
    inventories.forEach((inv) => {
      const pid = Number(inv?.product_id || 0)
      if (pid > 0) inventoryByProductId.set(pid, inv)
    })

    categorySource.value = products.map((p) => ({
      category_id: getProductCategoryId(p),
      category_name: getProductCategoryName(p)
    }))

    list.value = products.map((p) => {
      const pid = getSupplierProductId(p)
      const inv = inventoryByProductId.get(pid)
      const categoryId = getProductCategoryId(p)
      const categoryName = getProductCategoryName(p)
      return {
        id: inv?.id || p?.id || pid,
        store_id: inv?.store_id || storeId,
        store_name: inv?.store_name || auth.user?.store?.name || '当前门店',
        product_id: pid,
        product_name: getSupplierProductName(p, inv?.product_name || `商品 #${pid || p?.id || ''}`),
        quantity: inv?.quantity ?? 0,
        unit: inv?.unit || getSupplierProductUnit(p, ''),
        category_id: categoryId,
        category_name: categoryName
      }
    }).filter((item) => Number(item.product_id || 0) > 0 || item.product_name)

    if (!categoryTabs.value.some((tab) => tab.value === activeCategory.value)) {
      activeCategory.value = 'all'
    }
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
