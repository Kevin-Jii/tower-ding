<template>
  <view class="unitBlock">
    <view class="unitTitle">{{ title }}</view>
    <view class="rowGrid rowGrid--3">
      <view>
        <view class="fieldLabel">单位编码</view>
        <picker mode="selector" :range="unitOptions" range-key="label" :value="unitIndex" @change="onSelect">
          <view class="pickerCell">{{ unit.unit_name || '请选择' }}</view>
        </picker>
      </view>
      <view>
        <view class="fieldLabel">单位名称</view>
        <view class="readonlyCell">{{ unit.unit_name || '-' }}</view>
      </view>
      <view>
        <view class="fieldLabel">{{ isBase ? '换算系数' : '换算系数(>1)' }}</view>
        <view v-if="isBase" class="readonlyCell">1</view>
        <input
          v-else
          class="input"
          type="digit"
          :value="numStr(unit.factor_to_base)"
          @input="onFactorInput"
        />
      </view>
    </view>
    <view class="rowGrid rowGrid--3 mt8">
      <view>
        <view class="fieldLabel">数量精度(0~6)</view>
        <input class="input" type="digit" :value="numStr(unit.precision)" @input="onPrecisionInput" />
      </view>
      <view>
        <view class="fieldLabel">成本价</view>
        <input class="input" type="digit" :value="numStr(unit.cost_price)" @input="onCostInput" />
      </view>
      <view>
        <view class="fieldLabel">销售价</view>
        <input class="input" type="digit" :value="numStr(unit.sale_price)" @input="onSaleInput" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { DictOption } from '../../../../services/api'
import type { DraftUnit } from '../types'

const props = defineProps<{
  title: string
  isBase: boolean
  unit: DraftUnit
  unitOptions: DictOption[]
  unitIndex: number
  onSelectUnit: (idx: number) => void
  onNumberChange: (key: 'factor_to_base' | 'cost_price' | 'sale_price', value: string) => void
  onPrecisionChange: (value: string) => void
}>()

function numStr(v: any) {
  const n = Number(v || 0)
  return Number.isFinite(n) ? String(n) : '0'
}

function onSelect(e: any) {
  props.onSelectUnit(Number(e?.detail?.value || 0))
}

function onFactorInput(e: any) {
  props.onNumberChange('factor_to_base', String(e?.detail?.value || ''))
}

function onCostInput(e: any) {
  props.onNumberChange('cost_price', String(e?.detail?.value || ''))
}

function onSaleInput(e: any) {
  props.onNumberChange('sale_price', String(e?.detail?.value || ''))
}

function onPrecisionInput(e: any) {
  props.onPrecisionChange(String(e?.detail?.value || ''))
}
</script>
