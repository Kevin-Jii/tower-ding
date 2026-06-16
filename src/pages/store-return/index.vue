<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">门店返厂管理</view>
      <view class="title">返厂记录</view>
      <view class="subtitle">移动端只允许新增返厂记录</view>

      <view class="card statCard">
        <view>
          <view class="statLabel">押金合计</view>
          <view class="statValue">¥ {{ formatMoney(stats?.total_deposit) }}</view>
        </view>
        <view>
          <view class="statLabel">物流费用</view>
          <view class="statValue">¥ {{ formatMoney(stats?.logistics_fee) }}</view>
        </view>
      </view>

      <view class="card createCard">
        <view class="formTitle">新增返厂记录</view>
        <picker mode="date" fields="day" :value="returnDate" @change="onDateChange">
          <view class="pickerFake">{{ returnDate }} <text>›</text></view>
        </picker>
        <picker mode="selector" :range="productOptions" range-key="label" :value="productIndex" @change="onProductChange">
          <view class="pickerFake mt">{{ selectedProductLabel }} <text>›</text></view>
        </picker>
        <view class="qtyRow">
          <input class="input qtyInput" type="digit" :value="quantity" placeholder="数量" @input="onQtyInput" />
          <input class="input qtyInput" type="digit" :value="deposit" placeholder="单件押金" @input="onDepositInput" />
        </view>
        <input class="input mt" type="digit" :value="logisticsFee" placeholder="物流费用" @input="onLogisticsInput" />
        <input class="input mt" :value="remark" placeholder="备注（选填）" @input="onRemarkInput" />
        <view class="btn mt" @tap="submitReturn">保存返厂记录</view>
      </view>

      <view class="section-title">返厂列表</view>
      <view class="list">
        <view v-if="!returns.length" class="empty card">暂无返厂记录</view>
        <view v-for="row in returns" :key="row.id" class="row card" @tap="openDetail(row.id)">
          <view class="rowTop">
            <view>
              <view class="rowTitle">{{ row.return_no || `返厂 #${row.id}` }}</view>
              <view class="rowSub">{{ formatDate(row.return_date || row.created_at) }} · {{ row.operator_name || '-' }}</view>
            </view>
            <view class="amount">¥{{ formatMoney(row.total_deposit) }}</view>
          </view>
          <view class="rowFoot">
            <view class="tag">{{ row.item_count ?? row.items?.length ?? 0 }} 项</view>
            <view class="tag">物流 ¥{{ formatMoney(row.logistics_fee) }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh, useRouter } from '@tarojs/taro'
import { computed, ref } from 'vue'
import {
  createStoreReturn,
  getStoreReturnStats,
  listStoreReturnProducts,
  listStoreReturns,
  type StoreReturn,
  type StoreReturnProduct,
  type StoreReturnStats
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()
const router = useRouter()
const returns = ref<StoreReturn[]>([])
const products = ref<StoreReturnProduct[]>([])
const stats = ref<StoreReturnStats | null>(null)
const returnDate = ref(todayStr())
const productId = ref(0)
const quantity = ref('1')
const deposit = ref('')
const logisticsFee = ref('')
const remark = ref('')
const saving = ref(false)

const productOptions = computed(() => products.value.map((p) => ({ label: `${p.product_name || `返厂商品 #${p.id}`}（押金 ¥${formatMoney(p.deposit)}）`, value: p.id })))
const productIndex = computed(() => Math.max(0, productOptions.value.findIndex((p) => p.value === productId.value)))
const selectedProductLabel = computed(() => productOptions.value[productIndex.value]?.label || '请选择返厂商品')
const selectedProduct = computed(() => products.value.find((p) => p.id === productId.value))

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function moneyInputValue(e: any) {
  const raw = String(e?.detail?.value || '').replace(/[^\d.]/g, '')
  const [head, ...tail] = raw.split('.')
  return tail.length ? `${head}.${tail.join('').slice(0, 2)}` : head
}

function onDateChange(e: any) {
  returnDate.value = String(e?.detail?.value || returnDate.value)
}

function onProductChange(e: any) {
  const idx = Number(e?.detail?.value ?? 0)
  productId.value = Number(productOptions.value[idx]?.value || 0)
  deposit.value = String(selectedProduct.value?.deposit ?? '')
}

function onQtyInput(e: any) {
  quantity.value = moneyInputValue(e)
}

function onDepositInput(e: any) {
  deposit.value = moneyInputValue(e)
}

function onLogisticsInput(e: any) {
  logisticsFee.value = moneyInputValue(e)
}

function onRemarkInput(e: any) {
  remark.value = String(e?.detail?.value || '')
}

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function formatDate(v?: string) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

async function refresh() {
  if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
  try {
    const [rs, ps, st] = await Promise.all([
      listStoreReturns(auth.token, { store_id: auth.storeId || undefined, page: 1, page_size: 50 }),
      listStoreReturnProducts(auth.token, { store_id: auth.storeId || undefined, status: 1, page: 1, page_size: 500 }),
      getStoreReturnStats(auth.token, { store_id: auth.storeId || undefined })
    ])
    returns.value = rs
    products.value = ps
    stats.value = st
    if (!productId.value && ps[0]) {
      productId.value = ps[0].id
      deposit.value = String(ps[0].deposit ?? '')
    }
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

async function submitReturn() {
  if (!auth.token || saving.value) return
  const p = selectedProduct.value
  const qty = Number(quantity.value || 0)
  const dep = Number(deposit.value || 0)
  if (!p || !(qty > 0)) {
    Taro.showToast({ title: '请选择返厂商品并填写数量', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await createStoreReturn(auth.token, {
      store_id: auth.storeId || undefined,
      return_date: returnDate.value,
      logistics_fee: Number(logisticsFee.value || 0),
      remark: remark.value.trim(),
      items: [
        {
          product_id: p.id,
          product_name: p.product_name,
          quantity: qty,
          deposit: dep,
          remark: ''
        }
      ]
    })
    Taro.showToast({ title: '已保存', icon: 'success' })
    quantity.value = '1'
    logisticsFee.value = ''
    remark.value = ''
    await refresh()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

function openDetail(id: number) {
  Taro.navigateTo({ url: `/pages/store-return/detail?id=${id}` })
}

useDidShow(() => {
  if (String(router.params?.create || '') === '1') returnDate.value = todayStr()
  void refresh()
})

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>
