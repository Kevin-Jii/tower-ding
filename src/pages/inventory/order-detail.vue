<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">出入库单</view>
      <view class="title">单据详情</view>
      <view class="subtitle">{{ detail?.order_no || `单号 #${id}` }}</view>

      <view class="hero card card-dark">
        <view class="heroLabel">{{ detail?.type === 2 ? '出库' : '入库' }}</view>
        <view class="heroTitle">{{ detail?.reason || '—' }}</view>
        <view class="heroSub">{{ detail?.store_name || '-' }} · {{ formatDate(detail?.created_at) }}</view>
        <view class="heroFooter">
          <view class="heroMeta">总量 {{ formatQty(detail?.total_quantity) }}</view>
          <view class="heroMeta">{{ detail?.operator_name || '-' }}</view>
        </view>
      </view>

      <view class="card summary">
        <view class="sectionHead">
          <view class="sectionTitle">基本信息</view>
        </view>
        <view class="kv">
          <view class="k">单号</view>
          <view class="v">{{ detail?.order_no || '-' }}</view>
        </view>
        <view class="kv">
          <view class="k">备注</view>
          <view class="v">{{ detail?.remark || '无' }}</view>
        </view>
        <view class="kv">
          <view class="k">操作人手机</view>
          <view class="v">{{ detail?.operator_phone || '-' }}</view>
        </view>
      </view>

      <view class="card">
        <view class="sectionHead">
          <view class="sectionTitle">商品明细</view>
          <view class="sectionTip">{{ detail?.items?.length || 0 }} 项</view>
        </view>
        <view v-if="detail?.items?.length">
          <view v-for="it in detail.items" :key="it.id" class="itemRow">
            <view class="itemTop">
              <view>
                <view class="itemTitle">{{ it.product_name || `商品 #${it.product_id}` }}</view>
                <view class="itemMeta">
                  {{ formatQty(it.quantity) }} {{ it.unit || '' }}
                  <text v-if="it.production_date"> · 生产 {{ formatDay(it.production_date) }}</text>
                  <text v-if="it.expiry_date"> · 效期 {{ formatDay(it.expiry_date) }}</text>
                </view>
              </view>
            </view>
            <view v-if="it.remark" class="itemRemark">{{ it.remark }}</view>
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
import { getInventoryOrder, type InventoryOrder } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './order-detail.less'

const auth = useAuthStore()
const router = useRouter()
const id = Number(router.params?.id || 0)
const detail = ref<InventoryOrder | null>(null)

function formatQty(v: any) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '--'
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function formatDate(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 19)
}

function formatDay(v?: string) {
  if (!v) return ''
  return String(v).slice(0, 10)
}

async function refresh() {
  if (!auth.token || !id) return
  try {
    detail.value = await getInventoryOrder(auth.token, id)
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

useDidShow(() => refresh())
</script>