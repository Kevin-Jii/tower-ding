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
  token_type: string
  expires_in?: number
  user_info: User
}

const STORAGE_KEY = 'tower.auth'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: '' as string,
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
          this.user = v.user || null
        }
      } catch {
        // ignore
      }
    },
    async login(phone: string, password: string) {
      const data = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        data: { phone, password }
      })
      this.token = data.token
      this.user = data.user_info
      Taro.setStorageSync(STORAGE_KEY, { token: this.token, user: this.user })
    },
    async refreshProfile() {
      if (!this.token) return null
      const user = await getUserProfile(this.token)
      this.user = user
      Taro.setStorageSync(STORAGE_KEY, { token: this.token, user: this.user })
      return user
    },
    logout() {
      this.token = ''
      this.user = null
      Taro.removeStorageSync(STORAGE_KEY)
    }
  }
})
