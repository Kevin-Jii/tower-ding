import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'


import { computed, ref } from 'vue'


import { useAuthStore } from '../../stores/auth'


import { listDictDataByTypeCode, type DictData } from '../../services/api'

export default {
  setup() {
    const auth = useAuthStore()
    
    
    /** 与后台门店「归属区」字典 type_code 一致 */
    const ADMINISTRATIVE_UNIT_TYPE = 'ADMINISTRATIVEUNIT'
    
    
    
    const administrativeUnitDict = ref<DictData[]>([])
    
    
    const bindingWechat = ref(false)
    
    
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
      initials,
      storeInfo,
      administrativeUnitDisplay,
      storeCode,
      wechatBound,
      onLogout,
      onBindWechat,
      refreshProfile,
    }
  }
}
