import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'


import { reactive, ref } from 'vue'


import { createMember, listMembers, type Member } from '../../services/api'


import { useAuthStore } from '../../stores/auth'
import { formatMoney } from '../../shared/format'

export default {
  setup() {
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

    return {
      Taro,
      useDidShow,
      usePullDownRefresh,
      reactive,
      ref,
      createMember,
      listMembers,
      useAuthStore,
      auth,
      keyword,
      members,
      saving,
      form,
      onKeywordInput,
      onNameInput,
      onPhoneInput,
      memberName,
      formatMoney,
      refresh,
      submitMember,
    }
  }
}
