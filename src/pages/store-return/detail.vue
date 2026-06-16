<template>
  <view class="page">
    <view class="container">
      <view class="hero card">
        <view class="heroLabel">返厂单号</view>
        <view class="heroTitle">{{ detail?.return_no || `返厂 #${id}` }}</view>
        <view class="heroSub">{{ formatDate(detail?.return_date || detail?.created_at) }} · {{ detail?.operator_name || '-' }}</view>
        <view class="heroAmount">¥ {{ formatMoney(detail?.total_deposit) }}</view>
      </view>

      <view class="card summary">
        <view class="kv"><view class="k">押金总额</view><view class="v">¥ {{ formatMoney(detail?.total_deposit) }}</view></view>
        <view class="kv"><view class="k">物流费用</view><view class="v">¥ {{ formatMoney(detail?.logistics_fee) }}</view></view>
        <view class="kv"><view class="k">明细数量</view><view class="v">{{ detail?.item_count ?? detail?.items?.length ?? 0 }}</view></view>
        <view class="kv"><view class="k">备注</view><view class="v">{{ detail?.remark || '-' }}</view></view>
      </view>

      <view class="card">
        <view class="sectionHead">
          <view class="sectionTitle">返厂明细</view>
          <view class="sectionTip">{{ detail?.items?.length || 0 }} 项</view>
        </view>
        <view v-if="detail?.items?.length">
          <view v-for="item in detail?.items || []" :key="item.id" class="itemRow">
            <view class="itemTop">
              <view>
                <view class="itemTitle">{{ item.product_name || `商品 #${item.product_id}` }}</view>
                <view class="itemMeta">{{ formatQty(item.quantity) }} 件 · 单件押金 ¥{{ formatMoney(item.deposit) }}</view>
              </view>
              <view class="itemAmount">¥ {{ formatMoney(Number(item.quantity || 0) * Number(item.deposit || 0)) }}</view>
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
import { getStoreReturn, type StoreReturn } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './detail.less'

const auth = useAuthStore()
const router = useRouter()
const id = Number(router.params?.id || 0)
const detail = ref<StoreReturn | null>(null)

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

async function refresh() {
  if (!auth.token || !id) return
  try {
    detail.value = await getStoreReturn(auth.token, id)
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

useDidShow(() => refresh())
</script>
