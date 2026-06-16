<template>
  <view class="page">
    <view class="container">
      <view class="hero card">
        <view class="heroLabel">供货单号</view>
        <view class="heroTitle">{{ detail?.order_no || `供货单 #${id}` }}</view>
        <view class="heroSub">{{ detail?.customer_name || detail?.customer?.name || '-' }} · {{ formatDate(detail?.order_date || detail?.created_at) }}</view>
        <view class="heroAmount">¥ {{ formatMoney(detail?.total_amount) }}</view>
      </view>

      <view class="card summary">
        <view class="kv"><view class="k">收款状态</view><view class="v">{{ paymentLabel(detail?.payment_status) }}</view></view>
        <view class="kv"><view class="k">配送状态</view><view class="v">{{ deliveryLabel(detail?.delivery_status) }}</view></view>
        <view class="kv"><view class="k">已收金额</view><view class="v">¥ {{ formatMoney(detail?.paid_amount) }}</view></view>
        <view class="kv"><view class="k">未收金额</view><view class="v">¥ {{ formatMoney(detail?.unpaid_amount) }}</view></view>
        <view class="kv"><view class="k">毛利金额</view><view class="v">¥ {{ formatMoney(detail?.profit_amount) }}</view></view>
        <view class="kv"><view class="k">操作人</view><view class="v">{{ detail?.operator_name || '-' }}</view></view>
        <view class="kv"><view class="k">备注</view><view class="v">{{ detail?.remark || '-' }}</view></view>
      </view>

      <view class="card">
        <view class="sectionHead">
          <view class="sectionTitle">商品明细</view>
          <view class="sectionTip">{{ detail?.items?.length || 0 }} 项</view>
        </view>
        <view v-if="detail?.items?.length">
          <view v-for="item in detail?.items || []" :key="item.id" class="itemRow">
            <view class="itemTop">
              <view>
                <view class="itemTitle">{{ item.product_name || `商品 #${item.product_id}` }}</view>
                <view class="itemMeta">{{ formatQty(item.quantity) }} {{ item.unit_name || '' }} · 供货价 ¥{{ formatMoney(item.supply_price) }}</view>
              </view>
              <view class="itemAmount">¥ {{ formatMoney(item.amount) }}</view>
            </view>
          </view>
        </view>
        <view v-else class="empty">暂无明细</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { ref } from 'vue'
import { getB2BSupplyOrder, type B2BSupplyOrder } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './supply-order-detail.less'

const auth = useAuthStore()
const router = useRouter()
const id = Number(router.params?.id || 0)
const detail = ref<B2BSupplyOrder | null>(null)

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function formatQty(v: any) {
  const n = Number(v || 0)
  if (!Number.isFinite(n)) return '--'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function formatDate(v?: string) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

function paymentLabel(v?: number) {
  if (Number(v) === 3) return '已收款'
  if (Number(v) === 2) return '部分收款'
  return '未收款'
}

function deliveryLabel(v?: number) {
  if (Number(v) === 2) return '已配送'
  if (Number(v) === 3) return '已取消'
  return '待配送'
}

async function refresh() {
  if (!auth.token || !id) return
  try {
    detail.value = await getB2BSupplyOrder(auth.token, id)
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

useDidShow(() => refresh())
</script>
