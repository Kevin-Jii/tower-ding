import { defineComponent, type PropType } from 'vue'
import type { DictOption } from '../../../../services/api'
import type { DraftUnit } from '../types'

export type UnitConfigBlockProps = {
  title: string
  isBase: boolean
  unit: DraftUnit
  unitOptions: DictOption[]
  unitIndex: number
  onSelectUnit: (idx: number) => void
  onNumberChange: (key: 'factor_to_base' | 'cost_price' | 'sale_price', value: string) => void
  onPrecisionChange: (value: string) => void
}

export function useUnitConfigBlock(props: UnitConfigBlockProps) {
  function numStr(value: unknown) {
    const amount = Number(value || 0)
    return Number.isFinite(amount) ? String(amount) : '0'
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

  return { numStr, onSelect, onFactorInput, onCostInput, onSaleInput, onPrecisionInput }
}

export default defineComponent({
  name: 'UnitConfigBlock',
  props: {
    title: { type: String, required: true },
    isBase: { type: Boolean, required: true },
    unit: { type: Object as PropType<DraftUnit>, required: true },
    unitOptions: { type: Array as PropType<DictOption[]>, required: true },
    unitIndex: { type: Number, required: true },
    onSelectUnit: { type: Function as PropType<UnitConfigBlockProps['onSelectUnit']>, required: true },
    onNumberChange: { type: Function as PropType<UnitConfigBlockProps['onNumberChange']>, required: true },
    onPrecisionChange: { type: Function as PropType<UnitConfigBlockProps['onPrecisionChange']>, required: true }
  },
  setup(props) {
    return useUnitConfigBlock(props as UnitConfigBlockProps)
  }
})
