import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'


import { computed, ref } from 'vue'


import { useAuthStore } from '../../stores/auth'


import { listDictDataByTypeCode, type DictData } from '../../services/api'

const DAILY_TURNOVER_TEMPLATE_ID = '7aaQQAMYqAzfyffKov5MDNp85FfeO_6-TzKbIEh8M4Y'
const DAILY_TURNOVER_ROLES = new Set(['store_admin', 'admin', 'super_admin'])
const DAILY_TURNOVER_SUBSCRIPTION_CACHE_PREFIX = 'tower.daily-turnover-subscription'

export default {
  setup() {
    const auth = useAuthStore()
    
    
    /** 与后台门店「归属区」字典 type_code 一致 */
    const ADMINISTRATIVE_UNIT_TYPE = 'ADMINISTRATIVEUNIT'
    
    
    
    const administrativeUnitDict = ref<DictData[]>([])
    
    
    const bindingWechat = ref(false)


    const subscribingTurnover = ref(false)


    const turnoverSubscribed = ref(false)
    
    
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
    
    
    const wechatBound = computed(() => Boolean(auth.user?.wechat_openid))


    const canSubscribeTurnover = computed(() => {
      const roleCode = String(auth.user?.role?.code || '').trim().toLowerCase()
      return DAILY_TURNOVER_ROLES.has(roleCode)
    })


    function subscriptionCacheKey() {
      return `${DAILY_TURNOVER_SUBSCRIPTION_CACHE_PREFIX}.${DAILY_TURNOVER_TEMPLATE_ID}.${auth.user?.id || 'current'}`
    }


    function updateTurnoverSubscriptionStatus(subscribed: boolean) {
      turnoverSubscribed.value = subscribed
      if (subscribed) {
        Taro.setStorageSync(subscriptionCacheKey(), true)
      } else {
        Taro.removeStorageSync(subscriptionCacheKey())
      }
    }


    function syncTurnoverSubscriptionSetting(setting?: Taro.SubscriptionsSetting) {
      const status = String(setting?.itemSettings?.[DAILY_TURNOVER_TEMPLATE_ID] || '')
      if (setting?.mainSwitch === false || status === 'reject' || status === 'ban') {
        updateTurnoverSubscriptionStatus(false)
        return false
      }
      if (status === 'accept') {
        updateTurnoverSubscriptionStatus(true)
        return true
      }
      return null
    }


    async function refreshTurnoverSubscriptionStatus() {
      if (!canSubscribeTurnover.value) return
      turnoverSubscribed.value = Boolean(Taro.getStorageSync(subscriptionCacheKey()))
      try {
        const result = await Taro.getSetting({ withSubscriptions: true })
        syncTurnoverSubscriptionSetting(result.subscriptionsSetting)
      } catch {
        // 保留本地状态，避免设置接口短暂失败时页面闪动。
      }
    }
    
    
    
    function onLogout() {
      auth.logout()
      Taro.redirectTo({ url: '/pages/login/index' })
    }
    
    
    
    async function onBindWechat() {
      if (bindingWechat.value || wechatBound.value) return
      bindingWechat.value = true
      Taro.showLoading({ title: '绑定中' })
      try {
        await auth.bindWechat()
        Taro.hideLoading()
        Taro.showToast({ title: '绑定成功', icon: 'success' })
      } catch (err: any) {
        Taro.hideLoading()
        Taro.showToast({ title: err?.message || '绑定失败', icon: 'none' })
      } finally {
        bindingWechat.value = false
      }
    }



    async function onSubscribeTurnover() {
      if (subscribingTurnover.value) return
      if (!wechatBound.value) {
        Taro.showToast({ title: '请先绑定微信', icon: 'none' })
        return
      }
      subscribingTurnover.value = true
      try {
        // Taro 4.1.11 的聚合类型会误将支付宝 entityIds 标记为必填。
        const result = await Taro.requestSubscribeMessage({
          tmplIds: [DAILY_TURNOVER_TEMPLATE_ID]
        } as Taro.requestSubscribeMessage.Option)
        const status = (result as unknown as Record<string, string>)[DAILY_TURNOVER_TEMPLATE_ID]

        if (status === 'accept' || status === 'acceptWithAudio') {
          updateTurnoverSubscriptionStatus(true)
          Taro.showToast({ title: '本次订阅成功', icon: 'success' })
        } else if (status === 'ban') {
          updateTurnoverSubscriptionStatus(false)
          const modal = await Taro.showModal({
            title: '订阅未开启',
            content: '请在小程序设置中允许接收订阅消息。',
            confirmText: '去设置'
          })
          if (modal.confirm) {
            const setting = await Taro.openSetting({ withSubscriptions: true })
            syncTurnoverSubscriptionSetting(setting.subscriptionsSetting)
          }
        } else {
          updateTurnoverSubscriptionStatus(false)
          Taro.showToast({ title: '未允许订阅', icon: 'none' })
        }
      } catch (err: any) {
        Taro.showToast({ title: err?.errMsg || err?.message || '订阅失败', icon: 'none' })
      } finally {
        subscribingTurnover.value = false
      }
    }


    async function onCancelTurnoverSubscription() {
      if (subscribingTurnover.value) return
      const modal = await Taro.showModal({
        title: '取消营业额通知',
        content: '微信需要由你在订阅消息设置中关闭该通知。',
        confirmText: '去设置'
      })
      if (!modal.confirm) return

      subscribingTurnover.value = true
      try {
        const setting = await Taro.openSetting({ withSubscriptions: true })
        const subscribed = syncTurnoverSubscriptionSetting(setting.subscriptionsSetting)
        if (subscribed === false) {
          Taro.showToast({ title: '已取消订阅', icon: 'success' })
        } else if (subscribed === true) {
          Taro.showToast({ title: '订阅仍已开启', icon: 'none' })
        }
      } catch (err: any) {
        Taro.showToast({ title: err?.errMsg || err?.message || '打开设置失败', icon: 'none' })
      } finally {
        subscribingTurnover.value = false
      }
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
        await refreshTurnoverSubscriptionStatus()
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

    return {
      Taro,
      useDidShow,
      usePullDownRefresh,
      computed,
      ref,
      useAuthStore,
      listDictDataByTypeCode,
      auth,
      ADMINISTRATIVE_UNIT_TYPE,
      administrativeUnitDict,
      bindingWechat,
      subscribingTurnover,
      turnoverSubscribed,
      initials,
      storeInfo,
      administrativeUnitDisplay,
      storeCode,
      wechatBound,
      canSubscribeTurnover,
      onLogout,
      onBindWechat,
      onSubscribeTurnover,
      onCancelTurnoverSubscription,
      refreshProfile,
    }
  }
}
