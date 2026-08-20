import Taro, { useDidShow } from '@tarojs/taro'


import { ref } from 'vue'


import { useAuthStore } from '../../stores/auth'
import {
  forgetLogin,
  readRememberedLogins,
  rememberLogin,
  type RememberedLogin
} from '../../shared/login-accounts'

export default {
  setup() {
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
    
    
    const autoLoginChecked = ref(false)
    
    
    
    function onPhoneInput(e: any) {
      phone.value = String(e?.detail?.value || '')
    }
    
    
    function onPwdInput(e: any) {
      password.value = String(e?.detail?.value || '')
    }
    
    
    
    function hydrateRememberForm() {
      try {
        const saved = readRememberedLogins()[0] as RememberedLogin | undefined
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
    
    
    
    function redirectAuthedUser() {
      if (autoLoginChecked.value) return
      autoLoginChecked.value = true
      auth.hydrate()
      if (auth.isAuthed) {
        Taro.reLaunch({ url: '/pages/home/index' })
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
          rememberLogin(phone.value.trim(), password.value)
        } else {
          forgetLogin(phone.value.trim())
        }
        Taro.hideLoading()
        Taro.reLaunch({ url: '/pages/home/index' })
      } catch (err: any) {
        Taro.hideLoading()
        Taro.showToast({ title: err?.message || '登录失败', icon: 'none' })
      } finally {
        loading.value = false
      }
    }
    useDidShow(() => {
      redirectAuthedUser()
      hydrateRememberForm()
      hydratePolicyAccept()
    })

    return {
      Taro,
      useDidShow,
      ref,
      useAuthStore,
      POLICY_VERSION,
      POLICY_ACCEPT_KEY,
      auth,
      phone,
      password,
      loading,
      rememberPwd,
      agreedTerms,
      maskPassword,
      autoLoginChecked,
      onPhoneInput,
      onPwdInput,
      hydrateRememberForm,
      hydratePolicyAccept,
      redirectAuthedUser,
      onOpenUserAgreement,
      onOpenPrivacyPolicy,
      onSubmit,
    }
  }
}
