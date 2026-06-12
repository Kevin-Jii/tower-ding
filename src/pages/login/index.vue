<template>
  <view class="page login">
    <view class="erpBackdrop">
      <view class="dashPanel dashPanel--top">
        <view class="dashPanelTitle" />
        <view class="dashRow">
          <view class="dashBar dashBar--blue" />
          <view class="dashBar dashBar--green" />
          <view class="dashBar" />
        </view>
      </view>
      <view class="dashPanel dashPanel--side">
        <view class="dashMetric" />
        <view class="dashMetric dashMetric--wide" />
      </view>
    </view>
    <view class="loginBody">
      <view class="container loginContainer">
        <view class="card form">
          <view class="loginBrand">
            <image class="brandHeroLogo" src="../../assets/tabbar/home-active.png" mode="aspectFit" />
            <view>
              <view class="headline">Tower Ding</view>
              <view class="subtitle">门店经营 ERP 工作台</view>
            </view>
          </view>

          <view class="label">手机号</view>
          <input class="input" type="number" maxlength="11" placeholder="请输入手机号" :value="phone" @input="onPhoneInput" />

          <view class="label">密码</view>
          <view class="pwdWrap">
            <input class="input pwdInput" :password="maskPassword" placeholder="请输入登录密码" :value="password"
              @input="onPwdInput" />
            <view class="pwdEye" @tap.stop="maskPassword = !maskPassword">
              <view class="eyeDraw">
                <view class="eyeDrawOutline" />
                <view class="eyeDrawPupil" />
                <view v-if="!maskPassword" class="eyeDrawSlash" />
              </view>
            </view>
          </view>

          <view class="rememberRow" @tap="rememberPwd = !rememberPwd">
            <view :class="['rememberCheck', rememberPwd ? 'rememberCheck--on' : '']">
              <text v-if="rememberPwd">✓</text>
            </view>
            <view class="rememberText">记住密码</view>
          </view>

          <view :class="['btn', 'full', 'loginBtn', loading ? 'loginBtn--loading' : '']" @tap="onSubmit">{{ loading ?
            '登录中...' : '登录' }}</view>
        </view>
      </view>
    </view>

    <view class="loginFooter">
      <view class="agreeRow">
        <view class="agreeCheckWrap" @tap.stop="agreedTerms = !agreedTerms">
          <view :class="['rememberCheck', agreedTerms ? 'rememberCheck--on' : '']">
            <text v-if="agreedTerms">✓</text>
          </view>
        </view>
        <view class="agreeText">
          <text class="agreePlain">我已阅读并同意</text>
          <view class="agreeLink" @tap="onOpenUserAgreement">《用户服务协议》</view>
          <text class="agreePlain">与</text>
          <view class="agreeLink" @tap="onOpenPrivacyPolicy">《隐私政策》</view>
          <text class="agreePlain">，并授权在登录过程中处理我的手机号等必要信息。</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow } from '@tarojs/taro'
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

import './index.less'

const LOGIN_FORM_KEY = 'tower.login.form'
/** 与协议正文「更新日期」或条款变更保持一致时，已同意用户可自动勾选 */
const POLICY_VERSION = '2026-05-10'
const POLICY_ACCEPT_KEY = 'tower.login.policyAcceptedVersion'

const auth = useAuthStore()
const phone = ref('')
const password = ref('')
const loading = ref(false)
const rememberPwd = ref(false)
const agreedTerms = ref(false)
/** true 为密文（小眼睛点一下可短暂查看明文） */
const maskPassword = ref(true)

function onPhoneInput(e: any) {
  phone.value = String(e?.detail?.value || '')
}
function onPwdInput(e: any) {
  password.value = String(e?.detail?.value || '')
}

function hydrateRememberForm() {
  try {
    const saved = Taro.getStorageSync(LOGIN_FORM_KEY) as { phone?: string; password?: string } | undefined
    if (saved?.phone && saved?.password) {
      phone.value = String(saved.phone)
      password.value = String(saved.password)
      rememberPwd.value = true
    }
  } catch {
    // ignore
  }
}

function hydratePolicyAccept() {
  try {
    const v = Taro.getStorageSync(POLICY_ACCEPT_KEY) as string | undefined
    if (v && v === POLICY_VERSION) {
      agreedTerms.value = true
    }
  } catch {
    // ignore
  }
}

function onOpenUserAgreement() {
  Taro.navigateTo({ url: '/pages/login/user-agreement' }).catch(() => {
    Taro.showToast({ title: '打开失败，请重试', icon: 'none' })
  })
}

function onOpenPrivacyPolicy() {
  Taro.navigateTo({ url: '/pages/login/privacy-policy' }).catch(() => {
    Taro.showToast({ title: '打开失败，请重试', icon: 'none' })
  })
}

async function onSubmit() {
  if (loading.value) return
  if (!agreedTerms.value) {
    Taro.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
    return
  }
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
    Taro.setStorageSync(POLICY_ACCEPT_KEY, POLICY_VERSION)
    if (rememberPwd.value) {
      Taro.setStorageSync(LOGIN_FORM_KEY, {
        phone: phone.value.trim(),
        password: password.value
      })
    } else {
      Taro.removeStorageSync(LOGIN_FORM_KEY)
    }
    Taro.hideLoading()
    Taro.switchTab({ url: '/pages/home/index' })
  } catch (err: any) {
    Taro.hideLoading()
    Taro.showToast({ title: err?.message || '登录失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

useDidShow(() => {
  hydrateRememberForm()
  hydratePolicyAccept()
})
</script>
