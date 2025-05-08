import axios from 'axios'
import { MessageBox, Message } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'

// create an axios instance
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API, // url = base url + request url
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 30000 // request timeout
})

// request interceptor
service.interceptors.request.use(
  config => {
    // do something before request is sent
    if (store.getters.token && config.url.indexOf('api/user/login') < 0) {
      config.headers['access-token'] = getToken()
    }
    return config
  },
  error => {
    // do something with request error
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

// response interceptor
service.interceptors.response.use(
  /**
   * If you want to get http information such as headers or status
   * Please return  response => response
  */

  /**
   * Determine the request status by custom code
   * Here is just an example
   * You can also judge the status by HTTP Status Code
   */
  response => {
    if (response.config.url.indexOf('/api/user/logout') >= 0) {
      return
    }
    const res = response.data

    // 针对 /api/front-end/preset/query/ 的静默处理
    if (response.config.url.includes('/api/front-end/preset/query/')) {
      // 如果 code !== 0，记录日志但不弹出错误提示
      if (res.code && res.code !== 0) {
        console.warn('静默处理 /api/front-end/preset/query/ 错误:', res.msg)
        return res // 返回数据给调用方自行处理
      }
      return res
    }    
    // 通用错误处理
    if (res.code && res.code !== 0) {
      Message({
        message: res.msg,
        type: 'error',
        duration: 5 * 1000
      })
    } else {
      return res
    }
  },
  error => {
    console.log(error) // for debug

    // 针对 /api/front-end/preset/query/ 的静默处理
    if (error.config && error.config.url.includes('/api/front-end/preset/query/')) {
      if (error.message.includes('timeout')) {
        console.warn('静默处理 /api/front-end/preset/query/ 超时错误:', error.message)
        return // 静默处理超时错误
      }
      console.warn('静默处理 /api/front-end/preset/query/ 请求错误:', error.message)
      return // 静默处理其他错误
    }

    // 通用错误处理
    if (error.response.status === 401) {
      // to re-login
      MessageBox.confirm('登录已经到期， 是否重新登录', '登录确认', {
        confirmButtonText: '重新登录',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        store.dispatch('user/resetToken').then(() => {
          location.reload()
        })
      })
    } else {
      Message({
        message: error.message,
        type: 'error',
        duration: 5 * 1000
      })
    }
    // return Promise.reject(error)
  }
)

export default service
