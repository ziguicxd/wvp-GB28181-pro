/**
 * 文件管理相关的 Mixin
 * 包含文件列表、日期选择、文件播放等功能
 */
export const FileManagerMixin = {
  methods: {
    /**
     * 获取年度日期文件
     */
    async getDateInYear(callback) {
      try {
        const response = await this.$http.get('/api/cloudRecord/date/list', {
          params: {
            app: this.app,
            stream: this.stream,
            mediaServerId: this.mediaServerId,
            year: new Date().getFullYear()
          }
        })
        
        if (response.data.code === 0) {
          this.dateFilesObj = response.data.data || {}
          if (callback) callback()
        } else {
          this.$message.error('获取日期列表失败')
        }
      } catch (error) {
        console.error('获取日期列表失败:', error)
        this.$message.error('获取日期列表失败')
      }
    },

    /**
     * 日期改变事件
     */
    async dateChange() {
      if (!this.chooseDate) return
      
      this.loading = true
      try {
        const response = await this.$http.get('/api/cloudRecord/file/list', {
          params: {
            app: this.app,
            stream: this.stream,
            mediaServerId: this.mediaServerId,
            date: this.chooseDate,
            page: this.currentPage,
            count: this.count
          }
        })
        
        if (response.data.code === 0) {
          this.detailFiles = response.data.data?.list || []
          this.total = response.data.data?.total || 0
          
          // 自动选择第一个文件
          if (this.detailFiles.length > 0) {
            this.chooseFile(0)
          }
          
          // 生成时间段数据
          this.generateTimeSegments()
        } else {
          this.$message.error('获取文件列表失败')
        }
      } catch (error) {
        console.error('获取文件列表失败:', error)
        this.$message.error('获取文件列表失败')
      } finally {
        this.loading = false
      }
    },

    /**
     * 选择文件
     */
    chooseFile(index) {
      if (index < 0 || index >= this.detailFiles.length) return
      
      this.chooseFileIndex = index
      const file = this.detailFiles[index]
      
      if (file) {
        this.playRecord(file)
      }
    },

    /**
     * 播放录像
     */
    playRecord(file) {
      try {
        console.log('开始播放录像', file)
        
        // 清除之前的暂停状态
        this.pausedPosition = null
        this.pausedPlayTime = null
        
        // 设置加载状态
        this.playLoading = true
        
        // 构建播放URL
        this.videoUrl = this.buildPlayUrl(file)
        
        // 设置初始时间
        this.initTime = file.startTime
        this.playTime = file.startTime
        
        console.log('录像播放URL:', this.videoUrl)
        
      } catch (error) {
        console.error('播放录像失败:', error)
        this.$message.error('播放录像失败')
        this.playLoading = false
      }
    },

    /**
     * 构建播放URL
     */
    buildPlayUrl(file) {
      const baseUrl = '/api/cloudRecord/play'
      const params = new URLSearchParams({
        app: this.app,
        stream: this.stream,
        mediaServerId: this.mediaServerId || '',
        fileName: file.fileName,
        startTime: file.startTime,
        endTime: file.endTime
      })
      
      return `${baseUrl}?${params.toString()}`
    },

    /**
     * 下载文件
     */
    downloadFile(file) {
      try {
        const downloadUrl = this.buildDownloadUrl(file)
        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = file.fileName
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        this.$message.success('开始下载文件')
      } catch (error) {
        console.error('下载文件失败:', error)
        this.$message.error('下载文件失败')
      }
    },

    /**
     * 构建下载URL
     */
    buildDownloadUrl(file) {
      const baseUrl = '/api/cloudRecord/download'
      const params = new URLSearchParams({
        app: this.app,
        stream: this.stream,
        mediaServerId: this.mediaServerId || '',
        fileName: file.fileName
      })
      
      return `${baseUrl}?${params.toString()}`
    },

    /**
     * 获取文件显示名称
     */
    getFileShowName(file) {
      if (!file) return ''
      
      const startTime = new Date(file.startTime).toLocaleTimeString()
      const endTime = new Date(file.endTime).toLocaleTimeString()
      
      return `${startTime} - ${endTime}`
    },

    /**
     * 生成时间段数据
     */
    generateTimeSegments() {
      this.timeSegments = this.detailFiles.map(file => ({
        start: file.startTime,
        end: file.endTime,
        color: '#409EFF'
      }))
    },

    /**
     * 无限滚动加载更多
     */
    infiniteScroll() {
      // 如果还有更多数据，加载下一页
      if (this.detailFiles.length < this.total) {
        this.currentPage++
        this.loadMoreFiles()
      }
    },

    /**
     * 加载更多文件
     */
    async loadMoreFiles() {
      try {
        const response = await this.$http.get('/api/cloudRecord/file/list', {
          params: {
            app: this.app,
            stream: this.stream,
            mediaServerId: this.mediaServerId,
            date: this.chooseDate,
            page: this.currentPage,
            count: this.count
          }
        })
        
        if (response.data.code === 0) {
          const newFiles = response.data.data?.list || []
          this.detailFiles.push(...newFiles)
          
          // 更新时间段数据
          this.generateTimeSegments()
        }
      } catch (error) {
        console.error('加载更多文件失败:', error)
      }
    },

    /**
     * 播放器加载完成事件
     */
    onPlayerLoaded() {
      console.log('播放器加载完成')
      this.playLoading = false
      this.playing = true
      
      // 启动时间更新监控
      this.startTimeUpdateMonitor()
      
      // 禁用播放器悬停效果
      this.$nextTick(() => {
        this.disablePlayerHoverEffects()
      })
    },

    /**
     * 播放器错误事件
     */
    onPlayerError(error) {
      console.error('播放器错误:', error)
      this.playLoading = false
      this.playing = false
      this.$message.error('播放失败，请重试')
    },

    /**
     * 播放状态改变事件
     */
    playingChange(playing) {
      console.log('播放状态改变:', playing)
      this.playing = playing
      
      if (playing) {
        this.startTimeUpdateMonitor()
      } else {
        this.stopTimeUpdateMonitor()
      }
    },

    /**
     * 播放时间更新事件
     */
    showPlayTimeChange(time) {
      if (time && typeof time === 'number') {
        this.playTime = time
      }
    },

    /**
     * 时间轴时间改变事件
     */
    playTimeChange(time) {
      console.log('时间轴时间改变:', time)
      this.playTime = time
      
      const player = this.$refs.recordVideoPlayer
      if (player && typeof player.seek === 'function') {
        player.seek(time)
      }
    },

    /**
     * 时间轴鼠标按下事件
     */
    timelineMouseDown() {
      this.timelineControl = true
    },

    /**
     * 时间轴鼠标释放事件
     */
    mouseupTimeline() {
      this.timelineControl = false
    },

    /**
     * 全屏切换
     */
    fullScreen() {
      if (screenfull.isEnabled) {
        screenfull.toggle()
        this.isFullScreen = !this.isFullScreen
      }
    },

    /**
     * 禁用播放器悬停效果
     */
    disablePlayerHoverEffects() {
      try {
        const player = this.$refs.recordVideoPlayer
        const playerEl = player?.$el

        if (!playerEl) return

        // 添加禁用悬停效果的类
        playerEl.classList.add('hover-disabled')

        // 禁用悬停事件
        const events = ['mouseenter', 'mouseleave', 'mouseover', 'mouseout']
        events.forEach(eventType => {
          playerEl.addEventListener(eventType, (e) => {
            e.preventDefault()
            e.stopPropagation()
            return false
          }, true)
        })

        console.log('播放器悬停效果已禁用')
      } catch (error) {
        console.error('禁用播放器悬停效果失败:', error)
      }
    }
  }
}
