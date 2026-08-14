/**
 * 与后端约定的请求头名，用于区分调用端（小程序 / 网页 / App 等）。
 * 服务端读取该头做日志、限流或差异化逻辑；勿存放敏感信息。
 */
export const CLIENT_SOURCE_HEADER = 'X-Client-Source'

/**
 * 当前客户端仅发布微信小程序，请求头固定使用 weapp。
 */
export function getClientSource(): string {
  return 'weapp'
}
