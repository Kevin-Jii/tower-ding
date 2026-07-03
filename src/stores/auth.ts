import { defineStore } from 'pinia'
import Taro from '@tarojs/taro'
import { getUserProfile, type UserProfile } from '../services/api'
import { request } from '../services/http'

type User = UserProfile & {
  id: number
  phone?: string
  nickname?: string
  username?: string
  store_id?: number
}

type LoginResponse = {
  token: string
  refresh_token?: string
  token_type: string
  expires_in?: number
  refresh_expires_in?: number
  user_info: User
}

const STORAGE_KEY = 'tower.auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '' as string,
    refreshToken: '' as string,
    user: null as User | null
  }),
  getters: {
    isAuthed: (s) => Boolean(s.token),
    storeId: (s) => s.user?.store_id || s.user?.store?.id || 0
  },
  actions: {
    hydrate() {
      try {
        const v = Taro.getStorageSync(STORAGE_KEY)
        if (v?.token) {
          this.token = v.token
          this.refreshToken = v.refreshToken || v.refresh_token || ''
          this.user = v.user || null
        }
      } catch {
        // ignore
      }
    },
    persistLogin(data: LoginResponse) {
      this.token = data.token
      this.refreshToken = data.refresh_token || ''
      this.user = data.user_info
      Taro.setStorageSync(STORAGE_KEY, { token: this.token, refreshToken: this.refreshToken, user: this.user })
    },
    async getWechatCode() {
      if (process.env.TARO_ENV !== 'weapp') return ''
      const res = await Taro.login()
      return String(res.code || '')
    },
    async login(phone: string, password: string) {
      let wechatCode = ''
      try {
        wechatCode = await this.getWechatCode()
      } catch {
        wechatCode = ''
      }
      const data = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        data: { phone, password }
      })
      this.persistLogin(data)
      if (wechatCode) {
        try {
          await request<null>('/users/wechat-bind', {
            method: 'POST',
            data: { code: wechatCode },
            authToken: this.token,
            showLoading: false
          })
        } catch {
          // 绑定失败不影响账号密码登录
        }
      }
    },
    async loginByWechatCode(code?: string) {
      const loginCode = code || await this.getWechatCode()
      if (!loginCode) return false
      try {
        const data = await request<LoginResponse>('/auth/wechat-login', {
          method: 'POST',
          data: { code: loginCode },
          showLoading: false
        })
        this.persistLogin(data)
        return true
      } catch {
        return false
      }
    },
    async bindWechat() {
      if (!this.token) throw new Error('请先登录')
      const code = await this.getWechatCode()
      if (!code) throw new Error('当前环境不支持微信绑定')
      await request<null>('/users/wechat-bind', {
        method: 'POST',
        data: { code },
        authToken: this.token,
        showLoading: false
      })
      await this.refreshProfile()
    },
    async refreshProfile() {
      if (!this.token) return null
      const user = await getUserProfile(this.token)
      this.user = user
      Taro.setStorageSync(STORAGE_KEY, { token: this.token, refreshToken: this.refreshToken, user: this.user })
      return user
    },
    async refreshSession() {
      if (!this.refreshToken) return false
      try {
        const data = await request<LoginResponse>('/auth/refresh', {
          method: 'POST',
          data: { refresh_token: this.refreshToken },
          showLoading: false
        })
        this.token = data.token
        this.refreshToken = data.refresh_token || this.refreshToken
        this.user = data.user_info
        Taro.setStorageSync(STORAGE_KEY, { token: this.token, refreshToken: this.refreshToken, user: this.user })
        return true
      } catch {
        this.logout()
        return false
      }
    },
    logout() {
      this.token = ''
      this.refreshToken = ''
      this.user = null
      Taro.removeStorageSync(STORAGE_KEY)
    }
  }
})
