import Taro from '@tarojs/taro'

export type RememberedLogin = {
  phone: string
  password: string
}

export const LOGIN_FORM_KEY = 'tower.login.form'
export const LOGIN_ACCOUNTS_KEY = 'tower.login.accounts'

function isRememberedLogin(value: unknown): value is RememberedLogin {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<RememberedLogin>
  return Boolean(String(item.phone || '').trim() && String(item.password || ''))
}

function normalizeAccounts(value: unknown) {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value
    .filter(isRememberedLogin)
    .map((item) => ({
      phone: String(item.phone).trim(),
      password: String(item.password)
    }))
    .filter((item) => {
      if (seen.has(item.phone)) return false
      seen.add(item.phone)
      return true
    })
}

export function readRememberedLogins(): RememberedLogin[] {
  try {
    const accounts = normalizeAccounts(Taro.getStorageSync(LOGIN_ACCOUNTS_KEY))
    if (accounts.length) return accounts

    const legacy = Taro.getStorageSync(LOGIN_FORM_KEY)
    if (!isRememberedLogin(legacy)) return []
    const migrated = [{
      phone: String(legacy.phone).trim(),
      password: String(legacy.password)
    }]
    Taro.setStorageSync(LOGIN_ACCOUNTS_KEY, migrated)
    Taro.removeStorageSync(LOGIN_FORM_KEY)
    return migrated
  } catch {
    return []
  }
}

export function rememberLogin(phone: string, password: string) {
  const normalizedPhone = String(phone || '').trim()
  if (!normalizedPhone || !password) return
  const accounts = readRememberedLogins().filter((item) => item.phone !== normalizedPhone)
  Taro.setStorageSync(LOGIN_ACCOUNTS_KEY, [
    { phone: normalizedPhone, password: String(password) },
    ...accounts
  ])
  Taro.removeStorageSync(LOGIN_FORM_KEY)
}

export function forgetLogin(phone: string) {
  const normalizedPhone = String(phone || '').trim()
  const accounts = readRememberedLogins().filter((item) => item.phone !== normalizedPhone)
  if (accounts.length) {
    Taro.setStorageSync(LOGIN_ACCOUNTS_KEY, accounts)
  } else {
    Taro.removeStorageSync(LOGIN_ACCOUNTS_KEY)
  }
  Taro.removeStorageSync(LOGIN_FORM_KEY)
}
