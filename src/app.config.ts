export default {
  pages: [
    'pages/login/index',
    'pages/home/index',
    'pages/purchase/index',
    'pages/inventory/index',
    'pages/inventory/orders',
    'pages/inventory/order-detail',
    'pages/inventory/form',
    'pages/inventory/suppliers',
    'pages/inventory/product-pricing',
    'pages/inventory/stock-list',
    'pages/accounting/index',
    'pages/accounting/create',
    'pages/mine/index',
    'pages/purchase/detail',
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
        text: '首页'
      },
      {
        pagePath: 'pages/purchase/index',
        text: '采购'
      },
      {
        pagePath: 'pages/inventory/index',
        text: '库存'
      },
      {
        pagePath: 'pages/accounting/index',
        text: '记账'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
}
