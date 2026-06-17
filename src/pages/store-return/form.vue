<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">门店返厂管理</view>
      <view class="title">新增返厂记录</view>

      <view class="card formCard">
        <view class="fieldLabel">返厂日期</view>
        <picker mode="date" fields="day" :value="returnDate" @change="onDateChange">
          <view class="pickerFake">{{ returnDate }} <text>›</text></view>
        </picker>

        <view class="fieldLabel fieldLabel--spaced">选择商品</view>
        <view class="productGrid">
          <view
            v-for="product in products"
            :key="product.id"
            :class="['productOption', isSelected(product.id) ? 'productOption--on' : '']"
            @tap="toggleProduct(product)"
          >
            <view class="productName">{{ product.product_name || `返厂商品 #${product.id}` }}</view>
            <view class="productDeposit">押金 ¥{{ formatMoney(product.deposit) }}</view>
          </view>
        </view>
        <view v-if="!products.length" class="emptyProducts">暂无可返厂商品</view>

        <view v-if="lines.length" class="selectedBlock">
          <view class="selectedTitle">已选商品</view>
          <view v-for="line in lines" :key="line.product_id" class="returnLine">
            <view class="lineHead">
              <view class="lineTitle">{{ line.product_name || `商品 #${line.product_id}` }}</view>
              <view class="lineRemove" @tap="removeLineByProduct(line.product_id)">移除</view>
            </view>
            <view class="qtyRow">
              <input class="input qtyInput" type="digit" :value="line.quantity" placeholder="数量" @input="onQtyInput(line.product_id, $event)" />
              <input class="input qtyInput" type="digit" :value="line.deposit" placeholder="单件押金" @input="onDepositInput(line.product_id, $event)" />
            </view>
          </view>
        </view>

        <input class="input mt" type="digit" :value="logisticsFee" placeholder="物流费用" @input="onLogisticsInput" />
        <input class="input mt" :value="remark" placeholder="备注（选填）" @input="onRemarkInput" />
        <view :class="['btn', 'mt', saving ? 'btn--disabled' : '']" @tap="submitReturn">
          {{ saving ? '保存中...' : '保存返厂记录' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow } from '@tarojs/taro'
import { ref } from 'vue'
import { createStoreReturn, listStoreReturnProducts, type StoreReturnProduct } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './form.less'

type ReturnLine = {
  product_id: number
  product_name: string
  quantity: string
  deposit: string
}

const auth = useAuthStore()
const products = ref<StoreReturnProduct[]>([])
const returnDate = ref(todayStr())
const lines = ref<ReturnLine[]>([])
const logisticsFee = ref('')
const remark = ref('')
const saving = ref(false)

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

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function onDateChange(e: any) {
  returnDate.value = String(e?.detail?.value || returnDate.value)
}

function isSelected(productID?: number) {
  return lines.value.some((line) => line.product_id === Number(productID || 0))
}

function toggleProduct(product: StoreReturnProduct) {
  const productID = Number(product.id || 0)
  if (!productID) return
  if (isSelected(productID)) {
    removeLineByProduct(productID)
    return
  }
  lines.value.push({
    product_id: productID,
    product_name: product.product_name || '',
    quantity: '1',
    deposit: String(product.deposit ?? '')
  })
}

function removeLineByProduct(productID: number) {
  lines.value = lines.value.filter((line) => line.product_id !== Number(productID || 0))
}

function findLine(productID: number) {
  return lines.value.find((line) => line.product_id === Number(productID || 0))
}

function onQtyInput(productID: number, e: any) {
  const line = findLine(productID)
  if (!line) return
  line.quantity = moneyInputValue(e)
}

function onDepositInput(productID: number, e: any) {
  const line = findLine(productID)
  if (!line) return
  line.deposit = moneyInputValue(e)
}

function onLogisticsInput(e: any) {
  logisticsFee.value = moneyInputValue(e)
}

function onRemarkInput(e: any) {
  remark.value = String(e?.detail?.value || '')
}

async function loadProducts() {
  if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
  try {
    products.value = await listStoreReturnProducts(auth.token, {
      store_id: auth.storeId || undefined,
      status: 1,
      page: 1,
      page_size: 500
    })
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载商品失败', icon: 'none' })
  }
}

async function submitReturn() {
  if (!auth.token || saving.value) return
  const items = []
  for (const line of lines.value) {
    const qty = Number(line.quantity || 0)
    const dep = Number(line.deposit || 0)
    if (!(line.product_id > 0) || !(qty > 0)) {
      Taro.showToast({ title: '请完善返厂商品和数量', icon: 'none' })
      return
    }
    items.push({
      product_id: line.product_id,
      product_name: line.product_name,
      quantity: qty,
      deposit: dep,
      remark: ''
    })
  }
  if (!items.length) {
    Taro.showToast({ title: '请至少选择一个返厂商品', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await createStoreReturn(auth.token, {
      store_id: auth.storeId || undefined,
      return_date: returnDate.value,
      logistics_fee: Number(logisticsFee.value || 0),
      remark: remark.value.trim(),
      items
    })
    Taro.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      Taro.navigateBack()
    }, 350)
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

useDidShow(() => {
  void loadProducts()
})
</script>
