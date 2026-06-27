import Taro from '@tarojs/taro'
import { CLIENT_SOURCE_HEADER, getClientSource } from './client-source'

const DEFAULT_BASE_URL = 'http://47.120.27.64:5713/api/v1'
const AUTH_STORAGE_KEY = 'tower.auth'
let loadingCount = 0
let refreshPromise: Promise<string> | null = null

export type ApiResponse<T> = {
  code: number
  message?: string
  error?: string
  data: T
}

function getBaseUrl() {
  return (process.env.TARO_APP_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
}

function showGlobalLoading() {
  loadingCount += 1
  if (loadingCount === 1) {
    Taro.showLoading({ title: '加载中', mask: true })
  }
}

function hideGlobalLoading() {
  loadingCount = Math.max(0, loadingCount - 1)
  if (loadingCount === 0) {
    Taro.hideLoading()
  }
}

function cleanQueryData(data: unknown): unknown {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data
  const cleaned: Record<string, unknown> = {}
  Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (value === 'undefined' || value === 'null') return
    cleaned[key] = value
  })
  return cleaned
}

function readAuthStorage(): { token?: string; refreshToken?: string; user?: unknown } {
  try {
    return Taro.getStorageSync(AUTH_STORAGE_KEY) || {}
  } catch {
    return {}
  }
}

function writeAuthStorage(next: { token: string; refreshToken?: string; user?: unknown }) {
  Taro.setStorageSync(AUTH_STORAGE_KEY, next)
}

function clearAuthStorage() {
  Taro.removeStorageSync(AUTH_STORAGE_KEY)
}

function isAuthExpiredResponse(statusCode: number, body?: ApiResponse<unknown>) {
  return statusCode === 401 || body?.code === 401
}

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const current = readAuthStorage()
    const refreshToken = String(current.refreshToken || '')
    if (!refreshToken) throw new Error('登录已过期，请重新登录')

    const res = await Taro.request<ApiResponse<{
      token: string
      refresh_token?: string
      user_info?: unknown
    }>>({
      url: `${getBaseUrl()}/auth/refresh`,
      method: 'POST',
      data: { refresh_token: refreshToken },
      header: {
        'content-type': 'application/json',
        [CLIENT_SOURCE_HEADER]: getClientSource()
      }
    })

    const body = res.data
    if (!body || isAuthExpiredResponse(res.statusCode, body) || (body.code !== 0 && body.code !== 200)) {
      throw new Error(body?.message || body?.error || '登录已过期，请重新登录')
    }
    const data = body.data
    if (!data?.token) throw new Error('刷新登录态失败')

    writeAuthStorage({
      token: data.token,
      refreshToken: data.refresh_token || refreshToken,
      user: data.user_info || current.user
    })
    return data.token
  })().finally(() => {
    refreshPromise = null
  })
  return refreshPromise
}

function redirectToLogin() {
  clearAuthStorage()
  Taro.redirectTo({ url: '/pages/login/index' })
}

export async function withGlobalLoading<T>(run: () => Promise<T>, enabled = true) {
  if (!enabled) return run()
  showGlobalLoading()
  try {
    return await run()
  } finally {
    hideGlobalLoading()
  }
}

export async function request<T>(
  path: string,
  options: Omit<Taro.request.Option, 'url'> & { authToken?: string; showLoading?: boolean; _retry?: boolean } = {}
): Promise<T> {
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const { authToken, header, showLoading = true, method, data, _retry = false, ...rest } = options
  const storedAuth = readAuthStorage()
  const effectiveToken = authToken || String(storedAuth.token || '')
  const requestMethod = method || 'GET'
  const requestData = requestMethod === 'GET' ? cleanQueryData(data) : data
  if (showLoading) showGlobalLoading()
  try {
    const res = await Taro.request<ApiResponse<T>>({
      url,
      method: requestMethod,
      data: requestData as Taro.request.Option['data'],
      header: {
        'content-type': 'application/json',
        [CLIENT_SOURCE_HEADER]: getClientSource(),
        ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
        ...(header || {})
      },
      ...rest
    })

    const body = res.data
    if (isAuthExpiredResponse(res.statusCode, body)) {
      if (!_retry && path !== '/auth/login' && path !== '/auth/refresh') {
        try {
          const nextToken = await refreshAccessToken()
          return request<T>(path, { ...options, authToken: nextToken, showLoading: false, _retry: true })
        } catch (err) {
          redirectToLogin()
          throw err
        }
      }
      redirectToLogin()
      throw new Error(body?.message || body?.error || '登录已过期，请重新登录')
    }
    if (!body) throw new Error('接口返回为空')

    if (body.code !== 0 && body.code !== 200) {
      const msg = body.message || body.error || `请求失败(${body.code})`
      throw new Error(msg)
    }

    return body.data as T
  } finally {
    if (showLoading) hideGlobalLoading()
  }
}
