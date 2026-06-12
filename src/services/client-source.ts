/**
 * 与后端约定的请求头名，用于区分调用端（小程序 / 网页 / App 等）。
 * 服务端读取该头做日志、限流或差异化逻辑；勿存放敏感信息。
 */
export const CLIENT_SOURCE_HEADER = 'X-Client-Source'

/**
 * 与后端约定的取值（可按需扩展，需与 tower-go / web-admin 等对齐）。
 * - weapp：微信小程序
 * - web：H5 / 浏览器内嵌等
 * - app：React Native 等独立 App 构建（Taro `rn`）
 * - android-app：Capacitor Android 打包（通过 `.env.android` 或 `TARO_APP_CLIENT_SOURCE` 注入）
 * 其他小程序平台（支付宝等）在命中对应 TARO_ENV 时透传平台名，便于区分。
 */
export function getClientSource(): string {
  const override = process.env.TARO_APP_CLIENT_SOURCE
  if (typeof override === 'string' && override.trim()) return override.trim()

  const taro = String(process.env.TARO_ENV || '').trim()
  if (taro === 'weapp') return 'weapp'
  if (taro === 'h5') return 'web'
  if (taro === 'rn') return 'app'
  if (taro) return taro
  return 'unknown'
}
