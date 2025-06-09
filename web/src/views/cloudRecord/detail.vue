<template>
  <div id="recordDetail" class="app-container">
    <div :style="boxStyle">
      <div>
        <div v-if="this.$route.query.mediaServerId" class="page-header-btn" style="padding-right: 1rem">
          <b>节点：</b> {{ mediaServerId }}
        </div>
        <div v-if="this.$route.params.mediaServerId">
          <span>流媒体：{{ this.$route.params.mediaServerId }}</span>
        </div>
        <div class="record-list-box-box">
          <div v-if="showSidebar">
            <el-date-picker
              v-model="chooseDate"
              size="mini"
              :picker-options="pickerOptions"
              type="date"
              value-format="yyyy-MM-dd"
              placeholder="日期"
              style="width: 190px"
              @change="dateChange()"
            />
            <!--            <el-button :disabled="!mediaServerId" size="mini" type="primary" icon="fa fa-cloud-download" style="margin: auto; margin-left: 12px " title="裁剪合并" @click="drawerOpen"></el-button>-->
          </div>
          <div class="record-list-box" style="height: calc(100vh - 170px); overflow: auto">
            <ul v-if="detailFiles.length >0" v-infinite-scroll="infiniteScroll" class="infinite-list record-list">
              <li v-for="(item,index) in detailFiles" :key="index" class="infinite-list-item record-list-item">
                <el-tag v-if="chooseFileIndex !== index" @click="chooseFile(index)">
                  <i class="el-icon-video-camera" />
                  {{ getFileShowName(item) }}
                </el-tag>
                <el-tag v-if="chooseFileIndex === index" type="danger">
                  <i class="el-icon-video-camera" />
                  {{ getFileShowName(item) }}
                </el-tag>
                <a
                  class="el-icon-download"
                  style="color: #409EFF;font-weight: 600;margin-left: 10px;"
                  target="_blank"
                  @click="downloadFile(item)"
                />
              </li>
            </ul>
            <div v-if="detailFiles.length === 0" class="record-list-no-val">暂无数据</div>
          </div>
        </div>
      </div>
      <div id="playerBox">
        <div class="playBox" style="height: calc(100% - 90px); width: 100%; background-color: #000000; position: relative;">
          <div v-if="playLoading" style="position: relative; left: calc(50% - 32px); top: 43%; z-index: 100;color: #fff;float: left; text-align: center;">
            <div class="el-icon-loading" />
            <div style="width: 100%; line-height: 2rem">正在加载</div>
          </div>
          <easyPlayer
            ref="recordVideoPlayer"
            :videoUrl="videoUrl"
            :height="'calc(100vh - 250px)'"
            :show-button="false"
            @dblclick="fullScreen"
            @timeupdate="showPlayTimeChange"
            @playing="playingChange"
            @pause="playingChange"
            @loadeddata="onPlayerLoaded"
            @error="onPlayerError"
          />
          <!-- 精确拦截播放器控制栏 -->
          <div class="player-control-blocker" @click.stop @mousedown.stop @mouseup.stop @contextmenu.stop></div>
        </div>
        <div class="player-option-box">
          <VideoTimeline
            ref="Timeline"
            :init-time="initTime"
            :time-segments="timeSegments"
            :init-zoom-index="4"
            @timeChange="playTimeChange"
            @mousedown="timelineMouseDown"
            @mouseup="mouseupTimeline"
          />
          <div v-if="showTime" class="time-line-show">{{ showTimeValue }}</div>
        </div>
        <div style="height: 40px; background-color: #383838; display: grid; grid-template-columns: 1fr 600px 1fr; position: relative; z-index: 100;">
          <div style="text-align: left;">
            <div class="record-play-control" style="background-color: transparent; box-shadow: 0 0 10px transparent">
              <button class="record-play-control-item btn-list iconfont icon-list" title="列表" @click="sidebarControl()"></button>
              <button class="record-play-control-item btn-screenshot iconfont icon-camera1196054easyiconnet" title="截图" @click="snap()"></button>
            </div>
          </div>
          <div style="text-align: center;">
            <div class="record-play-control">
              <a v-if="chooseFileIndex > 0" class="record-play-control-item iconfont icon-diyigeshipin" title="上一个" @click="playLast()" />
              <a v-else style="color: #acacac; cursor: not-allowed" class="record-play-control-item iconfont icon-diyigeshipin" title="上一个" />
              <a class="record-play-control-item iconfont icon-kuaijin" title="快退五秒" @click="seekBackward()" />
              <a class="record-play-control-item iconfont icon-stop1" style="font-size: 14px" title="停止" @click="stopPLay()" />
              <button v-if="playing" class="record-play-control-item btn-pause iconfont icon-zanting" title="暂停" @click="pausePlay()"></button>
              <button v-if="!playing" class="record-play-control-item btn-play iconfont icon-kaishi" title="播放" @click="play()"></button>
              <a class="record-play-control-item iconfont icon-houtui" title="快进五秒" @click="seekForward()" />
              <a v-if="chooseFileIndex < detailFiles.length - 1" class="record-play-control-item iconfont icon-zuihouyigeshipin" title="下一个" @click="playNext()" />
              <a v-else style="color: #acacac; cursor: not-allowed" class="record-play-control-item iconfont icon-zuihouyigeshipin" title="下一个" @click="playNext()" />
              <el-dropdown @command="changePlaySpeed">
                <a class="record-play-control-item record-play-control-speed" title="倍速播放">{{ playSpeed }}X</a>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item
                    v-for="item in playSpeedRange"
                    :key="item"
                    :command="item"
                  >{{ item }}X</el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </div>
          </div>
          <div style="text-align: right;">
            <div class="record-play-control" style="background-color: transparent; box-shadow: 0 0 10px transparent">
              <a v-if="!isFullScreen" class="record-play-control-item iconfont icon-fangdazhanshi" title="全屏" @click="fullScreen()" />
              <a v-else class="record-play-control-item iconfont icon-suoxiao1" title="全屏" @click="fullScreen()" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import easyPlayer from '../common/easyPlayer.vue'
import VideoTimeline from '../common/VideoTimeLine/index.vue'
import moment from 'moment'
import screenfull from 'screenfull'

export default {
  name: 'CloudRecordDetail',
  components: {
    easyPlayer, VideoTimeline
  },
  data() {
    return {
      showSidebar: false,
      app: this.$route.params.app,
      stream: this.$route.params.stream,
      mediaServerId: null,
      dateFilesObj: [],
      mediaServerList: [],
      detailFiles: [],
      videoUrl: null,
      streamInfo: null,
      loading: false,
      chooseDate: null,
      playTime: null,
      playerTime: null,
      playSpeed: 1,
      chooseFileIndex: null,
      queryDate: new Date(),
      currentPage: 1,
      count: 1000000, // TODO 分页导致滑轨视频有效值无法获取完全
      total: 0,
      playLoading: false,
      showTime: true,
      isFullScreen: false,
      playSeekValue: 0,
      playing: false,
      taskTimeRange: [],
      timeFormat: '00:00:00',
      initTime: null,
      timelineControl: false,
      showOtherSpeed: true,
      timeSegments: [],
      pickerOptions: {
        cellClassName: (date) => {
          // 通过显示一个点标识这一天有录像
          const time = moment(date).format('YYYY-MM-DD')
          if (this.dateFilesObj[time]) {
            return 'data-picker-true'
          } else {
            return 'data-picker-false'
          }
        }
      },
      playSpeedRange: [1, 2, 4, 6, 8, 16, 20],
      timeUpdateInterval: null, // 时间更新监控定时器
      pausedPosition: null, // 暂停时的播放位置（毫秒）
      pausedPlayTime: null, // 暂停时的播放时间
      controlBarMonitorInterval: null // 控制栏监控定时器
    }
  },
  computed: {
    boxStyle() {
      if (this.showSidebar) {
        return {
          display: 'grid',
          gridTemplateColumns: '210px minmax(0, 1fr)'
        }
      } else {
        return {
          display: 'grid', gridTemplateColumns: '0 minmax(0, 1fr)'
        }
      }
    },
    showTimeValue() {
      return moment(this.playTime).format('YYYY-MM-DD HH:mm:ss')
    }
  },
  mounted() {
    // 查询当年有视频的日期
    this.getDateInYear(() => {
      if (Object.values(this.dateFilesObj).length > 0) {
        this.chooseDate = Object.values(this.dateFilesObj)[Object.values(this.dateFilesObj).length - 1]
        this.dateChange()
      }
    })
    // easyPlayer不需要手动监听事件，通过props传递

    // 基本的播放器初始化
    this.$nextTick(() => {
      console.log('播放器初始化完成')
    })

    // 动态加载html2canvas库用于截图
    this.loadHtml2Canvas()

    // 暴露基本调试方法到全局
    window.startTimeUpdateMonitor = () => this.startTimeUpdateMonitor()
    window.stopTimeUpdateMonitor = () => this.stopTimeUpdateMonitor()
    window.getCurrentPlayerTime = () => this.getCurrentPlayerTime(this.$refs.recordVideoPlayer)
    window.getPlayerPlayingState = () => this.getPlayerPlayingState(this.$refs.recordVideoPlayer)

    // 暴露播放控制调试方法
    window.debugPausePlay = () => {
      console.log('调试暂停播放状态:', {
        playing: this.playing,
        pausedPosition: this.pausedPosition,
        pausedPlayTime: this.pausedPlayTime,
        playTime: this.playTime,
        videoUrl: this.videoUrl
      })
    }
    window.testPause = () => this.pausePlay()
    window.testPlay = () => this.play()
    window.testStop = () => this.stopPLay()
    window.testResume = () => this.resumeFromPausedPosition()

    // 悬停效果禁用相关的调试方法
    window.disablePlayerHover = () => this.disablePlayerHoverEffects()
    window.enablePlayerHover = () => this.enablePlayerHoverEffects()
    window.disableHoverControlBar = () => this.disableHoverControlBar()
    window.enableHoverControlBar = () => this.enableHoverControlBar()
    window.startControlBarMonitor = () => this.startControlBarMonitor()
    window.stopControlBarMonitor = () => this.stopControlBarMonitor()
    window.testHoverDisable = () => {
      console.log('测试悬停效果禁用状态')
      const player = this.$refs.recordVideoPlayer?.$el
      if (player) {
        console.log('播放器元素:', player)
        console.log('播放器样式:', window.getComputedStyle(player))
        console.log('是否禁用悬停控制栏:', player.classList.contains('hover-controls-disabled'))
      }
    }
  },
  destroyed() {
    this.$destroy('recordVideoPlayer')

    // 清理所有监控
    this.stopTimeUpdateMonitor()
    this.stopControlBarMonitor()
  },
  methods: {
    sidebarControl() {
      console.log('侧边栏控制按钮被点击')
      this.showSidebar = !this.showSidebar
    },
    snap() {
      console.log('截图按钮被点击')
      const player = this.$refs.recordVideoPlayer

      if (!player) {
        console.warn('播放器引用不存在')
        this.$message.warning('播放器未加载，无法截图')
        return
      }

      // 检查播放状态
      if (!this.playing && !this.videoUrl) {
        this.$message.warning('请先播放视频再进行截图')
        return
      }

      // 显示截图进度
      this.$message.info('正在截图，请稍候...')

      // 尝试多种截图方法
      try {
        // 方法1: 直接调用播放器的截图方法
        if (typeof player.screenshot === 'function') {
          console.log('使用播放器screenshot方法截图')
          const result = player.screenshot()
          if (result !== false && result !== null && result !== undefined) {
            this.$message.success('截图成功')
            return
          }
        }

        // 方法2: 调用snap方法
        if (typeof player.snap === 'function') {
          console.log('使用播放器snap方法截图')
          const result = player.snap()
          if (result !== false && result !== null && result !== undefined) {
            this.$message.success('截图成功')
            return
          }
        }

        // 方法3: 调用capture方法
        if (typeof player.capture === 'function') {
          console.log('使用播放器capture方法截图')
          const result = player.capture()
          if (result !== false && result !== null && result !== undefined) {
            this.$message.success('截图成功')
            return
          }
        }

        // 方法4: 通过自定义方法截图
        console.log('播放器原生截图方法不可用，使用自定义截图方法')
        this.captureVideoFrame()

      } catch (error) {
        console.error('截图失败:', error)
        this.$message.error('截图失败: ' + error.message)
        // 尝试备用截图方法
        this.captureVideoFrame()
      }
    },
    captureVideoFrame() {
      // 通过多种方式截取视频帧
      try {
        console.log('开始自定义截图流程')
        const player = this.$refs.recordVideoPlayer
        const playerEl = player?.$el

        if (!playerEl) {
          console.error('播放器元素不存在')
          this.captureWithSimpleMethod()
          return
        }

        console.log('播放器元素找到，尝试截图方案')

        // 方法1: 尝试使用html2canvas库截图（最兼容）
        if (window.html2canvas) {
          console.log('使用html2canvas截图')
          this.captureWithHtml2Canvas(playerEl)
          return
        }

        // 方法2: 尝试直接截取播放器容器
        console.log('html2canvas不可用，尝试直接截取')
        this.capturePlayerContainer(playerEl)

      } catch (error) {
        console.error('自定义截图流程失败:', error)
        // 方法3: 使用简单方法
        this.captureWithSimpleMethod()
      }
    },
    captureWithHtml2Canvas(playerEl) {
      // 使用html2canvas库截图 - 优化配置避免跨域问题
      try {
        console.log('使用html2canvas截图，元素:', playerEl)

        // 配置html2canvas选项，尽量避免跨域问题
        const html2canvasOptions = {
          allowTaint: true,
          useCORS: false, // 禁用CORS，避免跨域问题
          scale: 1,
          logging: false,
          width: playerEl.offsetWidth || 800,
          height: playerEl.offsetHeight || 450,
          backgroundColor: '#000000',
          foreignObjectRendering: false, // 禁用外部对象渲染
          imageTimeout: 0, // 禁用图片超时
          removeContainer: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          ignoreElements: (element) => {
            // 忽略可能导致跨域问题的元素
            const tagName = element.tagName.toLowerCase()

            // 忽略video和canvas元素，因为它们可能导致跨域问题
            if (tagName === 'video' || tagName === 'canvas') {
              console.log('忽略可能导致跨域的元素:', tagName)
              return true
            }

            // 忽略包含跨域内容的iframe
            if (tagName === 'iframe') {
              return true
            }

            return false
          }
        }

        console.log('html2canvas配置:', html2canvasOptions)

        window.html2canvas(playerEl, html2canvasOptions).then(canvas => {
          console.log('html2canvas渲染完成，canvas尺寸:', canvas.width, 'x', canvas.height)

          // 尝试多种导出方式
          this.exportHtml2CanvasResult(canvas, playerEl)

        }).catch(error => {
          console.error('html2canvas渲染失败:', error)
          // 尝试简化的html2canvas配置
          this.captureWithSimplifiedHtml2Canvas(playerEl)
        })
      } catch (error) {
        console.error('html2canvas初始化失败:', error)
        this.captureWithSimplifiedHtml2Canvas(playerEl)
      }
    },
    captureWithSimplifiedHtml2Canvas(playerEl) {
      // 使用简化的html2canvas配置
      try {
        console.log('尝试简化的html2canvas配置')

        const simplifiedOptions = {
          allowTaint: true,
          useCORS: false,
          scale: 0.5, // 降低分辨率
          logging: false,
          backgroundColor: '#000000',
          foreignObjectRendering: false,
          imageTimeout: 0,
          ignoreElements: (element) => {
            // 忽略所有可能有问题的元素
            const tagName = element.tagName.toLowerCase()
            return ['video', 'canvas', 'iframe', 'object', 'embed'].includes(tagName)
          }
        }

        window.html2canvas(playerEl, simplifiedOptions).then(canvas => {
          console.log('简化html2canvas渲染完成')
          this.exportHtml2CanvasResult(canvas, playerEl)
        }).catch(error => {
          console.error('简化html2canvas也失败:', error)
          this.capturePlayerContainer(playerEl)
        })
      } catch (error) {
        console.error('简化html2canvas失败:', error)
        this.capturePlayerContainer(playerEl)
      }
    },
    exportHtml2CanvasResult(canvas, playerEl) {
      // 导出html2canvas结果，处理可能的跨域问题
      try {
        console.log('尝试导出html2canvas结果')

        // 方法1: 尝试toBlob
        try {
          canvas.toBlob((blob) => {
            if (blob && blob.size > 0) {
              this.downloadScreenshot(blob)
              this.$message.success('html2canvas截图成功')
              console.log('html2canvas toBlob成功，文件大小:', blob.size)
            } else {
              console.warn('html2canvas toBlob返回空blob')
              this.tryHtml2CanvasDataURL(canvas, playerEl)
            }
          }, 'image/png', 1.0)
        } catch (blobError) {
          console.error('html2canvas toBlob失败:', blobError)
          this.tryHtml2CanvasDataURL(canvas, playerEl)
        }

      } catch (error) {
        console.error('导出html2canvas结果失败:', error)
        this.tryHtml2CanvasDataURL(canvas, playerEl)
      }
    },
    tryHtml2CanvasDataURL(canvas, playerEl) {
      // 尝试使用dataURL导出html2canvas结果
      try {
        console.log('尝试html2canvas dataURL导出')

        const dataURL = canvas.toDataURL('image/png', 1.0)

        if (dataURL && dataURL.length > 100 && !dataURL.includes('data:,')) {
          this.downloadDataURL(dataURL)
          this.$message.success('html2canvas截图成功')
          console.log('html2canvas dataURL成功，数据长度:', dataURL.length)
        } else {
          console.error('html2canvas dataURL无效')
          this.createCustomScreenshot(playerEl)
        }

      } catch (dataURLError) {
        console.error('html2canvas dataURL失败:', dataURLError)
        this.createCustomScreenshot(playerEl)
      }
    },
    createCustomScreenshot(playerEl) {
      // 创建自定义截图，避免跨域问题
      try {
        console.log('创建自定义截图')

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        // 设置canvas尺寸
        canvas.width = playerEl.offsetWidth || 800
        canvas.height = playerEl.offsetHeight || 450

        // 绘制黑色背景
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // 绘制播放器信息
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 24px Arial'
        ctx.textAlign = 'center'
        ctx.fillText('录像播放截图', canvas.width / 2, canvas.height / 2 - 60)

        ctx.font = '18px Arial'
        ctx.fillText(`设备ID: ${this.deviceId || '未知'}`, canvas.width / 2, canvas.height / 2 - 20)
        ctx.fillText(`通道ID: ${this.channelId || '未知'}`, canvas.width / 2, canvas.height / 2 + 20)
        ctx.fillText(`时间: ${new Date(this.playTime || Date.now()).toLocaleString()}`, canvas.width / 2, canvas.height / 2 + 60)

        ctx.font = '14px Arial'
        ctx.fillStyle = '#cccccc'
        ctx.fillText('由于浏览器安全限制，无法获取视频画面', canvas.width / 2, canvas.height / 2 + 100)

        // 导出自定义截图
        canvas.toBlob((blob) => {
          if (blob) {
            this.downloadScreenshot(blob)
            this.$message.success('已生成播放信息截图')
            console.log('自定义截图创建成功')
          } else {
            // 最后的备用方案
            this.captureWithDisplayMedia()
          }
        }, 'image/png')

      } catch (error) {
        console.error('创建自定义截图失败:', error)
        this.captureWithDisplayMedia()
      }
    },
    capturePlayerContainer(playerEl) {
      // 截取播放器容器 - 尝试多种方案避免跨域问题
      try {
        console.log('尝试截取播放器容器，避免跨域问题', playerEl)

        // 方案1: DOM克隆方案（避免跨域问题）
        this.captureWithDOMCloning(playerEl)

      } catch (error) {
        console.error('容器截图失败:', error)
        // 方案2: SVG方案
        this.captureWithSVG(playerEl)
      }
    },
    captureVideoElement(videoElement) {
      // 截取video元素
      try {
        console.log('尝试截取video元素:', videoElement)

        // 尝试设置CORS属性（可能会失败，但不影响截图）
        try {
          if (!videoElement.crossOrigin) {
            videoElement.crossOrigin = 'anonymous'
          }
        } catch (corsError) {
          console.warn('无法设置CORS属性:', corsError)
        }

        // 检查视频状态
        console.log('视频状态:', {
          readyState: videoElement.readyState,
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          currentTime: videoElement.currentTime,
          duration: videoElement.duration
        })

        // 等待视频加载
        if (videoElement.readyState >= 2 && videoElement.videoWidth > 0) {
          this.drawVideoToCanvas(videoElement)
        } else {
          console.log('视频未完全加载，等待loadeddata事件')
          const timeout = setTimeout(() => {
            console.log('等待视频加载超时，尝试其他方法')
            this.captureWithScreenAPI()
          }, 3000)

          videoElement.addEventListener('loadeddata', () => {
            clearTimeout(timeout)
            console.log('视频加载完成，开始截图')
            this.drawVideoToCanvas(videoElement)
          }, { once: true })
        }
      } catch (error) {
        console.error('Video元素截图失败:', error)
        this.captureWithSimpleMethod()
      }
    },
    captureCanvasElement(canvasElement) {
      // 截取canvas元素
      try {
        // 直接从canvas获取图片数据
        canvasElement.toBlob((blob) => {
          if (blob) {
            this.downloadScreenshot(blob)
            this.$message.success('截图成功')
            console.log('Canvas元素截图成功')
          } else {
            throw new Error('Canvas截图失败')
          }
        }, 'image/png')
      } catch (error) {
        console.error('Canvas元素截图失败:', error)
        // 尝试复制canvas内容到新canvas
        this.copyCanvasContent(canvasElement)
      }
    },
    drawVideoToCanvas(videoElement) {
      // 将video绘制到canvas
      try {
        console.log('开始绘制视频到Canvas')
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        // 设置canvas尺寸
        const width = videoElement.videoWidth || videoElement.offsetWidth || 800
        const height = videoElement.videoHeight || videoElement.offsetHeight || 450

        canvas.width = width
        canvas.height = height

        console.log('Canvas尺寸:', { width, height })

        // 绘制视频帧到canvas
        ctx.drawImage(videoElement, 0, 0, width, height)

        console.log('视频已绘制到Canvas，尝试导出')

        // 首先尝试检查canvas是否被污染
        try {
          // 尝试读取一个像素来检查是否被污染
          ctx.getImageData(0, 0, 1, 1)
          console.log('Canvas未被污染，可以正常导出')

          // 尝试toBlob导出
          canvas.toBlob((blob) => {
            if (blob && blob.size > 0) {
              this.downloadScreenshot(blob)
              this.$message.success('截图成功')
              console.log('Canvas toBlob截图成功，文件大小:', blob.size)
            } else {
              console.warn('toBlob返回空blob，尝试dataURL方法')
              this.tryDataURLExport(canvas)
            }
          }, 'image/png', 1.0)

        } catch (taintError) {
          console.error('Canvas被污染，无法直接导出:', taintError)

          // Canvas被污染时的处理方案
          if (taintError.name === 'SecurityError' || taintError.message.includes('tainted')) {
            console.log('尝试使用代理或其他方法处理跨域问题')
            this.handleTaintedCanvas(videoElement)
          } else {
            this.tryDataURLExport(canvas)
          }
        }

      } catch (error) {
        console.error('绘制视频到Canvas失败:', error)
        this.captureWithSimpleMethod()
      }
    },
    tryDataURLExport(canvas) {
      // 尝试使用dataURL导出
      try {
        console.log('尝试使用dataURL导出')
        const dataURL = canvas.toDataURL('image/png', 1.0)

        if (dataURL && dataURL.length > 100) { // 检查dataURL是否有效
          this.downloadDataURL(dataURL)
          this.$message.success('截图成功')
          console.log('DataURL截图成功，数据长度:', dataURL.length)
        } else {
          throw new Error('DataURL无效或为空')
        }
      } catch (dataURLError) {
        console.error('DataURL导出失败:', dataURLError)
        this.captureWithSimpleMethod()
      }
    },
    handleTaintedCanvas(videoElement) {
      // 处理被污染的Canvas - 使用更安全的方法
      try {
        console.log('Canvas被污染，尝试替代方案')

        // 由于Canvas被污染，无法直接导出，尝试其他方法

        // 方法1: 尝试使用html2canvas（如果可用）
        if (window.html2canvas) {
          console.log('尝试使用html2canvas处理污染Canvas')
          const playerEl = videoElement.closest('.playBox') || videoElement.parentElement

          if (playerEl) {
            this.captureWithHtml2Canvas(playerEl)
            return
          }
        }

        // 方法2: 尝试屏幕捕获API
        console.log('尝试屏幕捕获API')
        this.captureWithDisplayMedia()

      } catch (error) {
        console.error('处理污染Canvas失败:', error)
        // 最后的备用方案
        this.captureWithSimpleMethod()
      }
    },
    copyCanvasContent(sourceCanvas) {
      // 复制canvas内容到新canvas
      try {
        const newCanvas = document.createElement('canvas')
        const ctx = newCanvas.getContext('2d')

        newCanvas.width = sourceCanvas.width
        newCanvas.height = sourceCanvas.height

        // 复制内容
        ctx.drawImage(sourceCanvas, 0, 0)

        // 尝试导出
        newCanvas.toBlob((blob) => {
          if (blob) {
            this.downloadScreenshot(blob)
            this.$message.success('截图成功')
            console.log('Canvas复制截图成功')
          } else {
            throw new Error('Canvas复制失败')
          }
        }, 'image/png')
      } catch (error) {
        console.error('Canvas复制失败:', error)
        this.captureWithScreenAPI()
      }
    },
    captureWithScreenAPI() {
      // 使用屏幕截图API
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          console.log('尝试使用屏幕截图API')
          navigator.mediaDevices.getDisplayMedia({ video: true })
            .then(stream => {
              const video = document.createElement('video')
              video.srcObject = stream
              video.play()

              video.addEventListener('loadedmetadata', () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                canvas.width = video.videoWidth
                canvas.height = video.videoHeight

                ctx.drawImage(video, 0, 0)

                // 停止屏幕共享
                stream.getTracks().forEach(track => track.stop())

                canvas.toBlob((blob) => {
                  if (blob) {
                    this.downloadScreenshot(blob)
                    this.$message.success('屏幕截图成功')
                    console.log('屏幕截图API成功')
                  }
                }, 'image/png')
              })
            })
            .catch(error => {
              console.error('屏幕截图API失败:', error)
              this.captureWithServerAPI()
            })
        } else {
          this.captureWithServerAPI()
        }
      } catch (error) {
        console.error('屏幕截图API不可用:', error)
        this.captureWithServerAPI()
      }
    },
    disablePlayerHoverEffects() {
      // 禁用播放器悬停效果
      try {
        console.log('禁用播放器悬停效果')
        const player = this.$refs.recordVideoPlayer
        const playerEl = player?.$el

        if (!playerEl) {
          console.warn('播放器元素不存在')
          return
        }

        // 添加禁用悬停效果的类
        playerEl.classList.add('hover-disabled')

        // 禁用播放器及其子元素的悬停事件
        const disableHover = (element) => {
          if (element) {
            element.style.pointerEvents = 'auto'
            element.style.cursor = 'default'

            // 移除可能的悬停事件监听器
            const events = ['mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'hover']
            events.forEach(eventType => {
              element.removeEventListener(eventType, this.handlePlayerHover, true)
            })

            // 递归处理子元素
            Array.from(element.children).forEach(child => {
              disableHover(child)
            })
          }
        }

        disableHover(playerEl)

        console.log('播放器悬停效果已禁用')

      } catch (error) {
        console.error('禁用播放器悬停效果失败:', error)
      }
    },
    enablePlayerHoverEffects() {
      // 启用播放器悬停效果
      try {
        console.log('启用播放器悬停效果')
        const player = this.$refs.recordVideoPlayer
        const playerEl = player?.$el

        if (!playerEl) {
          console.warn('播放器元素不存在')
          return
        }

        // 移除禁用悬停效果的类
        playerEl.classList.remove('hover-disabled')

        // 恢复播放器及其子元素的悬停事件
        const enableHover = (element) => {
          if (element) {
            element.style.pointerEvents = ''
            element.style.cursor = ''

            // 递归处理子元素
            Array.from(element.children).forEach(child => {
              enableHover(child)
            })
          }
        }

        enableHover(playerEl)

        console.log('播放器悬停效果已启用')

      } catch (error) {
        console.error('启用播放器悬停效果失败:', error)
      }
    },
    handlePlayerHover(event) {
      // 处理播放器悬停事件（用于移除）
      event.preventDefault()
      event.stopPropagation()
      return false
    },
    disableHoverControlBar() {
      // 禁用悬停时控制栏的出现
      try {
        console.log('禁用悬停控制栏出现')
        const player = this.$refs.recordVideoPlayer
        const playerEl = player?.$el

        if (!playerEl) {
          console.warn('播放器元素不存在')
          return
        }

        // 添加禁用悬停控制栏的类
        playerEl.classList.add('hover-controls-disabled')

        // 查找并隐藏所有可能的控制栏元素
        const controlSelectors = [
          '.controls',
          '.control-bar',
          '.player-controls',
          '.video-controls',
          '.bottom-controls',
          '.control-panel',
          '.media-controls',
          '.player-control-bar',
          '.vjs-control-bar',
          '.plyr__controls',
          '.fp-controls',
          '.jw-controls',
          '.dplayer-controller',
          '.artplayer-controls',
          '.xgplayer-controls',
          '.ckplayer-controls'
        ]

        controlSelectors.forEach(selector => {
          const elements = playerEl.querySelectorAll(selector)
          elements.forEach(element => {
            element.style.display = 'none'
            element.style.visibility = 'hidden'
            element.style.opacity = '0'
            element.style.pointerEvents = 'none'
            element.style.position = 'absolute'
            element.style.left = '-9999px'
            element.style.top = '-9999px'
            element.style.zIndex = '-1'
          })
        })

        // 禁用悬停事件监听器
        const hoverEvents = ['mouseenter', 'mouseleave', 'mouseover', 'mouseout']
        hoverEvents.forEach(eventType => {
          playerEl.addEventListener(eventType, this.preventControlBarShow, true)
        })

        // 监控DOM变化，防止控制栏动态出现
        this.startControlBarMonitor()

        console.log('悬停控制栏出现已禁用')

      } catch (error) {
        console.error('禁用悬停控制栏失败:', error)
      }
    },
    enableHoverControlBar() {
      // 启用悬停时控制栏的出现
      try {
        console.log('启用悬停控制栏出现')
        const player = this.$refs.recordVideoPlayer
        const playerEl = player?.$el

        if (!playerEl) {
          console.warn('播放器元素不存在')
          return
        }

        // 移除禁用悬停控制栏的类
        playerEl.classList.remove('hover-controls-disabled')

        // 恢复控制栏元素的样式
        const controlSelectors = [
          '.controls',
          '.control-bar',
          '.player-controls',
          '.video-controls',
          '.bottom-controls',
          '.control-panel',
          '.media-controls',
          '.player-control-bar',
          '.vjs-control-bar',
          '.plyr__controls',
          '.fp-controls',
          '.jw-controls',
          '.dplayer-controller',
          '.artplayer-controls',
          '.xgplayer-controls',
          '.ckplayer-controls'
        ]

        controlSelectors.forEach(selector => {
          const elements = playerEl.querySelectorAll(selector)
          elements.forEach(element => {
            element.style.display = ''
            element.style.visibility = ''
            element.style.opacity = ''
            element.style.pointerEvents = ''
            element.style.position = ''
            element.style.left = ''
            element.style.top = ''
            element.style.zIndex = ''
          })
        })

        // 移除悬停事件监听器
        const hoverEvents = ['mouseenter', 'mouseleave', 'mouseover', 'mouseout']
        hoverEvents.forEach(eventType => {
          playerEl.removeEventListener(eventType, this.preventControlBarShow, true)
        })

        // 停止控制栏监控
        this.stopControlBarMonitor()

        console.log('悬停控制栏出现已启用')

      } catch (error) {
        console.error('启用悬停控制栏失败:', error)
      }
    },
    preventControlBarShow(event) {
      // 阻止控制栏显示
      event.preventDefault()
      event.stopPropagation()

      // 隐藏可能出现的控制栏
      const target = event.target
      if (target) {
        const controlElements = target.querySelectorAll('.controls, .control-bar, .player-controls')
        controlElements.forEach(element => {
          element.style.display = 'none'
          element.style.visibility = 'hidden'
          element.style.opacity = '0'
        })
      }

      return false
    },
    startControlBarMonitor() {
      // 启动控制栏监控，防止控制栏动态出现
      if (this.controlBarMonitorInterval) {
        clearInterval(this.controlBarMonitorInterval)
      }

      this.controlBarMonitorInterval = setInterval(() => {
        const player = this.$refs.recordVideoPlayer
        const playerEl = player?.$el

        if (playerEl && playerEl.classList.contains('hover-controls-disabled')) {
          // 查找并隐藏任何可能出现的控制栏
          const controlSelectors = [
            '.controls',
            '.control-bar',
            '.player-controls',
            '.video-controls',
            '.bottom-controls'
          ]

          controlSelectors.forEach(selector => {
            const elements = playerEl.querySelectorAll(selector)
            elements.forEach(element => {
              if (element.style.display !== 'none') {
                element.style.display = 'none'
                element.style.visibility = 'hidden'
                element.style.opacity = '0'
                element.style.pointerEvents = 'none'
              }
            })
          })
        }
      }, 100) // 每100ms检查一次
    },
    stopControlBarMonitor() {
      // 停止控制栏监控
      if (this.controlBarMonitorInterval) {
        clearInterval(this.controlBarMonitorInterval)
        this.controlBarMonitorInterval = null
      }
    },
    captureWithServerAPI() {
      // 使用服务端截图API
      try {
        console.log('尝试使用服务端截图API')

        // 检查必要参数
        if (!this.deviceId || !this.channelId) {
          console.error('缺少必要参数:', { deviceId: this.deviceId, channelId: this.channelId })
          this.captureWithSimpleMethod()
          return
        }

        // 构建截图请求参数
        const screenshotParams = {
          deviceId: this.deviceId,
          channelId: this.channelId,
          time: this.playTime || Date.now(),
          format: 'png'
        }

        console.log('截图请求参数:', screenshotParams)

        // 使用正确的axios引用
        const axiosInstance = this.$http || this.axios || window.axios

        if (!axiosInstance) {
          console.error('axios实例不可用，尝试使用fetch')
          this.captureWithFetch(screenshotParams)
          return
        }

        // 调用服务端截图接口
        axiosInstance.post('/api/device/screenshot', screenshotParams, {
          responseType: 'blob',
          timeout: 10000
        }).then(response => {
          if (response.data && response.data.size > 0) {
            this.downloadScreenshot(response.data)
            this.$message.success('服务端截图成功')
            console.log('服务端截图API成功，文件大小:', response.data.size)
          } else {
            throw new Error('服务端截图返回空数据')
          }
        }).catch(error => {
          console.error('服务端截图API失败:', error)
          this.captureWithFetch(screenshotParams)
        })
      } catch (error) {
        console.error('服务端截图失败:', error)
        this.captureWithSimpleMethod()
      }
    },
    captureWithFetch(screenshotParams) {
      // 使用fetch API进行截图请求
      try {
        console.log('使用fetch API请求截图')

        fetch('/api/device/screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(screenshotParams)
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }
          return response.blob()
        })
        .then(blob => {
          if (blob && blob.size > 0) {
            this.downloadScreenshot(blob)
            this.$message.success('截图成功')
            console.log('Fetch截图成功，文件大小:', blob.size)
          } else {
            throw new Error('Fetch返回空数据')
          }
        })
        .catch(error => {
          console.error('Fetch截图失败:', error)
          this.captureWithSimpleMethod()
        })
      } catch (error) {
        console.error('Fetch截图异常:', error)
        this.captureWithSimpleMethod()
      }
    },
    downloadScreenshot(blob) {
      // 下载截图文件
      try {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `screenshot_${this.deviceId}_${new Date().getTime()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.error('下载截图失败:', error)
        this.$message.error('下载截图失败')
      }
    },
    downloadDataURL(dataURL) {
      // 下载DataURL格式的图片
      try {
        const link = document.createElement('a')
        link.href = dataURL
        link.download = `screenshot_${this.deviceId}_${new Date().getTime()}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } catch (error) {
        console.error('下载DataURL失败:', error)
        this.$message.error('下载截图失败')
      }
    },
    playLast() {
      console.log('上一个按钮被点击')
      // 播放上一个
      if (this.chooseFileIndex === 0) {
        return
      }
      this.chooseFile(this.chooseFileIndex - 1)
    },
    playNext() {
      console.log('下一个按钮被点击')
      // 播放下一个视频
      if (this.chooseFileIndex < this.detailFiles.length - 1) {
        this.chooseFile(this.chooseFileIndex + 1)
      } else {
        this.$message.info('已播放到最后一个录像')
      }
    },
    changePlaySpeed(speed) {
      console.log(speed)
      // 倍速播放
      this.playSpeed = speed
      this.$store.dispatch('cloudRecord/speed', {
        mediaServerId: this.streamInfo.mediaServerId,
        app: this.streamInfo.app,
        stream: this.streamInfo.stream,
        speed: this.playSpeed,
        schema: 'ts'
      })
      if (this.$refs.recordVideoPlayer && typeof this.$refs.recordVideoPlayer.setPlaybackRate === 'function') {
        this.$refs.recordVideoPlayer.setPlaybackRate(this.playSpeed)
      } else {
        console.warn('播放器不支持倍速播放功能')
      }
    },
    seekBackward() {
      console.log('快退按钮被点击')
      // 快退五秒
      this.playSeekValue -= 5 * 1000
      this.playRecord()
    },
    seekForward() {
      console.log('快进按钮被点击')
      // 快进五秒
      this.playSeekValue += 5 * 1000
      this.playRecord()
    },
    stopPLay() {
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

      this.videoUrl = null // 停止播放时清空视频 URL
      this.playing = false

      console.log('停止播放完成，已清除暂停状态')
    },
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

        // 尝试多种暂停方法
        if (typeof player.pause === 'function') {
          console.log('使用pause方法暂停')
          player.pause()
          this.playing = false
        } else if (typeof player.stop === 'function') {
          console.log('使用stop方法暂停')
          player.stop()
          this.playing = false
        } else {
          // 直接操作video元素
          const videoElement = player.$el?.querySelector('video')
          if (videoElement && typeof videoElement.pause === 'function') {
            console.log('直接暂停video元素')
            videoElement.pause()
            this.playing = false
          } else {
            console.warn('无法找到暂停方法')
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
            console.log('使用play方法播放')
            player.play()
            this.playing = true
          } else if (typeof player.unPause === 'function') {
            console.log('使用unPause方法播放')
            player.unPause()
            this.playing = true
          } else if (typeof player.resume === 'function') {
            console.log('使用resume方法播放')
            player.resume()
            this.playing = true
          } else {
            // 直接操作video元素
            const videoElement = player.$el?.querySelector('video')
            if (videoElement && typeof videoElement.play === 'function') {
              console.log('直接播放video元素')
              videoElement.play()
              this.playing = true
            } else {
              console.log('无法恢复播放，重新加载录像')
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
        console.log('播放失败，尝试重新加载录像')
        this.playRecord()
      }
    },
    resumeFromPausedPosition() {
      // 从暂停位置恢复播放
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

          // 方法1: 使用播放器的seek方法
          if (typeof player.seek === 'function') {
            console.log('使用播放器seek方法')
            player.seek(this.pausedPosition)
          } else if (typeof player.setCurrentTime === 'function') {
            console.log('使用播放器setCurrentTime方法')
            player.setCurrentTime(this.pausedPosition)
          } else {
            // 方法2: 直接设置video元素的currentTime
            const videoElement = player.$el?.querySelector('video')
            if (videoElement) {
              console.log('直接设置video元素currentTime')
              videoElement.currentTime = this.pausedPosition / 1000 // 转换为秒
            }
          }
        }

        // 开始播放
        if (typeof player.play === 'function') {
          console.log('使用play方法恢复播放')
          player.play()
        } else if (typeof player.resume === 'function') {
          console.log('使用resume方法恢复播放')
          player.resume()
        } else {
          // 直接操作video元素
          const videoElement = player.$el?.querySelector('video')
          if (videoElement && typeof videoElement.play === 'function') {
            console.log('直接播放video元素')
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
    fullScreen() {
      console.log('全屏按钮被点击')
      // 全屏
      if (this.isFullScreen) {
        screenfull.exit()
        this.isFullScreen = false
        return
      }

      // 安全地获取播放器尺寸
      let playerWidth = 800
      let playerHeight = 450
      if (this.$refs.recordVideoPlayer) {
        playerWidth = this.$refs.recordVideoPlayer.playerWidth || 800
        playerHeight = this.$refs.recordVideoPlayer.playerHeight || 450
      }

      screenfull.request(document.getElementById('playerBox'))
      screenfull.on('change', () => {
        if (this.$refs.recordVideoPlayer && typeof this.$refs.recordVideoPlayer.resize === 'function') {
          this.$refs.recordVideoPlayer.resize(playerWidth, playerHeight)
        }
        this.isFullScreen = screenfull.isFullscreen
      })
      this.isFullScreen = true
    },
    dateChange() {
      this.detailFiles = []
      this.currentPage = 1
      const chooseFullDate = new Date(this.chooseDate + ' ' + this.timeFormat)
      if (chooseFullDate.getFullYear() !== this.queryDate.getFullYear() ||
        chooseFullDate.getMonth() !== this.queryDate.getMonth()) {
        this.queryDate = chooseFullDate
        this.getDateInYear()
      }
      this.queryRecordDetails()
    },
    infiniteScroll() {
      if (this.total > this.detailFiles.length) {
        this.currentPage++
        this.queryRecordDetails()
      }
    },
    queryRecordDetails: function(callback) {
      this.timeSegments = []
      this.$store.dispatch('cloudRecord/queryList', {
        app: this.app,
        stream: this.stream,
        startTime: this.chooseDate + ' 00:00:00',
        endTime: this.chooseDate + ' 23:59:59',
        page: this.currentPage,
        count: this.count,
        mediaServerId: this.mediaServerId,
        ascOrder: true
      })
        .then(data => {
          this.total = data.total
          this.detailFiles = this.detailFiles.concat(data.list)
          const temp = new Set()
          this.initTime = Number.parseInt(this.detailFiles[0].startTime)
          for (let i = 0; i < this.detailFiles.length; i++) {
            temp.add(this.detailFiles[i].mediaServerId)
            this.timeSegments.push({
              beginTime: Number.parseInt(this.detailFiles[i].startTime),
              endTime: Number.parseInt(this.detailFiles[i].endTime),
              color: '#01901d',
              startRatio: 0.7,
              endRatio: 0.85,
              index: i
            })
          }
          this.mediaServerList = Array.from(temp)
          if (this.mediaServerList.length === 1) {
            this.mediaServerId = this.mediaServerList[0]
          }
        })
        .catch((error) => {
          console.log(error)
        })
        .finally(() => {
          this.loading = false
          if (callback) callback()
        })
    },
    chooseFile(index) {
      console.log('文件被选择，索引:', index, '文件信息:', this.detailFiles[index])
      this.chooseFileIndex = index
      let timeLength = 0
      for (let i = 0; i < this.detailFiles.length; i++) {
        if (i < index) {
          timeLength += this.detailFiles[i].timeLen
        }
      }
      this.playSeekValue = timeLength
      this.initTime = Number.parseInt(this.detailFiles[index].startTime) // 更新initTime为当前选择文件的开始时间

      // 更新时间轴显示
      this.playTime = this.initTime
      if (this.$refs.Timeline) {
        this.$refs.Timeline.setTime(this.playTime)
      }

      this.playRecord()
    },
    playRecord() {
      console.log('开始播放录像')

      // 清除之前的暂停状态
      this.pausedPosition = null
      this.pausedPlayTime = null

      // 移除对 destroy 方法的调用
      if (this.$refs.recordVideoPlayer && !this.$refs.recordVideoPlayer.playing) {
        this.playLoading = true;
      }

      if (this.chooseFileIndex !== null && this.detailFiles.length > 0 && this.chooseFileIndex < this.detailFiles.length) {
        const currentFile = this.detailFiles[this.chooseFileIndex]
        this.$store.dispatch('cloudRecord/getPlayPath', currentFile.id)
          .then(data => {
            if (!data) {
              this.$message.error('无法加载录像文件')
              return
            }

            this.streamInfo = {
              mediaServerId: currentFile.mediaServerId,
              app: data.app || this.app,
              stream: data.stream || this.stream,
              id: currentFile.id,
              startTime: currentFile.startTime,
              endTime: currentFile.endTime
            }

            if (location.protocol === 'https:') {
              let url = data.httpsPath
              url += (url.indexOf('?') > -1 ? '&' : '?') + 'time=' + new Date().getTime()
              this.videoUrl = url
            } else {
              let url = data.httpPath
              url += (url.indexOf('?') > -1 ? '&' : '?') + 'time=' + new Date().getTime()
              this.videoUrl = url
            }

            this.playTime = Number.parseInt(currentFile.startTime);
            this.initTime = this.playTime;

            setTimeout(() => {
              if (this.$refs.Timeline) {
                this.$refs.Timeline.setTime(this.playTime);
              }
              // 确保视频开始播放
              if (this.$refs.recordVideoPlayer) {
                this.$refs.recordVideoPlayer.play(this.videoUrl);
                this.playing = true;

                // 启动时间更新监控
                this.startTimeUpdateMonitor();

                // 播放器加载完成后的基本设置
                setTimeout(() => {
                  console.log('播放器加载完成，进行基本设置');
                  // 禁用播放器悬停效果
                  this.disablePlayerHoverEffects();
                  // 禁用悬停时控制栏的出现
                  this.disableHoverControlBar();
                }, 500);

                // 额外的延迟处理，确保所有悬停功能完全禁用
                setTimeout(() => {
                  this.disablePlayerHoverEffects();
                  this.disableHoverControlBar();
                }, 1000);

                // 最后一次确保，防止播放器重新启用控制栏
                setTimeout(() => {
                  this.disableHoverControlBar();
                }, 2000);
              }
            }, 100);
          })
          .catch((error) => {
            console.log('加载录像错误:', error)
            this.$message.error('加载录像文件失败: ' + (error.message || '未知错误'))
          })
          .finally(() => {
            this.playLoading = false
          })
      }
    },
    handleVideoEnd() {
      // 视频播放结束时触发
      if (this.chooseFileIndex < this.detailFiles.length - 1) {
        this.playNext() // 自动播放下一个视频
      } else {
        this.$message.info('已播放到最后一个录像')
      }
    },
    seekRecord() {
      // 确保streamInfo包含所有必要的信息
      if (!this.streamInfo || !this.streamInfo.mediaServerId || !this.streamInfo.app || !this.streamInfo.stream) {
        console.log('流信息不完整，无法定位')
        return
      }
      
      this.$store.dispatch('cloudRecord/seek', {
        mediaServerId: this.streamInfo.mediaServerId,
        app: this.streamInfo.app,
        stream: this.streamInfo.stream,
        seek: this.playSeekValue,
        schema: 'fmp4'
      })
        .then(() => {
          // 定位成功后的操作
        })
        .catch((error) => {
          console.log('定位错误:', error)
          // 即使定位失败，也不影响视频播放
        })
    },
    downloadFile(file) {
      this.$store.dispatch('cloudRecord/getPlayPath', file.id)
        .then(data => {
          const link = document.createElement('a')
          link.target = '_blank'
          if (location.protocol === 'https:') {
            link.href = data.httpsPath + '&save_name=' + file.fileName
          } else {
            link.href = data.httpPath + '&save_name=' + file.fileName
          }
          link.click()
        })
        .catch((error) => {
          console.log(error)
        })
    },
    backToList() {
      this.$router.back()
    },
    getFileShowName(item) {
      return moment(item.startTime).format('HH:mm:ss') + '-' + moment(item.endTime).format('HH:mm:ss')
    },

    showPlayTimeChange(val) {
      // 更新播放时间
      console.log('播放时间更新:', val)

      let newPlayTime
      if (typeof val === 'number') {
        // 如果val是秒数，转换为毫秒
        newPlayTime = val < 1000000000 ? val * 1000 : val
      } else if (val && val.currentTime !== undefined) {
        // 如果val是事件对象，提取currentTime
        newPlayTime = val.currentTime < 1000000000 ? val.currentTime * 1000 : val.currentTime
      } else {
        // 尝试从播放器直接获取当前时间
        const player = this.$refs.recordVideoPlayer
        if (player) {
          const currentTime = this.getCurrentPlayerTime(player)
          if (currentTime !== null) {
            newPlayTime = currentTime
          }
        }
      }

      if (newPlayTime !== undefined && newPlayTime !== null) {
        // 计算相对于当前文件开始时间的播放时间
        if (this.chooseFileIndex !== null && this.detailFiles[this.chooseFileIndex]) {
          const currentFile = this.detailFiles[this.chooseFileIndex]
          const fileStartTime = Number.parseInt(currentFile.startTime)
          this.playTime = fileStartTime + newPlayTime
        } else {
          this.playTime = newPlayTime
        }

        // 更新时间轴随播放时间推进
        this.timeSegments = this.timeSegments.map(segment => {
          if (this.playTime >= segment.beginTime && this.playTime <= segment.endTime) {
            return { ...segment, color: '#ff0000' }; // 当前播放段高亮
          }
          return { ...segment, color: '#01901d' };
        });

        // 时间轴实时更新
        if (this.$refs.Timeline) {
          this.$refs.Timeline.setTime(this.playTime);
        }

        console.log('播放时间已更新:', {
          originalVal: val,
          newPlayTime: newPlayTime,
          finalPlayTime: this.playTime,
          currentFileIndex: this.chooseFileIndex
        })
      }
    },
    getCurrentPlayerTime(player) {
      // 尝试多种方式获取播放器当前时间
      try {
        // 方法1: 直接获取currentTime属性
        if (player.currentTime !== undefined && player.currentTime !== null) {
          const time = player.currentTime < 1000000000 ? player.currentTime * 1000 : player.currentTime
          console.log('从播放器currentTime获取时间:', time)
          return time
        }

        // 方法2: 调用getCurrentTime方法
        if (typeof player.getCurrentTime === 'function') {
          const time = player.getCurrentTime()
          if (time !== null && time !== undefined) {
            const convertedTime = time < 1000000000 ? time * 1000 : time
            console.log('从播放器getCurrentTime方法获取时间:', convertedTime)
            return convertedTime
          }
        }

        // 方法3: 从video元素获取
        const videoElement = player.$el?.querySelector('video')
        if (videoElement && videoElement.currentTime !== undefined && videoElement.currentTime !== null) {
          const time = videoElement.currentTime < 1000000000 ? videoElement.currentTime * 1000 : videoElement.currentTime
          console.log('从video元素获取时间:', time)
          return time
        }

        // 方法4: 从canvas元素获取（某些播放器使用canvas）
        const canvasElement = player.$el?.querySelector('canvas')
        if (canvasElement && canvasElement.currentTime !== undefined && canvasElement.currentTime !== null) {
          const time = canvasElement.currentTime < 1000000000 ? canvasElement.currentTime * 1000 : canvasElement.currentTime
          console.log('从canvas元素获取时间:', time)
          return time
        }

        // 方法5: 使用当前的playTime作为备用
        if (this.playTime !== null && this.playTime !== undefined) {
          console.log('使用当前playTime作为备用时间:', this.playTime)
          return this.playTime
        }

        console.warn('无法获取播放器当前时间')
        return null
      } catch (error) {
        console.error('获取播放器时间失败:', error)
        return null
      }
    },
    playingChange(val) {
      // 播放状态变化时触发
      console.log('播放状态变化:', val)

      if (typeof val === 'boolean') {
        this.playing = val
      } else if (val && val.type) {
        // 如果是事件对象
        this.playing = val.type === 'playing' || val.type === 'play'
      } else {
        // 尝试从播放器获取状态
        const player = this.$refs.recordVideoPlayer
        if (player) {
          this.playing = this.getPlayerPlayingState(player)
        }
      }

      console.log('播放状态已更新:', this.playing)
    },
    getPlayerPlayingState(player) {
      // 尝试多种方式获取播放器播放状态
      try {
        // 方法1: 直接获取playing属性
        if (player.playing !== undefined) {
          return player.playing
        }

        // 方法2: 调用isPlaying方法
        if (typeof player.isPlaying === 'function') {
          return player.isPlaying()
        }

        // 方法3: 从video元素获取
        const videoElement = player.$el?.querySelector('video')
        if (videoElement) {
          return !videoElement.paused && !videoElement.ended && videoElement.readyState > 2
        }

        // 方法4: 检查paused属性
        if (player.paused !== undefined) {
          return !player.paused
        }

        return false
      } catch (error) {
        console.error('获取播放器状态失败:', error)
        return false
      }
    },
    onPlayerLoaded() {
      // 播放器加载完成回调
      console.log('播放器加载完成')
      this.playLoading = false

      // 启动时间更新监控
      this.startTimeUpdateMonitor()
    },
    onPlayerError(error) {
      // 播放器错误回调
      console.error('播放器错误:', error)
      this.playLoading = false
      this.playing = false
      this.$message.error('播放器加载失败')
    },
    playTimeChange(val) {
      console.log('时间轴时间变化:', val, '当前播放时间:', this.playTime)
      if (val === this.playTime) {
        return
      }

      // 更新播放时间
      this.playTime = val

      // 如果正在拖动时间轴，不要自动切换文件
      if (this.timelineControl) {
        return
      }

      // 根据时间轴的时间更新选择的文件
      for (let i = 0; i < this.detailFiles.length; i++) {
        const file = this.detailFiles[i]
        if (this.playTime >= file.startTime && this.playTime <= file.endTime) {
          if (this.chooseFileIndex !== i) {
            console.log(`时间轴触发文件切换，从 ${this.chooseFileIndex} 到 ${i}`)
            this.chooseFileIndex = i
            this.playSeekValue = this.playTime - file.startTime
            this.playRecord()
          }
          break
        }
      }
    },
    timelineMouseDown() {
      console.log('时间轴鼠标按下')
      // 标记时间轴拖动开始
      this.timelineControl = true
    },
    mouseupTimeline() {
      console.log('时间轴鼠标释放，当前播放时间:', this.playTime)
      if (!this.timelineControl) {
        this.timelineControl = false
        return
      }
      this.timelineControl = false

      // 根据时间轴的时间定位到对应的文件
      let timeLength = 0
      let fileFound = false
      for (let i = 0; i < this.detailFiles.length; i++) {
        const item = this.detailFiles[i]
        console.log(`检查文件 ${i}:`, {
          startTime: item.startTime,
          endTime: item.endTime,
          playTime: this.playTime
        })

        if (this.playTime > item.endTime) {
          timeLength += item.timeLen
        } else if (this.playTime >= item.startTime && this.playTime <= item.endTime) {
          timeLength += (this.playTime - item.startTime)
          this.chooseFileIndex = i // 更新当前选择的文件索引
          fileFound = true
          console.log(`找到匹配文件，索引: ${i}`)
          break
        }
      }

      if (fileFound) {
        // 更新播放时间和播放位置
        this.playSeekValue = timeLength
        console.log('开始播放选中的文件，时间偏移:', timeLength)
        this.playRecordFromCurrentTime() // 播放对应文件从当前时间开始
      } else {
        // 提示没有视频文件
        console.log('没有找到对应时间的视频文件')
        this.$message.warning('该时间段没有录像文件')
      }
    },
    playRecordFromCurrentTime() {
      // 移除对 destroy 方法的调用
      if (this.$refs.recordVideoPlayer && !this.$refs.recordVideoPlayer.playing) {
        this.playLoading = true;
      }

      if (this.chooseFileIndex !== null && this.detailFiles.length > 0 && this.chooseFileIndex < this.detailFiles.length) {
        const currentFile = this.detailFiles[this.chooseFileIndex]
        this.$store.dispatch('cloudRecord/getPlayPath', currentFile.id)
          .then(data => {
            if (!data) {
              this.$message.error('无法加载录像文件')
              return
            }

            this.streamInfo = {
              mediaServerId: currentFile.mediaServerId,
              app: data.app || this.app,
              stream: data.stream || this.stream,
              id: currentFile.id,
              startTime: currentFile.startTime,
              endTime: currentFile.endTime
            }

            if (location.protocol === 'https:') {
              let url = data.httpsPath
              url += (url.indexOf('?') > -1 ? '&' : '?') + 'time=' + new Date().getTime()
              this.videoUrl = url
            } else {
              let url = data.httpPath
              url += (url.indexOf('?') > -1 ? '&' : '?') + 'time=' + new Date().getTime()
              this.videoUrl = url
            }

            this.playTime = this.playSeekValue + Number.parseInt(currentFile.startTime) // 从当前时间播放
            this.initTime = this.playTime // 确保initTime与当前选择文件的开始时间一致

            setTimeout(() => {
              this.$refs.Timeline.setTime(this.playTime) // 时间轴定位到当前播放时间
            }, 100)
          })
          .catch((error) => {
            console.log('加载录像错误:', error)
            this.$message.error('加载录像文件失败: ' + (error.message || '未知错误'))
          })
          .finally(() => {
            this.playLoading = false
          })
      }
    },
    getTimeForFile(file) {
      const starTime = new Date(file.startTime * 1000)
      let endTime = new Date(file.endTime * 1000)
      if (this.checkIsOver24h(starTime, endTime)) {
        endTime = new Date(this.chooseDate + ' ' + '23:59:59')
      }
      return [starTime, endTime, endTime.getTime() - starTime.getTime()]
    },
    checkIsOver24h(starTime, endTime) {
      return starTime > endTime
    },
    playTimeFormat(val) {
      const h = parseInt(val / 3600)
      const m = parseInt((val - h * 3600) / 60)
      const s = parseInt(val - h * 3600 - m * 60)

      let hStr = h
      let mStr = m
      let sStr = s
      if (h < 10) {
        hStr = '0' + hStr
      }
      if (m < 10) {
        mStr = '0' + mStr
        s
      }
      if (s < 10) {
        sStr = '0' + sStr
      }
      return hStr + ':' + mStr + ':' + sStr
    },
    getDateInYear(callback) {
      this.dateFilesObj = {}
      this.$store.dispatch('cloudRecord/queryListByData', {
        app: this.app,
        stream: this.stream,
        year: this.queryDate.getFullYear(),
        month: this.queryDate.getMonth() + 1,
        mediaServerId: this.mediaServerId
      })
        .then((data) => {
          if (data.length > 0) {
            for (let i = 0; i < data.length; i++) {
              this.dateFilesObj[data[i]] = data[i]
            }
            console.log(this.dateFilesObj)
          }
          if (callback) callback()
        })
        .catch((error) => {
          console.log(error)
        })
    },
    goBack() {
      this.$router.push('/cloudRecord')
    },
    adjustPlayerControlBlocker() {
      // 动态检测并调整播放器控制栏拦截层
      this.$nextTick(() => {
        const playerElement = this.$refs.recordVideoPlayer?.$el
        if (!playerElement) return

        const blocker = document.querySelector('.player-control-blocker')
        if (!blocker) return

        // 检测播放器内部的控制栏元素
        const playerControls = playerElement.querySelectorAll([
          '.controls',
          '.control-bar',
          '.player-controls',
          '.video-controls',
          '.bottom-controls',
          '.control-panel',
          '.player-bar',
          '.media-controls'
        ].join(','))

        if (playerControls.length > 0) {
          // 如果找到控制栏，精确覆盖
          const controlBar = playerControls[0]
          const rect = controlBar.getBoundingClientRect()
          const playerRect = playerElement.getBoundingClientRect()

          // 计算相对位置
          const relativeBottom = playerRect.bottom - rect.bottom
          const relativeHeight = rect.height

          blocker.style.bottom = `${relativeBottom}px`
          blocker.style.height = `${relativeHeight}px`

          console.log('检测到播放器控制栏，已精确覆盖:', {
            controlBarHeight: relativeHeight,
            bottomOffset: relativeBottom
          })
        } else {
          // 如果没有找到控制栏，使用默认设置
          blocker.style.bottom = '0px'
          blocker.style.height = '40px'
          console.log('未检测到播放器控制栏，使用默认拦截设置')
        }
      })
    },
    hidePlayerControls() {
      // 强力隐藏播放器原生控制栏的方法
      const playerElement = this.$refs.recordVideoPlayer?.$el
      if (!playerElement) return

      // 扩展的控制栏选择器列表
      const controlSelectors = [
        '.controls',
        '.control-bar',
        '.player-controls',
        '.video-controls',
        '.bottom-controls',
        '.control-panel',
        '.player-bar',
        '.media-controls',
        '.buttons-box',
        '.h265web-btn',
        '.controlBar',
        '.vjs-control-bar',
        '.video-js .vjs-control-bar',
        '.plyr__controls',
        '.dplayer-controller',
        '.jwplayer .jw-controlbar',
        '.flowplayer .fp-controls',
        '.clappr-media-control',
        '.jessibuca-controls',
        '.jessibuca-control-bar',
        '.webrtc-controls',
        '.flv-controls'
      ]

      controlSelectors.forEach(selector => {
        const controls = playerElement.querySelectorAll(selector)
        controls.forEach(control => {
          // 多重隐藏方式
          control.style.display = 'none'
          control.style.visibility = 'hidden'
          control.style.opacity = '0'
          control.style.pointerEvents = 'none'
          control.style.position = 'absolute'
          control.style.left = '-9999px'
          control.style.top = '-9999px'
          control.style.width = '0'
          control.style.height = '0'
          control.style.overflow = 'hidden'
          control.style.zIndex = '-1'
          control.style.transition = 'none'
          control.style.animation = 'none'
          control.style.transform = 'none'

          // 移除可能的事件监听器
          control.onmouseenter = null
          control.onmouseleave = null
          control.onmouseover = null
          control.onmouseout = null

          // 添加自定义属性标记
          control.setAttribute('data-hidden-by-custom', 'true')
        })
      })

      console.log('已强力隐藏播放器原生控制栏')
    },
    showPlayerControls() {
      // 显示播放器原生控制栏的方法（用于调试）
      const playerElement = this.$refs.recordVideoPlayer?.$el
      if (!playerElement) return

      const controlSelectors = [
        '.controls',
        '.control-bar',
        '.player-controls',
        '.video-controls',
        '.bottom-controls',
        '.control-panel',
        '.player-bar',
        '.media-controls'
      ]

      controlSelectors.forEach(selector => {
        const controls = playerElement.querySelectorAll(selector)
        controls.forEach(control => {
          control.style.display = ''
          control.style.visibility = ''
          control.style.opacity = ''
          control.style.pointerEvents = ''
        })
      })

      console.log('已显示播放器原生控制栏')
    },
    debugPlayerControls() {
      // 调试方法：检查播放器控制栏状态
      const playerElement = this.$refs.recordVideoPlayer?.$el
      if (!playerElement) {
        console.log('播放器元素未找到')
        return
      }

      console.log('播放器元素:', playerElement)

      const controlSelectors = [
        '.controls',
        '.control-bar',
        '.player-controls',
        '.video-controls',
        '.bottom-controls',
        '.control-panel',
        '.player-bar',
        '.media-controls',
        '.buttons-box',
        '.h265web-btn',
        '.controlBar'
      ]

      controlSelectors.forEach(selector => {
        const controls = playerElement.querySelectorAll(selector)
        if (controls.length > 0) {
          console.log(`找到控制栏元素 ${selector}:`, controls)
        }
      })

      const blocker = document.querySelector('.player-control-blocker')
      console.log('拦截层元素:', blocker)

      console.log('调试方法已暴露到全局: debugPlayerControls(), adjustPlayerControlBlocker(), hidePlayerControls(), showPlayerControls()')
    },
    startControlsMonitor() {
      // 启动控制栏监控，持续隐藏可能出现的控制栏
      if (this.controlsMonitorInterval) {
        clearInterval(this.controlsMonitorInterval)
      }

      this.controlsMonitorInterval = setInterval(() => {
        this.hidePlayerControls()
      }, 100) // 每100ms检查一次

      console.log('已启动控制栏监控')
    },
    stopControlsMonitor() {
      // 停止控制栏监控
      if (this.controlsMonitorInterval) {
        clearInterval(this.controlsMonitorInterval)
        this.controlsMonitorInterval = null
      }

      console.log('已停止控制栏监控')
    },
    disablePlayerEvents() {
      // 彻底禁用播放器的鼠标悬停事件监听
      const playerElement = this.$refs.recordVideoPlayer?.$el
      if (!playerElement) return

      // 所有需要拦截的事件类型
      const events = [
        'mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'mousemove',
        'click', 'dblclick', 'focus', 'blur', 'focusin', 'focusout',
        'pointerenter', 'pointerleave', 'pointerover', 'pointerout', 'pointermove'
      ]

      events.forEach(eventType => {
        // 在捕获阶段拦截所有事件
        playerElement.addEventListener(eventType, (e) => {
          // 检查是否是控制栏相关的元素或事件
          const isControlElement = e.target.closest([
            '.controls', '.control-bar', '.player-controls', '.video-controls',
            '.bottom-controls', '.control-panel', '.player-bar', '.media-controls',
            '.buttons-box', '.h265web-btn', '.controlBar', '.vjs-control-bar',
            '.plyr__controls', '.dplayer-controller', '.jessibuca-controls',
            '.jessibuca-control-bar', '.webrtc-controls', '.flv-controls'
          ].join(','))

          if (isControlElement) {
            // 完全阻止控制栏相关的事件
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            return false
          }

          // 对于悬停相关事件，即使不是控制栏元素也要特殊处理
          if (['mouseenter', 'mouseleave', 'mouseover', 'mouseout', 'pointerenter', 'pointerleave', 'pointerover', 'pointerout'].includes(eventType)) {
            // 检查是否可能触发控制栏显示
            if (e.target === playerElement || playerElement.contains(e.target)) {
              // 阻止可能触发控制栏显示的悬停事件
              e.preventDefault()
              e.stopPropagation()
              e.stopImmediatePropagation()

              // 立即隐藏可能出现的控制栏
              setTimeout(() => {
                this.hidePlayerControls()
              }, 0)

              return false
            }
          }
        }, true) // 使用捕获阶段，优先级最高

        // 同时在冒泡阶段也添加拦截
        playerElement.addEventListener(eventType, (e) => {
          const isControlElement = e.target.closest([
            '.controls', '.control-bar', '.player-controls', '.video-controls',
            '.bottom-controls', '.control-panel', '.player-bar', '.media-controls',
            '.buttons-box', '.h265web-btn', '.controlBar'
          ].join(','))

          if (isControlElement) {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            return false
          }
        }, false) // 冒泡阶段
      })

      // 移除播放器可能已有的事件监听器
      this.removeExistingPlayerEventListeners(playerElement)

      console.log('已彻底禁用播放器悬停和控制栏相关事件')
    },
    forceHideControlsWithMutationObserver() {
      // 使用 MutationObserver 监控 DOM 变化，强制隐藏新出现的控制栏
      const playerElement = this.$refs.recordVideoPlayer?.$el
      if (!playerElement) return

      if (this.controlsMutationObserver) {
        this.controlsMutationObserver.disconnect()
      }

      this.controlsMutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            // 检查新添加的节点
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node
                // 检查是否是控制栏元素
                const controlSelectors = [
                  '.controls', '.control-bar', '.player-controls', '.video-controls',
                  '.bottom-controls', '.control-panel', '.player-bar', '.media-controls',
                  '.buttons-box', '.h265web-btn', '.controlBar', '.vjs-control-bar',
                  '.plyr__controls', '.dplayer-controller', '.jessibuca-controls'
                ]

                controlSelectors.forEach(selector => {
                  if (element.matches && element.matches(selector)) {
                    this.hideElementCompletely(element)
                  }
                  // 也检查子元素
                  const childControls = element.querySelectorAll && element.querySelectorAll(selector)
                  if (childControls) {
                    childControls.forEach(child => this.hideElementCompletely(child))
                  }
                })
              }
            })
          }

          if (mutation.type === 'attributes') {
            // 检查属性变化（如 style 变化）
            const target = mutation.target
            if (target.getAttribute && target.getAttribute('data-hidden-by-custom') === 'true') {
              // 如果是我们标记过的元素，重新隐藏
              this.hideElementCompletely(target)
            }
          }
        })
      })

      // 开始观察
      this.controlsMutationObserver.observe(playerElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      })

      console.log('已启动 DOM 变化监控')
    },
    hideElementCompletely(element) {
      // 彻底隐藏元素的方法
      if (!element || !element.style) return

      element.style.display = 'none'
      element.style.visibility = 'hidden'
      element.style.opacity = '0'
      element.style.pointerEvents = 'none'
      element.style.position = 'absolute'
      element.style.left = '-9999px'
      element.style.top = '-9999px'
      element.style.width = '0'
      element.style.height = '0'
      element.style.overflow = 'hidden'
      element.style.zIndex = '-1'
      element.style.transition = 'none'
      element.style.animation = 'none'
      element.style.transform = 'none'
      element.setAttribute('data-hidden-by-custom', 'true')
    },
    removeExistingPlayerEventListeners(playerElement) {
      // 尝试移除播放器可能已有的事件监听器
      if (!playerElement) return

      // 直接设置事件处理器为null（不使用克隆方法，因为会破坏播放器功能）
      const eventProperties = [
        'onmouseenter', 'onmouseleave', 'onmouseover', 'onmouseout', 'onmousemove',
        'onclick', 'ondblclick', 'onfocus', 'onblur', 'onfocusin', 'onfocusout',
        'onpointerenter', 'onpointerleave', 'onpointerover', 'onpointerout', 'onpointermove'
      ]

      // 递归处理播放器及其所有子元素
      const processElement = (element) => {
        if (!element) return

        eventProperties.forEach(prop => {
          if (element[prop]) {
            element[prop] = null
          }
        })

        // 处理子元素
        if (element.children) {
          Array.from(element.children).forEach(child => {
            processElement(child)
          })
        }
      }

      processElement(playerElement)

      // 特别处理可能的控制栏元素
      const controlSelectors = [
        '.controls', '.control-bar', '.player-controls', '.video-controls',
        '.bottom-controls', '.control-panel', '.player-bar', '.media-controls',
        '.buttons-box', '.h265web-btn', '.controlBar'
      ]

      controlSelectors.forEach(selector => {
        const controls = playerElement.querySelectorAll(selector)
        controls.forEach(control => {
          processElement(control)

          // 额外移除可能的自定义属性
          if (control.removeAttribute) {
            control.removeAttribute('onmouseenter')
            control.removeAttribute('onmouseleave')
            control.removeAttribute('onmouseover')
            control.removeAttribute('onmouseout')
          }
        })
      })

      console.log('已移除播放器现有的事件监听器')
    },
    disablePlayerHoverDetection() {
      // 禁用播放器可能的悬停检测机制
      const playerElement = this.$refs.recordVideoPlayer?.$el
      if (!playerElement) return

      // 覆盖可能的悬停检测方法
      if (window.jQuery && window.jQuery(playerElement).data()) {
        const $player = window.jQuery(playerElement)

        // 移除jQuery事件
        $player.off('mouseenter mouseleave mouseover mouseout hover')

        // 移除可能的悬停相关数据
        $player.removeData('hover')
        $player.removeData('mouseenter')
        $player.removeData('mouseleave')
      }

      // 如果播放器有自定义的悬停检测方法，尝试禁用
      const playerInstance = this.$refs.recordVideoPlayer
      if (playerInstance) {
        // 常见的播放器悬停方法名
        const hoverMethods = [
          'enableHover', 'disableHover', 'setHover', 'hover',
          'showControls', 'hideControls', 'toggleControls',
          'enableControlsOnHover', 'disableControlsOnHover'
        ]

        hoverMethods.forEach(method => {
          if (typeof playerInstance[method] === 'function') {
            try {
              if (method.includes('disable') || method.includes('hide')) {
                playerInstance[method]()
              } else if (method.includes('enable') || method.includes('show')) {
                // 重写这些方法为空函数
                playerInstance[method] = () => {}
              }
            } catch (e) {
              console.log(`无法调用播放器方法 ${method}:`, e)
            }
          }
        })

        // 重写可能的悬停相关属性
        if (playerInstance.options) {
          playerInstance.options.controls = false
          playerInstance.options.hover = false
          playerInstance.options.showControls = false
          playerInstance.options.controlsOnHover = false
        }
      }

      console.log('已禁用播放器悬停检测机制')
    },
    startTimeUpdateMonitor() {
      // 启动时间更新监控
      if (this.timeUpdateInterval) {
        clearInterval(this.timeUpdateInterval)
      }

      this.timeUpdateInterval = setInterval(() => {
        if (this.playing && this.$refs.recordVideoPlayer) {
          const currentTime = this.getCurrentPlayerTime(this.$refs.recordVideoPlayer)
          if (currentTime !== null) {
            this.showPlayTimeChange(currentTime / 1000) // 转换为秒
          }
        }
      }, 1000) // 每秒更新一次

      console.log('已启动时间更新监控')
    },
    stopTimeUpdateMonitor() {
      // 停止时间更新监控
      if (this.timeUpdateInterval) {
        clearInterval(this.timeUpdateInterval)
        this.timeUpdateInterval = null
      }

      console.log('已停止时间更新监控')
    },
    loadHtml2Canvas() {
      // 动态加载html2canvas库
      if (window.html2canvas) {
        console.log('html2canvas已加载')
        return Promise.resolve()
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
        script.onload = () => {
          console.log('html2canvas加载成功')
          resolve()
        }
        script.onerror = () => {
          console.warn('html2canvas加载失败，将使用其他截图方法')
          reject(new Error('html2canvas加载失败'))
        }
        document.head.appendChild(script)
      })
    },
    captureWithDOMCloning(playerEl) {
      // 通过DOM克隆避免跨域问题
      try {
        console.log('尝试DOM克隆截图方案')

        if (!playerEl) {
          const player = this.$refs.recordVideoPlayer
          playerEl = player?.$el
        }

        if (!playerEl) {
          this.captureWithDisplayMedia()
          return
        }

        // 克隆播放器容器
        const clonedEl = playerEl.cloneNode(true)

        // 移除所有可能导致跨域问题的元素
        const problematicElements = clonedEl.querySelectorAll('video, canvas, iframe, object, embed')
        problematicElements.forEach(el => {
          // 用占位符替换
          const placeholder = document.createElement('div')
          placeholder.style.width = el.offsetWidth + 'px' || '100%'
          placeholder.style.height = el.offsetHeight + 'px' || '100%'
          placeholder.style.backgroundColor = '#000000'
          placeholder.style.display = 'flex'
          placeholder.style.alignItems = 'center'
          placeholder.style.justifyContent = 'center'
          placeholder.style.color = '#ffffff'
          placeholder.style.fontSize = '16px'
          placeholder.textContent = '视频播放区域'

          el.parentNode.replaceChild(placeholder, el)
        })

        // 将克隆的元素临时添加到页面
        clonedEl.style.position = 'absolute'
        clonedEl.style.left = '-9999px'
        clonedEl.style.top = '-9999px'
        document.body.appendChild(clonedEl)

        // 使用html2canvas截取克隆的元素
        if (window.html2canvas) {
          window.html2canvas(clonedEl, {
            allowTaint: true,
            useCORS: false,
            scale: 1,
            logging: false,
            backgroundColor: '#000000'
          }).then(canvas => {
            // 移除临时元素
            document.body.removeChild(clonedEl)

            // 导出截图
            canvas.toBlob((blob) => {
              if (blob && blob.size > 0) {
                this.downloadScreenshot(blob)
                this.$message.success('DOM克隆截图成功')
                console.log('DOM克隆截图成功')
              } else {
                this.createCustomScreenshot(playerEl)
              }
            }, 'image/png')
          }).catch(error => {
            console.error('DOM克隆html2canvas失败:', error)
            document.body.removeChild(clonedEl)
            this.createCustomScreenshot(playerEl)
          })
        } else {
          document.body.removeChild(clonedEl)
          this.createCustomScreenshot(playerEl)
        }

      } catch (error) {
        console.error('DOM克隆截图失败:', error)
        this.createCustomScreenshot(playerEl)
      }
    },
    captureWithSVG(playerEl) {
      // 使用SVG方案截图
      try {
        console.log('尝试SVG截图方案')

        if (!playerEl) {
          const player = this.$refs.recordVideoPlayer
          playerEl = player?.$el
        }

        if (!playerEl) {
          this.captureWithDisplayMedia()
          return
        }

        // 创建SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        svg.setAttribute('width', playerEl.offsetWidth || 800)
        svg.setAttribute('height', playerEl.offsetHeight || 450)

        // 创建foreignObject
        const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject')
        foreignObject.setAttribute('width', '100%')
        foreignObject.setAttribute('height', '100%')

        // 创建简化的HTML内容
        const htmlContent = document.createElement('div')
        htmlContent.style.width = '100%'
        htmlContent.style.height = '100%'
        htmlContent.style.backgroundColor = '#000000'
        htmlContent.style.display = 'flex'
        htmlContent.style.flexDirection = 'column'
        htmlContent.style.alignItems = 'center'
        htmlContent.style.justifyContent = 'center'
        htmlContent.style.color = '#ffffff'
        htmlContent.style.fontFamily = 'Arial, sans-serif'

        // 添加内容
        const title = document.createElement('h2')
        title.textContent = '录像播放截图'
        title.style.margin = '0 0 20px 0'
        htmlContent.appendChild(title)

        const info = [
          `设备ID: ${this.deviceId || '未知'}`,
          `通道ID: ${this.channelId || '未知'}`,
          `时间: ${new Date(this.playTime || Date.now()).toLocaleString()}`
        ]

        info.forEach(text => {
          const p = document.createElement('p')
          p.textContent = text
          p.style.margin = '5px 0'
          htmlContent.appendChild(p)
        })

        foreignObject.appendChild(htmlContent)
        svg.appendChild(foreignObject)

        // 转换SVG为图片
        const svgData = new XMLSerializer().serializeToString(svg)
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)

        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          canvas.width = img.width
          canvas.height = img.height

          ctx.drawImage(img, 0, 0)

          URL.revokeObjectURL(url)

          canvas.toBlob((blob) => {
            if (blob && blob.size > 0) {
              this.downloadScreenshot(blob)
              this.$message.success('SVG截图成功')
              console.log('SVG截图成功')
            } else {
              this.captureWithDisplayMedia()
            }
          }, 'image/png')
        }

        img.onerror = () => {
          console.error('SVG图片加载失败')
          URL.revokeObjectURL(url)
          this.captureWithDisplayMedia()
        }

        img.src = url

      } catch (error) {
        console.error('SVG截图失败:', error)
        this.captureWithDisplayMedia()
      }
    },
    captureWithSimpleMethod() {
      // 简单截图方法，避免跨域问题
      try {
        console.log('使用简单截图方法')

        // 方法1: 尝试使用浏览器的截图功能
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          this.captureWithDisplayMedia()
          return
        }

        // 方法2: 创建一个简单的截图提示
        this.showScreenshotInstructions()

      } catch (error) {
        console.error('简单截图方法失败:', error)
        this.showScreenshotInstructions()
      }
    },
    captureWithDisplayMedia() {
      // 使用屏幕捕获API
      console.log('使用屏幕捕获API')

      navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      .then(stream => {
        console.log('屏幕捕获流获取成功')

        const video = document.createElement('video')
        video.srcObject = stream
        video.autoplay = true
        video.muted = true

        video.addEventListener('loadedmetadata', () => {
          console.log('屏幕捕获视频加载完成')

          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')

          canvas.width = video.videoWidth
          canvas.height = video.videoHeight

          // 绘制屏幕内容
          ctx.drawImage(video, 0, 0)

          // 停止屏幕捕获
          stream.getTracks().forEach(track => {
            track.stop()
            console.log('屏幕捕获轨道已停止')
          })

          // 导出截图
          canvas.toBlob((blob) => {
            if (blob && blob.size > 0) {
              this.downloadScreenshot(blob)
              this.$message.success('屏幕截图成功')
              console.log('屏幕截图成功，文件大小:', blob.size)
            } else {
              console.error('屏幕截图生成失败')
              this.showScreenshotInstructions()
            }
          }, 'image/png', 1.0)
        })

        video.addEventListener('error', (error) => {
          console.error('屏幕捕获视频错误:', error)
          stream.getTracks().forEach(track => track.stop())
          this.showScreenshotInstructions()
        })

      })
      .catch(error => {
        console.error('屏幕捕获失败:', error)
        if (error.name === 'NotAllowedError') {
          this.$message.warning('用户拒绝了屏幕捕获权限')
        } else if (error.name === 'NotSupportedError') {
          this.$message.warning('浏览器不支持屏幕捕获功能')
        } else {
          this.$message.warning('屏幕捕获失败: ' + error.message)
        }
        this.showScreenshotInstructions()
      })
    },
    showScreenshotInstructions() {
      // 显示截图说明
      console.log('显示截图说明')

      this.$alert(
        '由于浏览器安全限制，无法自动截图。请使用以下方法手动截图：\n\n' +
        '1. Windows: 按 Win + Shift + S 或 PrtScn 键\n' +
        '2. Mac: 按 Cmd + Shift + 4 或 Cmd + Shift + 3\n' +
        '3. 使用浏览器的开发者工具截图功能\n' +
        '4. 使用第三方截图工具\n\n' +
        '截图后可以保存到本地文件。',
        '截图说明',
        {
          confirmButtonText: '我知道了',
          type: 'info',
          dangerouslyUseHTMLString: false
        }
      )
    },
    createFallbackScreenshot() {
      // 创建备用截图（显示当前播放信息）
      try {
        console.log('创建备用截图')

        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        canvas.width = 800
        canvas.height = 450

        // 绘制背景
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // 绘制文本信息
        ctx.fillStyle = '#ffffff'
        ctx.font = '24px Arial'
        ctx.textAlign = 'center'

        const info = [
          '录像截图',
          `设备ID: ${this.deviceId || '未知'}`,
          `通道ID: ${this.channelId || '未知'}`,
          `时间: ${new Date(this.playTime || Date.now()).toLocaleString()}`,
          '由于浏览器安全限制，无法获取视频画面'
        ]

        info.forEach((text, index) => {
          ctx.fillText(text, canvas.width / 2, 150 + index * 40)
        })

        // 导出截图
        canvas.toBlob((blob) => {
          if (blob) {
            this.downloadScreenshot(blob)
            this.$message.success('已生成信息截图')
            console.log('备用截图创建成功')
          }
        }, 'image/png')

      } catch (error) {
        console.error('创建备用截图失败:', error)
        this.$message.error('截图功能完全不可用')
      }
    }
  }
}
</script>

<style>
/*
===========================================
注意：已禁用播放器控制栏强制隐藏功能
===========================================
以下所有关于隐藏播放器原生控制栏的CSS样式已被优化，
现在允许播放器显示原生控制栏。
如需重新启用控制栏隐藏，请移除下面的注释开始标记。

控制栏隐藏功能已禁用的原因：
- 用户反馈希望能看到播放器原生控制栏
- 原生控制栏提供更好的用户体验
- 避免与播放器内置功能冲突
*/

/*
===========================================
悬停效果禁用功能 - 独立启用
===========================================
以下CSS用于禁用播放器的悬停效果，但保持控制栏可见
*/

/* 禁用播放器的悬停效果 - 但不隐藏控制栏 */
.easy-player:hover, .easy-player:focus, .easy-player:active, .easy-player:focus-within,
.easy-player.hover, .easy-player.focused, .easy-player.active {
  cursor: default !important;
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}

/* 禁用播放器内所有元素的悬停效果 - 但不影响功能 */
.easy-player *:hover, .easy-player *:focus, .easy-player *:active,
.easy-player *.hover, .easy-player *.focused, .easy-player *.active {
  cursor: default !important;
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  /* 移除背景和颜色变化，保持原有样式 */
}

/* 禁用播放器的指针事件检测 - 但保持基本交互 */
.easy-player {
  /* 保持基本交互，只是禁用悬停视觉效果 */
  pointer-events: auto !important;
}

/* 禁用可能的CSS动画和过渡效果 */
.easy-player *[class*="control"],
.easy-player *[class*="button"],
.easy-player *[class*="bar"] {
  transition: none !important;
  animation: none !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}

/* 禁用媒体查询中的悬停效果 - 合并媒体查询 */
@media (hover: hover), (hover: none), (pointer: coarse) {
  .easy-player, .easy-player:hover, .easy-player:focus, .easy-player:active, .easy-player * {
    cursor: default !important;
    outline: none !important;
    border: none !important;
    box-shadow: none !important;
  }
}

/*
===========================================
禁用播放器悬停控制栏出现功能
===========================================
以下CSS专门用于禁用播放器悬停时控制栏的出现
*/

/* 强制隐藏所有状态下的控制栏 - 合并选择器 */
.easy-player:hover .controls, .easy-player:hover .control-bar, .easy-player:hover .player-controls,
.easy-player:hover .video-controls, .easy-player:hover .bottom-controls, .easy-player:hover .control-panel,
.easy-player:hover .media-controls, .easy-player:hover .player-control-bar, .easy-player:hover .vjs-control-bar,
.easy-player:hover .plyr__controls, .easy-player:hover .fp-controls, .easy-player:hover .jwplayer .jw-controls,
.easy-player:hover .video-js .vjs-control-bar, .easy-player:hover .dplayer-controller,
.easy-player:hover .artplayer-controls, .easy-player:hover .xgplayer-controls, .easy-player:hover .ckplayer-controls,
.easy-player:hover .flv-controls, .easy-player:hover .hls-controls, .easy-player:hover .dash-controls,
.easy-player:hover .webrtc-controls, .easy-player:hover .rtmp-controls, .easy-player:hover .rtsp-controls,
.easy-player:focus .controls, .easy-player:focus .control-bar, .easy-player:focus .player-controls,
.easy-player:focus-within .controls, .easy-player:focus-within .control-bar, .easy-player:focus-within .player-controls,
.easy-player:active .controls, .easy-player:active .control-bar, .easy-player:active .player-controls,
.easy-player.active .controls, .easy-player.active .control-bar, .easy-player.active .player-controls,
.easy-player.playing:hover .controls, .easy-player.paused:hover .controls,
.easy-player.loading:hover .controls, .easy-player.buffering:hover .controls, .easy-player.seeking:hover .controls {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  position: absolute !important;
  left: -9999px !important;
  top: -9999px !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  z-index: -1 !important;
}

/* 禁用控制栏的CSS动画、过渡效果和显示/隐藏动画 - 合并选择器 */
.easy-player .controls, .easy-player .control-bar, .easy-player .player-controls,
.easy-player .controls.show, .easy-player .control-bar.show, .easy-player .player-controls.show,
.easy-player .controls.visible, .easy-player .control-bar.visible, .easy-player .player-controls.visible {
  transition: none !important;
  animation: none !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* 媒体查询中的悬停控制栏禁用 - 合并媒体查询 */
@media (hover: hover), (hover: none), (pointer: coarse) {
  .easy-player:hover .controls, .easy-player:hover .control-bar, .easy-player:hover .player-controls,
  .easy-player .controls, .easy-player .control-bar, .easy-player .player-controls {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
}

/* 确保自定义控制栏和UI组件不受悬停效果禁用影响 - 合并选择器 */
.record-play-control, .record-play-control *, .record-play-control-item,
.player-option-box, .player-option-box *, .record-list-box, .record-list-box *,
.timeline-container, .timeline-container *, .video-timeline, .video-timeline *,
.el-dropdown, .el-dropdown *, .el-dropdown-menu, .el-dropdown-menu *,
.el-dropdown-item, .el-dropdown-item * {
  pointer-events: auto !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
}

/* 恢复自定义控制栏按钮的悬停效果 */
.record-play-control-item:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
  transform: scale(1.05) !important;
  cursor: pointer !important;
  outline: none !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3) !important;
}

/* 恢复时间轴的悬停效果 */
.video-timeline:hover {
  opacity: 1 !important;
  cursor: pointer !important;
}

/* 恢复侧边栏文件列表的悬停效果 */
.record-list-item:hover {
  background-color: rgba(64, 158, 255, 0.1) !important;
  cursor: pointer !important;
}

/* 恢复Element UI组件的悬停效果 */
.el-dropdown-item:hover {
  background-color: #ecf5ff !important;
  color: #409eff !important;
  cursor: pointer !important;
}

/* 动态禁用悬停效果的类 - 合并选择器 */
.easy-player.hover-disabled, .easy-player.hover-disabled *, .easy-player.hover-disabled:hover,
.easy-player.hover-disabled *:hover, .easy-player.hover-disabled:focus, .easy-player.hover-disabled *:focus,
.easy-player.hover-disabled:active, .easy-player.hover-disabled *:active {
  cursor: default !important;
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  color: inherit !important;
  transition: none !important;
  animation: none !important;
  transform: none !important;
}

/* 确保禁用悬停时，自定义控制栏仍然可用 - 合并选择器 */
.easy-player.hover-disabled ~ .record-play-control, .easy-player.hover-disabled ~ .record-play-control *,
.easy-player.hover-disabled ~ .player-option-box, .easy-player.hover-disabled ~ .player-option-box * {
  pointer-events: auto !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
}

/* 悬停效果禁用状态指示 */
.easy-player.hover-disabled::before {
  content: '';
  position: absolute;
  top: 5px;
  right: 5px;
  width: 8px;
  height: 8px;
  background-color: #f56c6c;
  border-radius: 50%;
  z-index: 1000;
  opacity: 0.7;
}

/* 悬停控制栏禁用的CSS类 - 合并选择器 */
.easy-player.hover-controls-disabled .controls, .easy-player.hover-controls-disabled .control-bar,
.easy-player.hover-controls-disabled .player-controls, .easy-player.hover-controls-disabled .video-controls,
.easy-player.hover-controls-disabled .bottom-controls, .easy-player.hover-controls-disabled .control-panel,
.easy-player.hover-controls-disabled .media-controls, .easy-player.hover-controls-disabled .player-control-bar,
.easy-player.hover-controls-disabled .vjs-control-bar, .easy-player.hover-controls-disabled .plyr__controls,
.easy-player.hover-controls-disabled .fp-controls, .easy-player.hover-controls-disabled .jw-controls,
.easy-player.hover-controls-disabled .dplayer-controller, .easy-player.hover-controls-disabled .artplayer-controls,
.easy-player.hover-controls-disabled .xgplayer-controls, .easy-player.hover-controls-disabled .ckplayer-controls {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  position: absolute !important;
  left: -9999px !important;
  top: -9999px !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  z-index: -1 !important;
}

/* 悬停控制栏禁用状态指示 */
.easy-player.hover-controls-disabled::after {
  content: '';
  position: absolute;
  top: 5px;
  right: 20px;
  width: 8px;
  height: 8px;
  background-color: #67c23a;
  border-radius: 50%;
  z-index: 1000;
  opacity: 0.7;
}

/* 双重禁用状态指示 */
.easy-player.hover-disabled.hover-controls-disabled::before {
  background-color: #e6a23c;
}

/* 强制禁用所有可能的控制栏显示触发器 - 合并选择器 */
.easy-player.hover-controls-disabled:hover, .easy-player.hover-controls-disabled:focus,
.easy-player.hover-controls-disabled:active, .easy-player.hover-controls-disabled.playing,
.easy-player.hover-controls-disabled.paused, .easy-player.hover-controls-disabled.loading,
.easy-player.hover-controls-disabled.buffering {
  /* 确保在任何状态下都不显示控制栏 */
  cursor: default !important;
  outline: none !important;
}

.easy-player.hover-controls-disabled:hover .controls, .easy-player.hover-controls-disabled:focus .controls,
.easy-player.hover-controls-disabled:active .controls, .easy-player.hover-controls-disabled.playing .controls,
.easy-player.hover-controls-disabled.paused .controls, .easy-player.hover-controls-disabled:hover .control-bar,
.easy-player.hover-controls-disabled:focus .control-bar, .easy-player.hover-controls-disabled:active .control-bar,
.easy-player.hover-controls-disabled.playing .control-bar, .easy-player.hover-controls-disabled.paused .control-bar {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

.record-list-box-box {
  width: fit-content;
  float: left;
}

.record-list-box {
  width: 100%;
  overflow: auto;
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: #FFF;
  margin-top: 10px;
}

.record-list {
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: #FFF;

}

.record-list-no-val {
  width: fit-content;
  position: relative;
  color: #9f9f9f;
  top: 50%;
  left: calc(50% - 2rem);
}

.record-list-item {
  padding: 0;
  margin: 0;
  margin: 0.5rem 0;
  cursor: pointer;
}
.record-play-control {
  height: 32px;
  line-height: 32px;
  display: inline-block;
  width: fit-content;
  padding: 0 10px;
  -webkit-box-shadow: 0 0 10px #262626;
  box-shadow: 0 0 10px #262626;
  background-color: #262626;
  margin: 4px 0;
}
.record-play-control-item {
  display: inline-block;
  padding: 0 10px;
  color: #fff;
  margin-right: 2px;
  cursor: pointer;
  text-decoration: none;
  background: transparent;
  border: none;
  font-size: 16px;
  font-family: inherit;
  outline: none;
  min-width: 32px; /* 增加最小宽度 */
  height: 32px;
  line-height: 32px;
  border-radius: 4px; /* 添加圆角 */
  transition: all 0.3s ease; /* 添加过渡动画 */
  position: relative;
}

.record-play-control-item:hover {
  color: #409EFF;
  background: rgba(64, 158, 255, 0.1); /* 悬停时的背景色 */
  transform: translateY(-1px); /* 轻微上移效果 */
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3); /* 添加阴影 */
}

.record-play-control-item:focus {
  outline: none;
  background: rgba(64, 158, 255, 0.1);
}

.record-play-control-item:active {
  background: rgba(64, 158, 255, 0.2);
  transform: translateY(0); /* 点击时恢复位置 */
}
/* 特殊按钮样式 - 列表按钮 */
.record-play-control-item.btn-list {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 6px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.record-play-control-item.btn-list:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 特殊按钮样式 - 截图按钮 */
.record-play-control-item.btn-screenshot {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: #fff;
  border-radius: 6px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(240, 147, 251, 0.3);
}

.record-play-control-item.btn-screenshot:hover {
  background: linear-gradient(135deg, #e081e9 0%, #e3455a 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(240, 147, 251, 0.4);
}

/* 特殊按钮样式 - 播放按钮 */
.record-play-control-item.btn-play {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: #fff;
  border-radius: 50%; /* 圆形按钮 */
  width: 40px;
  height: 40px;
  min-width: 40px;
  font-size: 18px;
  margin: 0 5px;
  box-shadow: 0 3px 6px rgba(79, 172, 254, 0.3);
}

.record-play-control-item.btn-play:hover {
  background: linear-gradient(135deg, #3d8bfe 0%, #00d4fe 100%);
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 5px 15px rgba(79, 172, 254, 0.4);
}

/* 特殊按钮样式 - 暂停按钮 */
.record-play-control-item.btn-pause {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
  color: #fff;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  min-width: 40px;
  font-size: 18px;
  margin: 0 5px;
  box-shadow: 0 3px 6px rgba(250, 112, 154, 0.3);
}

.record-play-control-item.btn-pause:hover {
  background: linear-gradient(135deg, #f8608a 0%, #fdd835 100%);
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 5px 15px rgba(250, 112, 154, 0.4);
}

/* 按钮加载动画 */
.record-play-control-item.loading {
  position: relative;
  pointer-events: none;
}

.record-play-control-item.loading::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border: 2px solid transparent;
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: button-loading 1s linear infinite;
}

@keyframes button-loading {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 按钮脉冲效果 */
.record-play-control-item.pulse {
  animation: button-pulse 2s infinite;
}

@keyframes button-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(64, 158, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}

/* 按钮图标旋转效果 */
.record-play-control-item.rotate-icon:hover .iconfont {
  transform: rotate(360deg);
  transition: transform 0.5s ease;
}

/* 禁用状态的按钮 */
.record-play-control-item:disabled,
.record-play-control-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.record-play-control-speed {
  font-weight: bold;
  color: #fff;
  user-select: none;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.record-play-control-speed:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

/* 响应式设计 - 移动端适配 */
@media (max-width: 768px) {
  .record-play-control-item {
    min-width: 28px;
    height: 28px;
    line-height: 28px;
    font-size: 14px;
    padding: 0 8px;
  }

  .record-play-control-item.btn-play,
  .record-play-control-item.btn-pause {
    width: 36px;
    height: 36px;
    min-width: 36px;
    font-size: 16px;
  }

  .record-play-control {
    padding: 0 8px;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .record-play-control-item {
    border: 2px solid #fff;
  }

  .record-play-control-item:hover {
    border-color: #409EFF;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .record-play-control-item {
    transition: none;
  }

  .record-play-control-item:hover {
    transform: none;
  }

  .record-play-control-item.loading::after {
    animation: none;
  }

  .record-play-control-item.pulse {
    animation: none;
  }
}
.player-option-box {
  height: 50px;
  position: relative;
  z-index: 200; /* 确保时间轴在拦截层之上 */
  pointer-events: auto !important; /* 强制启用鼠标事件 */
}
.time-line-show {
  position: relative;
  color: rgba(250, 249, 249, 0.89);
  left: calc(50% - 85px);
  top: -72px;
  text-shadow: 1px 0 #5f6b7c, -1px 0 #5f6b7c, 0 1px #5f6b7c, 0 -1px #5f6b7c, 1.1px 1.1px #5f6b7c, 1.1px -1.1px #5f6b7c, -1.1px 1.1px #5f6b7c, -1.1px -1.1px #5f6b7c;
}

/* 精确拦截播放器控制栏样式 */
.player-control-blocker {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px; /* 只覆盖播放器底部控制栏区域 */
  z-index: 10; /* 高于播放器控制栏，但低于我们的自定义控制栏 */
  pointer-events: auto;
  background-color: transparent;
  user-select: none;
}

/* 确保播放器主体区域可以正常交互 */
.playBox {
  position: relative;
}

/* 播放器组件本身保持正常交互 */
.easy-player,
.easy-player canvas,
.easy-player video {
  pointer-events: auto !important;
  user-select: auto !important;
}

/*
===========================================
以下控制栏隐藏样式已被禁用
===========================================
*/
/*
/* 强制隐藏播放器原生控制栏 - 使用通配符选择器优化 */
.easy-player [class*="control"], .easy-player [class*="controls"], 
.easy-player [class*="player-"], .easy-player [class*="bar"],
.easy-player:hover [class*="control"], .easy-player:hover [class*="controls"],
.easy-player:hover [class*="player-"], .easy-player:hover [class*="bar"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  position: absolute !important;
  left: -9999px !important;
  top: -9999px !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  z-index: -1 !important;
  transition: none !important;
  animation: none !important;
  transform: none !important;
}

/* 彻底禁用播放器的悬停效果和控制栏显示 - 合并选择器 */
.easy-player:hover, .easy-player:focus, .easy-player:active, .easy-player:focus-within,
.easy-player.hover, .easy-player.focused, .easy-player.active {
  cursor: default !important;
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}

/* 禁用播放器内所有元素的悬停效果 */
.easy-player *:hover, .easy-player *:focus, .easy-player *:active,
.easy-player *.hover, .easy-player *.focused, .easy-player *.active {
  cursor: default !important;
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  color: inherit !important;
}

/* 强制禁用所有可能的悬停显示控制栏 - 使用通配符选择器 */
.easy-player:hover [class*="control"], .easy-player:focus [class*="control"], 
.easy-player:active [class*="control"], .easy-player.hover [class*="control"],
.easy-player.focused [class*="control"], .easy-player.active [class*="control"] {
  /* 隐藏播放器控制栏的通用样式 */
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  position: absolute !important;
  left: -9999px !important;
  top: -9999px !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  z-index: -1 !important;
  transition: none !important;
  animation: none !important;
  transform: translateY(100px) !important;
}

/* 播放器控制栏隐藏选择器 - 合并所有状态和元素 */
.easy-player:hover .video-controls, .easy-player:focus .video-controls, .easy-player:active .video-controls,
.easy-player.hover .video-controls, .easy-player.focused .video-controls, .easy-player.active .video-controls,
.easy-player:hover .bottom-controls, .easy-player:focus .bottom-controls, .easy-player:active .bottom-controls,
.easy-player.hover .bottom-controls, .easy-player.focused .bottom-controls, .easy-player.active .bottom-controls,
.easy-player:hover .control-panel, .easy-player:focus .control-panel, .easy-player:active .control-panel,
.easy-player.hover .control-panel, .easy-player.focused .control-panel, .easy-player.active .control-panel,
.easy-player:hover .player-bar, .easy-player:focus .player-bar, .easy-player:active .player-bar,
.easy-player.hover .player-bar, .easy-player.focused .player-bar, .easy-player.active .player-bar,
.easy-player:hover .media-controls, .easy-player:focus .media-controls, .easy-player:active .media-controls,
.easy-player.hover .media-controls, .easy-player.focused .media-controls, .easy-player.active .media-controls,
.easy-player:hover .buttons-box, .easy-player:focus .buttons-box, .easy-player:active .buttons-box,
.easy-player.hover .buttons-box, .easy-player.focused .buttons-box, .easy-player.active .buttons-box,
.easy-player:hover .h265web-btn, .easy-player:focus .h265web-btn, .easy-player:active .h265web-btn,
.easy-player.hover .h265web-btn, .easy-player.focused .h265web-btn, .easy-player.active .h265web-btn,
.easy-player:hover .controlBar, .easy-player:focus .controlBar, .easy-player:active .controlBar,
.easy-player.hover .controlBar, .easy-player.focused .controlBar, .easy-player.active .controlBar {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
  position: absolute !important;
  left: -9999px !important;
  top: -9999px !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  z-index: -1 !important;
  transition: none !important;
  animation: none !important;
  transform: translateY(100px) !important;
}

/* 确保播放器视频区域可以正常交互 */
.easy-player .video-container,
.easy-player .video-wrapper,
.easy-player .player-video {
  pointer-events: auto !important;
}

/* 拦截层在全屏时的处理 */
.fullscreen .player-control-blocker {
  z-index: 9999 !important;
}

/* 强制覆盖可能的内联样式 */
.easy-player [style*="display: block"],
.easy-player [style*="display: flex"],
.easy-player [style*="display: inline"],
.easy-player [style*="visibility: visible"],
.easy-player [style*="opacity: 1"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

/* 针对特定的控制栏元素强制隐藏 */
.easy-player [class*="control"],
.easy-player [class*="button"],
.easy-player [class*="bar"],
.easy-player [id*="control"],
.easy-player [id*="button"],
.easy-player [id*="bar"] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

/* 但是保留视频元素本身 */
.easy-player video,
.easy-player canvas,
.easy-player .video-container,
.easy-player .video-wrapper,
.easy-player .player-video {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  pointer-events: auto !important;
}

/* 防止控制栏通过transform显示 */
.easy-player .controls,
.easy-player .control-bar,
.easy-player .player-controls,
.easy-player .video-controls,
.easy-player .bottom-controls,
.easy-player .control-panel,
.easy-player .player-bar,
.easy-player .media-controls {
  transform: translateY(100px) !important;
  margin-top: 100px !important;
}

/* 禁用可能的CSS动画和过渡 */
.easy-player *[class*="control"],
.easy-player *[class*="button"],
.easy-player *[class*="bar"] {
  transition: none !important;
  animation: none !important;
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
}

/* 彻底禁用播放器的指针事件和悬停检测 */
.easy-player {
  /* 禁用CSS悬停检测 */
  pointer-events: auto !important; /* 保持基本交互 */
  
  /* 使用CSS变量来强制覆盖可能的内联样式 */
  --controls-display: none !important;
  --controls-visibility: hidden !important;
  --controls-opacity: 0 !important;
  --controls-pointer-events: none !important;
}

/* 但是禁用控制栏区域的指针事件 - 合并所有播放器控制栏类型 */
.easy-player .controls, .easy-player .control-bar, .easy-player .player-controls,
.easy-player .video-controls, .easy-player .bottom-controls, .easy-player .control-panel,
.easy-player .player-bar, .easy-player .media-controls, .easy-player .buttons-box,
.easy-player .h265web-btn, .easy-player .controlBar, .easy-player .vjs-control-bar,
.easy-player .plyr__controls, .easy-player .dplayer-controller, .easy-player .jessibuca-controls,
.easy-player .jessibuca-control-bar, .easy-player .webrtc-controls, .easy-player .flv-controls {
  pointer-events: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  touch-action: none !important;
  
  /* 应用CSS变量 */
  display: var(--controls-display) !important;
  visibility: var(--controls-visibility) !important;
  opacity: var(--controls-opacity) !important;
  pointer-events: var(--controls-pointer-events) !important;
}

/* 禁用可能的媒体查询中的悬停效果 - 合并媒体查询 */
@media (hover: hover), (hover: none), (pointer: coarse) {
  .easy-player:hover .controls,
  .easy-player:hover .control-bar,
  .easy-player:hover .player-controls,
  .easy-player .controls,
  .easy-player .control-bar,
  .easy-player .player-controls {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
}

/* 确保交互元素的鼠标事件正常工作 - 合并选择器 */
.player-option-box, .player-option-box *,
.record-list-box, .record-list-box *,
.record-play-control, .record-play-control *,
.el-date-editor, .el-date-editor *,
.el-dropdown, .el-dropdown *,
.el-dropdown-menu, .el-dropdown-menu *,
.el-dropdown-item, .el-dropdown-item * {
  pointer-events: auto !important;
  user-select: auto !important;
  -webkit-user-select: auto !important;
  -moz-user-select: auto !important;
  -ms-user-select: auto !important;
}

/* 确保交互元素的鼠标事件正常 - 合并选择器 */
.timeline-container, .timeline-container *, .video-timeline, .video-timeline *,
.timeline-ruler, .timeline-ruler *, .timeline-track, .timeline-track *,
.timeline-segment, .timeline-segment *, .timeline-cursor, .timeline-cursor *,
.timeline-handle, .timeline-handle *, .timeline-progress, .timeline-progress *,
.timeline-time-marker, .timeline-time-marker *, .record-list-box-box, .record-list-box-box *,
.record-list-box, .record-list-box *, .sidebar-container, .sidebar-container *,
.sidebar-header, .sidebar-header *, .record-list, .record-list *,
.record-list-item, .record-list-item *, .infinite-list, .infinite-list *,
.infinite-list-item, .infinite-list-item *, .el-tag, .el-tag *,
.el-icon-video-camera, .el-icon-download {
  pointer-events: auto !important;
  user-select: auto !important;
  -webkit-user-select: auto !important;
  -moz-user-select: auto !important;
  -ms-user-select: auto !important;
  cursor: pointer !important;
}

/* 设置不同层级的z-index */
.timeline-container, .timeline-container *, .video-timeline, .video-timeline *,
.timeline-ruler, .timeline-ruler *, .timeline-track, .timeline-track *,
.timeline-segment, .timeline-segment *, .timeline-cursor, .timeline-cursor *,
.timeline-handle, .timeline-handle *, .timeline-progress, .timeline-progress *,
.timeline-time-marker, .timeline-time-marker * {
  z-index: 300 !important; /* 时间轴组件层级 */
}

.record-list-box-box, .record-list-box-box *, .record-list-box, .record-list-box *,
.sidebar-container, .sidebar-container *, .sidebar-header, .sidebar-header *,
.record-list, .record-list *, .record-list-item, .record-list-item *,
.infinite-list, .infinite-list *, .infinite-list-item, .infinite-list-item *,
.el-tag, .el-tag *, .el-icon-video-camera, .el-icon-download {
  z-index: 1002 !important; /* 侧边栏组件层级 */
}

/* 交互元素的视觉反馈效果 */
.timeline-dragging, .timeline-dragging * { cursor: grabbing !important; }
.record-list-item.selected .el-tag { 
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.5);
  transform: scale(1.02);
  transition: all 0.3s ease;
}
.video-timeline:hover { opacity: 1 !important; }
.player-option-box.timeline-active, .player-option-box.timeline-active * { z-index: 999 !important; }

/*
===========================================
控制栏隐藏功能已优化
===========================================
现在播放器可以正常显示原生控制栏，用户可以：
- 看到播放器内置的播放/暂停按钮
- 使用播放器内置的进度条
- 访问播放器内置的音量控制
- 使用播放器内置的全屏功能
- 享受播放器原生的用户体验

如需重新启用控制栏隐藏功能，请：
1. 移除CSS开头的注释开始标记
2. 移除CSS末尾的注释结束标记
3. 重新启用相关的JavaScript方法调用
*/
</style>
