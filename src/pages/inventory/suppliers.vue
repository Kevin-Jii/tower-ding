<template>
  <view class="page">
    <view class="container">
      <view class="eyebrow">库存 · 门店</view>
      <view class="title">供应商</view>
      <view class="subtitle">已绑定列表与从全库添加绑定（tower-go `store-suppliers`）</view>

      <view class="section-title">已绑定</view>
      <view class="list">
        <view v-if="!bound.length" class="empty card">尚未绑定供应商，请在下方搜索并添加</view>
        <view v-for="b in bound" :key="b.id || `${b.store_id}-${b.supplier_id}`" class="row card">
          <view class="rowTop">
            <view>
              <view class="rowTitle">{{ b.supplier?.supplier_name || `供应商 #${b.supplier_id}` }}</view>
              <view class="rowSub">{{ b.supplier?.contact_person || '—' }} · {{ b.supplier?.contact_phone || '—' }}</view>
            </view>
            <view class="btnUnbind" @tap.stop="confirmUnbind(b)">解绑</view>
          </view>
          <view class="rowMeta">编码 {{ b.supplier?.supplier_code || '—' }}</view>
        </view>
      </view>

      <view class="section-title">添加绑定</view>
      <input
        class="input search"
        placeholder="搜索供应商名称或编码"
        :value="keyword"
        confirm-type="search"
        @input="onKw"
        @confirm="searchCatalog"
      />
      <view class="hint">仅展示启用中的供应商；绑定后可在出入库/记账中选对应商品</view>

      <view class="list">
        <view v-if="searching" class="empty card">搜索中…</view>
        <view v-else-if="searched && !catalog.length" class="empty card">无匹配供应商</view>
        <view v-for="s in catalog" :key="s.id" class="row card">
          <view class="rowTop">
            <view>
              <view class="rowTitle">{{ s.supplier_name || `供应商 #${s.id}` }}</view>
              <view class="rowSub">{{ s.contact_person || '—' }} · {{ s.contact_phone || '—' }}</view>
            </view>
            <view v-if="isBound(s.id)" class="tagMuted">已绑定</view>
            <view v-else class="btnDark" @tap="doBind(s.id)">绑定</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'
import { computed, ref } from 'vue'
import {
  bindStoreSuppliers,
  listStoreBoundSuppliers,
  listSuppliers,
  unbindStoreSuppliers,
  type StoreSupplierBinding,
  type Supplier
} from '../../services/api'
import { useAuthStore } from '../../stores/auth'
import './suppliers.less'

const auth = useAuthStore()
const bound = ref<StoreSupplierBinding[]>([])
const catalog = ref<Supplier[]>([])
const keyword = ref('')
const searched = ref(false)
const searching = ref(false)

const boundIds = computed(() => new Set(bound.value.map((b) => b.supplier_id).filter(Boolean) as number[]))

function isBound(id: number) {
  return boundIds.value.has(id)
}

function onKw(e: any) {
  keyword.value = String(e?.detail?.value || '')
}

async function loadBound() {
  if (!auth.token) return
  try {
    bound.value = await listStoreBoundSuppliers(auth.token, {
      store_id: auth.storeId || undefined
    })
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '加载绑定失败', icon: 'none' })
  }
}

async function searchCatalog() {
  if (!auth.token) return
  searching.value = true
  searched.value = true
  try {
    catalog.value = await listSuppliers(auth.token, {
      keyword: keyword.value.trim() || undefined,
      page: 1,
      page_size: 50
    })
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '搜索失败', icon: 'none' })
    catalog.value = []
  } finally {
    searching.value = false
  }
}

function storeIdOrAbort(): number | null {
  const sid = auth.storeId
  if (!sid) {
    Taro.showToast({ title: '缺少门店信息，请重新登录', icon: 'none' })
    return null
  }
  return sid
}

async function doBind(supplierId: number) {
  const sid = storeIdOrAbort()
  if (!sid || !auth.token) return
  try {
    await bindStoreSuppliers(auth.token, { store_id: sid, supplier_ids: [supplierId] })
    Taro.showToast({ title: '已绑定', icon: 'success' })
    await loadBound()
  } catch (err: any) {
    Taro.showToast({ title: err?.message || '绑定失败', icon: 'none' })
  }
}

function confirmUnbind(b: StoreSupplierBinding) {
  const supplierId = b.supplier_id || b.supplier?.id
  if (!supplierId) return
  Taro.showModal({
    title: '解绑供应商',
    content: `确定解绑「${b.supplier?.supplier_name || supplierId}」？解绑后该供应商商品将不再出现在本门店选品中。`,
    success: async (res) => {
      if (!res.confirm) return
      const sid = storeIdOrAbort()
      if (!sid || !auth.token) return
      try {
        await unbindStoreSuppliers(auth.token, { store_id: sid, supplier_ids: [supplierId] })
        Taro.showToast({ title: '已解绑', icon: 'success' })
        await loadBound()
      } catch (err: any) {
        Taro.showToast({ title: err?.message || '解绑失败', icon: 'none' })
      }
    }
  })
}

async function refresh() {
  await loadBound()
}

useDidShow(() => {
  void refresh()
  if (!searched.value) void searchCatalog()
})

usePullDownRefresh(async () => {
  await refresh()
  await searchCatalog()
  Taro.stopPullDownRefresh()
})
</script>