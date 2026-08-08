'use strict'

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const DEFAULT_NOTIFY_PAGE = 'pages/accounting/index'
const REQUEST_TIMEOUT_MS = 15000

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
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      },
      signal: controller.signal
    })
    const body = await parseJSONResponse(response)
    if (!response.ok || body.code !== 200 || !Array.isArray(body.data)) {
      throw new Error(`Go report API failed: HTTP ${response.status}, code ${body.code || 'unknown'}`)
    }
    return body.data
  } catch (error) {
    if (error && error.name === 'AbortError') {
      throw new Error(`Go report API timed out after ${REQUEST_TIMEOUT_MS}ms`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
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

async function parseJSONResponse(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Go report API returned invalid JSON: HTTP ${response.status}`)
  }
}

function loadMessageConfig() {
  return {
    templateId: requiredEnv('WECHAT_TEMPLATE_ID'),
    page: normalizePage(process.env.WECHAT_NOTIFY_PAGE || DEFAULT_NOTIFY_PAGE),
    fields: {
      store: requiredEnv('WECHAT_TEMPLATE_STORE_KEY'),
      date: requiredEnv('WECHAT_TEMPLATE_DATE_KEY'),
      amount: requiredEnv('WECHAT_TEMPLATE_AMOUNT_KEY'),
      orderCount: requiredEnv('WECHAT_TEMPLATE_ORDER_COUNT_KEY'),
      channels: optionalEnv('WECHAT_TEMPLATE_CHANNELS_KEY')
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
    await cloud.openapi.subscribeMessage.send({
      touser: openID,
      templateId: config.templateId,
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

function buildTemplateData(report, fields) {
  const data = {
    [fields.store]: { value: truncateText(report.store_name || '未命名门店', 20) },
    [fields.date]: { value: formatBusinessDate(report.business_date) },
    [fields.amount]: { value: `${numberValue(report.total_amount).toFixed(2)}元` },
    [fields.orderCount]: { value: String(integerValue(report.order_count)) }
  }

  if (fields.channels) {
    data[fields.channels] = { value: formatChannelSummary(report.channels) }
  }
  return data
}

function formatChannelSummary(channels) {
  if (!Array.isArray(channels) || channels.length === 0) return '暂无渠道数据'
  const summary = channels
    .filter(channel => numberValue(channel.amount) > 0 || integerValue(channel.order_count) > 0)
    .map(channel => `${channel.channel_name || channel.channel}:${numberValue(channel.amount).toFixed(2)}元`)
    .join('，')
  return truncateText(summary || '暂无渠道数据', 20)
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

function formatBusinessDate(value) {
  const normalized = normalizeBusinessDate(value)
  if (!normalized) return ''
  const [year, month, day] = normalized.split('-')
  return `${year}年${month}月${day}日`
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
