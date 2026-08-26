import Taro, { useDidShow, usePullDownRefresh } from '@tarojs/taro'

import { computed, reactive, ref } from 'vue'

import LucideIcon from '../../components/LucideIcon.vue'
import HalfScreenDialog from '../../components/HalfScreenDialog.vue'
import { createMember, getMemberPage, getMemberStats, type Member, type MemberStats } from '../../services/api'
import { formatMoney } from '../../shared/format'
import { useAuthStore } from '../../stores/auth'

type ActivityFilter = 'all' | 'active' | 'inactive'
type SortMode = 'default' | 'balance' | 'points'

export default {
  components: { LucideIcon, HalfScreenDialog },
  setup() {
    const auth = useAuthStore()
    const keyword = ref('')
    const members = ref<Member[]>([])
    const stats = ref<MemberStats>({})
    const total = ref(0)
    const loading = ref(false)
    const saving = ref(false)
    const createOpen = ref(false)
    const filterOpen = ref(false)
    const sortOpen = ref(false)
    const activityFilter = ref<ActivityFilter>('all')
    const levelFilter = ref<number | null>(null)
    const sortMode = ref<SortMode>('default')
    const viewMode = ref<'grid' | 'list'>('grid')
    const form = reactive({ name: '', phone: '' })

    const filteredMembers = computed(() => {
      const rows = members.value.filter((member) => {
        if (levelFilter.value !== null && Number(member.level || 0) !== levelFilter.value) return false
        if (activityFilter.value === 'active' && !member.recent_consumption_at && !Number(member.consumption_count || 0)) return false
        if (activityFilter.value === 'inactive' && (member.recent_consumption_at || Number(member.consumption_count || 0) > 0)) return false
        return true
      })
      if (sortMode.value === 'balance') return [...rows].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
      if (sortMode.value === 'points') return [...rows].sort((a, b) => Number(b.points || 0) - Number(a.points || 0))
      return rows
    })

    const totalMembers = computed(() => Number(stats.value.total ?? total.value ?? 0))
    const totalConsumption = computed(() => {
      if (stats.value.total_consumption_amount !== undefined) return Number(stats.value.total_consumption_amount || 0)
      return members.value.reduce((sum, member) => sum + Number(member.total_consumption_amount || 0), 0)
    })
    const activeMembers = computed(() => {
      if (stats.value.active_30_days !== undefined) return Number(stats.value.active_30_days || 0)
      return members.value.filter((member) => member.recent_consumption_at || Number(member.consumption_count || 0) > 0).length
    })
    const totalPoints = computed(() => {
      if (stats.value.total_points !== undefined) return Number(stats.value.total_points || 0)
      return members.value.reduce((sum, member) => sum + Number(member.points || 0), 0)
    })

    const sortLabel = computed(() => ({ default: '默认排序', balance: '余额从高到低', points: '积分从高到低' }[sortMode.value]))
    const activityLabel = computed(() => ({ all: '全部会员', active: '近 30 天有消费', inactive: '暂无消费' }[activityFilter.value]))

    function onKeywordInput(event: any) {
      keyword.value = String(event?.detail?.value || '')
    }

    function onNameInput(event: any) {
      form.name = String(event?.detail?.value || '')
    }

    function onPhoneInput(event: any) {
      form.phone = String(event?.detail?.value || '')
    }

    function memberName(member: Member) {
      return member.name || member.phone || `会员 #${member.id}`
    }

    function memberInitial(member: Member) {
      return String(member.name || member.phone || '会').slice(0, 1).toUpperCase()
    }

    function formatDate(value?: string) {
      const date = String(value || '').trim()
      return date ? date.slice(0, 10) : '暂无消费记录'
    }

    function openCreate() {
      createOpen.value = true
    }

    function closeCreate() {
      if (!saving.value) createOpen.value = false
    }

    function clearFilters() {
      activityFilter.value = 'all'
      levelFilter.value = null
      filterOpen.value = false
    }

    function selectActivity(value: ActivityFilter) {
      activityFilter.value = value
    }

    function selectLevel(value: number | null) {
      levelFilter.value = value
    }

    function selectSort(value: SortMode) {
      sortMode.value = value
      sortOpen.value = false
    }

    function setViewMode(value: 'grid' | 'list') {
      viewMode.value = value
    }

    function openConsumption(member: Member) {
      const query = [
        `id=${encodeURIComponent(String(member.id))}`,
        `name=${encodeURIComponent(memberName(member))}`,
        `phone=${encodeURIComponent(String(member.phone || ''))}`
      ].join('&')
      Taro.navigateTo({ url: `/pages/member-consumption/index?${query}` })
    }

    async function refresh() {
      if (!auth.token) {
        await Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      loading.value = true
      try {
        const params = { store_id: auth.storeId || undefined, keyword: keyword.value.trim() || undefined, page: 1, page_size: 50 }
        const [pageData, statsData] = await Promise.all([
          getMemberPage(auth.token, params),
          getMemberStats(auth.token, { store_id: auth.storeId || undefined }).catch(() => ({} as MemberStats))
        ])
        members.value = pageData.list
        total.value = pageData.total
        stats.value = statsData
      } catch (error: any) {
        Taro.showToast({ title: error?.message || '加载失败', icon: 'none' })
      } finally {
        loading.value = false
      }
    }

    async function submitMember() {
      if (!auth.token || saving.value) return
      if (!form.phone.trim()) {
        Taro.showToast({ title: '请填写手机号', icon: 'none' })
        return
      }
      saving.value = true
      try {
        await createMember(auth.token, {
          store_id: auth.storeId || undefined,
          name: form.name.trim(),
          phone: form.phone.trim()
        })
        Taro.showToast({ title: '会员已新增', icon: 'success' })
        form.name = ''
        form.phone = ''
        createOpen.value = false
        await refresh()
      } catch (error: any) {
        Taro.showToast({ title: error?.message || '保存失败', icon: 'none' })
      } finally {
        saving.value = false
      }
    }

    useDidShow(() => refresh())

    usePullDownRefresh(async () => {
      await refresh()
      Taro.stopPullDownRefresh()
    })

    return {
      Taro,
      auth,
      keyword,
      members,
      filteredMembers,
      totalMembers,
      totalConsumption,
      activeMembers,
      totalPoints,
      loading,
      saving,
      createOpen,
      filterOpen,
      sortOpen,
      activityFilter,
      levelFilter,
      sortMode,
      viewMode,
      sortLabel,
      activityLabel,
      form,
      onKeywordInput,
      onNameInput,
      onPhoneInput,
      memberName,
      memberInitial,
      formatDate,
      formatMoney,
      openCreate,
      closeCreate,
      clearFilters,
      selectActivity,
      selectLevel,
      selectSort,
      setViewMode,
      openConsumption,
      refresh,
      submitMember
    }
  }
}
