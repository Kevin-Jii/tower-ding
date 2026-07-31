import Taro from '@tarojs/taro'


import LucideIcon from '../../components/LucideIcon.vue'


import { useAuthStore } from '../../stores/auth'


import type { LucideIconName } from '../../utils/lucide-icons'



type MoreItem = {
  title: string
  desc: string
  icon: LucideIconName
  tone: string
  color: string
  url: string
}

export default {
  components: { LucideIcon },
  setup() {
    const auth = useAuthStore()
    
    
    
    const groups: Array<{ title: string; items: MoreItem[] }> = [
      {
        title: '库存入库',
        items: [
          { title: '新增入库单', desc: '商品采购、补货入库登记', icon: 'package-plus', tone: 'blue', color: '#287fe5', url: '/pages/inventory/form?type=in' },
          { title: '入库记录', desc: '查看历史入库单据明细', icon: 'file-text', tone: 'sky', color: '#2f80ed', url: '/pages/inventory/orders?type=in' },
          { title: '供应商商品', desc: '查看供货商品和分类', icon: 'warehouse', tone: 'green', color: '#35a853', url: '/pages/inventory/suppliers' }
        ]
      },
      {
        title: '库存出库',
        items: [
          { title: '新增出库单', desc: '日常出库、调拨出库登记', icon: 'package-x', tone: 'orange', color: '#ff8b2c', url: '/pages/inventory/form?type=out' },
          { title: '出库记录', desc: '查看历史出库单据明细', icon: 'receipt-text', tone: 'purple', color: '#7c5ce8', url: '/pages/inventory/orders?type=out' },
          { title: '报损自用', desc: '登记报损、自用等库存损耗', icon: 'triangle-alert', tone: 'rose', color: '#e24a5a', url: '/pages/inventory-loss/index' }
        ]
      },
      {
        title: '财务支出',
        items: [
          { title: '门店支出', desc: '记录门店费用和支出分类', icon: 'wallet', tone: 'blue', color: '#287fe5', url: '/pages/store-expense/index' }
        ]
      },
      {
        title: '常用业务',
        items: [
          { title: '快速记账', desc: '快速记录门店收支订单', icon: 'wallet-cards', tone: 'blue', color: '#287fe5', url: '/pages/accounting/create?mode=quick' },
          { title: '补记账单', desc: '补录遗漏订单并选择记账日期', icon: 'receipt-text', tone: 'purple', color: '#7c5ce8', url: '/pages/accounting/create?mode=supplement' },
          { title: '入库', desc: '商品采购、补货入库登记', icon: 'package-plus', tone: 'green', color: '#35a853', url: '/pages/inventory/form?type=in' },
          { title: '会员存酒', desc: '会员存取酒和流水查询', icon: 'bottle-wine', tone: 'sky', color: '#2f80ed', url: '/pages/member-wine/index' },
          { title: '门店返厂', desc: '返厂记录新增和明细查询', icon: 'shopping-bag', tone: 'orange', color: '#ff8b2c', url: '/pages/store-return/index' },
          { title: 'B2B供货', desc: 'B2B 供货单据管理', icon: 'warehouse', tone: 'green', color: '#35a853', url: '/pages/b2b/supply-orders' }
        ]
      }
    ]
    
    
    
    function go(url: string) {
      if (!auth.token) {
        Taro.redirectTo({ url: '/pages/login/index' })
        return
      }
      Taro.navigateTo({ url })
    }
    
    
    
    function back() {
      Taro.navigateBack({ delta: 1 })
    }

    return {
      Taro,
      LucideIcon,
      useAuthStore,
      auth,
      groups,
      go,
      back,
    }
  }
}
