import { defineComponent, type PropType } from 'vue'

type Tab = {
  label: string
  value: string
}

type Product = Record<string, any>

export default defineComponent({
  name: 'ProductPickerSheet',
  props: {
    title: { type: String, required: true },
    tabs: { type: Array as PropType<Tab[]>, required: true },
    activeCategory: { type: String, required: true },
    products: { type: Array as PropType<Product[]>, required: true }
  },
  emits: ['update:activeCategory', 'select', 'close'],
  setup(_, { emit }) {
    function noopTouchMove() {}

    return { emit, noopTouchMove }
  }
})
