<template>
  <div class="dashboard">
    <h1>仪表盘</h1>
    <div class="quick-links">
      <router-link to="/user/list">用户列表</router-link>
      <router-link to="/user/123">用户详情</router-link>
      <router-link to="/order/list">订单列表</router-link>
      <router-link to="/order/statistics">订单统计</router-link>
      <router-link to="/product">商品管理</router-link>
      <router-link to="/old-page">已废弃页面</router-link>
      <router-link to="/nonexistent">不存在的页面</router-link>
    </div>
    <div class="actions">
      <button @click="goToReport">查看报表</button>
      <button @click="goToHidden">隐藏页面</button>
      <button @click="goToLegacy">旧功能入口</button>
      <button @click="goToExternal">外链</button>
      <button @click="goToBrokenExternal">有问题的外链</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Dashboard',
  methods: {
    goToReport() {
      this.$router.push('/report')
    },
    goToHidden() {
      this.$router.push('/hidden-page')
    },
    goToLegacy() {
      this.$router.push('/legacy-function')
    },
    goToExternal() {
      window.location.href = 'https://www.example.com/docs'
    },
    goToBrokenExternal() {
      window.location.href = ' htt p:// broken-link.com/test'
    }
  }
}
</script>
