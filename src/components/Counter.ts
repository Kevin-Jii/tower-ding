import { defineComponent } from 'vue'
import { useCounterStore } from '../stores/counter'

export default defineComponent({
  name: 'Counter',
  setup() {
    const counter = useCounterStore()

    function onAdd() {
      counter.increment()
    }

    return { counter, onAdd }
  }
})
