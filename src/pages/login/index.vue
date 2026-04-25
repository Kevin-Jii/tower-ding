<template>
  <view class="page login">
    <view class="container">
      <view class="headline">掌上工作台</view>
      <view class="subtitle">采购、库存、记账、门店协同</view>

      <view class="card form">
        <view class="formTop">
          <view class="brandMark">
            <view class="brandCore" />
          </view>
          <view>
            <view class="formTitle">门店登录</view>
            <view class="formSub">使用手机号和密码进入门店后台</view>
          </view>
        </view>

        <view class="label">手机号</view>
        <input class="input" type="number" maxlength="11" placeholder="请输入手机号" :value="phone" @input="onPhoneInput" />

        <view class="label">密码</view>
        <input class="input" password placeholder="请输入登录密码" :value="password" @input="onPwdInput" />

        <view class="btn full" @tap="onSubmit">{{ loading ? '登录中...' : '登录' }}</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro from '@tarojs/taro'
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

import './index.less'

const auth = useAuthStore()
const phone = ref('')
const password = ref('')
const loading = ref(false)

function onPhoneInput(e: any) {
  phone.value = String(e?.detail?.value || '')
}
function onPwdInput(e: any) {
  password.value = String(e?.detail?.value || '')
}

async function onSubmit() {
  if (loading.value) return
  if (phone.value.trim().length !== 11) {
    Taro.showToast({ title: '请输入 11 位手机号', icon: 'none' })
    return
  }
  if (password.value.trim().length < 6) {
    Taro.showToast({ title: '密码至少 6 位', icon: 'none' })
    return
  }

  loading.value = true
  Taro.showLoading({ title: '登录中' })
  try {
    await auth.login(phone.value.trim(), password.value)
    Taro.hideLoading()
    Taro.switchTab({ url: '/pages/home/index' })
  } catch (err: any) {
    Taro.hideLoading()
    Taro.showToast({ title: err?.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>
