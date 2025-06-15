<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
import { startGlobalInterceptor } from '@/utils/httpInterceptor'

export default {
  name: 'App',
  created() {
    // 确保拦截器在应用创建时就启动
    this.initGlobalInterceptor()
  },
  mounted() {
    // 在DOM挂载后再次确保拦截器启动
    this.ensureInterceptorActive()
  },
  methods: {
    initGlobalInterceptor() {
      try {
        // 启动全局HTTP拦截器
        startGlobalInterceptor()
        // console.log('[App] 全局HTTP拦截器已启动')
      } catch (error) {
        // console.error('[App] 启动全局HTTP拦截器失败:', error)
      }
    },
    ensureInterceptorActive() {
      // 检查拦截器是否正常工作
      if (window.h265webInterceptor) {
        const status = window.h265webInterceptor.status()
        if (!status.active) {
          // console.warn('[App] 检测到拦截器未激活，重新启动')
          window.h265webInterceptor.start()
        }
      }
    }
  }
}
</script>
