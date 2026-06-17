export default {
  pages: [
    'pages/home/index',
    'pages/login/index',
    'pages/login/user-agreement',
    'pages/login/privacy-policy',
    'pages/inventory/index',
    'pages/inventory/orders',
    'pages/inventory/order-detail',
    'pages/inventory/form',
    'pages/inventory/suppliers',
    'pages/inventory/product-pricing',
    'pages/inventory/stock-list',
    'pages/accounting/index',
    'pages/accounting/create',
    'pages/member/index',
    'pages/b2b/supply-orders',
    'pages/b2b/supply-order-detail',
    'pages/store-return/index',
    'pages/store-return/form',
    'pages/store-return/detail',
    'pages/mine/index',
    'pages/accounting/detail'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'Tower',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#8B93A0',
    selectedColor: '#111418',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/tabbar/home.png',
        selectedIconPath: 'assets/tabbar/home-active.png'
      },
      {
        pagePath: 'pages/inventory/index',
        text: '库存',
        iconPath: 'assets/tabbar/inventory.png',
        selectedIconPath: 'assets/tabbar/inventory-active.png'
      },
      {
        pagePath: 'pages/accounting/index',
        text: '记账',
        iconPath: 'assets/tabbar/accounting.png',
        selectedIconPath: 'assets/tabbar/accounting-active.png'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
        iconPath: 'assets/tabbar/mine.png',
        selectedIconPath: 'assets/tabbar/mine-active.png'
      }
    ]
  }
}
