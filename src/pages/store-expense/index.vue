<template>
  <view class="page expensePage">
    <view class="container expenseContainer">
      <view class="expenseHero">
        <view>
          <view class="eyebrow">门店支出</view>
          <view class="title">支出记录</view>
        </view>
        <view class="heroAction" @tap="refresh">刷新</view>
      </view>

      <view class="summaryGrid">
        <view class="summaryCard summaryCard--main">
          <view class="summaryLabel">支出总额</view>
          <view class="summaryValue">¥{{ formatMoney(stats?.total_amount) }}</view>
        </view>
        <view class="summaryCard">
          <view class="summaryLabel">支出记录</view>
          <view class="summaryValue">{{ stats?.count || 0 }} 笔</view>
        </view>
      </view>

      <view class="card formCard">
        <view class="formTitle">新增支出</view>
        <view class="fieldLabel">支出分类</view>
        <picker mode="selector" :range="categoryOptions" range-key="label" :value="categoryIndex" @change="onCategoryChange">
          <view :class="['pickerFake', form.category_code ? '' : 'pickerFake--empty']">
            <text>{{ selectedCategoryLabel || '请选择支出分类' }}</text>
            <text class="pickerArrow">›</text>
          </view>
        </picker>

        <view class="fieldLabel fieldLabel--spaced">支出金额</view>
        <input class="input" type="digit" :value="amountText" placeholder="请输入支出金额" @input="onAmountInput" />

        <view class="fieldLabel fieldLabel--spaced">备注说明</view>
        <textarea class="textarea" :value="form.remark" placeholder="例如：平台费用、维修维护、推广支出" maxlength="500" @input="onRemarkInput" />

        <view :class="['btn', 'submitBtn', saving ? 'btn--disabled' : '']" @tap="submit">
          {{ saving ? '保存中…' : '保存支出' }}
        </view>
      </view>

      <view class="listHeader">
        <view class="section-title">最近支出</view>
        <picker mode="selector" :range="filterOptions" range-key="label" :value="filterIndex" @change="onFilterChange">
          <view class="filterBtn">{{ selectedFilterLabel }} <text>›</text></view>
        </picker>
      </view>

      <view class="expenseList">
        <view v-if="loading" class="empty card">正在加载支出记录…</view>
        <view v-else-if="!expenses.length" class="empty card">暂无支出记录</view>
        <block v-else>
          <view v-for="row in expenses" :key="row.id" class="expenseRow card">
            <view class="rowTop">
              <view class="rowMain">
                <view class="rowTitle">{{ row.category_name || categoryLabel(row.category_code) || '门店支出' }}</view>
                <view class="rowSub">{{ row.expense_no || `支出 #${row.id}` }} · {{ formatDate(row.expense_date || row.created_at) }}</view>
              </view>
              <view class="rowAmount">¥{{ formatMoney(row.amount) }}</view>
            </view>
            <view class="rowFoot">
              <view class="tag">{{ row.operator_name || '当前操作人' }}</view>
              <view v-if="row.remark" class="remark">{{ row.remark }}</view>
            </view>
          </view>
        </block>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { computed, reactive, ref } from 'vue'
import {
  createStoreExpense,
  getStoreExpenseStats,
  listDictDataByTypeCode,
  listStoreExpenses,
  type DictData,
  type StoreExpense,
  type StoreExpenseStats
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const EXPENSE_CATEGORY_CODE = 'EXPENDITURECLASS'

type CategoryOption = {
  label: string
  value: string
}

const auth = useAuthStore()
const categories = ref<DictData[]>([])
const expenses = ref<StoreExpense[]>([])
const stats = ref<StoreExpenseStats | null>(null)
const loading = ref(false)
const saving = ref(false)
const amountText = ref('')
const categoryFilter = ref('')
const form = reactive({
  category_code: '',
  remark: ''
})

const categoryOptions = computed<CategoryOption[]>(() =>
  categories.value
    .filter((item) => item.status !== 0)
    .map((item) => ({
      label: String(item.label || item.value || '').trim(),
      value: String(item.value || item.label || '').trim()
    }))
    .filter((item) => item.label && item.value)
)
const filterOptions = computed<CategoryOption[]>(() => [{ label: '全部分类', value: '' }, ...categoryOptions.value])
const categoryIndex = computed(() => {
  const idx = categoryOptions.value.findIndex((item) => item.value === form.category_code)
  return idx >= 0 ? idx : 0
})
const filterIndex = computed(() => {
  const idx = filterOptions.value.findIndex((item) => item.value === categoryFilter.value)
  return idx >= 0 ? idx : 0
})
const selectedCategoryLabel = computed(() => categoryLabel(form.category_code))
const selectedFilterLabel = computed(() => categoryLabel(categoryFilter.value) || '全部分类')

function moneyInputValue(e: any) {
  const raw = String(e?.detail?.value || '').replace(/[^\d.]/g, '')
  const [head, ...tail] = raw.split('.')
  return tail.length ? `${head}.${tail.join('').slice(0, 2)}` : head
}

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function formatDate(v?: string) {
  if (!v) return '-'
  return String(v).slice(0, 10)
}

function categoryLabel(code?: string) {
  if (!code) return ''
  return categoryOptions.value.find((item) => item.value === code)?.label || ''
}

function onCategoryChange(e: any) {
  const idx = Number(e?.detail?.value || 0)
  form.category_code = categoryOptions.value[idx]?.value || ''
}

function onFilterChange(e: any) {
  const idx = Number(e?.detail?.value || 0)
  categoryFilter.value = filterOptions.value[idx]?.value || ''
  void refreshListAndStats()
}

function onAmountInput(e: any) {
  amountText.value = moneyInputValue(e)
}

function onRemarkInput(e: any) {
  form.remark = String(e?.detail?.value || '')
}

async function loadCategories() {
  if (!auth.token) return
  try {
    categories.value = await listDictDataByTypeCode(auth.token, EXPENSE_CATEGORY_CODE)
  } catch (err: any) {
    categories.value = []
    Taro.showToast({ title: err?.message || '加载支出分类失败', icon: 'none' })
  }
}

async function refreshListAndStats() {
  if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
  loading.value = true
  try {
    const params = {
      store_id: auth.storeId || undefined,
      category_code: categoryFilter.value || undefined
    }
    const [rows, stat] = await Promise.all([
      listStoreExpenses(auth.token, { ...params, page: 1, page_size: 50 }),
      getStoreExpenseStats(auth.token, params)
    ])
    expenses.value = rows
    stats.value = stat
  } catch (err: any) {
    expenses.value = []
    stats.value = null
    Taro.showToast({ title: err?.message || '加载支出失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function refresh() {
  await Promise.all([loadCategories(), refreshListAndStats()])
}

function resetForm() {
  form.category_code = ''
  form.remark = ''
  amountText.value = ''
}

async function submit() {
  if (!auth.token || saving.value) return
  const amount = Number(amountText.value || 0)
  if (!form.category_code) {
    Taro.showToast({ title: '请选择支出分类', icon: 'none' })
    return
  }
  if (!(amount > 0)) {
    Taro.showToast({ title: '请输入支出金额', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await createStoreExpense(auth.token, {
      store_id: auth.storeId || undefined,
      category_code: form.category_code,
      amount,
      remark: form.remark.trim() || undefined
    })
    Taro.showToast({ title: '已保存', icon: 'success' })
    resetForm()
    await refreshListAndStats()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
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
