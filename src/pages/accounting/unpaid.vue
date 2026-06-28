<template>
  <view class="page">
    <view class="container">
      <view class="card searchCard">
        <view class="searchTitle">未支付订单</view>
        <view class="searchRow">
          <input
            class="searchInput"
            :value="memberKeyword"
            placeholder="搜索会员名称 / 手机号"
            confirm-type="search"
            @input="onKeywordInput"
            @confirm="refresh"
          />
          <view class="searchBtn" @tap="refresh">搜索</view>
        </view>
      </view>

      <view class="sectionHead">
        <view class="section-title">待处理列表</view>
        <view class="sectionCount">{{ list.length }} 笔</view>
      </view>

      <view class="list">
        <view v-if="loading" class="empty card">正在加载未支付订单…</view>
        <view v-else-if="!list.length" class="empty card">暂无未支付订单</view>
        <view v-for="item in list" :key="item.id" class="row card">
          <view class="rowTop">
            <view class="rowMain">
              <view class="rowTitle">{{ rowDisplayNo(item) }}</view>
              <view class="rowSub">{{ channelText(item) }} · {{ formatDate(item.account_date || item.created_at) }}</view>
            </view>
            <view class="amount amount--in">¥ {{ formatMoney(item.gross_total_amount ?? item.total_amount ?? item.amount) }}</view>
          </view>
          <view class="rowFoot">
            <view class="rowMeta">会员 {{ accountMemberLabel(item) }}</view>
            <view class="rowMeta">商品 {{ item.item_count ?? item.items?.length ?? 0 }} 项</view>
            <view class="rowMeta rowMeta--warn">未支付</view>
          </view>
          <view class="rowActions rowActions--right">
            <view :class="['miniBtn', 'miniBtn--dark', savingId === item.id ? 'miniBtn--disabled' : '']" @tap="markPaid(item)">
              {{ savingId === item.id ? '处理中…' : '标记已支付' }}
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { ref } from 'vue'
import {
  listDictDataByTypeCode,
  listStoreAccounts,
  updateStoreAccount,
  type DictData,
  type Member,
  type StoreAccount
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './unpaid.less'

const auth = useAuthStore()
const list = ref<StoreAccount[]>([])
const channelDict = ref<Record<string, string>>({})
const memberKeyword = ref('')
const loading = ref(false)
const savingId = ref(0)

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function formatDate(v?: string) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

function memberLabel(member?: Member | null) {
  if (!member) return '-'
  const name = String(member.name || '').trim()
  const phone = String(member.phone || '').trim()
  if (name && phone) return `${name}(${phone})`
  return name || phone || `会员 #${member.id}`
}

function accountMemberLabel(item: StoreAccount) {
  if (item.member) return memberLabel(item.member)
  const mid = Number(item.member_id || 0)
  return mid > 0 ? `会员 #${mid}` : '-'
}

function rowDisplayNo(item: StoreAccount) {
  if (item.member) return memberLabel(item.member)
  return item.order_no || item.account_no || `记账 #${item.id}`
}

function channelText(item: StoreAccount) {
  const code = String(item.channel || '').trim()
  if (!code) return '未知渠道'
  return channelDict.value[code] || code
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

function onKeywordInput(e: any) {
  memberKeyword.value = String(e?.detail?.value || '')
}

async function loadChannelDict() {
  if (!auth.token) return
  try {
    channelDict.value = mapDict(await listDictDataByTypeCode(auth.token, 'sales_channel'))
  } catch {
    channelDict.value = {}
  }
}

async function loadAllUnpaidAccounts() {
  if (!auth.token) return []
  const rows: StoreAccount[] = []
  const pageSize = 100
  for (let page = 1; page <= 50; page += 1) {
    const pageRows = await listStoreAccounts(auth.token, {
      store_id: auth.storeId || undefined,
      member_keyword: memberKeyword.value.trim() || undefined,
      payment_status: 2,
      page,
      page_size: pageSize
    })
    rows.push(...pageRows)
    if (pageRows.length < pageSize) break
  }
  return rows
}

async function refresh() {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  loading.value = true
  try {
    await loadChannelDict()
    list.value = await loadAllUnpaidAccounts()
  } catch (err: any) {
    list.value = []
    Taro.showToast({ title: err?.message || '加载未支付订单失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function markPaid(item: StoreAccount) {
  if (!auth.token || savingId.value) return
  savingId.value = item.id
  try {
    await updateStoreAccount(auth.token, item.id, { payment_status: 1 })
    Taro.showToast({ title: '已改为已支付', icon: 'success' })
    list.value = list.value.filter((row) => row.id !== item.id)
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '修改失败', icon: 'none' })
  } finally {
    savingId.value = 0
  }
}

useDidShow(() => {
  void refresh()
})

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>
