<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">会员模块</view>
      <view class="title">会员管理</view>
      <view class="subtitle">会员资料查询与新增</view>

      <view class="card formCard">
        <view class="formTitle">新增会员</view>
        <input class="input mt" :value="form.name" placeholder="姓名" @input="onNameInput" />
        <input class="input mt" :value="form.phone" type="number" placeholder="手机号" @input="onPhoneInput" />
        <view class="btn mt" @tap="submitMember">保存会员</view>
      </view>

      <view class="searchRow">
        <input class="searchInput" :value="keyword" placeholder="搜索姓名 / 手机号 / 会员号" confirm-type="search" @input="onKeywordInput" @confirm="refresh" />
        <view class="searchBtn" @tap="refresh">搜索</view>
      </view>

      <view class="list">
        <view v-if="!members.length" class="empty card">暂无会员</view>
        <view v-for="m in members" :key="m.id" class="row card">
          <view class="rowTop">
            <view>
              <view class="rowTitle">{{ memberName(m) }}</view>
              <view class="rowSub">{{ m.phone || '-' }}</view>
            </view>
            <view class="statusTag">等级 {{ m.level ?? 0 }}</view>
          </view>
          <view class="rowFoot">
            <view class="rowMeta">余额 ¥{{ formatMoney(m.balance) }}</view>
            <view class="rowMeta">积分 {{ m.points ?? 0 }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { reactive, ref } from 'vue'
import { createMember, listMembers, type Member } from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()
const keyword = ref('')
const members = ref<Member[]>([])
const saving = ref(false)
const form = reactive({ name: '', phone: '' })

function onKeywordInput(e: any) {
  keyword.value = String(e?.detail?.value || '')
}

function onNameInput(e: any) {
  form.name = String(e?.detail?.value || '')
}

function onPhoneInput(e: any) {
  form.phone = String(e?.detail?.value || '')
}

function memberName(m: Member) {
  return m.name || m.phone || `会员 #${m.id}`
}

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

async function refresh() {
  if (!auth.token) return Taro.redirectTo({ url: '/pages/login/index' })
  try {
    members.value = await listMembers(auth.token, { keyword: keyword.value.trim() || undefined, page: 1, page_size: 50 })
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  }
}

async function submitMember() {
  if (!auth.token || saving.value) return
  if (!form.phone.trim()) {
    Taro.showToast({ title: '请填写手机号', icon: 'none' })
    return
  }
  saving.value = true
  try {
    await createMember(auth.token, {
      store_id: auth.storeId || undefined,
      name: form.name.trim(),
      phone: form.phone.trim()
    })
    Taro.showToast({ title: '已保存', icon: 'success' })
    form.name = ''
    form.phone = ''
    await refresh()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

useDidShow(() => refresh())

usePullDownRefresh(async () => {
  await refresh()
  Taro.stopPullDownRefresh()
})
</script>
