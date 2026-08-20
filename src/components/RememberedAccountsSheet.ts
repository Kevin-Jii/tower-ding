import { defineComponent, type PropType } from 'vue'
import type { RememberedLogin } from '../shared/login-accounts'

export default defineComponent({
  name: 'RememberedAccountsSheet',
  props: {
    accounts: { type: Array as PropType<RememberedLogin[]>, required: true },
    switching: { type: Boolean, default: false }
  },
  emits: ['select', 'close', 'use-other'],
  setup(_, { emit }) {
    function maskPhone(phone: string) {
      const value = String(phone || '')
      if (value.length < 7) return value
      return `${value.slice(0, 3)}****${value.slice(-4)}`
    }

    function noopTouchMove() {}

    return { emit, maskPhone, noopTouchMove }
  }
})
