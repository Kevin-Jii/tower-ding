import { defineComponent, type PropType } from 'vue'
import type { DictOption, SupplierProduct } from '../../../../services/api'
import type { ProductDraft } from '../types'
import UnitConfigBlock from './unit-config-block.vue'

export type ProductUnitCardProps = {
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
}

export function useProductUnitCard(props: ProductUnitCardProps) {
  function onSwitchChange(e: any) {
    props.onToggleBig(Boolean(e?.detail?.value))
  }

  function money(value: number) {
    const amount = Number(value || 0)
    return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
  }

  return { onSwitchChange, money }
}

export default defineComponent({
  name: 'ProductUnitCard',
  components: { UnitConfigBlock },
  props: {
    row: { type: Object as PropType<SupplierProduct>, required: true },
    draft: { type: Object as PropType<ProductDraft>, required: true },
    unitOptions: { type: Array as PropType<DictOption[]>, required: true },
    bigOptions: { type: Array as PropType<DictOption[]>, required: true },
    baseIndex: { type: Number, required: true },
    bigIndex: { type: Number, required: true },
    saving: { type: Boolean, required: true },
    onToggleBig: { type: Function as PropType<ProductUnitCardProps['onToggleBig']>, required: true },
    onSelectBase: { type: Function as PropType<ProductUnitCardProps['onSelectBase']>, required: true },
    onSelectBig: { type: Function as PropType<ProductUnitCardProps['onSelectBig']>, required: true },
    onBaseNumber: { type: Function as PropType<ProductUnitCardProps['onBaseNumber']>, required: true },
    onBigNumber: { type: Function as PropType<ProductUnitCardProps['onBigNumber']>, required: true },
    onBasePrecision: { type: Function as PropType<ProductUnitCardProps['onBasePrecision']>, required: true },
    onBigPrecision: { type: Function as PropType<ProductUnitCardProps['onBigPrecision']>, required: true },
    onSave: { type: Function as PropType<ProductUnitCardProps['onSave']>, required: true }
  },
  setup(props) {
    return useProductUnitCard(props as ProductUnitCardProps)
  }
})
