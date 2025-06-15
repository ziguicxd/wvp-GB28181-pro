/**
 * h265web日志拦截器
 * 这个脚本需要在所有其他脚本之前加载
 * 直接在HTML中引入，确保最早执行
 */

(function() {
  'use strict';

  console.log('[h265web拦截器] 开始执行早期拦截');

  // 保存原始console方法 - 使用更深层的引用
  const originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    info: console.info.bind(console),
    debug: console.debug.bind(console)
  };

  // 保存原始的console对象引用
  const originalConsoleObject = window.console;

  // 重要：保存原始的bind方法，防止h265web绕过我们的拦截
  const originalBind = Function.prototype.bind;
  
  // 检查调用栈是否来自h265web相关文件
  function isFromH265webFiles() {
    try {
      const stack = new Error().stack;
      if (stack) {
        return (
          stack.includes('missile.js') ||
          stack.includes('h265web') ||
          stack.includes('265web') ||
          stack.includes('h265webjs')
        );
      }
    } catch (e) {
      // 忽略错误
    }
    return false;
  }

  // 检查是否为h265web相关日志
  function isH265webLog(logContent) {
    return (
      logContent.includes('h265web.js loaded!') ||
      logContent.includes('missile.js:') ||
      logContent.includes('_     ___   __ _____') ||
      logContent.includes('| |   |__ \\') ||
      logContent.includes('| |__    )') ||
      logContent.includes('| \'_ \\  /') ||
      logContent.includes('| | | |/') ||
      logContent.includes('|_| |_|____') ||
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
      logContent.includes('[v] all ok now') ||
      logContent.includes('Numberwolf') ||
      logContent.includes('numberwolf') ||
      (logContent.includes('*') && logContent.includes('[h265web.js]')) ||
      logContent.includes('/*********************************************************') ||
      logContent.includes('**********************************************************/') ||
      (logContent.includes('|') && logContent.includes('_') && logContent.includes('\\')) ||
      // 新增更多匹配规则
      logContent.includes('h265web.js:') ||
      logContent.includes('265webjs') ||
      logContent.includes('H265webjs') ||
      // 匹配特定的ASCII艺术字符
      /\|\s+\|\s+\|/.test(logContent) ||
      /\|\s*_\s*\|/.test(logContent) ||
      /_+\s+___/.test(logContent)
    );
  }
  
  // 创建拦截函数
  function createInterceptor(originalMethod, methodName) {
    const interceptorFunction = function(...args) {
      // 首先检查调用栈
      if (isFromH265webFiles()) {
        // 如果来自h265web相关文件，直接屏蔽
        originalConsole.log('[h265web拦截器] 通过调用栈检测到h265web日志，已屏蔽');
        return;
      }

      const logContent = args.join(' ');

      if (isH265webLog(logContent)) {
        // 屏蔽h265web相关日志
        originalConsole.log('[h265web拦截器] 通过内容检测到h265web日志，已屏蔽:', logContent.substring(0, 50) + '...');
        return;
      }

      // 其他日志正常输出
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
  
  // 重写Function.prototype.bind来拦截所有bind调用
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

        // 检查调用栈
        if (isFromH265webFiles()) {
          originalConsole.log('[h265web拦截器] 通过bind拦截检测到h265web日志，已屏蔽');
          return;
        }

        const logContent = allArgs.join(' ');
        if (isH265webLog(logContent)) {
          originalConsole.log('[h265web拦截器] 通过bind拦截检测到h265web日志内容，已屏蔽:', logContent.substring(0, 50) + '...');
          return;
        }

        // 其他日志正常输出
        return originalFunction.apply(thisArg, allArgs);
      };
    }

    // 其他函数的bind调用正常处理
    return originalBind.call(this, thisArg, ...args);
  };

  // 重写所有console方法
  console.log = createInterceptor(originalConsole.log, 'log');
  console.warn = createInterceptor(originalConsole.warn, 'warn');
  console.error = createInterceptor(originalConsole.error, 'error');
  console.info = createInterceptor(originalConsole.info, 'info');
  console.debug = createInterceptor(originalConsole.debug, 'debug');

  // 同时重写window.console，防止直接访问
  Object.defineProperty(window, 'console', {
    value: {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug,
      trace: console.trace,
      dir: console.dir,
      dirxml: console.dirxml,
      group: console.group,
      groupEnd: console.groupEnd,
      time: console.time,
      timeEnd: console.timeEnd,
      count: console.count,
      assert: console.assert,
      clear: console.clear,
      table: console.table
    },
    writable: false,
    configurable: false
  });

  console.log('[h265web拦截器] 早期拦截器已启动，开始监控h265web日志');

  // 添加额外的监控机制 - 监控所有可能的console访问方式
  const consoleProxy = new Proxy(originalConsoleObject, {
    get: function(target, prop) {
      if (typeof target[prop] === 'function') {
        return function(...args) {
          // 检查调用栈
          if (isFromH265webFiles()) {
            console.log('[h265web拦截器] Proxy检测到h265web调用console.' + prop + '，已屏蔽');
            return;
          }

          const logContent = args.join(' ');
          if (isH265webLog(logContent)) {
            console.log('[h265web拦截器] Proxy检测到h265web日志内容，已屏蔽');
            return;
          }

          return target[prop].apply(target, args);
        };
      }
      return target[prop];
    }
  });

  // 尝试替换全局console引用
  try {
    Object.defineProperty(window, 'console', {
      value: consoleProxy,
      writable: false,
      configurable: true
    });
  } catch (e) {
    console.log('[h265web拦截器] 无法完全锁定console对象:', e.message);
  }

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
      console.log('[h265web拦截器] 测试正常日志');
      console.log('h265web.js loaded!'); // 这应该被拦截
      console.log('missile.js: test'); // 这应该被拦截
    }
  };

})();
