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
  return (
    logString.includes('h265web.js') ||
    logString.includes('missile.js') ||
    logString.includes('H265webjs') ||
    logString.includes('265webjs') ||
    logString.includes('wasm') ||
    logString.includes('WebAssembly') ||
    (logString.includes('39.106.146.94') && logString.includes('10001')) ||
    logString.includes('anchor?type=info') ||
    logString.includes('app=h265web') ||
    // 屏蔽h265web播放器的启动横幅和版权信息
    logString.includes('h265web.js loaded!') ||
    logString.includes('_     ___   __ _____') ||
    logString.includes('| |   |__ \\') ||
    logString.includes('| |__    )') ||
    logString.includes('| \'_ \\  /') ||
    logString.includes('| | | |/') ||
    logString.includes('|_| |_|____') ||
    logString.includes('h265web.js is permanent free') ||
    logString.includes('本播放内核完全免费') ||
    logString.includes('可商业化!') ||
    logString.includes('Author & 作者: Numberwolf') ||
    logString.includes('ChangYanlong') ||
    logString.includes('QQ Group & 技术支持群') ||
    logString.includes('925466059') ||
    logString.includes('WeChat & 微信: numberwolf11') ||
    logString.includes('Discord: numberwolf#8694') ||
    logString.includes('porschegt23@foxmail.com') ||
    logString.includes('https://www.jianshu.com/u/9c09c1e00fd1') ||
    logString.includes('https://github.com/numberwolf') ||
    logString.includes('[v] all ok now') ||
    // 屏蔽包含ASCII艺术字的日志
    (logString.includes('*') && logString.includes('h265web.js')) ||
    (logString.includes('|') && logString.includes('_')) ||
    // 屏蔽其他h265web相关的输出
    logString.includes('Numberwolf') ||
    logString.includes('numberwolf')
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

  // 创建日志过滤函数
  const createLogFilter = (originalMethod, methodName) => {
    return function(...args) {
      // 检查调用栈是否来自h265web相关文件
      if (isFromH265webFiles()) {
        // 如果来自h265web相关文件，直接屏蔽
        return
      }

      // 检查日志内容是否包含h265web相关的关键词
      const logString = args.join(' ')

      // 特殊处理：检查是否是h265web的ASCII艺术字横幅
      const isAsciiArt = (
        logString.includes('/*********************************************************') ||
        logString.includes('**********************************************************/') ||
        (logString.includes('*') && logString.includes('[h265web.js]')) ||
        (logString.includes('|') && logString.includes('_') && logString.includes('\\')) ||
        (logString.includes('missile.js:') && (
          logString.includes('_     ___') ||
          logString.includes('| |   |__') ||
          logString.includes('| |__    )') ||
          logString.includes('| \'_ \\') ||
          logString.includes('| | | |') ||
          logString.includes('|_| |_|')
        ))
      )

      if (isH265webLog(logString) || isAsciiArt) {
        // 屏蔽这些日志，不输出
        return
      }

      // 其他日志正常输出
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
    console.log('[全局拦截器] 拦截器已经启动，跳过重复启动')
    return
  }

  console.log('[全局拦截器] 启动h265web请求和日志拦截器')

  try {
    interceptFetch()
    interceptXMLHttpRequest()
    interceptConsole()

    // 额外的强制日志拦截
    interceptH265webLogs()

    interceptorActive = true
    console.log('[全局拦截器] 拦截器启动成功')
  } catch (error) {
    console.error('[全局拦截器] 拦截器启动失败:', error)
  }
}

/**
 * 强制拦截h265web相关的日志输出
 * 这是一个更激进的方法，直接监控所有console调用
 */
function interceptH265webLogs() {
  // 保存原始console方法（如果还没有保存的话）
  if (!window._h265webOriginalConsole) {
    window._h265webOriginalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    }
  }

  // 重写所有console方法
  const createStrongFilter = (originalMethod, methodName) => {
    return function(...args) {
      // 检查参数内容 - 这是最重要的检查
      const logContent = args.join(' ')

      // 详细的内容检查
      if (
        // 基础检查
        logContent.includes('h265web.js loaded!') ||
        logContent.includes('missile.js:') ||
        logContent.includes('[v] all ok now') ||

        // ASCII艺术字检查
        logContent.includes('_     ___   __ _____') ||
        logContent.includes('| |   |__ \\') ||
        logContent.includes('| |__    )') ||
        logContent.includes('| \'_ \\  /') ||
        logContent.includes('| | | |/') ||
        logContent.includes('|_| |_|____') ||

        // 版权信息检查
        logContent.includes('h265web.js is permanent free') ||
        logContent.includes('本播放内核完全免费') ||
        logContent.includes('可商业化!') ||
        logContent.includes('Author & 作者: Numberwolf') ||
        logContent.includes('ChangYanlong') ||
        logContent.includes('QQ Group & 技术支持群') ||
        logContent.includes('925466059') ||
        logContent.includes('WeChat & 微信: numberwolf11') ||
        logContent.includes('Discord: numberwolf#8694') ||
        logContent.includes('porschegt23@foxmail.com') ||
        logContent.includes('https://www.jianshu.com/u/9c09c1e00fd1') ||
        logContent.includes('https://github.com/numberwolf') ||

        // 通用检查
        logContent.includes('Numberwolf') ||
        logContent.includes('numberwolf') ||
        (logContent.includes('*') && logContent.includes('[h265web.js]')) ||
        (logContent.includes('/*********************************************************')) ||
        (logContent.includes('**********************************************************/'))
      ) {
        // 屏蔽这些日志，输出调试信息
        console.log(`[全局拦截器] 已屏蔽h265web日志: ${logContent.substring(0, 50)}...`)
        return
      }

      // 获取调用栈信息进行二次检查
      try {
        const stack = new Error().stack || ''
        if (stack.includes('missile.js') ||
            stack.includes('h265web.js') ||
            stack.includes('265web')) {
          console.log(`[全局拦截器] 通过调用栈检测屏蔽h265web日志`)
          return
        }
      } catch (e) {
        // 忽略调用栈检查错误
      }

      // 其他日志正常输出
      return originalMethod.apply(console, args)
    }
  }

  // 应用强力过滤器到所有console方法
  console.log = createStrongFilter(window._h265webOriginalConsole.log, 'log')
  console.warn = createStrongFilter(window._h265webOriginalConsole.warn, 'warn')
  console.error = createStrongFilter(window._h265webOriginalConsole.error, 'error')
  console.info = createStrongFilter(window._h265webOriginalConsole.info, 'info')
  console.debug = createStrongFilter(window._h265webOriginalConsole.debug, 'debug')

  console.log('[全局拦截器] 强力日志拦截器已启动')
}

/**
 * 停止全局拦截器
 */
function stopGlobalInterceptor() {
  if (!interceptorActive) {
    return
  }

  console.log('[全局拦截器] 停止h265web请求和日志拦截器')
  
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
    console.log('[全局拦截器] 拦截器停止成功')
  } catch (error) {
    console.error('[全局拦截器] 拦截器停止失败:', error)
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

// 立即启动拦截器 - 在模块加载时就启动
console.log('[全局拦截器] 模块加载，立即启动拦截器')
startGlobalInterceptor()

// 额外的早期拦截 - 直接在这里就开始拦截console
if (typeof window !== 'undefined' && window.console) {
  console.log('[全局拦截器] 执行早期console拦截')

  // 立即执行强力拦截
  const originalLog = console.log
  console.log = function(...args) {
    const logContent = args.join(' ')
    if (logContent.includes('h265web.js loaded!') ||
        logContent.includes('missile.js:') ||
        logContent.includes('_     ___   __ _____') ||
        logContent.includes('| |   |__ \\') ||
        logContent.includes('h265web.js is permanent free') ||
        logContent.includes('本播放内核完全免费') ||
        logContent.includes('Numberwolf') ||
        logContent.includes('[v] all ok now') ||
        (logContent.includes('*') && logContent.includes('[h265web.js]'))) {
      // 直接屏蔽，不输出
      return
    }
    return originalLog.apply(console, args)
  }

  interceptH265webLogs()
}

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
