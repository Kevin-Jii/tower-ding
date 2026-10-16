import { defineComponent, type PropType } from 'vue'

import LucideIcon from '../../../components/LucideIcon.vue'

import type { AccountCardViewModel } from './account-card-types'

export default defineComponent({
  name: 'AccountingRecordCard',
  components: { LucideIcon },
  props: {
    view: { type: Object as PropType<AccountCardViewModel>, required: true }
  },
  emits: ['tap', 'bind-consumables', 'edit', 'configure'],
  setup(_props, { emit }) {
    return {
      onTap: () => emit('tap'),
      onBindConsumables: () => emit('bind-consumables'),
      onEdit: () => emit('edit'),
      onConfigure: () => emit('configure')
    }
  }
})
