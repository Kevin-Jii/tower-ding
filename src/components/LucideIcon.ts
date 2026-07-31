import { defineComponent } from 'vue'
import { type LucideIconName } from '../utils/lucide-icons'
import { useLucideIcon } from './use-lucide-icon'

export default defineComponent({
  name: 'LucideIcon',
  props: {
    name: { type: String as () => LucideIconName, required: true },
    color: { type: String, default: '#287fe5' },
    size: { type: Number, default: 28 },
    strokeWidth: { type: Number, default: 2.2 }
  },
  setup(props) {
    return useLucideIcon(props)
  }
})
