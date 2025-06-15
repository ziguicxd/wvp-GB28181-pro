<template>
  <div id="h265Player" ref="container" style="background-color: #000000; " @dblclick="fullscreenSwich">
    <div id="glplayer" ref="playerBox" style="width: 100%; height: 100%; margin: 0 auto;" />
    <div v-if="playerLoading" class="player-loading">
      <i class="el-icon-loading" />
      <span>视频加载中</span>
    </div>
    <div v-if="showButton" id="buttonsBox" class="buttons-box">
      <div class="buttons-box-left">
        <i v-if="!playing" class="iconfont icon-play h265web-btn" @click="unPause" />
        <i v-if="playing" class="iconfont icon-pause h265web-btn" @click="pause" />
        <i class="iconfont icon-stop h265web-btn" @click="destroy" />
        <i v-if="isNotMute" class="iconfont icon-audio-high h265web-btn" @click="mute()" />
        <i v-if="!isNotMute" class="iconfont icon-audio-mute h265web-btn" @click="cancelMute()" />
      </div>
      <div class="buttons-box-right">
        <!--          <i class="iconfont icon-file-record1 h265web-btn"></i>-->
        <!--          <i class="iconfont icon-xiangqing2 h265web-btn" ></i>-->
        <i
          class="iconfont icon-camera1196054easyiconnet h265web-btn"
          style="font-size: 1rem !important"
          @click="screenshot"
        />
        <i class="iconfont icon-shuaxin11 h265web-btn" @click="playBtnClick" />
        <i v-if="!fullscreen" class="iconfont icon-weibiaoti10 h265web-btn" @click="fullscreenSwich" />
        <i v-if="fullscreen" class="iconfont icon-weibiaoti11 h265web-btn" @click="fullscreenSwich" />
      </div>
    </div>
  </div>
</template>

<script>
const h265webPlayer = {}
/**
 * 从github上复制的
 * @see https://github.com/numberwolf/h265web.js/blob/master/example_normal/index.js
 */
const token = 'base64:QXV0aG9yOmNoYW5neWFubG9uZ3xudW1iZXJ3b2xmLEdpdGh1YjpodHRwczovL2dpdGh1Yi5jb20vbnVtYmVyd29sZixFbWFpbDpwb3JzY2hlZ3QyM0Bmb3htYWlsLmNvbSxRUTo1MzEzNjU4NzIsSG9tZVBhZ2U6aHR0cDovL3h2aWRlby52aWRlbyxEaXNjb3JkOm51bWJlcndvbGYjODY5NCx3ZWNoYXI6bnVtYmVyd29sZjExLEJlaWppbmcsV29ya0luOkJhaWR1'
export default {
  name: 'H265web',
  props: ['videoUrl', 'error', 'hasAudio', 'height', 'showButton'],
  data() {
    return {
      playing: false,
      isNotMute: false,
      quieting: false,
      fullscreen: false,
      loaded: false, // mute
      speed: 0,
      kBps: 0,
      btnDom: null,
      videoInfo: null,
      volume: 1,
      rotate: 0,
      vod: true, // 点播
      forceNoOffscreen: false,
      playerWidth: 0,
      playerHeight: 0,
      inited: false,
      playerLoading: false,
      mediaInfo: null
    }
  },
  watch: {
    videoUrl(newData, oldData) {
      this.play(newData)
    },
    playing(newData, oldData) {
      this.$emit('playStatusChange', newData)
    },
    immediate: true
  },
  mounted() {
    const paramUrl = decodeURIComponent(this.$route.params.url)
    window.onresize = () => {
      this.updatePlayerDomSize()
    }
    this.btnDom = document.getElementById('buttonsBox')

    // 全局拦截器已在main.js中启动，这里只需要确保拦截器正常工作
    this.ensureGlobalInterceptorActive()

    console.log('初始化时的地址为: ' + paramUrl)
    if (paramUrl) {
      this.play(this.videoUrl)
    }
  },
  destroyed() {
    if (h265webPlayer[this._uid]) {
      h265webPlayer[this._uid].destroy()
    }
    this.playing = false
    this.loaded = false
    this.playerLoading = false

    // 全局拦截器会持续工作，不需要在组件销毁时恢复
    // console.log('[h265web] 组件销毁，全局拦截器继续工作')
  },
  methods: {
    updatePlayerDomSize() {
      const dom = this.$refs.container
      if (!this.parentNodeResizeObserver) {
        this.parentNodeResizeObserver = new ResizeObserver(entries => {
          this.updatePlayerDomSize()
        })
        this.parentNodeResizeObserver.observe(dom.parentNode)
      }
      const boxWidth = dom.parentNode.clientWidth
      const boxHeight = dom.parentNode.clientHeight
      let width = boxWidth
      let height = (9 / 16) * width
      if (boxHeight > 0 && boxWidth > boxHeight / 9 * 16) {
        height = boxHeight
        width = boxHeight / 9 * 16
      }

      const clientHeight = Math.min(document.body.clientHeight, document.documentElement.clientHeight)
      if (height > clientHeight) {
        height = clientHeight
        width = (16 / 9) * height
      }

      this.$refs.playerBox.style.width = width + 'px'
      this.$refs.playerBox.style.height = height + 'px'
      this.playerWidth = width
      this.playerHeight = height
      if (this.playing) {
        h265webPlayer[this._uid].resize(this.playerWidth, this.playerHeight)
      }
    },
    resize(width, height) {
      this.playerWidth = width
      this.playerHeight = height
      this.$refs.playerBox.style.width = width + 'px'
      this.$refs.playerBox.style.height = height + 'px'
      if (this.playing) {
        h265webPlayer[this._uid].resize(this.playerWidth, this.playerHeight)
      }
    },
    create(url) {
      this.playerLoading = true
      const options = {}
      h265webPlayer[this._uid] = new window.new265webjs(url, Object.assign(
        {
          player: 'glplayer', // 播放器容器id
          width: this.playerWidth,
          height: this.playerHeight,
          token: token,
          extInfo: {
            coreProbePart: 0.4,
            probeSize: 8192,
            ignoreAudio: this.hasAudio == null ? 0 : (this.hasAudio ? 0 : 1)
          },
          // 屏蔽统计和日志相关配置
          debug: false, // 关闭调试模式
          debugLevel: 0, // 设置调试级别为0
          logLevel: 0, // 关闭日志输出
          disableStats: true, // 禁用统计
          disableAnalytics: true, // 禁用分析
          noStats: true, // 不发送统计数据
          noLog: true, // 不输出日志
          silent: true // 静默模式
        },
        options
      ))
      const h265web = h265webPlayer[this._uid]
      h265web.onOpenFullScreen = () => {
        this.fullscreen = true
      }
      h265web.onCloseFullScreen = () => {
        this.fullscreen = false
      }
      h265web.onReadyShowDone = () => {
        // 准备好显示了，尝试自动播放
        const result = h265web.play()
        this.playing = result
        this.playerLoading = false
      }
      h265web.onLoadFinish = () => {
        try {
          this.loaded = true
          // 可以获取mediaInfo
          // @see https://github.com/numberwolf/h265web.js/blob/8b26a31ffa419bd0a0f99fbd5111590e144e36a8/example_normal/index.js#L252C9-L263C11
          if (h265web.mediaInfo && typeof h265web.mediaInfo === 'function') {
            this.mediaInfo = h265web.mediaInfo()
          } else {
            console.warn('播放器不支持mediaInfo方法')
          }
        } catch (error) {
          console.warn('获取媒体信息时出现错误:', error)
          this.loaded = true // 仍然标记为已加载，避免阻塞
        }
      }
      h265web.onPlayTime = (videoPTS) => {
        try {
          // 检查videoPTS是否有效
          if (videoPTS !== null && videoPTS !== undefined && !isNaN(videoPTS)) {
            this.$emit('playTimeChange', videoPTS)
          } else {
            console.warn('播放器返回无效的时间值:', videoPTS)
          }
        } catch (error) {
          console.warn('播放器时间回调出现错误:', error)
        }
      }
<<<<<<< HEAD
=======
      h265web.onSeekFinish = () => {
        try {
          console.log('播放器seek完成')
          this.$emit('seekFinish')
        } catch (error) {
          console.warn('播放器seek完成回调出现错误:', error)
        }
      }
>>>>>>> 1eb0c96c5 (屏蔽H265播放器原始日志)
      h265web.do()
    },
    screenshot: function() {
      if (h265webPlayer[this._uid]) {
        const canvas = document.createElement('canvas')
        console.log(this.mediaInfo)
        canvas.width = this.mediaInfo.meta.size.width
        canvas.height = this.mediaInfo.meta.size.height
        h265webPlayer[this._uid].snapshot(canvas) // snapshot to canvas

        // 下载截图
        const link = document.createElement('a')
        link.download = 'screenshot.png'
        link.href = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
        link.click()
      }
    },
    playBtnClick: function(event) {
      this.play(this.videoUrl)
    },
    play: function(url) {
      // 确保完全清理旧的播放器
      if (h265webPlayer[this._uid]) {
        this.destroy()
        // 给一点时间让销毁操作完成
        setTimeout(() => {
          this.play(url)
        }, 100)
        return
      }

      if (!url) {
        return
      }

      if (this.playerWidth === 0 || this.playerHeight === 0) {
        this.updatePlayerDomSize()
        setTimeout(() => {
          this.play(url)
        }, 300)
        return
      }

      this.create(url)
    },
    unPause: function() {
      try {
        if (h265webPlayer[this._uid] && h265webPlayer[this._uid].play) {
          h265webPlayer[this._uid].play()
          this.playing = h265webPlayer[this._uid].isPlaying()
        }
      } catch (error) {
        console.warn('恢复播放时出现错误:', error)
        this.playing = false
      }
      this.err = ''
    },
    pause: function() {
      try {
        if (h265webPlayer[this._uid] && h265webPlayer[this._uid].pause) {
          h265webPlayer[this._uid].pause()
          this.playing = h265webPlayer[this._uid].isPlaying()
        }
      } catch (error) {
        console.warn('暂停播放时出现错误:', error)
        this.playing = false
      }
      this.err = ''
    },
    mute: function() {
      if (h265webPlayer[this._uid]) {
        h265webPlayer[this._uid].setVoice(0.0)
        this.isNotMute = false
      }
    },
    cancelMute: function() {
      if (h265webPlayer[this._uid]) {
        h265webPlayer[this._uid].setVoice(1.0)
        this.isNotMute = true
      }
    },
    destroy: function() {
      // 立即重置状态，避免其他方法继续调用播放器
      this.playing = false
      this.loaded = false
      this.playerLoading = false
      this.err = ''

      if (h265webPlayer[this._uid]) {
        try {
          // 先暂停播放，避免事件监听器继续触发
          if (h265webPlayer[this._uid].pause) {
            h265webPlayer[this._uid].pause()
          }

          // 等待一小段时间让暂停操作完成
          setTimeout(() => {
            try {
              if (h265webPlayer[this._uid] && h265webPlayer[this._uid].release) {
                h265webPlayer[this._uid].release()
              }
            } catch (error) {
              console.warn('释放播放器资源时出现错误:', error)
            } finally {
              h265webPlayer[this._uid] = null
              // 清理DOM容器
              this.clearPlayerDOM()
            }
          }, 100)

        } catch (error) {
          console.warn('销毁播放器时出现错误:', error)
          h265webPlayer[this._uid] = null
          this.clearPlayerDOM()
        }
      } else {
        this.clearPlayerDOM()
      }
    },

    clearPlayerDOM: function() {
      // 清理DOM容器，移除所有子元素和事件监听器
      try {
        if (this.$refs.playerBox) {
          // 移除所有子元素
          while (this.$refs.playerBox.firstChild) {
            this.$refs.playerBox.removeChild(this.$refs.playerBox.firstChild)
          }
        }
      } catch (error) {
        console.warn('清理DOM容器时出现错误:', error)
      }
    },
    fullscreenSwich: function() {
      const isFull = this.isFullscreen()
      if (isFull) {
        h265webPlayer[this._uid].closeFullScreen()
      } else {
        h265webPlayer[this._uid].fullScreen()
      }
      this.fullscreen = !isFull
    },
    isFullscreen: function() {
      return document.fullscreenElement ||
        document.msFullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement || false
    },
    setPlaybackRate: function(speed) {
      try {
        if (h265webPlayer[this._uid] && h265webPlayer[this._uid].setPlaybackRate) {
          h265webPlayer[this._uid].setPlaybackRate(speed)
        }
      } catch (error) {
        console.warn('设置播放倍速时出现错误:', error)
      }
<<<<<<< HEAD
    }
=======
    },
    seek: function(pts) {
      try {
        console.log('h265web播放器seek方法被调用，目标时间:', pts, '秒')
        console.log('播放器状态:', {
          playerExists: !!h265webPlayer[this._uid],
          seekMethodExists: !!(h265webPlayer[this._uid] && h265webPlayer[this._uid].seek),
          playerUid: this._uid,
          loaded: this.loaded,
          playing: this.playing
        })

        if (h265webPlayer[this._uid] && h265webPlayer[this._uid].seek) {
          console.log('执行播放器seek操作到:', pts, '秒')

          // 检查pts值是否合理
          if (pts < 0) {
            console.warn('seek时间小于0，调整为0')
            pts = 0
          }

          // 执行seek操作
          h265webPlayer[this._uid].seek(pts)
          console.log('播放器seek操作已执行')

          // 验证seek是否成功（尝试不同的时间获取方法）
          setTimeout(() => {
            try {
              let currentTime = null

              // 尝试不同的时间获取方法
              if (h265webPlayer[this._uid]) {
                if (h265webPlayer[this._uid].getCurrentTime) {
                  currentTime = h265webPlayer[this._uid].getCurrentTime()
                } else if (h265webPlayer[this._uid].getTime) {
                  currentTime = h265webPlayer[this._uid].getTime()
                } else if (h265webPlayer[this._uid].currentTime !== undefined) {
                  currentTime = h265webPlayer[this._uid].currentTime
                }

                if (currentTime !== null) {
                  console.log('seek后播放器当前时间:', currentTime, '秒，目标时间:', pts, '秒')
                  if (Math.abs(currentTime - pts) > 2) {
                    console.warn('seek可能未成功，时间差异较大')
                  }
                } else {
                  console.log('播放器不支持获取当前时间，无法验证seek结果')
                }
              }
            } catch (error) {
              console.warn('验证seek结果时出现错误:', error)
            }
          }, 100)

          return true
        } else {
          console.warn('播放器未准备好或不支持seek操作', {
            playerExists: !!h265webPlayer[this._uid],
            seekMethodExists: !!(h265webPlayer[this._uid] && h265webPlayer[this._uid].seek)
          })
          return false
        }
      } catch (error) {
        console.error('播放器seek时出现错误:', error)
        return false
      }
    },

    // 确保全局拦截器正常工作
    ensureGlobalInterceptorActive() {
      try {
        // 检查全局拦截器是否存在并正常工作
        if (window.h265webInterceptor) {
          const status = window.h265webInterceptor.status()
          if (status.active) {
            // console.log('[h265web] 全局拦截器正常工作')
          } else {
            // console.warn('[h265web] 全局拦截器未激活，尝试重新启动')
            window.h265webInterceptor.start()
          }
        } else {
          // console.warn('[h265web] 全局拦截器不存在，可能未正确加载')
        }
      } catch (error) {
        // console.error('[h265web] 检查全局拦截器状态失败:', error)
      }
    },


>>>>>>> 1eb0c96c5 (屏蔽H265播放器原始日志)
  }
}
</script>

<style>
.buttons-box {
  width: 100%;
  height: 28px;
  background-color: rgba(43, 51, 63, 0.7);
  position: absolute;
  display: -webkit-box;
  display: -ms-flexbox;
  display: flex;
  left: 0;
  bottom: 0;
  user-select: none;
  z-index: 10;
}

.h265web-btn {
  width: 20px;
  color: rgb(255, 255, 255);
  line-height: 27px;
  margin: 0px 10px;
  padding: 0px 2px;
  cursor: pointer;
  text-align: center;
  font-size: 0.8rem !important;
}

.buttons-box-right {
  position: absolute;
  right: 0;
}
.player-loading {
  width: fit-content;
  height: 30px;
  position: absolute;
  left: calc(50% - 52px);
  top: calc(50% - 52px);
  color: #fff;
  font-size: 16px;
}
.player-loading i{
  font-size: 24px;
  line-height: 24px;
  text-align: center;
  display: block;
}
.player-loading span{
  display: inline-block;
  font-size: 16px;
  height: 24px;
  line-height: 24px;
}
</style>
