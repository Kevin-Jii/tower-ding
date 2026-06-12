<template>
  <view class="page">
    <view class="container">
      <view class="card hero">
        <view class="heroTop">
          <view>
            <view class="heroLabel">筛选范围内合计</view>
            <view class="heroMoney">¥ {{ formatMoney(stats?.total_amount) }}</view>
          </view>
          <view class="heroBadge">{{ stats?.count ?? 0 }} 笔</view>
        </view>
        <view class="heroSub">本页展示 {{ list.length }} 条记录</view>
        <view class="dateFilter">
          <picker mode="date" :value="startDate" :end="endDate || today" @change="onStartDateChange">
            <view class="dateBox">
              <view class="dateLabel">开始日期</view>
              <view class="dateValue">{{ startDate || '不限' }}</view>
            </view>
          </picker>
          <view class="dateDash">至</view>
          <picker mode="date" :value="endDate" :start="startDate || undefined" :end="today" @change="onEndDateChange">
            <view class="dateBox">
              <view class="dateLabel">结束日期</view>
              <view class="dateValue">{{ endDate || '不限' }}</view>
            </view>
          </picker>
          <view class="dateClear" @tap="clearDateRange">清空</view>
        </view>
      </view>
      <view class="card cta" @tap="goCreate">
        <view>
          <view class="ctaTitle">创建新记账</view>
          <view class="ctaSub">渠道 + 多行商品（金额可为单价×数量）</view>
        </view>
        <view class="ctaPlus">+</view>
      </view>
      <view class="grid">
        <view class="metric card">
          <view class="metricLabel">笔数</view>
          <view class="metricValue">{{ stats?.count ?? 0 }}</view>
        </view>
        <view class="metric card">
          <view class="metricLabel">笔均金额</view>
          <view class="metricValue">¥ {{ avgStat }}</view>
        </view>
      </view>

      <view class="section-title">最近记录</view>
      <view class="list">
        <view v-if="!list.length" class="empty card">暂无记账数据</view>
        <view v-for="item in list" :key="item.id" class="row card" @tap="openDetail(item.id)">
          <view class="rowTop">
            <view class="rowMain">
              <view class="rowTitle">{{ item.account_no || `记账 #${item.id}` }}</view>
              <view class="rowSub">{{ channelLabel(item.channel) }} · {{ formatDay(item.account_date || item.created_at) }}
              </view>
            </view>
            <view class="amount amount--in">¥ {{ formatMoney(item.net_income_amount ?? item.total_amount) }}</view>
          </view>
          <view class="rowFoot">
            <view class="rowMeta">净收入 ¥{{ formatMoney(item.net_income_amount) }}</view>
            <view class="rowMeta">其他支出 ¥{{ formatMoney(item.other_expense_amount) }}</view>
            <view class="rowMeta">{{ item.item_count ?? item.items?.length ?? 0 }} 项商品</view>
          </view>
          <view class="rowStatus">
            <view class="statusTags">
              <view :class="['statusTag', paymentStatusValue(item) === 2 ? 'statusTag--warn' : 'statusTag--ok']">
                {{ paymentStatusLabel(item.payment_status) }}
              </view>
              <view class="statusTag">{{ memberLabel(item.member) }}</view>
            </view>
            <view class="settingsBtn" @tap.stop="openMetaSheet(item)">设置</view>
          </view>
        </view>
      </view>
    </view>

    <view v-if="metaSheetOpen" class="metaMask" @tap="closeMetaSheet">
      <view class="metaSheet" @tap.stop>
        <view class="sheetHandle" />
        <view class="sheetTitle">会员与支付</view>
        <view class="sheetSub">{{ editingAccount?.account_no || `记账 #${editingAccount?.id || ''}` }}</view>

        <view class="editRow">
          <view class="editLabel">关联会员</view>
          <picker mode="selector" :range="memberOptions" range-key="label" :value="memberIndex" @change="onMemberChange">
            <view class="pickerFake">{{ selectedMemberLabel }} <text class="pickArrowInline">›</text></view>
          </picker>
        </view>

        <view class="editRow">
          <view class="editLabel">支付状态</view>
          <view class="paySeg">
            <view :class="['paySegItem', paymentStatus === 1 ? 'paySegItem--on' : '']" @tap="paymentStatus = 1">已支付</view>
            <view :class="['paySegItem', paymentStatus === 2 ? 'paySegItem--on' : '']" @tap="paymentStatus = 2">未支付</view>
          </view>
        </view>

        <view class="sheetActions">
          <view class="btn btn--ghost sheetBtn" @tap="closeMetaSheet">取消</view>
          <view :class="['btn', 'sheetBtn', savingMeta ? 'btn--disabled' : '']" @tap="saveAccountMeta">
            {{ savingMeta ? '保存中...' : '保存设置' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { computed, ref } from 'vue'
import {
  getStoreAccountStats,
  listDictDataByTypeCode,
  listMembers,
  listStoreAccounts,
  updateStoreAccount,
  type DictData,
  type Member,
  type StoreAccount
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()
const list = ref<StoreAccount[]>([])
const stats = ref<{ total_amount?: number; count?: number } | null>(null)
const channelDict = ref<Record<string, string>>({})
const members = ref<Member[]>([])
const today = todayStr()
const startDate = ref(monthStartStr())
const endDate = ref(today)
const metaSheetOpen = ref(false)
const editingAccount = ref<StoreAccount | null>(null)
const selectedMemberId = ref(0)
const paymentStatus = ref(1)
const savingMeta = ref(false)

const queryRange = computed(() => {
  return {
    start_date: startDate.value || undefined,
    end_date: endDate.value || undefined
  }
})

const avgStat = computed(() => {
  const c = Number(stats.value?.count || 0)
  const t = Number(stats.value?.total_amount || 0)
  if (!c) return '0'
  return formatMoney(t / c)
})
const memberOptions = computed(() => [
  { label: '不绑定会员', value: 0 },
  ...members.value.map((m) => ({ label: memberLabel(m), value: Number(m.id || 0) }))
])
const memberIndex = computed(() => {
  const i = memberOptions.value.findIndex((m) => m.value === selectedMemberId.value)
  return i >= 0 ? i : 0
})
const selectedMemberLabel = computed(() => memberOptions.value[memberIndex.value]?.label || '不绑定会员')

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function todayStr() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function monthStartStr() {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
}

function onStartDateChange(e: any) {
  const v = String(e?.detail?.value || '').trim()
  startDate.value = v
  if (endDate.value && v && v > endDate.value) {
    endDate.value = v
  }
  void refresh()
}

function onEndDateChange(e: any) {
  const v = String(e?.detail?.value || '').trim()
  endDate.value = v
  if (startDate.value && v && startDate.value > v) {
    startDate.value = v
  }
  void refresh()
}

function clearDateRange() {
  startDate.value = ''
  endDate.value = ''
  void refresh()
}

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function formatDay(v?: string) {
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
  if (!code) return '—'
  return channelDict.value[code] || code
}

function paymentStatusValue(item: StoreAccount) {
  return Number(item.payment_status || 1) === 2 ? 2 : 1
}

function paymentStatusLabel(v?: number) {
  return Number(v || 1) === 2 ? '未支付' : '已支付'
}

function memberLabel(member?: Member | null) {
  if (!member) return '不绑定会员'
  const name = String(member.name || '').trim()
  const phone = String(member.phone || '').trim()
  if (name && phone) return `${name}(${phone})`
  return name || phone || `会员 #${member.id}`
}

function onMemberChange(e: any) {
  const idx = Number(e?.detail?.value ?? 0)
  selectedMemberId.value = memberOptions.value[idx]?.value || 0
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

async function loadMembers() {
  if (!auth.token) return
  try {
    members.value = await listMembers(auth.token, { page: 1, page_size: 100 })
  } catch {
    members.value = []
  }
}

async function refresh() {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  const q = queryRange.value
  try {
    const [accounts, accountStats] = await Promise.all([
      listStoreAccounts(auth.token, {
        store_id: auth.storeId || undefined,
        start_date: q.start_date,
        end_date: q.end_date,
        page: 1,
        page_size: 40
      }),
      getStoreAccountStats(auth.token, {
        store_id: auth.storeId || undefined,
        start_date: q.start_date,
        end_date: q.end_date
      })
    ])
    list.value = accounts
    stats.value = accountStats
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

function openDetail(id: number) {
  Taro.navigateTo({ url: `/pages/accounting/detail?id=${id}` })
}

function openMetaSheet(item: StoreAccount) {
  editingAccount.value = item
  selectedMemberId.value = Number(item.member_id || item.member?.id || 0)
  paymentStatus.value = paymentStatusValue(item)
  metaSheetOpen.value = true
  if (!members.value.length) void loadMembers()
}

function closeMetaSheet() {
  if (savingMeta.value) return
  metaSheetOpen.value = false
}

async function saveAccountMeta() {
  if (!auth.token || !editingAccount.value?.id || savingMeta.value) return
  savingMeta.value = true
  try {
    await updateStoreAccount(auth.token, editingAccount.value.id, {
      member_id: selectedMemberId.value > 0 ? selectedMemberId.value : 0,
      payment_status: paymentStatus.value
    })
    Taro.showToast({ title: '已保存', icon: 'success' })
    metaSheetOpen.value = false
    await refresh()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    savingMeta.value = false
  }
}

function goCreate() {
  Taro.navigateTo({ url: '/pages/accounting/create' })
}

useDidShow(() => refresh())
useDidShow(() => {
  void Promise.all([loadChannelDict(), loadMembers()])
})

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>
