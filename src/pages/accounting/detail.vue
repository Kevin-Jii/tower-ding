<template>
  <view class="page">
    <view class="container">
      <view class="hero card">
        <view class="heroLabel">记账编号</view>
        <view class="heroTitle">{{ detail?.account_no || detail?.order_no || `记账 #${id}` }}</view>
        <view class="heroSub">{{ detail?.store?.name || '当前门店' }} · {{ formatDate(detail?.account_date ||
          detail?.created_at) }}</view>
        <view class="heroAmount">¥ {{ formatMoney(detail?.net_income_amount ?? detail?.total_amount ?? detail?.amount)
        }}</view>
      </view>

      <view class="card summary">
        <view class="sectionHead">
          <view class="sectionTitle">基础信息</view>
        </view>
        <view class="kv">
          <view class="k">总金额</view>
          <view class="v">¥ {{ formatMoney(displayTotalAmount) }}</view>
        </view>
        <view class="kv">
          <view class="k">其他支出</view>
          <view class="v">¥ {{ formatMoney(detail?.other_expense_amount) }}</view>
        </view>
        <view class="kv">
          <view class="k">跑腿费用</view>
          <view class="v">¥ {{ formatMoney(detail?.errand_fee) }}</view>
        </view>
        <view class="kv">
          <view class="k">耗材金额</view>
          <view class="v">¥ {{ formatMoney(consumableAmount) }}</view>
        </view>
        <view class="kv">
          <view class="k">渠道</view>
          <view class="v">{{ channelLabel(detail?.channel) }}</view>
        </view>
        <view class="kv">
          <view class="k">订单号</view>
          <view class="v">{{ detail?.order_no || detail?.account_no || '-' }}</view>
        </view>
        <view class="kv">
          <view class="k">门店</view>
          <view class="v">{{ detail?.store?.name || detail?.store?.id || '-' }}</view>
        </view>
        <view class="kv">
          <view class="k">操作人</view>
          <view class="v">{{ operatorName }}</view>
        </view>
        <view class="kv">
          <view class="k">记账日期</view>
          <view class="v">{{ formatDate(detail?.account_date || detail?.created_at) }}</view>
        </view>
        <view class="kv">
          <view class="k">标签</view>
          <view class="v">{{ detail?.tag_name || '-' }}</view>
        </view>
        <view class="kv">
          <view class="k">备注</view>
          <view class="v">{{ detail?.remark || '无' }}</view>
        </view>
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
                <view class="itemMeta">
                  {{ formatQty(item.quantity) }} {{ item.unit || '' }}
                  <text v-if="item.spec"> · {{ item.spec }}</text>
                  <text> · 单价 ¥ {{ formatMoney(item.price) }}/{{ item.unit || '-' }}</text>
                </view>
              </view>
              <view class="itemAmount">¥ {{ formatMoney(item.amount) }}</view>
            </view>
            <view v-if="item.remark" class="itemRemark">{{ item.remark }}</view>
          </view>
        </view>
        <view v-else class="empty">暂无明细数据</view>
      </view>

      <view class="card">
        <view class="sectionHead">
          <view class="sectionTitle">消耗品</view>
          <view class="sectionTip">{{ detail?.consumables?.length || 0 }} 项</view>
        </view>
        <view v-if="detail?.consumables?.length">
          <view v-for="item in detail?.consumables || []" :key="item.id" class="itemRow">
            <view class="itemTop">
              <view>
                <view class="itemTitle">{{ item.product_name || `消耗品 #${item.product_id}` }}</view>
                <view class="itemMeta">
                  {{ formatQty(item.quantity) }} {{ item.unit || '' }}
                  <text> · 单价 ¥ {{ formatMoney(item.price) }}</text>
                </view>
              </view>
              <view class="itemAmount">¥ {{ formatMoney(item.amount) }}</view>
            </view>
            <view v-if="item.remark" class="itemRemark">{{ item.remark }}</view>
          </view>
        </view>
        <view v-else class="empty">暂无消耗品</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { computed, ref } from 'vue'
import {
  getStoreAccountDetail,
  listDictDataByTypeCode,
  type DictData,
  type StoreAccount
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './detail.less'

const auth = useAuthStore()
const router = useRouter()
const id = Number(router.params?.id || 0)
const detail = ref<StoreAccount | null>(null)
const channelDict = ref<Record<string, string>>({})

const operatorName = computed(() => {
  const operator = detail.value?.operator
  return operator?.nickname || operator?.username || operator?.phone || '-'
})
const displayTotalAmount = computed(() => {
  const item = detail.value
  if (!item) return 0
  return item.total_amount ?? item.amount
})
const consumableAmount = computed(() => {
  return (detail.value?.consumables || []).reduce((sum, c) => sum + Number(c.amount || 0), 0)
})
const itemCostAmount = computed(() => {
  return (detail.value?.items || []).reduce((sum, item: any) => {
    const direct = Number(item.cost_amount ?? item.cost_total ?? 0)
    if (direct > 0) return sum + direct
    const unitCost = Number(item.cost_price ?? item.unit_cost ?? 0)
    const qty = Number(item.quantity || 0)
    return sum + unitCost * qty
  }, 0)
})

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
  if (!code) return '-'
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
  if (!auth.token || !id) return
  try {
    const data = await getStoreAccountDetail(auth.token, id)
    detail.value = data
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

useDidShow(() => {
  void Promise.all([refresh(), loadChannelDict()])
})
</script>
