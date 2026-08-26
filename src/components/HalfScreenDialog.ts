import { defineComponent } from 'vue'

export default defineComponent({
  name: 'HalfScreenDialog',
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    closable: { type: Boolean, default: true }
  },
  emits: ['close'],
  setup(_, { emit }) {
    function noopTouchMove() {}
    return { emit, noopTouchMove }
  }
})
