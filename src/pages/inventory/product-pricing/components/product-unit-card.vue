<template>
  <view class="card">
    <view class="rowHead">
      <view>
        <view class="name">{{ row.name || `商品 #${row.id}` }}</view>
        <view class="sub">ID {{ row.id }} · 供应商 {{ row.supplier_id || '-' }}</view>
      </view>
      <view class="switchWrap">
        <view class="switchLabel">大规格</view>
        <switch
          color="#2f6bff"
          :checked="draft.big_enabled"
          @change="onSwitchChange"
        />
      </view>
    </view>

    <view class="previewLine">
      <text>基础：{{ draft.base.unit_name || draft.base.unit_code || '-' }} x1</text>
      <text v-if="draft.big_enabled">
        ｜大规格：{{ draft.big.unit_name || draft.big.unit_code || '-' }} x{{ draft.big.factor_to_base || '-' }}
      </text>
      <text v-else>｜大规格：未启用</text>
    </view>
    <view class="previewSub">
      <text>
        基础价：成本 ¥{{ money(draft.base.cost_price) }} / 销售 ¥{{ money(draft.base.sale_price) }} / 毛利 ¥{{ money((draft.base.sale_price || 0) - (draft.base.cost_price || 0)) }}
      </text>
    </view>
    <view v-if="draft.big_enabled" class="previewSub">
      <text>
        大规格价：成本 ¥{{ money(draft.big.cost_price) }} / 销售 ¥{{ money(draft.big.sale_price) }} / 毛利 ¥{{ money((draft.big.sale_price || 0) - (draft.big.cost_price || 0)) }}
      </text>
    </view>

    <unit-config-block
      title="基础单位（必填）"
      :is-base="true"
      :unit="draft.base"
      :unit-options="unitOptions"
      :unit-index="baseIndex"
      :on-select-unit="onSelectBase"
      :on-number-change="onBaseNumber"
      :on-precision-change="onBasePrecision"
    />

    <unit-config-block
      v-if="draft.big_enabled"
      title="大规格单位（0/1）"
      :is-base="false"
      :unit="draft.big"
      :unit-options="bigOptions"
      :unit-index="bigIndex"
      :on-select-unit="onSelectBig"
      :on-number-change="onBigNumber"
      :on-precision-change="onBigPrecision"
    />

    <view v-if="draft.warn" class="warnText">{{ draft.warn }}</view>
    <view :class="['saveBtn', saving ? 'saveBtn--disabled' : '']" @tap="onSave">
      {{ saving ? '保存中…' : '保存单个商品配置' }}
    </view>
  </view>
</template>

<script setup lang="ts">
import type { DictOption, SupplierProduct } from '../../../../services/api'
import type { ProductDraft } from '../types'
import UnitConfigBlock from './unit-config-block.vue'

const props = defineProps<{
  row: SupplierProduct
  draft: ProductDraft
  unitOptions: DictOption[]
  bigOptions: DictOption[]
  baseIndex: number
  bigIndex: number
  saving: boolean
  onToggleBig: (enabled: boolean) => void
  onSelectBase: (idx: number) => void
  onSelectBig: (idx: number) => void
  onBaseNumber: (key: 'factor_to_base' | 'cost_price' | 'sale_price', value: string) => void
  onBigNumber: (key: 'factor_to_base' | 'cost_price' | 'sale_price', value: string) => void
  onBasePrecision: (value: string) => void
  onBigPrecision: (value: string) => void
  onSave: () => void
}>()

function onSwitchChange(e: any) {
  props.onToggleBig(Boolean(e?.detail?.value))
}

function money(v: number) {
  const n = Number(v || 0)
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}
</script>
