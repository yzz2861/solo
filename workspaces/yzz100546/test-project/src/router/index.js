import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { title: '仪表盘', roles: ['admin', 'user'] }
  },
  {
    path: '/user',
    name: 'User',
    component: () => import('@/views/user/Index.vue'),
    meta: { title: '用户管理', roles: ['admin'] },
    children: [
      {
        path: ':id',
        name: 'UserDetail',
        component: () => import('@/views/user/Detail.vue'),
        meta: { title: '用户详情', roles: ['admin'] }
      },
      {
        path: 'list',
        name: 'UserList',
        component: () => import('@/views/user/List.vue'),
        meta: { title: '用户列表', roles: ['admin'] }
      }
    ]
  },
  {
    path: '/order',
    name: 'Order',
    component: () => import('@/views/order/Index.vue'),
    meta: { title: '订单管理' },
    children: [
      {
        path: ':orderId',
        name: 'OrderDetail',
        component: () => import('@/views/order/Detail.vue'),
        meta: { title: '订单详情' }
      }
    ]
  },
  {
    path: '/product',
    name: 'Product',
    component: () => import('@/views/product/Index.vue'),
    meta: { title: '商品管理' }
  },
  {
    path: '/product/:id/edit',
    name: 'ProductEdit',
    component: () => import('@/views/product/Edit.vue'),
    meta: { title: '编辑商品' }
  },
  {
    path: '/report',
    name: 'Report',
    component: () => import('@/views/report/Index.vue'),
    meta: { title: '报表中心', roles: ['admin', 'superAdmin'] }
  },
  {
    path: '/hidden-page',
    name: 'HiddenPage',
    component: () => import('@/views/HiddenPage.vue'),
    meta: { title: '隐藏页面' }
  },
  {
    path: '/orphan-page',
    name: 'OrphanPage',
    component: () => import('@/views/OrphanPage.vue'),
    meta: { title: '孤儿页面' }
  },
  {
    path: '/admin-only',
    name: 'AdminOnly',
    component: () => import('@/views/AdminOnly.vue'),
    meta: { title: '管理员专属', roles: ['admin'] }
  },
  {
    path: '/duplicate',
    name: 'Duplicate1',
    component: () => import('@/views/Duplicate.vue'),
    meta: { title: '重复路由1' }
  },
  {
    path: '/duplicate',
    name: 'Duplicate2',
    component: () => import('@/views/Duplicate2.vue'),
    meta: { title: '重复路由2' }
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
