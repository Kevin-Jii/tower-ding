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
          <view class="k">商品总金额</view>
          <view class="v">¥ {{ formatMoney(detail?.total_amount || detail?.amount) }}</view>
        </view>
        <view class="kv">
          <view class="k">其他支出</view>
          <view class="v">¥ {{ formatMoney(detail?.other_expense_amount) }}</view>
        </view>
        <view class="kv">
          <view class="k">净收入</view>
          <view class="v">¥ {{ formatMoney(detail?.net_income_amount) }}</view>
        </view>
        <view class="kv">
          <view class="k">渠道</view>
          <view class="v">{{ channelLabel(detail?.channel) }}</view>
        </view>
        <view class="kv">
          <view class="k">支付状态</view>
          <view class="v">{{ paymentStatusLabel(detail?.payment_status) }}</view>
        </view>
        <view class="kv">
          <view class="k">关联会员</view>
          <view class="v">{{ memberLabel(detail?.member) }}</view>
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

      <view class="card editCard">
        <view class="sectionHead">
          <view class="sectionTitle">会员与支付</view>
          <view v-if="saving" class="sectionTip">保存中…</view>
        </view>
        <view class="editRow">
          <view class="editLabel">会员</view>
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
        <view :class="['btn saveBtn', saving ? 'btn--disabled' : '']" @tap="saveAccountMeta">保存设置</view>
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
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { computed, ref } from 'vue'
import {
  getStoreAccountDetail,
  listDictDataByTypeCode,
  listMembers,
  updateStoreAccount,
  type DictData,
  type Member,
  type StoreAccount
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './detail.less'

const auth = useAuthStore()
const router = useRouter()
const id = Number(router.params?.id || 0)
const detail = ref<StoreAccount | null>(null)
const channelDict = ref<Record<string, string>>({})
const members = ref<Member[]>([])
const selectedMemberId = ref(0)
const paymentStatus = ref(1)
const saving = ref(false)

const operatorName = computed(() => {
  const operator = detail.value?.operator
  return operator?.nickname || operator?.username || operator?.phone || '-'
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

function paymentStatusLabel(v?: number) {
  return Number(v || 1) === 2 ? '未支付' : '已支付'
}

function memberLabel(member?: Member | null) {
  if (!member) return '-'
  const name = String(member.name || '').trim()
  const phone = String(member.phone || '').trim()
  if (name && phone) return `${name}（${phone}）`
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

async function refresh() {
  if (!auth.token || !id) return
  try {
    const data = await getStoreAccountDetail(auth.token, id)
    detail.value = data
    selectedMemberId.value = Number(data.member_id || data.member?.id || 0)
    paymentStatus.value = Number(data.payment_status || 1) === 2 ? 2 : 1
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
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

async function saveAccountMeta() {
  if (!auth.token || !id || saving.value) return
  saving.value = true
  try {
    await updateStoreAccount(auth.token, id, {
      member_id: selectedMemberId.value > 0 ? selectedMemberId.value : 0,
      payment_status: paymentStatus.value
    })
    Taro.showToast({ title: '已保存', icon: 'success' })
    await refresh()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

useDidShow(() => {
  void Promise.all([refresh(), loadChannelDict(), loadMembers()])
})
</script>
