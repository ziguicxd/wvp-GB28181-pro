/**
 * h265web日志拦截器
 * 这个脚本需要在所有其他脚本之前加载
 * 直接在HTML中引入，确保最早执行
 */

(function() {
  'use strict';

  // console.log('[h265web拦截器] 开始执行早期拦截');

  // 保存原始console方法 - 使用更深层的引用
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };

  // 重要：保存原始的bind方法，防止h265web绕过我们的拦截
  const originalBind = Function.prototype.bind;
  
  // 检查调用栈是否来自h265web相关文件的特定日志输出函数
  function isFromH265webFiles() {
    try {
      const stack = new Error().stack;
      if (stack) {
        // 只拦截来自missile.js的特定日志输出函数，不拦截所有调用
        return (
          stack.includes('missile.js') && (
            stack.includes('out(') ||
            stack.includes('err(') ||
            stack.includes('UTF8ArrayToString') ||
            stack.includes('put_char')
          )
        );
      }
    } catch (e) {
      // 忽略错误
    }
    return false;
  }

  // 检查是否为h265web特定的启动日志（更精确的匹配）
  function isH265webLog(logContent) {
    // 只拦截非常特定的h265web启动和版权信息日志
    return (
      // 启动信息
      logContent === 'h265web.js loaded!' ||

      // 构建日期和版本信息
      logContent.includes('build date:') ||
      logContent.includes('version: 1.0.1') ||
      /^version:\s*\d+\.\d+\.\d+/.test(logContent) ||

      // ASCII艺术字横幅（完整匹配所有行）
      logContent.includes('/*********************************************************') ||
      logContent.includes('**********************************************************/') ||
      // 第一行：_     ___   __ _____             _      _
      logContent.includes('_     ___   __ _____             _      _') ||
      // 第二行：| |   |__ \ / /| ____|           | |    (_)
      logContent.includes('| |   |__ \\ / /| ____|           | |    (_)') ||
      // 第三行：| |__    ) / /_| |____      _____| |__   _ ___
      logContent.includes('| |__    ) / /_| |____      _____| |__   _ ___') ||
      // 第四行：| '_ \  / / '_ \___ \ \ /\ / / _ \ '_ \ | / __|
      logContent.includes('| \'_ \\  / / \'_ \\___ \\ \\ /\\ / / _ \\ \'_ \\ | / __|') ||
      // 第五行：| | | |/ /| (_) |__) \ V  V /  __/ |_) || \__ \
      logContent.includes('| | | |/ /| (_) |__) \\ V  V /  __/ |_) || \\__ \\') ||
      // 第六行：|_| |_|____\___/____/ \_/\_/ \___|_.__(_) |___/
      logContent.includes('|_| |_|____\\___/____/ \\_/\\_/ \\___|_.__(_) |___/') ||
      // 第七行：                                        _/ |
      logContent.includes('                                        _/ |') ||
      // 第八行：                                       |__/
      logContent.includes('                                       |__/') ||
      // 通用ASCII字符模式匹配
      /^\s*_\s+___\s+__\s+_____/.test(logContent) ||
      /^\s*\|\s+\|\s+\|__\s+\\/.test(logContent) ||
      /^\s*\|\s+\|__\s+\)/.test(logContent) ||
      /^\s*\|\s+'_\s+\\/.test(logContent) ||
      /^\s*\|\s+\|\s+\|\s+\//.test(logContent) ||
      /^\s*\|_\|\s+\|____/.test(logContent) ||
      /^\s*_\/\s+\|/.test(logContent) ||
      /^\s*\|__\//.test(logContent) ||
      // 匹配包含多个管道符和下划线的ASCII艺术
      (/\|.*\|.*\|/.test(logContent) && /_/.test(logContent) && logContent.length > 30) ||

      // 版权和作者信息（精确匹配）
      logContent.includes('h265web.js is permanent free & 本播放内核完全免费 可商业化!') ||
      logContent.includes('Author & 作者: Numberwolf - ChangYanlong') ||
      logContent.includes('QQ Group & 技术支持群: 925466059') ||
      logContent.includes('WeChat & 微信: numberwolf11') ||
      logContent.includes('Discord: numberwolf#8694') ||
      logContent.includes('Email & 邮箱: porschegt23@foxmail.com') ||
      logContent.includes('Blog & 博客: https://www.jianshu.com/u/9c09c1e00fd1') ||
      logContent.includes('Github: https://github.com/numberwolf') ||
      logContent.includes('h265web.js: https://github.com/numberwolf/h265web.js') ||

      // 结束信息
      logContent === '[v] all ok now' ||

      // 带有特定格式的h265web标识
      (logContent.includes('*') && logContent.includes('[h265web.js]'))
    );
  }
  
  // 创建拦截函数（更温和的拦截策略）
  function createInterceptor(originalMethod, methodName) {
    const interceptorFunction = function(...args) {
      const logContent = args.join(' ');

      // 优先检查内容，只拦截非常特定的h265web日志
      if (isH265webLog(logContent)) {
        // 静默屏蔽h265web特定日志，不输出拦截提示
        return;
      }

      // 检查调用栈（仅作为辅助判断）
      if (isFromH265webFiles() && isH265webLog(logContent)) {
        // 只有当内容也匹配时才屏蔽
        return;
      }

      // 所有其他日志（包括正常的调试日志）都正常输出
      return originalMethod.apply(console, args);
    };

    // 重要：重写bind方法，确保h265web无法绕过我们的拦截
    interceptorFunction.bind = function(thisArg, ...args) {
      return function(...moreArgs) {
        return interceptorFunction.apply(thisArg, args.concat(moreArgs));
      };
    };

    return interceptorFunction;
  }
  
  // 重写Function.prototype.bind来拦截console方法的bind调用
  Function.prototype.bind = function(thisArg, ...args) {
    const originalFunction = this;

    // 检查是否是console方法的bind调用
    if (originalFunction === originalConsole.log ||
        originalFunction === originalConsole.warn ||
        originalFunction === originalConsole.error ||
        originalFunction === originalConsole.info ||
        originalFunction === originalConsole.debug) {

      // 返回我们的拦截函数
      return function(...moreArgs) {
        const allArgs = args.concat(moreArgs);
        const logContent = allArgs.join(' ');

        // 只拦截特定的h265web日志内容
        if (isH265webLog(logContent)) {
          // 静默屏蔽，不输出拦截提示
          return;
        }

        // 所有其他日志正常输出
        return originalFunction.apply(thisArg, allArgs);
      };
    }

    // 其他函数的bind调用正常处理
    return originalBind.call(this, thisArg, ...args);
  };

  // 重写console方法（只重写主要的日志方法）
  console.log = createInterceptor(originalConsole.log, 'log');
  console.warn = createInterceptor(originalConsole.warn, 'warn');
  console.error = createInterceptor(originalConsole.error, 'error');
  console.info = createInterceptor(originalConsole.info, 'info');
  console.debug = createInterceptor(originalConsole.debug, 'debug');

  // console.log('[h265web拦截器] 早期拦截器已启动，精确拦截h265web特定日志');

  // 在window对象上暴露控制接口
  window.h265webEarlyInterceptor = {
    restore: function() {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
      console.log('[h265web拦截器] 早期拦截器已恢复');
    },
    status: function() {
      return {
        active: console.log !== originalConsole.log,
        originalMethods: originalConsole
      };
    },
    test: function() {
      console.log('[h265web拦截器] 测试正常日志 - 这条应该显示');
      console.log('h265web.js loaded!'); // 这应该被拦截
      console.log('[v] all ok now'); // 这应该被拦截
      console.log('这是一条普通的调试日志 - 这条应该显示');
      console.warn('这是一条普通的警告日志 - 这条应该显示');
    },
    enableDebug: function() {
      // 临时启用调试模式，显示拦截信息
      window.h265webDebugMode = true;
    },
    disableDebug: function() {
      // 禁用调试模式
      window.h265webDebugMode = false;
    }
  };

})();
