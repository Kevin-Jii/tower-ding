import { ref } from 'vue'
import { listDictOptionsByTypeCode, type DictOption } from '../../../services/api'

const dictCache = new Map<string, DictOption[]>()

export function useUnitDict() {
  const unitOptions = ref<DictOption[]>([])

  async function loadUnitOptions(authToken: string) {
    const cacheKey = 'product_unit'
    if (dictCache.has(cacheKey)) {
      unitOptions.value = dictCache.get(cacheKey) || []
      return unitOptions.value
    }

    const rows = await listDictOptionsByTypeCode(authToken, 'product_unit')
    const dedupMap = new Map<string, DictOption>()
    rows.forEach((it) => {
      if (!dedupMap.has(it.value)) dedupMap.set(it.value, it)
    })
    const normalized = Array.from(dedupMap.values())
    dictCache.set(cacheKey, normalized)
    unitOptions.value = normalized
    return normalized
  }

  return {
    unitOptions,
    loadUnitOptions
  }
}
