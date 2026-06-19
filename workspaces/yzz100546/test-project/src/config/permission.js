export default [
  {
    route: '/dashboard',
    roles: ['admin', 'user', 'operator']
  },
  {
    route: '/user',
    roles: ['admin']
  },
  {
    route: '/user/list',
    roles: ['admin']
  },
  {
    route: '/user/:id',
    roles: ['admin']
  },
  {
    route: '/order',
    roles: ['admin', 'user']
  },
  {
    route: '/order/:orderId',
    roles: ['admin', 'user']
  },
  {
    route: '/product',
    roles: ['admin', 'user', 'operator']
  },
  {
    route: '/report',
    roles: ['admin', 'superAdmin']
  },
  {
    route: '/admin-only',
    roles: ['admin']
  },
  {
    route: '/hidden-page',
    roles: ['admin']
  },
  {
    route: '/old-permission-page',
    roles: ['admin']
  },
  {
    route: '/obsolete-route',
    roles: ['admin', 'user']
  },
  {
    route: '/product/:id/edit',
    roles: ['admin', 'user']
  }
]
