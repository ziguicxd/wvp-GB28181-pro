/**
 * 播放器控制相关的 Mixin
 * 包含播放、暂停、停止、快进、快退等功能
 */
export const PlayerControlMixin = {
  data() {
    return {
      pausedPosition: null, // 暂停时的播放位置（毫秒）
      pausedPlayTime: null, // 暂停时的播放时间
      timeUpdateInterval: null // 时间更新监控定时器
    }
  },
  
  methods: {
    /**
     * 播放视频
     */
    play() {
      console.log('播放按钮被点击，当前播放状态:', this.playing)
      const player = this.$refs.recordVideoPlayer
      
      if (!player) {
        console.warn('播放器引用不存在，重新播放录像')
        this.playRecord()
        return
      }

      try {
        // 检查是否有暂停位置需要恢复
        if (this.pausedPosition !== null || this.pausedPlayTime !== null) {
          console.log('检测到暂停位置，尝试从暂停位置继续播放')
          this.resumeFromPausedPosition()
          return
        }

        // 如果有视频URL且播放器已加载，尝试恢复播放
        if (this.videoUrl && player.loaded) {
          console.log('播放器已加载，尝试恢复播放')
          
          // 尝试多种播放方法
          if (typeof player.play === 'function') {
            player.play()
            this.playing = true
          } else if (typeof player.unPause === 'function') {
            player.unPause()
            this.playing = true
          } else if (typeof player.resume === 'function') {
            player.resume()
            this.playing = true
          } else {
            // 直接操作video元素
            const videoElement = player.$el?.querySelector('video')
            if (videoElement && typeof videoElement.play === 'function') {
              videoElement.play()
              this.playing = true
            } else {
              this.playRecord()
            }
          }

          // 重新启动时间更新监控
          this.startTimeUpdateMonitor()
        } else {
          console.log('播放器未加载或无视频URL，重新播放录像')
          this.playRecord()
        }
      } catch (error) {
        console.error('播放失败:', error)
        this.playRecord()
      }
    },

    /**
     * 暂停播放
     */
    pausePlay() {
      console.log('暂停按钮被点击，当前播放状态:', this.playing)
      const player = this.$refs.recordVideoPlayer
      
      if (!player) {
        console.warn('播放器引用不存在')
        return
      }

      try {
        // 保存当前播放位置
        const currentPlayerTime = this.getCurrentPlayerTime(player)
        if (currentPlayerTime !== null) {
          this.pausedPosition = currentPlayerTime
          console.log('保存暂停位置:', this.pausedPosition)
        }

        // 保存当前播放时间
        this.pausedPlayTime = this.playTime
        console.log('保存暂停播放时间:', this.pausedPlayTime)

        // 执行暂停操作
        if (typeof player.pause === 'function') {
          player.pause()
          this.playing = false
        } else if (typeof player.stop === 'function') {
          player.stop()
          this.playing = false
        } else {
          // 直接操作video元素
          const videoElement = player.$el?.querySelector('video')
          if (videoElement && typeof videoElement.pause === 'function') {
            videoElement.pause()
            this.playing = false
          }
        }

        // 停止时间更新监控
        this.stopTimeUpdateMonitor()
        
        console.log('暂停成功，播放状态:', this.playing)
      } catch (error) {
        console.error('暂停失败:', error)
        this.playing = false
      }
    },

    /**
     * 停止播放
     */
    stopPlay() {
      console.log('停止按钮被点击')
      
      // 停止时间更新监控
      this.stopTimeUpdateMonitor()
      
      // 清除暂停状态
      this.pausedPosition = null
      this.pausedPlayTime = null
      
      // 停止播放器
      if (this.$refs.recordVideoPlayer && typeof this.$refs.recordVideoPlayer.destroy === 'function') {
        this.$refs.recordVideoPlayer.destroy()
      }
      
      this.videoUrl = null
      this.playing = false
      
      console.log('停止播放完成，已清除暂停状态')
    },

    /**
     * 从暂停位置恢复播放
     */
    resumeFromPausedPosition() {
      try {
        console.log('从暂停位置恢复播放')
        const player = this.$refs.recordVideoPlayer
        
        if (!player) {
          console.warn('播放器不存在，重新播放')
          this.playRecord()
          return
        }

        // 恢复播放时间
        if (this.pausedPlayTime !== null) {
          this.playTime = this.pausedPlayTime
          console.log('恢复播放时间:', this.playTime)
          
          // 更新时间轴
          if (this.$refs.Timeline) {
            this.$refs.Timeline.setTime(this.playTime)
          }
        }

        // 尝试设置播放位置
        if (this.pausedPosition !== null) {
          console.log('尝试设置播放位置:', this.pausedPosition)
          
          if (typeof player.seek === 'function') {
            player.seek(this.pausedPosition)
          } else if (typeof player.setCurrentTime === 'function') {
            player.setCurrentTime(this.pausedPosition)
          } else {
            const videoElement = player.$el?.querySelector('video')
            if (videoElement) {
              videoElement.currentTime = this.pausedPosition / 1000
            }
          }
        }

        // 开始播放
        if (typeof player.play === 'function') {
          player.play()
        } else if (typeof player.resume === 'function') {
          player.resume()
        } else {
          const videoElement = player.$el?.querySelector('video')
          if (videoElement && typeof videoElement.play === 'function') {
            videoElement.play()
          }
        }

        this.playing = true
        
        // 清除暂停位置
        this.pausedPosition = null
        this.pausedPlayTime = null
        
        // 重新启动时间更新监控
        this.startTimeUpdateMonitor()
        
        console.log('从暂停位置恢复播放成功')
        
      } catch (error) {
        console.error('从暂停位置恢复播放失败:', error)
        
        // 清除暂停位置
        this.pausedPosition = null
        this.pausedPlayTime = null
        
        // 重新播放
        this.playRecord()
      }
    },

    /**
     * 快进5秒
     */
    seekForward() {
      this.seekBy(5000) // 5秒 = 5000毫秒
    },

    /**
     * 快退5秒
     */
    seekBackward() {
      this.seekBy(-5000) // -5秒 = -5000毫秒
    },

    /**
     * 跳转指定时间
     * @param {number} milliseconds - 跳转的毫秒数（正数为快进，负数为快退）
     */
    seekBy(milliseconds) {
      if (!this.playTime) return
      
      const newTime = this.playTime + milliseconds
      const player = this.$refs.recordVideoPlayer
      
      if (player && typeof player.seek === 'function') {
        player.seek(newTime)
      }
      
      this.playTime = newTime
      
      // 更新时间轴
      if (this.$refs.Timeline) {
        this.$refs.Timeline.setTime(newTime)
      }
    },

    /**
     * 改变播放速度
     * @param {number} speed - 播放速度
     */
    changePlaySpeed(speed) {
      this.playSpeed = speed
      const player = this.$refs.recordVideoPlayer
      
      if (player && typeof player.setPlaybackRate === 'function') {
        player.setPlaybackRate(speed)
      }
      
      console.log('播放速度已改变为:', speed)
    },

    /**
     * 播放上一个文件
     */
    playPrevious() {
      if (this.chooseFileIndex > 0) {
        this.chooseFile(this.chooseFileIndex - 1)
      }
    },

    /**
     * 播放下一个文件
     */
    playNext() {
      if (this.chooseFileIndex < this.detailFiles.length - 1) {
        this.chooseFile(this.chooseFileIndex + 1)
      }
    },

    /**
     * 获取播放器当前时间
     */
    getCurrentPlayerTime(player) {
      try {
        if (player.currentTime !== undefined && player.currentTime !== null) {
          const time = player.currentTime < 1000000000 ? player.currentTime * 1000 : player.currentTime
          return time
        }

        if (typeof player.getCurrentTime === 'function') {
          const time = player.getCurrentTime()
          if (time !== null && time !== undefined) {
            return time < 1000000000 ? time * 1000 : time
          }
        }

        const videoElement = player.$el?.querySelector('video')
        if (videoElement && videoElement.currentTime !== undefined) {
          const time = videoElement.currentTime < 1000000000 ? videoElement.currentTime * 1000 : videoElement.currentTime
          return time
        }

        return this.playTime || null
      } catch (error) {
        console.error('获取播放器时间失败:', error)
        return null
      }
    },

    /**
     * 启动时间更新监控
     */
    startTimeUpdateMonitor() {
      if (this.timeUpdateInterval) {
        clearInterval(this.timeUpdateInterval)
      }
      
      this.timeUpdateInterval = setInterval(() => {
        const player = this.$refs.recordVideoPlayer
        if (player && this.playing) {
          const currentTime = this.getCurrentPlayerTime(player)
          if (currentTime !== null) {
            this.playTime = currentTime
          }
        }
      }, 1000)
    },

    /**
     * 停止时间更新监控
     */
    stopTimeUpdateMonitor() {
      if (this.timeUpdateInterval) {
        clearInterval(this.timeUpdateInterval)
        this.timeUpdateInterval = null
      }
    }
  },

  destroyed() {
    this.stopTimeUpdateMonitor()
  }
}
