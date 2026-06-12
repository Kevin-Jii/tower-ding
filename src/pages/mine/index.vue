<template>
  <view class="page">
    <view class="container">
      <view class="profile card">
        <view class="avatar">{{ initials }}</view>
        <view class="profileMeta">
          <view class="profileName">{{ auth.user?.nickname || auth.user?.username || auth.user?.phone || '未登录用户' }}
          </view>
          <view class="profileStore">{{ auth.user?.store?.name || `门店 #${auth.user?.store_id || '-'}` }}</view>
        </view>
        <view :class="['statusBadge', auth.token ? 'statusBadge--on' : '']">{{ auth.token ? '在线' : '离线' }}</view>
      </view>

      <view class="card infoCard">
        <view class="panelTitle">账号信息</view>
        <view class="kv">
          <view class="k">用户</view>
          <view class="v">{{ auth.user?.nickname || auth.user?.username || auth.user?.phone || '-' }}</view>
        </view>
        <view class="kv">
          <view class="k">门店</view>
          <view class="v">{{ auth.user?.store?.name || auth.user?.store_id || '-' }}</view>
        </view>
        <view class="kv">
          <view class="k">手机号</view>
          <view class="v">{{ auth.user?.phone || '-' }}</view>
        </view>
        <view class="kv">
          <view class="k">登录状态</view>
          <view class="v">{{ auth.token ? '已登录' : '未登录' }}</view>
        </view>
        <view class="kv">
          <view class="k">角色</view>
          <view class="v">{{ auth.user?.role?.name || auth.user?.role?.code || '-' }}</view>
        </view>
      </view>

      <view class="card storeCard">
        <view class="panelTitle">门店信息</view>
        <view class="kv">
          <view class="k">门店编号</view>
          <view class="v">{{ storeCode }}</view>
        </view>
        <view class="kv">
          <view class="k">联系人</view>
          <view class="v">{{ storeInfo?.contact_person || '-' }}</view>
        </view>
        <view class="kv">
          <view class="k">联系电话</view>
          <view class="v">{{ storeInfo?.phone || '-' }}</view>
        </view>
        <view class="kv">
          <view class="k">营业时间</view>
          <view class="v">{{ storeInfo?.business_hours || '-' }}</view>
        </view>
        <view class="kv">
          <view class="k">归属区域</view>
          <view class="v">{{ administrativeUnitDisplay }}</view>
        </view>
        <view class="kv">
          <view class="k">门店地址</view>
          <view class="v">{{ storeInfo?.address || '-' }}</view>
        </view>
      </view>

      <view class="btn danger" @tap="onLogout">退出登录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { computed, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { listDictDataByTypeCode, type DictData } from '../../services/api'
import './index.less'

const auth = useAuthStore()
/** 与后台门店「归属区」字典 type_code 一致 */
const ADMINISTRATIVE_UNIT_TYPE = 'ADMINISTRATIVEUNIT'

const administrativeUnitDict = ref<DictData[]>([])
const initials = computed(() => {
  const text = auth.user?.nickname || auth.user?.username || auth.user?.phone || 'TW'
  return String(text).slice(0, 2).toUpperCase()
})
const storeInfo = computed(() => auth.user?.store || null)
const administrativeUnitDisplay = computed(() => {
  const raw = storeInfo.value?.administrative_unit
  if (raw == null || String(raw).trim() === '') return '-'
  const key = String(raw).trim()
  const row = administrativeUnitDict.value.find((d) => String(d.value ?? '').trim() === key)
  const label = String(row?.label ?? '').trim()
  return label || key
})
const storeCode = computed(() => {
  const code = storeInfo.value?.store_code
  if (typeof code === 'string' && code.trim()) return code
  return auth.user?.store_id ? `#${auth.user.store_id}` : '-'
})

function onLogout() {
  auth.logout()
  Taro.redirectTo({ url: '/pages/login/index' })
}

async function refreshProfile() {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  try {
    const [, dictRows] = await Promise.all([
      auth.refreshProfile(),
      listDictDataByTypeCode(auth.token, ADMINISTRATIVE_UNIT_TYPE).catch(() => [] as DictData[])
    ])
    administrativeUnitDict.value = dictRows
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '资料刷新失败', icon: 'none' })
  } finally {
    Taro.stopPullDownRefresh()
  }
}

useDidShow(() => {
  void refreshProfile()
})

usePullDownRefresh(() => {
  void refreshProfile()
})
</script>
