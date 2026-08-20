import { defineComponent, type PropType } from 'vue'

export type BillTicketStatus = 'paid' | 'unpaid' | 'neutral'

export default defineComponent({
  name: 'BillTicket',
  props: {
    status: {
      type: String as PropType<BillTicketStatus>,
      default: 'neutral'
    },
    clickable: {
      type: Boolean,
      default: false
    }
  },
  emits: ['tap'],
  setup(props, { emit }) {
    function onTap() {
      if (props.clickable) emit('tap')
    }

    return { onTap }
  }
})
