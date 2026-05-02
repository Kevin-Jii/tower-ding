<template>
  <view class="page">
    <view class="container">
      <view class="card metaCard">
        <view class="metaHint">销售渠道（字典名称）</view>
        <view v-if="channelDictLoading" class="dictHint">正在加载渠道选项…</view>
        <view v-else-if="!channelOptions.length" class="dictHint dictHint--warn">未配置「销售渠道」字典，无法提交，请联系管理员</view>
        <template v-else>
          <view class="roRow">
            <text class="roK">销售渠道</text>
            <picker mode="selector" :range="channelOptions" range-key="label" :value="channelIndex"
              @change="onChannelChange">
              <view class="pickerFake">{{ channelLabel }} <text class="pickArrowInline">›</text></view>
            </picker>
          </view>
          <view class="roRow mt">
            <text class="roK">记账日期</text>
            <text class="roV">{{ accountDate }}</text>
          </view>
        </template>
      </view>

      <view class="section-title">商品明细</view>
      <view class="list">
        <view v-for="(line, idx) in lines" :key="idx" class="line card">
          <view class="lineHead">
            <view class="lineTitle">第 {{ idx + 1 }} 行</view>
            <view v-if="lines.length > 1" class="lineRemove" @tap="removeLine(idx)">删除</view>
          </view>
          <view class="pickRow" @tap="openPicker(idx)">
            <view v-if="line.product_id" class="pickMain">
              <view class="pickName">{{ line.product_name }}</view>
              <view class="pickSub">ID {{ line.product_id }}</view>
            </view>
            <view v-else class="pickPlaceholder">点击选择商品</view>
            <view class="pickArrow">›</view>
          </view>
          <view v-if="line.product_id" class="lineReadRow">
            <view class="lrItem lrItem--wide">
              <view class="fieldLabel">规格单位</view>
              <view class="unitPills">
                <view
                  v-for="u in lineUnitOptions(line)"
                  :key="u.value"
                  :class="['unitPill', line.unit === u.value ? 'unitPill--on' : '']"
                  @tap="setLineUnit(idx, u.value, u.spec)"
                >
                  {{ u.label }}
                </view>
              </view>
              <view
                v-if="lineUnitOptions(line).length < 2"
                class="lrVal lrVal--hint"
              >
                暂无大规格可选，请先到「库存 → 商品单位与价格配置」启用大规格
              </view>
              <view class="lrVal lrVal--hint">单价与小计由后端自动计算</view>
            </view>
          </view>
          <view class="fieldLabel mt">数量</view>
          <view class="stepper" @tap.stop>
            <view class="stepBtn" @tap="decQty(idx)">−</view>
            <view class="stepVal">{{ qtyStr(line) }}</view>
            <view class="stepBtn" @tap="incQty(idx)">+</view>
          </view>
        </view>
      </view>

      <view class="btnRow">
        <view class="btn btn--ghost" @tap="addLine">+ 添加一行</view>
      </view>

      <view class="card totalCard">
        <view class="totalLabel">金额设置</view>
        <view class="totalHint">商品单价与每行小计由后端按单位自动取价并计算</view>
        <view class="fieldLabel mt">其他支出</view>
        <input class="input" type="digit" :value="formatMoney(otherExpenseAmount)" @input="onOtherExpenseInput" />
      </view>

      <view class="btnRow">
        <view :class="['btn', submitting ? 'btn--disabled' : '']" @tap="submit">{{ submitting ? '提交中…' : '提交记账' }}
        </view>
      </view>

      <view v-if="pickerOpen" class="mask" @tap="closePicker">
        <view class="sheet" @tap.stop>
          <view class="sheetTitle">选择商品</view>
          <scroll-view scroll-y class="sheetList">
            <view v-if="!products.length" class="sheetEmpty">暂无库存商品</view>
            <view v-for="p in products" :key="p.id" class="sheetRow" @tap="pickProduct(p)">
              <view>
                <view class="sheetName">{{ p.product_name || `商品 #${p.product_id || ''}` }}</view>
                <view class="sheetSub">库存 {{ p.quantity ?? 0 }} {{ p.unit || '-' }}</view>
              </view>
            </view>
          </scroll-view>
          <view class="sheetClose btn btn--ghost" @tap="closePicker">关闭</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import Taro, { useDidShow } from '@tarojs/taro'
import { computed, ref } from 'vue'
import {
  createStoreAccount,
  listInventories,
  listDictDataByTypeCode,
  listProductUnitSpecs
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './create.less'

const auth = useAuthStore()

const channelOptions = ref([])
const channelDictLoading = ref(false)
const channel = ref('')
const accountDate = ref(todayStr())
const otherExpenseAmount = ref(0)
const lines = ref([{ product_id: 0, quantity: 1, unit: '', spec: '', price: 0, amount: 0, product_name: '' }])
const submitting = ref(false)

const pickerOpen = ref(false)
const pickerLine = ref(0)
const products = ref([])
const unitOptionsMap = ref({})

const channelLabel = computed(() => {
  const o = channelOptions.value.find((c) => c.value === channel.value)
  return o?.label || channel.value || '—'
})

const channelIndex = computed(() => {
  const i = channelOptions.value.findIndex((c) => c.value === channel.value)
  return i >= 0 ? i : 0
})

function mapDictOptions(rows) {
  return rows
    .map((r) => ({
      label: String(r.label || r.value || '').trim() || String(r.value || ''),
      value: String(r.value || '').trim()
    }))
    .filter((o) => o.value)
}

function pickDefaultValue(rows) {
  const def = rows.find((r) => r.is_default)
  return String(def?.value || rows[0]?.value || '').trim()
}

async function loadChannelDict() {
  if (!auth.token) return
  channelDictLoading.value = true
  try {
    const rows = await listDictDataByTypeCode(auth.token, 'sales_channel')
    channelOptions.value = mapDictOptions(rows)
    const allowed = new Set(channelOptions.value.map((o) => o.value))
    if (!channel.value || !allowed.has(channel.value)) {
      channel.value = pickDefaultValue(rows) || ''
    }
  } catch (err) {
    channelOptions.value = []
    Taro.showToast({ title: err?.message || '加载销售渠道失败', icon: 'none' })
  } finally {
    channelDictLoading.value = false
  }
}

function todayStr() {
  const n = new Date()
  const p = (x) => (x < 10 ? `0${x}` : `${x}`)
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`
}

function addLine() {
  lines.value.push({ product_id: 0, quantity: 1, unit: '', spec: '', price: 0, amount: 0, product_name: '' })
}

function removeLine(i) {
  lines.value.splice(i, 1)
}

function qtyStr(line) {
  const n = Number(line.quantity || 1)
  if (!Number.isFinite(n)) return '1'
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

function onOtherExpenseInput(e) {
  const n = Number(String(e?.detail?.value || '').replace(/[^\d.]/g, ''))
  otherExpenseAmount.value = Number.isFinite(n) && n >= 0 ? n : 0
}

function onChannelChange(e) {
  const idx = Number(e?.detail?.value ?? -1)
  if (!Number.isInteger(idx) || idx < 0 || idx >= channelOptions.value.length) return
  channel.value = channelOptions.value[idx]?.value || ''
}

function setLineUnit(i, unit, spec) {
  const line = lines.value[i]
  if (!line) return
  line.unit = unit
  line.spec = spec
}

function lineUnitOptions(line) {
  const pid = Number(line?.product_id || 0)
  if (!pid) return []
  return unitOptionsMap.value[pid] || []
}

function buildUnitOptions(specs) {
  const enabled = specs
    .filter((s) => s?.is_enabled !== false)
    .map((s) => {
      const label = String(s?.unit_name || s?.unit_code || '').trim()
      const factor = Number(s?.factor_to_base || 1)
      return {
        label: factor > 1 ? `${label} x${factor}` : label,
        value: label,
        spec: label,
        factor
      }
    })
    .filter((o) => o.value)

  const dedup = []
  const seen = new Set()
  enabled
    .sort((a, b) => a.factor - b.factor)
    .forEach((o) => {
      if (seen.has(o.value)) return
      seen.add(o.value)
      dedup.push({ label: o.label, value: o.value, spec: o.spec })
    })
  return dedup
}

async function loadUnitOptionsForProduct(productId, fallbackUnit) {
  if (!auth.token || !productId) return
  try {
    const specs = await listProductUnitSpecs(auth.token, productId)
    const opts = buildUnitOptions(specs)
    if (opts.length) {
      unitOptionsMap.value[productId] = opts
      for (const line of lines.value) {
        if (Number(line?.product_id || 0) !== productId) continue
        const exists = opts.some((o) => o.value === line.unit)
        if (!exists) {
          line.unit = opts[0].value
          line.spec = opts[0].spec
        }
      }
      return
    }
  } catch {
    // ignore and fallback
  }
  unitOptionsMap.value[productId] = fallbackUnit ? [{ label: fallbackUnit, value: fallbackUnit, spec: fallbackUnit }] : []
}

function incQty(i) {
  const line = lines.value[i]
  if (!line) return
  const q = Number(line.quantity || 1)
  line.quantity = Math.round((q + 1) * 100) / 100
}

function decQty(i) {
  const line = lines.value[i]
  if (!line) return
  const q = Number(line.quantity || 1)
  line.quantity = Math.max(1, Math.round((q - 1) * 100) / 100)
}

function formatMoney(v) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function openPicker(lineIdx) {
  pickerLine.value = lineIdx
  pickerOpen.value = true
  void loadProducts()
}

function closePicker() {
  pickerOpen.value = false
}

async function loadProducts() {
  if (!auth.token) return
  try {
    products.value = await listInventories(auth.token, {
      store_id: auth.storeId || undefined,
      page: 1,
      page_size: 100
    })
  } catch (err) {
    Taro.showToast({ title: err?.message || '加载库存商品失败', icon: 'none' })
  }
}

function pickProduct(p) {
  const i = pickerLine.value
  const row = lines.value[i]
  const pid = Number(p.product_id || 0)
  if (!pid) return
  row.product_id = pid
  row.product_name = p.product_name || `商品 #${pid}`
  const fallback = String(p.unit || '').trim() || '件'
  row.unit = fallback
  row.spec = fallback
  row.price = undefined
  row.amount = undefined
  void loadUnitOptionsForProduct(pid, fallback)
  closePicker()
}

async function submit() {
  if (!auth.token) return
  if (!channel.value) {
    Taro.showToast({ title: channelOptions.value.length ? '请选择销售渠道' : '销售渠道字典未配置', icon: 'none' })
    return
  }
  const items = []
  let hasMissingUnit = false
  for (const line of lines.value) {
    if (!line.product_id) continue
    const qty = Number(line.quantity)
    if (!(qty > 0)) continue
    const unit = String(line.unit || '').trim()
    if (!unit) {
      hasMissingUnit = true
      continue
    }
    items.push({
      product_id: line.product_id,
      quantity: qty,
      unit,
      spec: line.spec || undefined,
      // 不传 price/amount，后端按单位自动取 bottle_price/case_price 并计算小计
      remark: line.remark || undefined
    })
  }
  if (hasMissingUnit) {
    Taro.showToast({ title: '请为商品选择单位', icon: 'none' })
    return
  }
  if (!items.length) {
    Taro.showToast({ title: '请完善至少一行商品（含单位）', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const acc = await createStoreAccount(auth.token, {
      channel: channel.value,
      account_date: accountDate.value,
      other_expense_amount: Number(otherExpenseAmount.value || 0),
      items
    })
    Taro.showToast({ title: '已创建', icon: 'success' })
    setTimeout(() => {
      Taro.redirectTo({ url: `/pages/accounting/detail?id=${acc.id}` })
    }, 400)
  } catch (err) {
    Taro.showToast({ title: err?.message || '提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

useDidShow(() => {
  accountDate.value = todayStr()
  void Promise.all([loadChannelDict(), loadProducts()])
})
</script>
