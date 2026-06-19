export default [
  {
    path: '/dashboard',
    title: '仪表盘',
    icon: 'dashboard'
  },
  {
    path: '/user',
    title: '用户管理',
    icon: 'user',
    roles: ['admin'],
    children: [
      {
        path: '/user/list',
        title: '用户列表'
      },
      {
        path: '/old-user-page',
        title: '旧用户页面'
      }
    ]
  },
  {
    path: '/order',
    title: '订单管理',
    icon: 'order',
    children: [
      {
        path: '/order/list',
        title: '订单列表'
      },
      {
        path: '/order/statistics',
        title: '订单统计'
      }
    ]
  },
  {
    path: '/product',
    title: '商品管理',
    icon: 'product'
  },
  {
    path: '/report',
    title: '报表中心',
    icon: 'report',
    roles: ['admin', 'superAdmin']
  },
  {
    path: '/deprecated-page',
    title: '已废弃页面',
    icon: 'warning'
  },
  {
    path: '/hidden-page',
    title: '隐藏页面',
    icon: 'eye-off',
    roles: ['admin']
  }
]
