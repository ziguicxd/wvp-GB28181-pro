/**
 * 截图功能相关的 Mixin
 * 包含多种截图方法和降级策略
 */
export const ScreenshotMixin = {
  methods: {
    /**
     * 主截图方法
     */
    takeScreenshot() {
      console.log('开始截图')
      const player = this.$refs.recordVideoPlayer

      if (!player) {
        this.$message.warning('播放器未加载，无法截图')
        return
      }

      if (!this.playing && !this.videoUrl) {
        this.$message.warning('请先播放视频再进行截图')
        return
      }

      this.$message.info('正在截图，请稍候...')

      try {
        // 尝试播放器原生截图方法
        if (this.tryPlayerNativeScreenshot(player)) {
          return
        }

        // 尝试自定义截图方法
        this.tryCustomScreenshot()
      } catch (error) {
        console.error('截图失败:', error)
        this.$message.error('截图失败: ' + error.message)
        this.showScreenshotInstructions()
      }
    },

    /**
     * 尝试播放器原生截图方法
     */
    tryPlayerNativeScreenshot(player) {
      const methods = ['screenshot', 'snap', 'capture']
      
      for (const method of methods) {
        if (typeof player[method] === 'function') {
          console.log(`尝试播放器${method}方法`)
          try {
            const result = player[method]()
            if (result !== false && result !== null && result !== undefined) {
              this.$message.success('截图成功')
              return true
            }
          } catch (error) {
            console.warn(`播放器${method}方法失败:`, error)
          }
        }
      }
      
      return false
    },

    /**
     * 尝试自定义截图方法
     */
    tryCustomScreenshot() {
      const player = this.$refs.recordVideoPlayer
      const playerEl = player?.$el

      if (!playerEl) {
        this.showScreenshotInstructions()
        return
      }

      // 尝试html2canvas截图
      if (window.html2canvas) {
        this.captureWithHtml2Canvas(playerEl)
      } else {
        // 加载html2canvas库
        this.loadHtml2Canvas().then(() => {
          if (window.html2canvas) {
            this.captureWithHtml2Canvas(playerEl)
          } else {
            this.showScreenshotInstructions()
          }
        }).catch(() => {
          this.showScreenshotInstructions()
        })
      }
    },

    /**
     * 使用html2canvas截图
     */
    captureWithHtml2Canvas(playerEl) {
      const options = {
        allowTaint: true,
        useCORS: false,
        scale: 1,
        logging: false,
        width: playerEl.offsetWidth || 800,
        height: playerEl.offsetHeight || 450,
        backgroundColor: '#000000',
        foreignObjectRendering: false,
        imageTimeout: 0,
        ignoreElements: (element) => {
          const tagName = element.tagName.toLowerCase()
          return ['video', 'canvas', 'iframe'].includes(tagName)
        }
      }

      window.html2canvas(playerEl, options)
        .then(canvas => {
          this.exportCanvas(canvas)
        })
        .catch(error => {
          console.error('html2canvas截图失败:', error)
          this.createInfoScreenshot()
        })
    },

    /**
     * 导出canvas为图片
     */
    exportCanvas(canvas) {
      try {
        canvas.toBlob((blob) => {
          if (blob && blob.size > 0) {
            this.downloadScreenshot(blob)
            this.$message.success('截图成功')
          } else {
            this.tryCanvasDataURL(canvas)
          }
        }, 'image/png', 1.0)
      } catch (error) {
        console.error('导出canvas失败:', error)
        this.tryCanvasDataURL(canvas)
      }
    },

    /**
     * 尝试使用dataURL导出
     */
    tryCanvasDataURL(canvas) {
      try {
        const dataURL = canvas.toDataURL('image/png', 1.0)
        if (dataURL && dataURL.length > 100) {
          this.downloadDataURL(dataURL)
          this.$message.success('截图成功')
        } else {
          this.createInfoScreenshot()
        }
      } catch (error) {
        console.error('dataURL导出失败:', error)
        this.createInfoScreenshot()
      }
    },

    /**
     * 创建信息截图
     */
    createInfoScreenshot() {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      canvas.width = 800
      canvas.height = 450
      
      // 绘制背景
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // 绘制文本信息
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('录像截图', canvas.width / 2, canvas.height / 2 - 60)
      
      ctx.font = '18px Arial'
      ctx.fillText(`设备ID: ${this.deviceId || '未知'}`, canvas.width / 2, canvas.height / 2 - 20)
      ctx.fillText(`通道ID: ${this.channelId || '未知'}`, canvas.width / 2, canvas.height / 2 + 20)
      ctx.fillText(`时间: ${new Date(this.playTime || Date.now()).toLocaleString()}`, canvas.width / 2, canvas.height / 2 + 60)
      
      ctx.font = '14px Arial'
      ctx.fillStyle = '#cccccc'
      ctx.fillText('由于浏览器安全限制，无法获取视频画面', canvas.width / 2, canvas.height / 2 + 100)
      
      // 导出截图
      canvas.toBlob((blob) => {
        if (blob) {
          this.downloadScreenshot(blob)
          this.$message.success('已生成播放信息截图')
        } else {
          this.showScreenshotInstructions()
        }
      }, 'image/png')
    },

    /**
     * 下载截图
     */
    downloadScreenshot(blob) {
      try {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `screenshot_${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('下载截图失败:', error)
        this.$message.error('下载截图失败')
      }
    },

    /**
     * 下载DataURL格式的图片
     */
    downloadDataURL(dataURL) {
      try {
        const link = document.createElement('a')
        link.href = dataURL
        link.download = `screenshot_${Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        console.error('下载DataURL失败:', error)
        this.$message.error('下载截图失败')
      }
    },

    /**
     * 显示截图说明
     */
    showScreenshotInstructions() {
      const currentTime = new Date(this.playTime || Date.now()).toLocaleString()
      
      this.$alert(
        `由于浏览器安全限制，无法自动截图。请使用以下方法手动截图：

当前播放信息：
时间: ${currentTime}

Windows 系统：
• Win + Shift + S - 区域截图（推荐）
• PrtScn - 全屏截图
• Alt + PrtScn - 当前窗口截图

Mac 系统：
• Cmd + Shift + 4 - 区域截图（推荐）
• Cmd + Shift + 3 - 全屏截图
• Cmd + Shift + 4 + 空格 - 窗口截图

浏览器截图：
• Chrome: F12 → Console → 输入 screenshot
• Firefox: F12 → 设置 → 截取整页
• Edge: F12 → 设备仿真 → 截图按钮

建议使用区域截图精确选择播放器区域，确保视频正在播放以获得最佳画面。`,
        '截图说明',
        {
          confirmButtonText: '我知道了',
          type: 'info'
        }
      )
    },

    /**
     * 动态加载html2canvas库
     */
    loadHtml2Canvas() {
      return new Promise((resolve, reject) => {
        if (window.html2canvas) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
        script.onload = () => {
          console.log('html2canvas库加载成功')
          resolve()
        }
        script.onerror = () => {
          console.error('html2canvas库加载失败')
          reject(new Error('html2canvas库加载失败'))
        }
        document.head.appendChild(script)
      })
    }
  }
}
