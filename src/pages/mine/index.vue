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
      </view>

      <view class="card infoCard">
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
      </view>

      <view class="shortcutGrid">
        <view class="card shortcut">
          <view class="shortcutTitle">采购通知</view>
          <view class="shortcutSub">钉钉同步</view>
        </view>
        <view class="card shortcut">
          <view class="shortcutTitle">主题风格</view>
          <view class="shortcutSub">苹果极简</view>
        </view>
      </view>

      <view class="btn danger" @tap="onLogout">退出登录</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro from '@tarojs/taro'
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()
const initials = computed(() => {
  const text = auth.user?.nickname || auth.user?.username || auth.user?.phone || 'TW'
  return String(text).slice(0, 2).toUpperCase()
})

function onLogout() {
  auth.logout()
  Taro.redirectTo({ url: '/pages/login/index' })
}
</script>
