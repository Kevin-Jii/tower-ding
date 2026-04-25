<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">采购流程 / 详情</view>
      <view class="title">采购单详情</view>
      <view class="subtitle">订单信息、供应商分组和商品明细统一查看</view>

      <view class="hero card card-dark">
        <view class="heroLabel">订单状态</view>
        <view class="heroTitle">{{ detail?.order_no || `采购单 #${id}` }}</view>
        <view class="heroSub">{{ detail?.store?.name || '当前门店' }} · {{ formatDate(detail?.order_date || detail?.created_at) }}</view>
        <view class="heroFooter">
          <view :class="['statusBadge', statusClass(detail?.status)]">{{ formatStatus(detail?.status) }}</view>
          <view class="heroAmount">¥ {{ formatMoney(detail?.total_amount) }}</view>
        </view>
      </view>

      <view class="actionBar" v-if="actions.length">
        <view
          v-for="action in actions"
          :key="action"
          :class="['actionBtn', actionBtnClass(action), pendingAction === action ? 'actionBtn--loading' : '']"
          @tap="handleAction(action)"
        >
          {{ pendingAction === action ? '处理中...' : actionLabel(action) }}
        </view>
      </view>

      <view class="card summary">
        <view class="sectionHead">
          <view class="sectionTitle">订单信息</view>
        </view>
        <view class="kv">
          <view class="k">订单编号</view>
          <view class="v">{{ detail?.order_no || '-' }}</view>
        </view>
        <view class="kv">
          <view class="k">创建人</view>
          <view class="v">{{ creatorName }}</view>
        </view>
        <view class="kv">
          <view class="k">下单日期</view>
          <view class="v">{{ formatDate(detail?.order_date || detail?.created_at) }}</view>
        </view>
        <view class="kv">
          <view class="k">更新时间</view>
          <view class="v">{{ formatDateTime(detail?.updated_at) }}</view>
        </view>
        <view class="kv">
          <view class="k">订单备注</view>
          <view class="v">{{ detail?.remark || '无' }}</view>
        </view>
      </view>

      <view class="card" v-if="supplierGroups.length">
        <view class="sectionHead">
          <view class="sectionTitle">按供应商分组</view>
        </view>
        <view v-for="group in supplierGroups" :key="group.supplier_id" class="groupBlock">
          <view class="groupHeader">
            <view>
              <view class="groupName">{{ group.supplier_name || `供应商 #${group.supplier_id}` }}</view>
              <view class="groupMeta">{{ group.items?.length || 0 }} 个商品</view>
            </view>
            <view class="groupAmount">¥ {{ formatMoney(group.sub_total) }}</view>
          </view>
          <view v-for="item in group.items || []" :key="item.id" class="groupItem">
            <view>
              <view class="itemTitle">{{ item.product_name || `商品 #${item.product_id}` }}</view>
              <view class="itemMeta">{{ formatQty(item.quantity) }} {{ item.unit || '' }} · 单价 ¥ {{ formatMoney(item.unit_price) }}</view>
            </view>
            <view class="itemAmount">¥ {{ formatMoney(item.amount) }}</view>
          </view>
        </view>
      </view>

      <view class="card">
        <view class="sectionHead">
          <view class="sectionTitle">商品明细</view>
          <view class="sectionTip">{{ detail?.items?.length || 0 }} 项</view>
        </view>
        <view v-if="detail?.items?.length">
          <view v-for="item in detail?.items || []" :key="item.id" class="detailItem">
            <view class="detailItemTop">
              <view>
                <view class="itemTitle">{{ item.product?.name || `商品 #${item.product?.id || item.id}` }}</view>
                <view class="itemMeta">
                  {{ item.supplier?.supplier_name || `供应商 #${item.supplier_id || '-'}` }}
                  · {{ formatQty(item.quantity) }} {{ item.product?.unit || '' }}
                </view>
              </view>
              <view class="itemAmount">¥ {{ formatMoney(item.amount) }}</view>
            </view>
            <view class="detailRemark" v-if="item.remark">{{ item.remark }}</view>
          </view>
        </view>
        <view v-else class="empty">暂无商品明细</view>
      </view>

      <view class="card raw">
        <view class="sectionHead">
          <view class="sectionTitle">原始数据</view>
        </view>
        <view class="rawText">{{ pretty }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { computed, ref } from 'vue'
import {
  cancelPurchaseOrder,
  completePurchaseOrder,
  confirmPurchaseOrder,
  getPurchaseOrderActions,
  getPurchaseOrderDetail,
  getPurchaseOrderSupplierGroups,
  type PurchaseOrder,
  type SupplierGroupedItems
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './detail.less'

const auth = useAuthStore()
const router = useRouter()
const id = Number(router.params?.id || 0)
const detail = ref<PurchaseOrder | null>(null)
const supplierGroups = ref<SupplierGroupedItems[]>([])
const actions = ref<string[]>([])
const pendingAction = ref('')

const pretty = computed(() => JSON.stringify(detail.value || {}, null, 2))
const creatorName = computed(() => {
  const creator = detail.value?.creator
  return creator?.nickname || creator?.username || creator?.phone || '-'
})

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(0) : '0'
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

function formatDateTime(v?: string) {
  if (!v) return '-'
  return String(v).replace('T', ' ').slice(0, 16)
}

function formatStatus(v: any) {
  if (v === 1 || v === '1') return '待审核'
  if (v === 2 || v === '2') return '待到货'
  if (v === 3 || v === '3') return '已完成'
  if (v === 4 || v === '4') return '已取消'
  return '未知状态'
}

function statusClass(v: any) {
  if (v === 1 || v === '1') return 'statusBadge--pending'
  if (v === 2 || v === '2') return 'statusBadge--confirmed'
  if (v === 3 || v === '3') return 'statusBadge--done'
  if (v === 4 || v === '4') return 'statusBadge--cancelled'
  return ''
}

function actionLabel(action: string) {
  if (action === 'confirm') return '确认订单'
  if (action === 'complete') return '完成订单'
  if (action === 'cancel') return '取消订单'
  return action
}

function actionBtnClass(action: string) {
  if (action === 'cancel') return 'actionBtn--ghost'
  return ''
}

async function refresh() {
  if (!auth.token || !id) return
  try {
    const [order, groups, actionList] = await Promise.all([
      getPurchaseOrderDetail(auth.token, id),
      getPurchaseOrderSupplierGroups(auth.token, id),
      getPurchaseOrderActions(auth.token, id)
    ])
    detail.value = order
    supplierGroups.value = groups
    actions.value = actionList
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

async function handleAction(action: string) {
  if (!auth.token || !id || pendingAction.value) return
  pendingAction.value = action
  Taro.showLoading({ title: '处理中' })
  try {
    if (action === 'confirm') await confirmPurchaseOrder(auth.token, id)
    else if (action === 'complete') await completePurchaseOrder(auth.token, id)
    else if (action === 'cancel') await cancelPurchaseOrder(auth.token, id)
    await refresh()
    Taro.hideLoading()
    Taro.showToast({ title: '操作成功', icon: 'success' })
  } catch (err: any) {
    Taro.hideLoading()
    Taro.showToast({ title: err?.message || '操作失败', icon: 'none' })
  } finally {
    pendingAction.value = ''
  }
}

useDidShow(() => refresh())
</script>
