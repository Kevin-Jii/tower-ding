'use strict'

const DEFAULT_NOTIFY_PAGE = 'pages/accounting/index'
const REQUEST_TIMEOUT_MS = 15000
const WECHAT_STABLE_TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/stable_token'
const WECHAT_SUBSCRIBE_MESSAGE_URL = 'https://api.weixin.qq.com/cgi-bin/message/subscribe/send'
const WECHAT_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000
const WECHAT_TOKEN_ERROR_CODES = new Set([40001, 40014, 42001])

let cachedWechatAccessToken = ''
let cachedWechatAccessTokenExpiresAt = 0

exports.main = async (event = {}) => {
  const dryRun = event.dryRun === true || event.dryRun === 'true'
  const businessDate = normalizeBusinessDate(event.business_date || event.businessDate)
  const reports = await fetchDailyTurnoverReports(businessDate)
  const eligibleReports = reports.filter(report => shouldNotifyStore(report))

  if (dryRun) {
    return {
      ok: true,
      dry_run: true,
      business_date: businessDate || eligibleReports[0]?.business_date || '',
      stores: eligibleReports.map(report => ({
        store_id: report.store_id,
        store_name: report.store_name,
        total_amount: numberValue(report.total_amount),
        order_count: integerValue(report.order_count),
        admin_count: Array.isArray(report.admins) ? report.admins.length : 0
      }))
    }
  }

  const messageConfig = loadMessageConfig()
  const results = []

  for (const report of eligibleReports) {
    const admins = Array.isArray(report.admins) ? report.admins : []
    for (const admin of admins) {
      const result = await sendDailyTurnoverMessage(report, admin, messageConfig)
      results.push(result)
    }
  }

  const succeeded = results.filter(item => item.success).length
  const failed = results.length - succeeded
  console.log('daily turnover notification completed', {
    businessDate: businessDate || eligibleReports[0]?.business_date || '',
    stores: eligibleReports.length,
    recipients: results.length,
    succeeded,
    failed
  })

  return {
    ok: failed === 0,
    business_date: businessDate || eligibleReports[0]?.business_date || '',
    store_count: eligibleReports.length,
    recipient_count: results.length,
    succeeded,
    failed,
    results
  }
}

async function fetchDailyTurnoverReports(businessDate) {
  const baseURL = requiredEnv('GO_API_BASE_URL')
  const token = requiredEnv('INTERNAL_SERVICE_TOKEN')
  const endpoint = buildDailyTurnoverURL(baseURL, businessDate)
  const { response, body } = await requestJSON(
    endpoint,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    },
    'Go report API'
  )
  if (!response.ok || body.code !== 200 || !Array.isArray(body.data)) {
    throw new Error(`Go report API failed: HTTP ${response.status}, code ${body.code || 'unknown'}`)
  }
  return body.data
}

function buildDailyTurnoverURL(baseURL, businessDate) {
  let normalized = String(baseURL || '').trim().replace(/\/+$/, '')
  normalized = normalized.replace(/\/api\/v1$/i, '')
  const url = new URL(`${normalized}/api/internal/v1/reports/daily-turnover`)
  if (url.protocol !== 'https:') {
    throw new Error('GO_API_BASE_URL must use HTTPS')
  }
  if (businessDate) {
    url.searchParams.set('business_date', businessDate)
  }
  return url.toString()
}

async function requestJSON(url, options, requestName) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const text = await response.text()
    let body = {}
    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        throw new Error(`${requestName} returned invalid JSON: HTTP ${response.status}`)
      }
    }
    return { response, body }
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error(`${requestName} timed out after ${REQUEST_TIMEOUT_MS}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function loadMessageConfig() {
  return {
    templateId: requiredEnv('WECHAT_TEMPLATE_ID'),
    page: normalizePage(process.env.WECHAT_NOTIFY_PAGE || DEFAULT_NOTIFY_PAGE),
    fields: {
      amount: requiredEnv('WECHAT_TEMPLATE_AMOUNT_KEY'),
      time: requiredEnv('WECHAT_TEMPLATE_TIME_KEY')
    }
  }
}

async function sendDailyTurnoverMessage(report, admin, config) {
  const storeID = integerValue(report.store_id)
  const userID = integerValue(admin && admin.user_id)
  const openID = String((admin && admin.openid) || '').trim()
  if (!openID) {
    return { store_id: storeID, user_id: userID, success: false, error: 'missing openid' }
  }

  try {
    await sendWechatSubscribeMessage({
      touser: openID,
      template_id: config.templateId,
      page: config.page,
      data: buildTemplateData(report, config.fields)
    })
    return { store_id: storeID, user_id: userID, success: true }
  } catch (error) {
    const message = safeErrorMessage(error)
    console.error('subscription message send failed', { storeID, userID, error: message })
    return { store_id: storeID, user_id: userID, success: false, error: message }
  }
}

async function sendWechatSubscribeMessage(payload) {
  let result = await requestWechatSubscribeMessage(payload, false)
  if (WECHAT_TOKEN_ERROR_CODES.has(Number(result.body.errcode))) {
    cachedWechatAccessToken = ''
    cachedWechatAccessTokenExpiresAt = 0
    result = await requestWechatSubscribeMessage(payload, true)
  }

  if (!result.response.ok || Number(result.body.errcode) !== 0) {
    throw new Error(formatWechatAPIError('WeChat subscribe message API', result.response.status, result.body))
  }
}

async function requestWechatSubscribeMessage(payload, forceRefreshToken) {
  const accessToken = await getWechatAccessToken(forceRefreshToken)
  const endpoint = new URL(WECHAT_SUBSCRIBE_MESSAGE_URL)
  endpoint.searchParams.set('access_token', accessToken)
  return requestJSON(
    endpoint.toString(),
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    },
    'WeChat subscribe message API'
  )
}

async function getWechatAccessToken(forceRefresh) {
  const now = Date.now()
  if (!forceRefresh && cachedWechatAccessToken && now < cachedWechatAccessTokenExpiresAt) {
    return cachedWechatAccessToken
  }

  const { response, body } = await requestJSON(
    WECHAT_STABLE_TOKEN_URL,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credential',
        appid: requiredEnv('WECHAT_APP_ID'),
        secret: requiredEnv('WECHAT_APP_SECRET'),
        force_refresh: Boolean(forceRefresh)
      })
    },
    'WeChat stable token API'
  )

  const accessToken = String(body.access_token || '').trim()
  if (!response.ok || !accessToken) {
    throw new Error(formatWechatAPIError('WeChat stable token API', response.status, body))
  }

  const expiresInSeconds = Math.max(60, integerValue(body.expires_in || 7200))
  cachedWechatAccessToken = accessToken
  cachedWechatAccessTokenExpiresAt = now + Math.max(
    60 * 1000,
    expiresInSeconds * 1000 - WECHAT_TOKEN_REFRESH_BUFFER_MS
  )
  return cachedWechatAccessToken
}

function formatWechatAPIError(apiName, status, body) {
  const errCode = Number.isFinite(Number(body && body.errcode)) ? Number(body.errcode) : 'unknown'
  const errMsg = truncateText(body && body.errmsg ? body.errmsg : 'unknown error', 160)
  return `${apiName} failed: HTTP ${status}, errcode ${errCode}, errmsg ${errMsg}`
}

function buildTemplateData(report, fields) {
  return {
    [fields.amount]: { value: `${numberValue(report.total_amount).toFixed(2)}元` },
    [fields.time]: { value: formatBusinessPeriod(report.business_date) }
  }
}

function formatBusinessPeriod(businessDate) {
  const normalized = normalizeBusinessDate(businessDate)
  if (!normalized) {
    throw new Error('report business_date is required')
  }
  const [year, month, day] = normalized.split('-')
  return `${year}年${month}月${day}日`
}

function shouldNotifyStore(report) {
  if (!report || !Array.isArray(report.admins) || report.admins.length === 0) return false
  const skipZeroTurnover = String(process.env.SKIP_ZERO_TURNOVER || '').toLowerCase() === 'true'
  return !skipZeroTurnover || numberValue(report.total_amount) > 0 || integerValue(report.order_count) > 0
}

function normalizeBusinessDate(value) {
  if (value === undefined || value === null || String(value).trim() === '') return ''
  const normalized = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error('business_date must use YYYY-MM-DD format')
  }
  return normalized
}

function normalizePage(value) {
  return String(value || DEFAULT_NOTIFY_PAGE).trim().replace(/^\/+/, '')
}

function requiredEnv(name) {
  const value = optionalEnv(name)
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function optionalEnv(name) {
  return String(process.env[name] || '').trim()
}

function numberValue(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function integerValue(value) {
  return Math.max(0, Math.trunc(numberValue(value)))
}

function truncateText(value, maxLength) {
  return Array.from(String(value || '')).slice(0, maxLength).join('')
}

function safeErrorMessage(error) {
  const message = error && error.message ? error.message : String(error || 'unknown error')
  return truncateText(message, 300)
}
