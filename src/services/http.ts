import Taro from '@tarojs/taro'
import { CLIENT_SOURCE_HEADER, getClientSource } from './client-source'

const DEFAULT_BASE_URL = 'http://47.120.27.64:5713/api/v1'

export type ApiResponse<T> = {
  code: number
  message?: string
  error?: string
  data: T
}

function getBaseUrl() {
  return (process.env.TARO_APP_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '')
}

export async function request<T>(
  path: string,
  options: Omit<Taro.request.Option, 'url'> & { authToken?: string } = {}
): Promise<T> {
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const { authToken, header, ...rest } = options

  const res = await Taro.request<ApiResponse<T>>({
    url,
    header: {
      'content-type': 'application/json',
      [CLIENT_SOURCE_HEADER]: getClientSource(),
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(header || {})
    },
    ...rest
  })

  if (res.statusCode === 401) {
    Taro.removeStorageSync('tower.auth')
    Taro.redirectTo({ url: '/pages/login/index' })
    throw new Error('登录已过期，请重新登录')
  }

  const body = res.data
  if (!body) throw new Error('接口返回为空')

  if (body.code === 401) {
    Taro.removeStorageSync('tower.auth')
    Taro.redirectTo({ url: '/pages/login/index' })
    throw new Error(body.message || body.error || '登录已过期，请重新登录')
  }

  if (body.code !== 0 && body.code !== 200) {
    const msg = body.message || body.error || `请求失败(${body.code})`
    throw new Error(msg)
  }

  return body.data as T
}
