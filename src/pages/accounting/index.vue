<template>
  <view class="page">
    <view class="container">
      <view class="card hero">
        <view class="heroTop">
          <view>
            <view class="heroLabel">总销售额</view>
            <view class="heroMoney">¥ {{ formatMoney(stats?.gross_total_amount) }}</view>
          </view>
          <view class="heroBadge">{{ stats?.count ?? 0 }} 笔</view>
        </view>
        <view class="dateFilter">
          <Picker mode="date" fields="day" :value="accountDate" :end="today" @change="onAccountDateChange">
            <view class="dateBox dateBox--single">
              <view class="dateLabel">日期</view>
              <view class="dateValue">{{ accountDate || '选择日期' }}</view>
              <text class="dateArrow">›</text>
            </view>
          </Picker>
        </view>
      </view>
      <view class="actionGrid">
        <view class="card cta" @tap="goCreate('quick')">
          <view>
            <view class="ctaTitle">快速记账</view>
            <view class="ctaSub">选择系统商品，后端自动算价并扣库存</view>
          </view>
          <view class="ctaPlus">+</view>
        </view>
      </view>

      <view class="sectionHead">
        <view class="section-title">最近记录</view>
        <view class="filterBtn" @tap="openFilterSheet">
          筛选
          <text v-if="activeFilterCount" class="filterBadge">{{ activeFilterCount }}</text>
        </view>
      </view>
      <view class="list">
        <view v-if="!list.length" class="empty card">暂无记账数据</view>
        <view v-for="item in list" :key="item.id" class="row card" @tap="openDetail(item.id)">
          <view class="rowTop">
            <image v-if="platformIcon(item)" class="platformIcon" :src="platformIcon(item)" mode="aspectFit" />
            <view class="rowMain">
              <view class="rowTitle">{{ rowDisplayNo(item) }}</view>
              <view class="rowSub">
                <text v-if="platformLabel(item)" class="platformName">{{ platformLabel(item) }}</text>
                <text v-else>{{ channelLabel(item.channel) }}</text>
              </view>
            </view>
            <view class="amount amount--in">¥ {{ formatMoney(item.gross_total_amount ?? item.total_amount ??
              item.amount) }}</view>
          </view>
          <view class="rowFoot">
            <view class="rowMeta">{{ item.item_count ?? item.items?.length ?? 0 }} 项商品</view>
            <view class="rowMeta">操作人 {{ operatorLabel(item) }}</view>
            <view v-if="Number(item.is_errand_order || 0) === 1" class="rowMeta">跑腿 ¥{{ formatMoney(item.errand_fee) }}
            </view>
            <view v-if="Number(item.round_amount || 0) > 0" class="rowMeta">抹零 ¥{{ formatMoney(item.round_amount) }}
            </view>
            <view v-if="Number(item.is_gift_wine || 0) === 1" class="rowMeta">赠酒 ¥{{
              formatMoney(item.gift_wine_cost_amount) }}</view>
            <view v-if="hasConsumables(item)" class="rowMeta rowMeta--locked">已绑定耗材</view>
          </view>
          <view class="rowStatus">
            <view class="statusTags">
              <view class="statusTag">{{ channelLabel(item.channel) }}</view>
              <view :class="['statusTag', paymentStatusValue(item) === 2 ? 'statusTag--warn' : 'statusTag--ok']">
                {{ paymentStatusLabel(paymentStatusValue(item)) }}
              </view>
              <view class="statusTag">{{ accountMemberLabel(item) }}</view>
            </view>
            <view class="rowActions" @tap.stop>
              <view v-if="canBindConsumables(item)" class="miniBtn miniBtn--dark" @tap="openConsumableSheet(item)">绑定消耗品
              </view>
              <template v-if="canOpenMetaSheet(item)">
                <view class="iconMiniBtn" @tap="openMetaSheet(item)">
                  <LucideIcon name="settings" color="#17202a" :size="17" :stroke-width="2.25" />
                </view>
              </template>
            </view>
          </view>
        </view>
        <view v-if="list.length" class="loadMore">{{ loadingMore ? '加载中...' : hasMore ? '上拉加载更多' : '没有更多了' }}</view>
      </view>
    </view>

    <view v-if="filterSheetOpen" class="metaMask" @tap="closeFilterSheet">
      <view class="metaSheet" @tap.stop>
        <view class="sheetHandle" />
        <view class="sheetTitle">筛选条件</view>

        <view class="editRow">
          <view class="editLabel">会员搜索</view>
          <input class="filterInput" :value="memberKeyword" placeholder="姓名 / 手机号 / 会员号" confirm-type="search"
            @input="onMemberKeywordInput" />
        </view>

        <view class="editRow">
          <view class="editLabel">支付状态</view>
          <picker mode="selector" :range="paymentFilterOptions" range-key="label" :value="paymentFilterIndex"
            @change="onPaymentFilterChange">
            <view class="pickerFake">{{ paymentFilterLabel }} <text class="pickArrowInline">›</text></view>
          </picker>
        </view>

        <view class="sheetActions">
          <view class="btn btn--ghost sheetBtn" @tap="resetFilters">重置</view>
          <view class="btn sheetBtn" @tap="applyFilters">确定</view>
        </view>
      </view>
    </view>

    <view v-if="metaSheetOpen" class="metaMask" @tap="closeMetaSheet">
      <view class="metaSheet" @tap.stop>
        <view class="sheetHandle" />
        <view class="sheetTitle">编辑记账</view>
        <view class="sheetSub">{{ editingAccount?.account_no || `记账 #${editingAccount?.id || ''}` }}</view>

        <view class="switchRow">
          <view>
            <view class="editLabel">支付状态</view>
            <view class="switchHint">{{ paymentStatus === 1 ? '已支付' : '未支付' }}</view>
          </view>
          <Switch color="#17202a" :checked="paymentStatus === 1" @change="onPaymentStatusSwitch" />
        </view>

        <view class="switchRow">
          <view>
            <view class="editLabel">是否跑腿</view>
            <view class="switchHint">{{ editIsErrandOrder === 1 ? '跑腿订单' : '普通订单' }}</view>
          </view>
          <Switch color="#17202a" :checked="editIsErrandOrder === 1" @change="onErrandSwitch" />
        </view>

        <view v-if="editIsErrandOrder === 1" class="editRow">
          <view class="editLabel">跑腿费用</view>
          <input class="filterInput" type="digit" :value="editErrandFee" placeholder="0.00"
            @input="onEditErrandFeeInput" />
        </view>

        <view class="switchRow">
          <view>
            <view class="editLabel">是否抹零</view>
            <view class="switchHint">{{ editIsRounding === 1 ? '抹零订单' : '不抹零' }}</view>
          </view>
          <Switch color="#17202a" :checked="editIsRounding === 1" @change="onRoundingSwitch" />
        </view>

        <view v-if="editIsRounding === 1" class="editRow">
          <view class="editLabel">抹零金额</view>
          <input class="filterInput" type="digit" :value="editRoundingAmount" placeholder="0.00"
            @input="onEditRoundingAmountInput" />
        </view>

        <view class="switchRow">
          <view>
            <view class="editLabel">是否赠酒</view>
            <view class="switchHint">{{ editIsGiftWine === 1 ? editGiftWineSummary : '不赠酒' }}</view>
          </view>
          <Switch color="#17202a" :checked="editIsGiftWine === 1" @change="onGiftWineSwitch" />
        </view>

        <view v-if="editIsGiftWine === 1" class="giftWineBox">
          <view class="pickRow" @tap="openGiftWinePicker">
            <view v-if="editGiftWineProductId" class="pickMain">
              <view class="pickName">{{ editGiftWineProductName }}</view>
              <view class="pickSub">ID {{ editGiftWineProductId }}</view>
            </view>
            <view v-else class="pickPlaceholder">点击选择赠酒商品</view>
            <view class="pickArrow">›</view>
          </view>
          <view v-if="editGiftWineProductId" class="editRow">
            <view class="editLabel">赠酒规格</view>
            <view class="unitPills">
              <view v-for="u in editGiftWineUnitOptions" :key="u.value"
                :class="['unitPill', editGiftWineUnit === u.value ? 'unitPill--on' : '']"
                @tap="editGiftWineUnit = u.value">
                {{ u.label }}
              </view>
            </view>
          </view>
          <view class="giftWineFoot">
            <view class="giftQty">
              <view class="editLabel">赠酒数量</view>
              <view class="stepper" @tap.stop>
                <view class="stepBtn" @tap="decGiftWineQty">−</view>
                <input class="stepInput" type="digit" :value="editGiftWineQuantity" @input="onGiftWineQuantityInput" />
                <view class="stepBtn" @tap="incGiftWineQty">+</view>
              </view>
            </view>
            <view class="giftCost">
              <view class="editLabel">赠酒成本</view>
              <view class="giftCostValue">¥ {{ formatMoney(editGiftWineCostAmount) }}</view>
            </view>
          </view>
        </view>

        <view class="sheetActions">
          <view class="btn btn--ghost sheetBtn" @tap="closeMetaSheet">取消</view>
          <view :class="['btn', 'sheetBtn', savingMeta ? 'btn--disabled' : '']" @tap="saveAccountMeta">
            {{ savingMeta ? '保存中...' : '保存设置' }}
          </view>
        </view>
      </view>
    </view>

    <view v-if="consumableSheetOpen" class="metaMask" @tap="closeConsumableSheet">
      <view class="metaSheet" @tap.stop>
        <view class="sheetHandle" />
        <view class="sheetTitle">绑定消耗品</view>
        <view class="sheetSub">{{ consumableTarget?.account_no || `记账 #${consumableTarget?.id || ''}` }}</view>

        <view v-for="(line, idx) in consumableLines" :key="idx" class="consumeLine">
          <view class="lineHead">
            <view class="lineTitle">消耗品 {{ idx + 1 }}</view>
            <view v-if="consumableLines.length > 1" class="lineRemove" @tap="removeConsumableLine(idx)">移除</view>
          </view>
          <view class="editRow">
            <view class="editLabel">类型</view>
            <view class="paySeg">
              <view :class="['paySegItem', line.kind === 'product' ? 'paySegItem--on' : '']"
                @tap="setConsumableKind(idx, 'product')">档案</view>
              <view :class="['paySegItem', line.kind === 'custom' ? 'paySegItem--on' : '']"
                @tap="setConsumableKind(idx, 'custom')">自定义</view>
            </view>
          </view>
          <template v-if="line.kind === 'product'">
            <view class="editRow">
              <view class="editLabel">消耗品</view>
              <picker mode="selector" :range="consumableProductOptions" range-key="label"
                :value="consumableProductIndex(line)" @change="onConsumableProductChange(idx, $event)">
                <view class="pickerFake">{{ consumableProductLabel(line) }} <text class="pickArrowInline">›</text>
                </view>
              </picker>
            </view>
            <view class="editRow">
              <view class="editLabel">数量</view>
              <input class="filterInput" type="digit" :value="line.quantity" placeholder="1"
                @input="onConsumableQtyInput(idx, $event)" />
            </view>
          </template>
          <template v-else>
            <view class="editRow">
              <view class="editLabel">名称</view>
              <input class="filterInput" :value="line.name" placeholder="自定义消耗品名称"
                @input="onConsumableNameInput(idx, $event)" />
            </view>
            <view class="editRow">
              <view class="editLabel">金额</view>
              <input class="filterInput" type="digit" :value="line.amount" placeholder="0.00"
                @input="onConsumableAmountInput(idx, $event)" />
            </view>
          </template>
        </view>

        <view class="consumeTotal">消耗品合计 ¥{{ formatMoney(consumableBindTotal) }}</view>

        <view class="sheetActions">
          <view class="btn btn--ghost sheetBtn" @tap="addConsumableLine">加一行</view>
          <view :class="['btn', 'sheetBtn', consumableSaving ? 'btn--disabled' : '']" @tap="saveConsumables">
            {{ consumableSaving ? '保存中...' : '保存消耗品' }}
          </view>
        </view>
      </view>
    </view>

    <view v-if="giftWinePickerOpen" class="metaMask" @tap="closeGiftWinePicker">
      <view class="productSheet" @tap.stop>
        <view class="sheetHandle" />
        <view class="sheetTitle">选择赠酒商品</view>
        <scroll-view scroll-x class="sheetTabs" :show-scrollbar="false">
          <view v-for="tab in productTabs" :key="tab.value"
            :class="['sheetTab', productTab === tab.value ? 'sheetTab--on' : '']" @tap="productTab = tab.value">
            {{ tab.label }}
          </view>
        </scroll-view>
        <view class="productList">
          <view v-if="!filteredProducts.length" class="sheetEmpty">暂无库存商品</view>
          <view v-for="p in filteredProducts" :key="p.id" class="productRow" @tap="pickGiftWineProduct(p)">
            <view>
              <view class="pickName">{{ p.product_name || `商品 #${p.product_id || ''}` }}</view>
              <view class="pickSub">库存 {{ p.quantity ?? 0 }} {{ p.unit || '-' }}</view>
            </view>
          </view>
        </view>
        <view class="btn btn--ghost sheetBtn" @tap="closeGiftWinePicker">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { Picker, Switch } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useReachBottom } from '@tarojs/taro'
import { computed, ref } from 'vue'
import elemeIcon from '../../assets/platforms/eleme.png'
import jdIcon from '../../assets/platforms/jd.png'
import meituanIcon from '../../assets/platforms/meituan.png'
import miniappIcon from '../../assets/platforms/miniapp.png'
import storeIcon from '../../assets/platforms/store.png'
import taobaoIcon from '../../assets/platforms/taobao.png'
import wechatIcon from '../../assets/platforms/wechat.png'
import LucideIcon from '../../components/LucideIcon.vue'
import {
  getStoreAccountStats,
  bindStoreAccountConsumables,
  getStoreAccountDetail,
  listDictDataByTypeCode,
  listAllInventories,
  listAllStoreSupplierProducts,
  listMembers,
  listProductUnitSpecs,
  listStoreAccounts,
  listStoreAccountConsumableProducts,
  updateStoreAccount,
  type DictData,
  type Member,
  type StoreAccount,
  type StoreAccountConsumableProduct
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './index.less'

const auth = useAuthStore()
const list = ref<StoreAccount[]>([])
const stats = ref<{ gross_total_amount?: number; total_amount?: number; count?: number } | null>(null)
const channelDict = ref<Record<string, string>>({})
const channelOptions = ref<Array<{ label: string; value: string }>>([])
const members = ref<Member[]>([])
const today = businessDateStr()
const accountDate = ref(today)
const metaSheetOpen = ref(false)
const editingAccount = ref<StoreAccount | null>(null)
const paymentStatus = ref(1)
const editIsErrandOrder = ref(0)
const editErrandFee = ref('')
const editIsRounding = ref(0)
const editRoundingAmount = ref('')
const editIsGiftWine = ref(0)
const editGiftWineProductPath = ref<Array<string | number>>([])
const editGiftWineProductId = ref(0)
const editGiftWineProductName = ref('')
const editGiftWineUnit = ref('')
const editGiftWineQuantity = ref('1')
const giftWinePickerOpen = ref(false)
const products = ref<any[]>([])
const categorySource = ref<any[]>([])
const productTab = ref('all')
const unitOptionsMap = ref<Record<number, Array<{ label: string; value: string; spec: string; cost_price: number; sale_price?: number }>>>({})
const paymentFilter = ref(0)
const memberKeyword = ref('')
const filterSheetOpen = ref(false)
const savingMeta = ref(false)
const consumableSheetOpen = ref(false)
const consumableSaving = ref(false)
const consumableTarget = ref<StoreAccount | null>(null)
const consumableProducts = ref<StoreAccountConsumableProduct[]>([])
const consumableLines = ref<Array<{ kind: 'product' | 'custom'; consumable_product_id: number; quantity: string; name: string; amount: string }>>([])
const page = ref(1)
const pageSize = 10
const hasMore = ref(true)
const loadingMore = ref(false)
const refreshing = ref(false)
const paymentFilterOptions = [
  { label: '全部', value: 0 },
  { label: '已支付', value: 1 },
  { label: '未支付', value: 2 }
]

const queryRange = computed(() => {
  return {
    start_date: accountDate.value || undefined,
    end_date: accountDate.value || undefined
  }
})

const consumableProductOptions = computed(() =>
  consumableProducts.value.map((p) => ({ label: `${p.name || `消耗品 #${p.id}`}（¥${formatMoney(p.cost_price)}）`, value: p.id }))
)
const consumableProductMap = computed(() => {
  const map = new Map<number, StoreAccountConsumableProduct>()
  consumableProducts.value.forEach((p) => map.set(Number(p.id || 0), p))
  return map
})
const consumableBindTotal = computed(() => {
  return consumableLines.value.reduce((sum, line) => {
    if (line.kind === 'custom') return sum + Number(line.amount || 0)
    const p = consumableProductMap.value.get(Number(line.consumable_product_id || 0))
    return sum + Number(p?.cost_price || 0) * Number(line.quantity || 0)
  }, 0)
})
const paymentFilterIndex = computed(() => {
  const i = paymentFilterOptions.findIndex((item) => item.value === paymentFilter.value)
  return i >= 0 ? i : 0
})
const paymentFilterLabel = computed(() => paymentFilterOptions[paymentFilterIndex.value]?.label || '全部')
const activeFilterCount = computed(() => {
  let count = 0
  if (memberKeyword.value.trim()) count += 1
  if (paymentFilter.value) count += 1
  return count
})
const productTabs = computed(() => {
  const seen = new Map<number, string>()
  categorySource.value.forEach((p) => {
    const id = Number(p?.category_id || 0)
    const name = String(p?.category_name || '').trim()
    if (id > 0 && name && !seen.has(id)) seen.set(id, name)
  })
  const tabs = [{ label: '全部分类', value: 'all' }]
  seen.forEach((label, id) => tabs.push({ label, value: String(id) }))
  return tabs
})
const filteredProducts = computed(() => {
  if (productTab.value === 'all') return products.value
  return products.value.filter((p) => String(Number(p?.category_id || 0)) === productTab.value)
})
const editGiftWineUnitOptions = computed(() => {
  const pid = Number(editGiftWineProductId.value || 0)
  if (!pid) return []
  return unitOptionsMap.value[pid] || []
})
const selectedGiftWineUnit = computed(() => {
  return editGiftWineUnitOptions.value.find((u) => u.value === editGiftWineUnit.value) || editGiftWineUnitOptions.value[0] || null
})
const editGiftWineCostAmount = computed(() => {
  if (editIsGiftWine.value !== 1) return 0
  const qty = Number(editGiftWineQuantity.value || 0)
  const cost = Number(selectedGiftWineUnit.value?.cost_price || 0)
  return qty > 0 && cost > 0 ? Math.round(qty * cost * 100) / 100 : 0
})
const editGiftWineSummary = computed(() => {
  if (!editGiftWineProductId.value) return '请选择赠酒商品'
  const qty = Number(editGiftWineQuantity.value || 0)
  const q = Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, '')
  return `${editGiftWineProductName.value || '赠酒商品'} ${q || 0}${editGiftWineUnit.value || ''}`
})

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`
}

function businessDate() {
  const now = new Date()
  if (now.getHours() < 5) now.setDate(now.getDate() - 1)
  now.setHours(0, 0, 0, 0)
  return now
}

function businessDateStr() {
  const now = businessDate()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function onAccountDateChange(e: any) {
  accountDate.value = String(e?.detail?.value || '').trim()
  void refresh()
}

function formatMoney(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

function mapDict(rows: DictData[]) {
  const map: Record<string, string> = {}
  rows.forEach((r) => {
    const value = String(r?.value || '').trim()
    if (!value) return
    map[value] = String(r?.label || r?.value || '').trim() || value
  })
  return map
}

function getProductCategoryId(product: any) {
  return Number(product?.category_id || product?.category?.id || product?.product?.category_id || product?.product?.category?.id || 0)
}

function getProductCategoryName(product: any) {
  return String(product?.category?.name || product?.category_name || product?.product?.category?.name || product?.product?.category_name || '').trim()
}

function getSupplierProductId(product: any) {
  return Number(product?.product_id || product?.product?.id || product?.id || 0)
}

function getSupplierProductName(product: any, fallback = '') {
  return String(product?.product_name || product?.name || product?.product?.product_name || product?.product?.name || fallback || '').trim()
}

function getSupplierProductUnit(product: any, fallback = '') {
  return String(product?.unit || product?.product?.unit || fallback || '').trim()
}

function getSupplierProductPrice(product: any) {
  const n = Number(product?.sale_price || product?.price || product?.bottle_price || product?.product?.sale_price || product?.product?.price || 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function productPathOf(product: any) {
  const categoryId = getProductCategoryId(product)
  const productId = Number(product?.product_id || product?.id || 0)
  return categoryId > 0 ? [categoryId, productId] : [productId]
}

function buildUnitOptions(specs: any[]) {
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

  const dedup: Array<{ label: string; value: string; spec: string; cost_price: number; sale_price?: number }> = []
  const seen = new Set<string>()
  enabled
    .sort((a, b) => a.factor - b.factor)
    .forEach((o) => {
      if (seen.has(o.value)) return
      seen.add(o.value)
      dedup.push({ label: o.label, value: o.value, spec: o.spec, cost_price: o.cost_price, sale_price: o.sale_price })
    })
  return dedup
}

function channelLabel(channel?: string) {
  const code = String(channel || '').trim()
  if (!code) return '—'
  return channelDict.value[code] || code
}

function channelText(item: StoreAccount) {
  return `${item.channel || ''} ${channelLabel(item.channel)}`.toLowerCase()
}

function platformInfo(item: StoreAccount) {
  const text = channelText(item)
  if (text.includes('美团') || text.includes('meituan')) {
    return { label: '美团', icon: meituanIcon }
  }
  if (text.includes('饿了么') || text.includes('eleme') || text.includes('elm')) {
    return { label: '饿了么', icon: elemeIcon }
  }
  if (text.includes('淘宝') || text.includes('闪购') || text.includes('taobao') || text.includes('shangou')) {
    return { label: text.includes('闪购') || text.includes('shangou') ? '淘宝闪购' : '淘宝', icon: taobaoIcon }
  }
  if (text.includes('京东') || text.includes('jingdong') || text.includes('jd')) {
    return { label: '京东', icon: jdIcon }
  }
  if (text.includes('商城') || text.includes('小程序') || text.includes('mall') || text.includes('miniapp')) {
    return { label: '商城小程序', icon: miniappIcon }
  }
  if (text.includes('微信') || text.includes('wechat')) {
    return { label: '微信', icon: wechatIcon }
  }
  if (text.includes('线下') || text.includes('门店') || text.includes('offline') || text.includes('store')) {
    return { label: '线下门店', icon: storeIcon }
  }
  return null
}

function platformIcon(item: StoreAccount) {
  return platformInfo(item)?.icon || ''
}

function platformLabel(item: StoreAccount) {
  return platformInfo(item)?.label || ''
}

function orderDisplayNo(item: StoreAccount) {
  return item.order_no || item.account_no || `记账 #${item.id}`
}

function rowDisplayNo(item: StoreAccount) {
  if (item.member) return memberLabel(item.member)
  return orderDisplayNo(item)
}

function operatorLabel(item: StoreAccount) {
  const operator = item.operator
  return operator?.nickname || operator?.username || operator?.phone || '-'
}

function isOnlinePaidChannel(item: StoreAccount) {
  const text = channelText(item)
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
}

function paymentStatusValue(item: StoreAccount) {
  return Number(item.payment_status || 1) === 2 ? 2 : 1
}

function paymentStatusLabel(v?: number) {
  return Number(v || 1) === 2 ? '未支付' : '已支付'
}

function canEditAccount(item: StoreAccount) {
  const d = accountCreatedAt(item)
  if (!d) return false
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function accountCreatedAt(item: StoreAccount) {
  const s = String(item.created_at || '').trim()
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return false
  return d
}

function canEditPaymentStatus(item: StoreAccount) {
  const d = accountCreatedAt(item)
  if (!d) return false
  const now = new Date()
  return now.getTime() - d.getTime() >= 0 && now.getTime() - d.getTime() < 5 * 24 * 60 * 60 * 1000
}

function hasConsumables(item: StoreAccount) {
  return (item.consumables?.length || 0) > 0
}

function canBindConsumables(item: StoreAccount) {
  return !hasConsumables(item)
}

function canOpenMetaSheet(item: StoreAccount) {
  return !hasConsumables(item) && canEditPaymentStatus(item)
}

function memberLabel(member?: Member | null) {
  if (!member) return '-'
  const name = String(member.name || '').trim()
  const phone = String(member.phone || '').trim()
  if (name && phone) return `${name}(${phone})`
  return name || phone || `会员 #${member.id}`
}

function accountMemberLabel(item: StoreAccount) {
  if (item.member) return memberLabel(item.member)
  const mid = Number(item.member_id || 0)
  return mid > 0 ? `会员 #${mid}` : '-'
}

function onMemberKeywordInput(e: any) {
  memberKeyword.value = String(e?.detail?.value || '')
}

function onPaymentFilterChange(e: any) {
  const idx = Number(e?.detail?.value ?? 0)
  paymentFilter.value = paymentFilterOptions[idx]?.value || 0
}

function openFilterSheet() {
  filterSheetOpen.value = true
}

function closeFilterSheet() {
  filterSheetOpen.value = false
}

function resetFilters() {
  memberKeyword.value = ''
  paymentFilter.value = 0
  filterSheetOpen.value = false
  void refresh(true)
}

function applyFilters() {
  filterSheetOpen.value = false
  void refresh(true)
}

async function loadChannelDict() {
  if (!auth.token) return
  try {
    const rows = await listDictDataByTypeCode(auth.token, 'sales_channel')
    channelDict.value = mapDict(rows)
    channelOptions.value = rows
      .map((r) => ({
        label: String(r?.label || r?.value || '').trim() || String(r?.value || ''),
        value: String(r?.value || '').trim()
      }))
      .filter((o) => o.value)
  } catch {
    channelDict.value = {}
    channelOptions.value = []
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

async function loadProducts() {
  if (!auth.token) return
  try {
    const storeId = auth.storeId || undefined
    const [inventories, supplierProducts] = await Promise.all([
      listAllInventories(auth.token, { store_id: storeId }),
      listAllStoreSupplierProducts(auth.token, { store_id: storeId })
    ])
    const inventoryByProductId = new Map<number, any>()
    categorySource.value = supplierProducts.map((p: any) => ({
      category_id: getProductCategoryId(p),
      category_name: getProductCategoryName(p)
    }))
    inventories.forEach((inv: any) => {
      const pid = Number(inv?.product_id || 0)
      if (pid > 0) inventoryByProductId.set(pid, inv)
    })
    const rows: any[] = []
    const supplierProductIds = new Set<number>()
    supplierProducts.forEach((p: any) => {
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
    inventories.forEach((inv: any) => {
      const pid = Number(inv?.product_id || 0)
      if (pid <= 0 || supplierProductIds.has(pid)) return
      rows.push({ ...inv, id: pid, category_id: 0, category_name: '' })
    })
    products.value = rows
    if (!productTabs.value.some((tab) => tab.value === productTab.value)) productTab.value = 'all'
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载库存商品失败', icon: 'none' })
  }
}

async function loadUnitOptionsForProduct(productId: number, fallbackUnit = '') {
  if (!auth.token || !productId) return
  try {
    const specs = await listProductUnitSpecs(auth.token, productId)
    const opts = buildUnitOptions(specs as any[])
    if (opts.length) {
      unitOptionsMap.value[productId] = opts
      if (Number(editGiftWineProductId.value || 0) === productId && !opts.some((o) => o.value === editGiftWineUnit.value)) {
        editGiftWineUnit.value = opts[0].value
      }
      return
    }
  } catch {
    // fallback below
  }
  unitOptionsMap.value[productId] = fallbackUnit
    ? [{ label: fallbackUnit, value: fallbackUnit, spec: fallbackUnit, cost_price: 0 }]
    : []
}

async function loadConsumableProducts() {
  if (!auth.token) return
  try {
    consumableProducts.value = await listStoreAccountConsumableProducts(auth.token, {
      store_id: auth.storeId || undefined,
      page: 1,
      page_size: 500,
      showLoading: false
    })
  } catch {
    consumableProducts.value = []
  }
}

async function refresh(reset = true) {
  if (!auth.token) {
    Taro.redirectTo({ url: '/pages/login/index' })
    return
  }
  if (loadingMore.value) return
  loadingMore.value = true
  if (reset) {
    page.value = 1
    hasMore.value = true
  } else if (!hasMore.value) {
    loadingMore.value = false
    return
  }
  const q = queryRange.value
  try {
    const currentPage = page.value
    const [accounts, accountStats] = await Promise.all([
      listStoreAccounts(auth.token, {
        store_id: auth.storeId || undefined,
        start_date: q.start_date,
        end_date: q.end_date,
        member_keyword: memberKeyword.value.trim() || undefined,
        payment_status: paymentFilter.value || undefined,
        page: currentPage,
        page_size: pageSize
      }),
      getStoreAccountStats(auth.token, {
        store_id: auth.storeId || undefined,
        start_date: q.start_date,
        end_date: q.end_date
      })
    ])
    list.value = reset ? accounts : [...list.value, ...accounts]
    hasMore.value = accounts.length >= pageSize
    if (hasMore.value) page.value = currentPage + 1
    stats.value = accountStats
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载失败', icon: 'none' })
  } finally {
    loadingMore.value = false
  }
}

function openDetail(id: number) {
  Taro.navigateTo({ url: `/pages/accounting/detail?id=${id}` })
}

function openMetaSheet(item: StoreAccount) {
  if (!canOpenMetaSheet(item)) {
    Taro.showToast({ title: hasConsumables(item) ? '已绑定耗材，不能修改' : '该记录已超过支付状态可修改时间', icon: 'none' })
    return
  }
  editingAccount.value = item
  paymentStatus.value = paymentStatusValue(item)
  editIsErrandOrder.value = Number(item.is_errand_order || 0) === 1 ? 1 : 0
  editErrandFee.value = String(item.errand_fee ?? '')
  editIsRounding.value = Number(item.round_amount || 0) > 0 ? 1 : 0
  editRoundingAmount.value = String(item.round_amount ?? '')
  editIsGiftWine.value = Number(item.is_gift_wine || 0) === 1 ? 1 : 0
  editGiftWineProductId.value = Number(item.gift_wine_product_id || 0)
  editGiftWineProductName.value = String(item.gift_wine_product_name || '')
  editGiftWineProductPath.value = item.gift_wine_product_path || (editGiftWineProductId.value ? [editGiftWineProductId.value] : [])
  editGiftWineUnit.value = String(item.gift_wine_unit || '')
  editGiftWineQuantity.value = String(item.gift_wine_quantity || 1)
  if (editGiftWineProductId.value > 0) void loadUnitOptionsForProduct(editGiftWineProductId.value, editGiftWineUnit.value)
  metaSheetOpen.value = true
}

function closeMetaSheet() {
  if (savingMeta.value) return
  metaSheetOpen.value = false
}

async function saveAccountMeta() {
  if (!auth.token || !editingAccount.value?.id || savingMeta.value) return
  if (editIsGiftWine.value === 1) {
    if (!editGiftWineProductId.value) {
      Taro.showToast({ title: '请选择赠酒商品', icon: 'none' })
      return
    }
    if (!editGiftWineUnit.value) {
      Taro.showToast({ title: '请选择赠酒规格单位', icon: 'none' })
      return
    }
    if (!(Number(editGiftWineQuantity.value || 0) > 0)) {
      Taro.showToast({ title: '请填写赠酒数量', icon: 'none' })
      return
    }
    if (!(editGiftWineCostAmount.value > 0)) {
      Taro.showToast({ title: '赠酒商品未维护规格成本价', icon: 'none' })
      return
    }
  }
  savingMeta.value = true
  try {
    await updateStoreAccount(auth.token, editingAccount.value.id, {
      payment_status: paymentStatus.value,
      is_errand_order: editIsErrandOrder.value,
      errand_fee: editIsErrandOrder.value === 1 ? Number(editErrandFee.value || 0) : 0,
      round_amount: editIsRounding.value === 1 ? Number(editRoundingAmount.value || 0) : 0,
      is_gift_wine: editIsGiftWine.value,
      gift_wine_product_path: editIsGiftWine.value === 1 ? editGiftWineProductPath.value : [],
      gift_wine_product_id: editIsGiftWine.value === 1 ? editGiftWineProductId.value : 0,
      gift_wine_unit: editIsGiftWine.value === 1 ? editGiftWineUnit.value : '',
      gift_wine_quantity: editIsGiftWine.value === 1 ? Number(editGiftWineQuantity.value || 0) : 0,
      gift_wine_cost_amount: editIsGiftWine.value === 1 ? editGiftWineCostAmount.value : 0
    })
    Taro.showToast({ title: '已保存', icon: 'success' })
    metaSheetOpen.value = false
    await refresh()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    savingMeta.value = false
  }
}

function onEditErrandFeeInput(e: any) {
  editErrandFee.value = moneyInputValue(e)
}

function onEditRoundingAmountInput(e: any) {
  editRoundingAmount.value = moneyInputValue(e)
}

function onPaymentStatusSwitch(e: any) {
  paymentStatus.value = e?.detail?.value ? 1 : 2
}

function onErrandSwitch(e: any) {
  editIsErrandOrder.value = e?.detail?.value ? 1 : 0
  if (editIsErrandOrder.value === 0) editErrandFee.value = ''
}

function onRoundingSwitch(e: any) {
  editIsRounding.value = e?.detail?.value ? 1 : 0
  if (editIsRounding.value === 0) editRoundingAmount.value = ''
}

function onGiftWineSwitch(e: any) {
  editIsGiftWine.value = e?.detail?.value ? 1 : 0
  if (editIsGiftWine.value === 0) {
    editGiftWineProductPath.value = []
    editGiftWineProductId.value = 0
    editGiftWineProductName.value = ''
    editGiftWineUnit.value = ''
    editGiftWineQuantity.value = '1'
  }
}

function openGiftWinePicker() {
  productTab.value = 'all'
  giftWinePickerOpen.value = true
  void loadProducts()
}

function closeGiftWinePicker() {
  giftWinePickerOpen.value = false
}

function pickGiftWineProduct(product: any) {
  const pid = Number(product?.product_id || product?.id || 0)
  if (!pid) return
  editGiftWineProductPath.value = productPathOf(product)
  editGiftWineProductId.value = pid
  editGiftWineProductName.value = String(product?.product_name || `商品 #${pid}`)
  const fallback = String(product?.unit || '').trim() || '件'
  editGiftWineUnit.value = fallback
  if (!(Number(editGiftWineQuantity.value || 0) > 0)) editGiftWineQuantity.value = '1'
  void loadUnitOptionsForProduct(pid, fallback)
  closeGiftWinePicker()
}

function onGiftWineQuantityInput(e: any) {
  editGiftWineQuantity.value = moneyInputValue(e)
}

function incGiftWineQty() {
  const q = Number(editGiftWineQuantity.value || 1)
  editGiftWineQuantity.value = String(Math.round((q + 1) * 100) / 100)
}

function decGiftWineQty() {
  const q = Number(editGiftWineQuantity.value || 1)
  editGiftWineQuantity.value = String(Math.max(1, Math.round((q - 1) * 100) / 100))
}

function moneyInputValue(e: any) {
  const raw = String(e?.detail?.value || '').replace(/[^\d.]/g, '')
  const [head, ...tail] = raw.split('.')
  return tail.length ? `${head}.${tail.join('').slice(0, 2)}` : head
}

function goCreate(mode: 'quick' | 'custom') {
  Taro.navigateTo({ url: `/pages/accounting/create?mode=${mode}` })
}

function makeConsumableLine(kind: 'product' | 'custom' = 'product') {
  return { kind, consumable_product_id: 0, quantity: '1', name: '', amount: '' }
}

async function openConsumableSheet(item: StoreAccount) {
  if (hasConsumables(item)) {
    Taro.showToast({ title: '已绑定耗材，不能再次绑定', icon: 'none' })
    return
  }
  consumableTarget.value = item
  consumableLines.value = [makeConsumableLine()]
  await loadConsumableProducts()
  try {
    if (auth.token) {
      const full = await getStoreAccountDetail(auth.token, item.id)
      if (full.consumables?.length) {
        consumableLines.value = full.consumables.map((c) => {
          const pid = Number(c.product_id || 0)
          const inCatalog = pid > 0 && consumableProductMap.value.has(pid)
          return {
            kind: inCatalog ? 'product' : 'custom',
            consumable_product_id: inCatalog ? pid : 0,
            quantity: String(c.quantity || 1),
            name: inCatalog ? '' : String(c.product_name || ''),
            amount: inCatalog ? '' : String(c.amount || '')
          }
        })
      }
    }
  } catch {
    // 空白表单仍允许绑定
  }
  consumableSheetOpen.value = true
}

function closeConsumableSheet() {
  if (consumableSaving.value) return
  consumableSheetOpen.value = false
}

function addConsumableLine() {
  consumableLines.value.push(makeConsumableLine())
}

function removeConsumableLine(idx: number) {
  consumableLines.value.splice(idx, 1)
  if (!consumableLines.value.length) consumableLines.value.push(makeConsumableLine())
}

function setConsumableKind(idx: number, kind: 'product' | 'custom') {
  consumableLines.value[idx] = makeConsumableLine(kind)
}

function consumableProductIndex(line: { consumable_product_id: number }) {
  const i = consumableProductOptions.value.findIndex((o) => o.value === Number(line.consumable_product_id || 0))
  return i >= 0 ? i : 0
}

function consumableProductLabel(line: { consumable_product_id: number }) {
  const i = consumableProductIndex(line)
  return consumableProductOptions.value[i]?.label || '请选择消耗品'
}

function onConsumableProductChange(idx: number, e: any) {
  const i = Number(e?.detail?.value ?? 0)
  consumableLines.value[idx].consumable_product_id = Number(consumableProductOptions.value[i]?.value || 0)
}

function onConsumableQtyInput(idx: number, e: any) {
  consumableLines.value[idx].quantity = moneyInputValue(e)
}

function onConsumableNameInput(idx: number, e: any) {
  consumableLines.value[idx].name = String(e?.detail?.value || '')
}

function onConsumableAmountInput(idx: number, e: any) {
  consumableLines.value[idx].amount = moneyInputValue(e)
}

async function saveConsumables() {
  if (!auth.token || !consumableTarget.value || consumableSaving.value) return
  const consumables: Array<Record<string, unknown>> = []
  for (const line of consumableLines.value) {
    if (line.kind === 'custom') {
      const name = line.name.trim()
      const amount = Number(line.amount || 0)
      if (!name || !(amount > 0)) {
        Taro.showToast({ title: '请填写自定义消耗品名称和金额', icon: 'none' })
        return
      }
      consumables.push({ product_id: 0, product_name: name, quantity: 1, amount })
      continue
    }
    const productID = Number(line.consumable_product_id || 0)
    const quantity = Number(line.quantity || 0)
    if (productID > 0 && quantity > 0) consumables.push({ consumable_product_id: productID, quantity })
  }
  if (!consumables.length) {
    Taro.showToast({ title: '请至少选择一条消耗品', icon: 'none' })
    return
  }
  consumableSaving.value = true
  try {
    await bindStoreAccountConsumables(auth.token, consumableTarget.value.id, { consumables })
    Taro.showToast({ title: '已保存', icon: 'success' })
    consumableSheetOpen.value = false
    await refresh()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '保存失败', icon: 'none' })
  } finally {
    consumableSaving.value = false
  }
}

useDidShow(() => refresh(true))
useDidShow(() => {
  void Promise.all([loadChannelDict(), loadMembers(), loadConsumableProducts(), loadProducts()])
})

usePullDownRefresh(async () => {
  refreshing.value = true
  await refresh(true)
  refreshing.value = false
  Taro.stopPullDownRefresh()
})

useReachBottom(() => {
  void refresh(false)
})
</script>
