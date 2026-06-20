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
        </template>
      </view>

      <view class="card metaCard">
        <view class="metaHint">会员与支付</view>
        <view class="switchRow">
          <view>
            <view class="roK">是否绑定会员</view>
            <view class="switchHint">{{ bindMemberEnabled ? selectedMemberLabel : '不绑定会员' }}</view>
          </view>
          <Switch color="#111418" :checked="bindMemberEnabled" @change="onBindMemberSwitch" />
        </view>
        <view class="roRow mt">
          <text class="roK">支付状态</text>
          <view class="paySeg">
            <view :class="['paySegItem', paymentStatus === 1 ? 'paySegItem--on' : '']" @tap="paymentStatus = 1">已支付
            </view>
            <view :class="['paySegItem', paymentStatus === 2 ? 'paySegItem--on' : '']" @tap="paymentStatus = 2">未支付
            </view>
          </view>
        </view>
      </view>

      <view v-if="isTakeawayChannel" class="card takeawayCard">
        <view class="totalLabel">外卖订单</view>
        <view class="takeawayHint">{{ channelLabel }} 实际收入会覆盖商品明细销售额，商品明细只用于扣库存和成本核算</view>
        <view class="fieldLabel mt">外卖订单号</view>
        <input class="input" :value="orderNo" placeholder="如：美团1号 / 淘宝闪购1号" @input="onOrderNoInput" />
        <view class="fieldLabel mt">平台收入金额</view>
        <input class="input" type="digit" :value="incomeAmount" placeholder="0.00" @input="onIncomeAmountInput" />
      </view>

      <view class="section-title">商品明细</view>
      <view class="list">
        <view v-for="(line, idx) in lines" :key="idx" class="line card">
          <view class="lineHead">
            <view class="lineTitle">第 {{ idx + 1 }} 行</view>
            <view v-if="lines.length > 1" class="lineRemove" @tap="removeLine(idx)">删除</view>
          </view>
          <view class="lineMode">
            <view :class="['modePill', !line.is_custom ? 'modePill--on' : '']" @tap="setLineMode(idx, false)">库存商品
            </view>
            <view :class="['modePill', line.is_custom ? 'modePill--on' : '']" @tap="setLineMode(idx, true)">自定义内容</view>
          </view>
          <view v-if="!line.is_custom" class="pickRow" @tap="openPicker(idx)">
            <view v-if="line.product_id" class="pickMain">
              <view class="pickName">{{ line.product_name }}</view>
              <view class="pickSub">ID {{ line.product_id }}</view>
            </view>
            <view v-else class="pickPlaceholder">点击选择商品</view>
            <view class="pickArrow">›</view>
          </view>
          <view v-else class="customBox">
            <view class="fieldLabel">记账内容</view>
            <input class="input compactInput" :value="line.product_name" placeholder="如：临时服务费 / 手工收入"
              @input="onCustomNameInput(idx, $event)" />
            <view class="row2">
              <view class="col">
                <view class="fieldLabel mt">单位</view>
                <input class="input compactInput" :value="line.unit" placeholder="次/份/项"
                  @input="onCustomUnitInput(idx, $event)" />
              </view>
              <view class="col">
                <view class="fieldLabel mt">单价</view>
                <input class="input compactInput" type="digit" :value="line.price || ''" placeholder="0.00"
                  @input="onCustomPriceInput(idx, $event)" />
              </view>
            </view>
            <view class="fieldLabel mt">备注</view>
            <input class="input compactInput" :value="line.remark || ''" placeholder="选填"
              @input="onLineRemarkInput(idx, $event)" />
          </view>
          <view v-if="line.product_id" class="lineReadRow">
            <view class="lrItem lrItem--wide">
              <view class="fieldLabel">规格单位</view>
              <view class="unitPills">
                <view v-for="u in lineUnitOptions(line)" :key="u.value"
                  :class="['unitPill', line.unit === u.value ? 'unitPill--on' : '']"
                  @tap="setLineUnit(idx, u.value, u.spec)">
                  {{ u.label }}
                </view>
              </view>
              <view v-if="lineUnitOptions(line).length < 2" class="lrVal lrVal--hint">
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
        <view v-if="isTakeawayChannel" class="amountSummary">
          <view class="amountLine">
            <text>商品标价合计</text>
            <text>¥ {{ formatMoney(markedAmount) }}</text>
          </view>
          <view class="amountLine">
            <text>平台收入金额</text>
            <text>¥ {{ formatMoney(incomeAmount) }}</text>
          </view>
        </view>
        <view v-else class="totalHint">商品单价与每行小计由后端按单位自动取价并计算</view>
        <view class="fieldLabel mt">其他支出</view>
        <input class="input" type="digit" :value="otherExpenseAmount" placeholder="0.00" @input="onOtherExpenseInput" />

        <view class="switchRow mt">
          <view>
            <view class="roK">是否赠酒</view>
            <view class="switchHint">{{ giftWineEnabled ? giftWineSummary : '不赠酒' }}</view>
          </view>
          <Switch color="#111418" :checked="giftWineEnabled" @change="onGiftWineSwitch" />
        </view>
        <view v-if="giftWineEnabled" class="giftWineBox">
          <view class="pickRow" @tap="openGiftWinePicker">
            <view v-if="giftWineProductId" class="pickMain">
              <view class="pickName">{{ giftWineProductName }}</view>
              <view class="pickSub">ID {{ giftWineProductId }}</view>
            </view>
            <view v-else class="pickPlaceholder">点击选择赠酒商品</view>
            <view class="pickArrow">›</view>
          </view>
          <view v-if="giftWineProductId" class="lineReadRow">
            <view class="lrItem lrItem--wide">
              <view class="fieldLabel">规格单位</view>
              <view class="unitPills">
                <view v-for="u in giftWineUnitOptions" :key="u.value"
                  :class="['unitPill', giftWineUnit === u.value ? 'unitPill--on' : '']"
                  @tap="setGiftWineUnit(u.value)">
                  {{ u.label }}
                </view>
              </view>
              <view v-if="giftWineUnitOptions.length < 2" class="lrVal lrVal--hint">
                暂无更多规格，成本按当前单位计算
              </view>
            </view>
          </view>
          <view class="giftWineFoot">
            <view class="giftQty">
              <view class="fieldLabel">赠酒数量</view>
              <view class="stepper" @tap.stop>
                <view class="stepBtn" @tap="decGiftWineQty">−</view>
                <input class="stepInput" type="digit" :value="giftWineQuantity" @input="onGiftWineQuantityInput" />
                <view class="stepBtn" @tap="incGiftWineQty">+</view>
              </view>
            </view>
            <view class="giftCost">
              <view class="fieldLabel">赠酒成本</view>
              <view class="netValue">¥ {{ formatMoney(giftWineCostAmount) }}</view>
            </view>
          </view>
        </view>

        <view v-if="isTakeawayChannel" class="netPreview">
          <view class="netLabel">预计净收入</view>
          <view class="netValue">¥ {{ formatMoney(estimatedNetIncome) }}</view>
        </view>
        <view v-if="isTakeawayChannel" class="totalHint">预计值未扣商品成本和消耗品成本，最终以后端计算为准</view>
      </view>

      <view class="btnRow">
        <view :class="['btn', submitting ? 'btn--disabled' : '']" @tap="submit">{{ submitting ? '提交中…' : '提交记账' }}
        </view>
      </view>

      <view v-if="pickerOpen" class="mask" @tap="closePicker">
        <view class="sheet" @tap.stop>
          <view class="sheetTitle">{{ pickerTarget === 'gift' ? '选择赠酒商品' : '选择商品' }}</view>
          <scroll-view scroll-x class="sheetTabs" :show-scrollbar="false">
            <view v-for="tab in productTabs" :key="tab.value"
              :class="['sheetTab', productTab === tab.value ? 'sheetTab--on' : '']" @tap="productTab = tab.value">
              {{ tab.label }}
            </view>
          </scroll-view>
          <view class="sheetList">
            <view v-if="!filteredProducts.length" class="sheetEmpty">暂无库存商品</view>
            <view v-for="p in filteredProducts" :key="p.id" class="sheetRow" @tap="pickProduct(p)">
              <view>
                <view class="sheetName">{{ p.product_name || `商品 #${p.product_id || ''}` }}</view>
                <view class="sheetSub">库存 {{ p.quantity ?? 0 }} {{ p.unit || '-' }}</view>
              </view>
            </view>
          </view>
          <view class="sheetClose btn btn--ghost" @tap="closePicker">关闭</view>
        </view>
      </view>

      <view v-if="memberSheetOpen" class="mask" @tap="closeMemberSheet">
        <view class="sheet memberSheet" @tap.stop>
          <view class="sheetTitle">选择会员</view>
          <view class="memberSearchRow">
            <input
              class="memberSearchInput"
              :value="memberSearchKeyword"
              placeholder="姓名 / 手机号 / 会员号"
              confirm-type="search"
              @input="onMemberSearchInput"
              @confirm="searchMembers"
            />
            <view class="memberSearchBtn" @tap="searchMembers">搜索</view>
          </view>
          <view class="sheetList memberList">
            <view v-if="!members.length" class="sheetEmpty">暂无会员</view>
            <view
              v-for="member in members"
              :key="member.id"
              :class="['sheetRow', selectedMemberId === Number(member.id || 0) ? 'sheetRow--on' : '']"
              @tap="pickMember(member)"
            >
              <view>
                <view class="sheetName">{{ memberLabel(member) }}</view>
                <view class="sheetSub">会员 #{{ member.id }}</view>
              </view>
            </view>
          </view>
          <view class="sheetClose btn btn--ghost" @tap="closeMemberSheet">关闭</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { Switch } from '@tarojs/components'
import Taro, { useDidShow, useRouter } from '@tarojs/taro'
import { computed, ref } from 'vue'
import {
  createStoreAccount,
  listAllInventories,
  listDictDataByTypeCode,
  listMembers,
  listProductUnitSpecs,
  listAllStoreSupplierProducts,
  type Member
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './create.less'

const auth = useAuthStore()
const router = useRouter()

const channelOptions = ref([])
const channelDictLoading = ref(false)
const channel = ref('')
const members = ref<Member[]>([])
const memberSearchKeyword = ref('')
const selectedMemberId = ref(0)
const bindMemberEnabled = ref(false)
const memberSheetOpen = ref(false)
const paymentStatus = ref(1)
const otherExpenseAmount = ref('')
const orderNo = ref('')
const incomeAmount = ref('')
function newLine() {
  return { product_id: 0, quantity: 1, unit: '', spec: '', price: 0, amount: 0, list_price: 0, product_name: '', remark: '', is_custom: false }
}

const lines = ref([newLine()])
const submitting = ref(false)

const pickerOpen = ref(false)
const pickerLine = ref(0)
const pickerTarget = ref<'line' | 'gift'>('line')
const products = ref([])
const categorySource = ref([])
const productTab = ref('all')
const unitOptionsMap = ref({})
const initialModeApplied = ref(false)
const giftWineEnabled = ref(false)
const giftWineProductPath = ref<Array<string | number>>([])
const giftWineProductId = ref(0)
const giftWineProductName = ref('')
const giftWineUnit = ref('')
const giftWineQuantity = ref('1')

const channelLabel = computed(() => {
  const o = channelOptions.value.find((c) => c.value === channel.value)
  return o?.label || channel.value || '—'
})

const channelIndex = computed(() => {
  const i = channelOptions.value.findIndex((c) => c.value === channel.value)
  return i >= 0 ? i : 0
})
const memberOptions = computed(() => [
  { label: '不绑定会员', value: 0 },
  ...members.value.map((m) => ({ label: memberLabel(m), value: Number(m.id || 0) }))
])
const memberIndex = computed(() => {
  const i = memberOptions.value.findIndex((m) => m.value === selectedMemberId.value)
  return i >= 0 ? i : 0
})
const selectedMemberLabel = computed(() => memberOptions.value[memberIndex.value]?.label || '不绑定会员')
const isTakeawayChannel = computed(() => {
  const text = `${channel.value} ${channelLabel.value}`.toLowerCase()
  return [
    '外卖',
    '美团',
    '饿了么',
    '淘宝',
    '闪购',
    '京东',
    '商城',
    '小程序',
    'waimai',
    'takeaway',
    'delivery',
    'meituan',
    'eleme',
    'elm',
    'taobao',
    'shangou',
    'jingdong',
    'jd',
    'mall',
    'miniapp'
  ].some((keyword) => text.includes(keyword))
})
const productTabs = computed(() => {
  const seen = new Map()
  categorySource.value.forEach((p) => {
    const id = Number(p?.category_id || 0)
    const name = String(p?.category_name || '').trim()
    if (id > 0 && name && !seen.has(id)) seen.set(id, name)
  })
  const tabs = [{ label: '全部分类', value: 'all' }]
  seen.forEach((label, id) => {
    tabs.push({ label, value: String(id) })
  })
  return tabs
})
const filteredProducts = computed(() => {
  if (productTab.value !== 'all') {
    return products.value.filter((p) => String(Number(p?.category_id || 0)) === productTab.value)
  }
  return products.value
})
const markedAmount = computed(() => {
  return lines.value.reduce((sum, line) => sum + lineMarkedAmount(line), 0)
})
const estimatedNetIncome = computed(() => {
  if (!isTakeawayChannel.value) return 0
  return Number(incomeAmount.value || 0) - Number(otherExpenseAmount.value || 0)
})
const giftWineUnitOptions = computed(() => {
  const pid = Number(giftWineProductId.value || 0)
  if (!pid) return []
  return unitOptionsMap.value[pid] || []
})
const selectedGiftWineUnit = computed(() => {
  return giftWineUnitOptions.value.find((u) => u.value === giftWineUnit.value) || giftWineUnitOptions.value[0] || null
})
const giftWineCostAmount = computed(() => {
  if (!giftWineEnabled.value) return 0
  const qty = Number(giftWineQuantity.value || 0)
  const cost = Number(selectedGiftWineUnit.value?.cost_price || 0)
  return qty > 0 && cost > 0 ? Math.round(qty * cost * 100) / 100 : 0
})
const giftWineSummary = computed(() => {
  if (!giftWineProductId.value) return '请选择赠酒商品'
  const qty = Number(giftWineQuantity.value || 0)
  const q = Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, '')
  return `${giftWineProductName.value || '赠酒商品'} ${q || 0}${giftWineUnit.value || ''}`
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

function getProductCategoryId(product) {
  return Number(product?.category_id || product?.category?.id || product?.product?.category_id || product?.product?.category?.id || 0)
}

function getProductCategoryName(product) {
  return String(product?.category?.name || product?.category_name || product?.product?.category?.name || product?.product?.category_name || '').trim()
}

function getSupplierProductId(product) {
  return Number(product?.product_id || product?.product?.id || product?.id || 0)
}

function getSupplierProductName(product, fallback) {
  return String(product?.product_name || product?.name || product?.product?.product_name || product?.product?.name || fallback || '').trim()
}

function getSupplierProductUnit(product, fallback) {
  return String(product?.unit || product?.product?.unit || fallback || '').trim()
}

function getSupplierProductPrice(product) {
  const n = Number(product?.sale_price || product?.price || product?.bottle_price || product?.product?.sale_price || product?.product?.price || 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function productPathOf(product) {
  const categoryId = getProductCategoryId(product)
  const productId = Number(product?.product_id || product?.id || 0)
  return categoryId > 0 ? [categoryId, productId] : [productId]
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

function memberLabel(member) {
  const name = String(member?.name || '').trim()
  const phone = String(member?.phone || '').trim()
  if (name && phone) return `${name}(${phone})`
  return name || phone || `会员 #${member?.id || ''}`
}

function onMemberSearchInput(e) {
  memberSearchKeyword.value = String(e?.detail?.value || '')
}

function searchMembers() {
  void loadMembers(memberSearchKeyword.value.trim())
}

function onBindMemberSwitch(e) {
  bindMemberEnabled.value = Boolean(e?.detail?.value)
  if (bindMemberEnabled.value) {
    memberSheetOpen.value = true
    void loadMembers(memberSearchKeyword.value.trim())
    return
  }
  selectedMemberId.value = 0
  memberSheetOpen.value = false
}

function pickMember(member) {
  selectedMemberId.value = Number(member?.id || 0)
  bindMemberEnabled.value = selectedMemberId.value > 0
  memberSheetOpen.value = false
}

function closeMemberSheet() {
  memberSheetOpen.value = false
  if (!selectedMemberId.value) bindMemberEnabled.value = false
}

function addLine() {
  lines.value.push(newLine())
}

function removeLine(i) {
  lines.value.splice(i, 1)
}

function qtyStr(line) {
  const n = Number(line.quantity || 1)
  if (!Number.isFinite(n)) return '1'
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

function moneyInputValue(e) {
  const raw = String(e?.detail?.value || '').replace(/[^\d.]/g, '')
  const [head, ...tail] = raw.split('.')
  return tail.length ? `${head}.${tail.join('').slice(0, 2)}` : head
}

function onOtherExpenseInput(e) {
  otherExpenseAmount.value = moneyInputValue(e)
}

function onOrderNoInput(e) {
  orderNo.value = String(e?.detail?.value || '')
}

function onIncomeAmountInput(e) {
  incomeAmount.value = moneyInputValue(e)
}

function onChannelChange(e) {
  const idx = Number(e?.detail?.value ?? -1)
  if (!Number.isInteger(idx) || idx < 0 || idx >= channelOptions.value.length) return
  channel.value = channelOptions.value[idx]?.value || ''
}

function setLineMode(i, isCustom) {
  const line = lines.value[i]
  if (!line) return
  line.is_custom = Boolean(isCustom)
  line.product_id = 0
  line.product_name = ''
  line.unit = ''
  line.spec = ''
  line.price = 0
  line.amount = 0
  line.list_price = 0
  line.remark = ''
}

function onCustomNameInput(i, e) {
  const line = lines.value[i]
  if (!line) return
  line.product_name = String(e?.detail?.value || '')
}

function onCustomUnitInput(i, e) {
  const line = lines.value[i]
  if (!line) return
  line.unit = String(e?.detail?.value || '')
  line.spec = line.unit
}

function onCustomPriceInput(i, e) {
  const line = lines.value[i]
  if (!line) return
  const n = Number(String(e?.detail?.value || '').replace(/[^\d.]/g, ''))
  line.price = Number.isFinite(n) && n >= 0 ? n : 0
}

function onLineRemarkInput(i, e) {
  const line = lines.value[i]
  if (!line) return
  line.remark = String(e?.detail?.value || '')
}

function setLineUnit(i, unit, spec) {
  const line = lines.value[i]
  if (!line) return
  line.unit = unit
  line.spec = spec
  const opt = lineUnitOptions(line).find((o) => o.value === unit)
  if (opt?.sale_price > 0) line.list_price = opt.sale_price
}

function setGiftWineUnit(unit) {
  giftWineUnit.value = String(unit || '').trim()
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
        label,
        value: label,
        spec: label,
        factor,
        cost_price: Number(s?.cost_price || 0),
        sale_price: Number(s?.sale_price || 0)
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
      dedup.push({ label: o.label, value: o.value, spec: o.spec, cost_price: o.cost_price, sale_price: o.sale_price })
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
          if (opts[0]?.sale_price > 0) line.list_price = opts[0].sale_price
        } else {
          const current = opts.find((o) => o.value === line.unit)
          if (current?.sale_price > 0) line.list_price = current.sale_price
        }
      }
      if (Number(giftWineProductId.value || 0) === productId && !opts.some((o) => o.value === giftWineUnit.value)) {
        giftWineUnit.value = opts[0].value
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

function openPicker(lineIdx) {
  pickerTarget.value = 'line'
  pickerLine.value = lineIdx
  productTab.value = 'all'
  pickerOpen.value = true
  void loadProducts()
}

function openGiftWinePicker() {
  pickerTarget.value = 'gift'
  productTab.value = 'all'
  pickerOpen.value = true
  void loadProducts()
}

function closePicker() {
  pickerOpen.value = false
}

async function loadProducts() {
  if (!auth.token) return
  try {
    const storeId = auth.storeId || undefined
    const [inventories, supplierProducts] = await Promise.all([
      listAllInventories(auth.token, { store_id: storeId }),
      listAllStoreSupplierProducts(auth.token, { store_id: storeId })
    ])
    const inventoryByProductId = new Map()
    categorySource.value = supplierProducts.map((p) => ({
      category_id: getProductCategoryId(p),
      category_name: getProductCategoryName(p)
    }))
    inventories.forEach((inv) => {
      const pid = Number(inv?.product_id || 0)
      if (pid > 0) inventoryByProductId.set(pid, inv)
    })
    const rows = []
    const supplierProductIds = new Set()
    supplierProducts.forEach((p) => {
      const pid = getSupplierProductId(p)
      if (pid <= 0) return
      supplierProductIds.add(pid)
      const inv = inventoryByProductId.get(pid)
      rows.push({
        id: pid,
        product_id: pid,
        product_name: getSupplierProductName(p, inv?.product_name || `商品 #${pid}`),
        quantity: inv?.quantity ?? 0,
        unit: inv?.unit || getSupplierProductUnit(p, ''),
        list_price: getSupplierProductPrice(p),
        category_id: getProductCategoryId(p),
        category_name: getProductCategoryName(p)
      })
    })
    inventories.forEach((inv) => {
      const pid = Number(inv?.product_id || 0)
      if (pid <= 0 || supplierProductIds.has(pid)) return
      rows.push({
        ...inv,
        category_id: 0,
        category_name: ''
      })
    })
    products.value = rows
    if (!productTabs.value.some((tab) => tab.value === productTab.value)) {
      productTab.value = 'all'
    }
  } catch (err) {
    Taro.showToast({ title: err?.message || '加载库存商品失败', icon: 'none' })
  }
}

async function loadMembers(keyword = '') {
  if (!auth.token) return
  try {
    members.value = await listMembers(auth.token, {
      keyword: keyword || undefined,
      page: 1,
      page_size: 100
    })
  } catch {
    members.value = []
  }
}

function applyInitialMode() {
  if (initialModeApplied.value) return
  initialModeApplied.value = true
  const mode = String(router.params?.mode || '')
  if (mode === 'custom') {
    lines.value = [newLine()]
    setLineMode(0, true)
  } else if (mode === 'quick') {
    lines.value = [newLine()]
    setLineMode(0, false)
  }
}

function pickProduct(p) {
  if (pickerTarget.value === 'gift') {
    pickGiftWineProduct(p)
    return
  }
  const i = pickerLine.value
  const row = lines.value[i]
  const pid = Number(p.product_id || 0)
  if (!pid) return
  row.product_id = pid
  row.product_name = p.product_name || `商品 #${pid}`
  const fallback = String(p.unit || '').trim() || '件'
  row.unit = fallback
  row.spec = fallback
  row.list_price = Number(p.list_price || 0)
  row.price = undefined
  row.amount = undefined
  void loadUnitOptionsForProduct(pid, fallback)
  closePicker()
}

function pickGiftWineProduct(p) {
  const pid = Number(p.product_id || 0)
  if (!pid) return
  giftWineProductId.value = pid
  giftWineProductName.value = p.product_name || `商品 #${pid}`
  giftWineProductPath.value = productPathOf(p)
  const fallback = String(p.unit || '').trim() || '件'
  giftWineUnit.value = fallback
  if (!(Number(giftWineQuantity.value || 0) > 0)) giftWineQuantity.value = '1'
  void loadUnitOptionsForProduct(pid, fallback)
  closePicker()
}

function onGiftWineSwitch(e) {
  giftWineEnabled.value = Boolean(e?.detail?.value)
  if (giftWineEnabled.value) {
    if (!giftWineQuantity.value) giftWineQuantity.value = '1'
    return
  }
  giftWineProductPath.value = []
  giftWineProductId.value = 0
  giftWineProductName.value = ''
  giftWineUnit.value = ''
  giftWineQuantity.value = '1'
}

function onGiftWineQuantityInput(e) {
  giftWineQuantity.value = moneyInputValue(e)
}

function incGiftWineQty() {
  const q = Number(giftWineQuantity.value || 1)
  giftWineQuantity.value = String(Math.round((q + 1) * 100) / 100)
}

function decGiftWineQty() {
  const q = Number(giftWineQuantity.value || 1)
  giftWineQuantity.value = String(Math.max(1, Math.round((q - 1) * 100) / 100))
}

function lineMarkedAmount(line) {
  const qty = Number(line?.quantity || 0)
  if (!(qty > 0)) return 0
  if (line?.is_custom) {
    const price = Number(line?.price || 0)
    return price > 0 ? Math.round(qty * price * 100) / 100 : 0
  }
  const price = Number(line?.list_price || 0)
  return price > 0 ? Math.round(qty * price * 100) / 100 : 0
}

function formatMoney(v) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
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
    if (line.is_custom) {
      const name = String(line.product_name || '').trim()
      const unit = String(line.unit || '').trim()
      const qty = Number(line.quantity)
      const price = Number(line.price || 0)
      if (!name && !unit && !price) continue
      if (!name) {
        Taro.showToast({ title: '请填写自定义记账内容', icon: 'none' })
        return
      }
      if (!unit) {
        Taro.showToast({ title: `请填写「${name}」单位`, icon: 'none' })
        return
      }
      if (!(qty > 0) || !(price > 0)) {
        Taro.showToast({ title: `请填写「${name}」数量和单价`, icon: 'none' })
        return
      }
      items.push({
        product_id: 0,
        product_name: name,
        quantity: qty,
        unit,
        price,
        amount: Math.round(qty * price * 100) / 100,
        remark: line.remark || undefined
      })
      continue
    }
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
  if (giftWineEnabled.value) {
    if (!giftWineProductId.value) {
      Taro.showToast({ title: '请选择赠酒商品', icon: 'none' })
      return
    }
    if (!giftWineUnit.value) {
      Taro.showToast({ title: '请选择赠酒规格单位', icon: 'none' })
      return
    }
    if (!(Number(giftWineQuantity.value || 0) > 0)) {
      Taro.showToast({ title: '请填写赠酒数量', icon: 'none' })
      return
    }
    if (!(giftWineCostAmount.value > 0)) {
      Taro.showToast({ title: '赠酒商品未维护规格成本价', icon: 'none' })
      return
    }
  }
  submitting.value = true
  try {
    const payload: Record<string, any> = {
      channel: channel.value,
      other_expense_amount: Number(otherExpenseAmount.value || 0),
      payment_status: paymentStatus.value,
      member_id: bindMemberEnabled.value && selectedMemberId.value > 0 ? selectedMemberId.value : 0,
      is_gift_wine: giftWineEnabled.value ? 1 : 0,
      gift_wine_product_path: giftWineEnabled.value ? giftWineProductPath.value : [],
      gift_wine_product_id: giftWineEnabled.value ? giftWineProductId.value : 0,
      gift_wine_unit: giftWineEnabled.value ? giftWineUnit.value : '',
      gift_wine_quantity: giftWineEnabled.value ? Number(giftWineQuantity.value || 0) : 0,
      gift_wine_cost_amount: giftWineEnabled.value ? giftWineCostAmount.value : 0,
      items
    }
    if (isTakeawayChannel.value) {
      if (orderNo.value.trim()) payload.order_no = orderNo.value.trim()
      if (incomeAmount.value !== '') payload.income_amount = Number(incomeAmount.value || 0)
      payload.remark = `${channelLabel.value}外卖订单`
    }
    const acc = await createStoreAccount(auth.token, payload)
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
  applyInitialMode()
  void Promise.all([loadChannelDict(), loadProducts(), loadMembers()])
})
</script>
