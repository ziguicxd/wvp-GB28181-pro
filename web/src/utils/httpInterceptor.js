/**
 * 全局HTTP请求拦截器
 * 用于拦截h265web播放器的统计请求和日志
 * 从系统启动开始就生效
 */

// 存储原始方法的引用
let originalMethods = {
  fetch: null,
  XMLHttpRequest: null,
  console: {
    log: null,
    warn: null,
    error: null,
    info: null,
    debug: null
  }
}

// 拦截状态标记
let interceptorActive = false

/**
 * 检查URL是否为h265web统计请求
 * @param {string} url - 请求URL
 * @returns {boolean} - 是否为需要拦截的请求
 */
function isH265webStatsRequest(url) {
  if (typeof url !== 'string') return false
  
  return (
    url.includes('39.106.146.94:10001/eye/user/anchor/anchor') ||
    (url.includes('anchor') && url.includes('type=info') && url.includes('app=h265web')) ||
    (url.includes('h265web') && url.includes('type=info')) ||
    url.includes('action=build') ||
    url.includes('page=player') ||
    url.includes('block=player')
  )
}

/**
 * 检查日志内容是否为h265web相关日志
 * @param {string} logString - 日志内容
 * @returns {boolean} - 是否为需要屏蔽的日志
 */
function isH265webLog(logString) {
  // 只拦截非常特定的h265web启动和版权信息日志，避免误拦截正常日志
  return (
    // 启动信息
    logString === 'h265web.js loaded!' ||

    // 构建日期和版本信息
    logString.includes('build date:') ||
    logString.includes('version: 1.0.1') ||
    /^version:\s*\d+\.\d+\.\d+/.test(logString) ||

    // ASCII艺术字横幅（完整匹配所有行）
    logString.includes('/*********************************************************') ||
    logString.includes('**********************************************************/') ||
    // 完整的ASCII艺术字行匹配
    logString.includes('_     ___   __ _____             _      _') ||
    logString.includes('| |   |__ \\ / /| ____|           | |    (_)') ||
    logString.includes('| |__    ) / /_| |____      _____| |__   _ ___') ||
    logString.includes('| \'_ \\  / / \'_ \\___ \\ \\ /\\ / / _ \\ \'_ \\ | / __|') ||
    logString.includes('| | | |/ /| (_) |__) \\ V  V /  __/ |_) || \\__ \\') ||
    logString.includes('|_| |_|____\\___/____/ \\_/\\_/ \\___|_.__(_) |___/') ||
    logString.includes('                                        _/ |') ||
    logString.includes('                                       |__/') ||
    // 通用ASCII字符模式匹配
    /^\s*_\s+___\s+__\s+_____/.test(logString) ||
    /^\s*\|\s+\|\s+\|__\s+\\/.test(logString) ||
    /^\s*\|\s+\|__\s+\)/.test(logString) ||
    /^\s*\|\s+'_\s+\\/.test(logString) ||
    /^\s*\|\s+\|\s+\|\s+\//.test(logString) ||
    /^\s*\|_\|\s+\|____/.test(logString) ||
    /^\s*_\/\s+\|/.test(logString) ||
    /^\s*\|__\//.test(logString) ||
    // 匹配包含多个管道符和下划线的ASCII艺术
    (/\|.*\|.*\|/.test(logString) && /_/.test(logString) && logString.length > 30) ||

    // 版权和作者信息（精确匹配）
    logString.includes('h265web.js is permanent free & 本播放内核完全免费 可商业化!') ||
    logString.includes('Author & 作者: Numberwolf - ChangYanlong') ||
    logString.includes('QQ Group & 技术支持群: 925466059') ||
    logString.includes('WeChat & 微信: numberwolf11') ||
    logString.includes('Discord: numberwolf#8694') ||
    logString.includes('Email & 邮箱: porschegt23@foxmail.com') ||
    logString.includes('Blog & 博客: https://www.jianshu.com/u/9c09c1e00fd1') ||
    logString.includes('Github: https://github.com/numberwolf') ||
    logString.includes('h265web.js: https://github.com/numberwolf/h265web.js') ||

    // 结束信息
    logString === '[v] all ok now' ||

    // 带有特定格式的h265web标识
    (logString.includes('*') && logString.includes('[h265web.js]')) ||

    // 网络请求相关（保留这些，因为它们是统计请求相关的）
    (logString.includes('39.106.146.94') && logString.includes('10001')) ||
    logString.includes('anchor?type=info') ||
    logString.includes('app=h265web')
  )
}

/**
 * 拦截fetch请求
 */
function interceptFetch() {
  if (!originalMethods.fetch) {
    originalMethods.fetch = window.fetch
  }

  window.fetch = function(url, options) {
    // 检查是否是h265web的统计请求
    if (isH265webStatsRequest(url)) {
      console.log('[全局拦截器] 已拦截h265web统计请求:', url)
      // 返回一个成功的空响应
      return Promise.resolve(new Response('{"code":0,"msg":"success"}', {
        status: 200,
        statusText: 'OK',
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }))
    }
    
    // 其他请求正常处理
    return originalMethods.fetch.apply(this, arguments)
  }
}

/**
 * 拦截XMLHttpRequest
 */
function interceptXMLHttpRequest() {
  if (!originalMethods.XMLHttpRequest) {
    originalMethods.XMLHttpRequest = window.XMLHttpRequest
  }

  const OriginalXHR = originalMethods.XMLHttpRequest
  
  window.XMLHttpRequest = function() {
    const xhr = new OriginalXHR()
    const originalOpen = xhr.open
    
    xhr.open = function(method, url, async, user, password) {
      // 检查是否是h265web的统计请求
      if (isH265webStatsRequest(url)) {
        console.log('[全局拦截器] 已拦截h265web XHR统计请求:', url)
        // 重定向到一个空的数据URL
        url = 'data:application/json,{"code":0,"msg":"success"}'
      }
      return originalOpen.call(this, method, url, async, user, password)
    }
    
    return xhr
  }
  
  // 复制原始XMLHttpRequest的属性和方法
  for (let prop in OriginalXHR) {
    if (OriginalXHR.hasOwnProperty(prop)) {
      try {
        window.XMLHttpRequest[prop] = OriginalXHR[prop]
      } catch (e) {
        // 忽略无法复制的属性
      }
    }
  }
  
  // 复制原型链上的方法
  window.XMLHttpRequest.prototype = OriginalXHR.prototype
}

/**
 * 检查调用栈是否来自h265web相关文件
 * @returns {boolean} - 是否来自h265web相关文件
 */
function isFromH265webFiles() {
  try {
    const stack = new Error().stack
    if (stack) {
      return (
        stack.includes('missile.js') ||
        stack.includes('h265web.js') ||
        stack.includes('265web') ||
        stack.includes('h265web')
      )
    }
  } catch (e) {
    // 忽略错误
  }
  return false
}

/**
 * 拦截控制台日志
 */
function interceptConsole() {
  // 保存原始console方法
  if (!originalMethods.console.log) {
    originalMethods.console.log = console.log
    originalMethods.console.warn = console.warn
    originalMethods.console.error = console.error
    originalMethods.console.info = console.info
    originalMethods.console.debug = console.debug
  }

  // 创建日志过滤函数（温和的拦截策略）
  const createLogFilter = (originalMethod, methodName) => {
    return function(...args) {
      // 检查日志内容是否包含h265web特定的启动日志
      const logString = args.join(' ')

      if (isH265webLog(logString)) {
        // 静默屏蔽特定的h265web日志，不输出拦截提示
        return
      }

      // 所有其他日志（包括正常的调试日志）都正常输出
      return originalMethod.apply(console, args)
    }
  }

  // 应用过滤器到各个console方法
  console.log = createLogFilter(originalMethods.console.log, 'log')
  console.warn = createLogFilter(originalMethods.console.warn, 'warn')
  console.error = createLogFilter(originalMethods.console.error, 'error')
  console.info = createLogFilter(originalMethods.console.info, 'info')
  console.debug = createLogFilter(originalMethods.console.debug, 'debug')
}

/**
 * 启动全局拦截器
 */
function startGlobalInterceptor() {
  if (interceptorActive) {
    // console.log('[全局拦截器] 拦截器已经启动，跳过重复启动')
    return
  }

  // console.log('[全局拦截器] 启动h265web请求和日志拦截器')

  try {
    interceptFetch()
    interceptXMLHttpRequest()
    interceptConsole()

    interceptorActive = true
    // console.log('[全局拦截器] 拦截器启动成功')
  } catch (error) {
    // console.error('[全局拦截器] 拦截器启动失败:', error)
  }
}



/**
 * 停止全局拦截器
 */
function stopGlobalInterceptor() {
  if (!interceptorActive) {
    return
  }

  // console.log('[全局拦截器] 停止h265web请求和日志拦截器')
  
  try {
    // 恢复原始的fetch
    if (originalMethods.fetch) {
      window.fetch = originalMethods.fetch
    }
    
    // 恢复原始的XMLHttpRequest
    if (originalMethods.XMLHttpRequest) {
      window.XMLHttpRequest = originalMethods.XMLHttpRequest
    }
    
    // 恢复原始的console方法
    if (originalMethods.console.log) {
      console.log = originalMethods.console.log
      console.warn = originalMethods.console.warn
      console.error = originalMethods.console.error
      console.info = originalMethods.console.info
      console.debug = originalMethods.console.debug
    }
    
    interceptorActive = false
    // console.log('[全局拦截器] 拦截器停止成功')
  } catch (error) {
    // console.error('[全局拦截器] 拦截器停止失败:', error)
  }
}

/**
 * 获取拦截器状态
 */
function getInterceptorStatus() {
  return {
    active: interceptorActive,
    originalMethods: originalMethods
  }
}

// 自动启动拦截器
startGlobalInterceptor()

// 导出控制函数
export {
  startGlobalInterceptor,
  stopGlobalInterceptor,
  getInterceptorStatus,
  isH265webStatsRequest,
  isH265webLog
}

// 在window对象上暴露控制函数，便于调试
if (typeof window !== 'undefined') {
  window.h265webInterceptor = {
    start: startGlobalInterceptor,
    stop: stopGlobalInterceptor,
    status: getInterceptorStatus
  }
}
