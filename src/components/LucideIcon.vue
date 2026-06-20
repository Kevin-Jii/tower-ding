<template>
  <image class="lucideIcon" :style="iconStyle" :src="src" mode="aspectFit" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { lucideIconDataUri, type LucideIconName } from '../utils/lucide-icons'

const props = withDefaults(
  defineProps<{
    name: LucideIconName
    color?: string
    size?: number
    strokeWidth?: number
  }>(),
  {
    color: '#287fe5',
    size: 28,
    strokeWidth: 2.2
  }
)

const src = computed(() => lucideIconDataUri(props.name, props.color, props.strokeWidth))
const iconStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`
}))
</script>

<style>
.lucideIcon {
  display: block;
  flex-shrink: 0;
}
</style>
