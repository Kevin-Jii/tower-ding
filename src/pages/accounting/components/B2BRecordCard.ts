import { defineComponent, type PropType } from 'vue'

import LucideIcon from '../../../components/LucideIcon.vue'

import type { AccountCardViewModel } from './account-card-types'

export default defineComponent({
  name: 'B2BRecordCard',
  components: { LucideIcon },
  props: {
    view: { type: Object as PropType<AccountCardViewModel>, required: true }
  },
  emits: ['tap'],
  setup(_props, { emit }) {
    return { onTap: () => emit('tap') }
  }
})
