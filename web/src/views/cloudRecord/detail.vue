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
          <easyPlayer ref="recordVideoPlayer" :videoUrl="videoUrl" :height="'calc(100vh - 250px)'" :show-button="false" @dblclick="fullScreen" />
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
      controlsMonitorInterval: null, // 控制栏监控定时器
      controlsMutationObserver: null // DOM变化监控器
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

    // 动态调整拦截层位置
    this.$nextTick(() => {
      this.adjustPlayerControlBlocker()
    })

    // 暴露调试方法到全局
    window.debugPlayerControls = () => this.debugPlayerControls()
    window.adjustPlayerControlBlocker = () => this.adjustPlayerControlBlocker()
    window.hidePlayerControls = () => this.hidePlayerControls()
    window.showPlayerControls = () => this.showPlayerControls()
    window.startControlsMonitor = () => this.startControlsMonitor()
    window.stopControlsMonitor = () => this.stopControlsMonitor()
    window.disablePlayerEvents = () => this.disablePlayerEvents()
    window.disablePlayerHoverDetection = () => this.disablePlayerHoverDetection()
    window.removeExistingPlayerEventListeners = () => this.removeExistingPlayerEventListeners(this.$refs.recordVideoPlayer?.$el)
    window.forceHideControlsWithMutationObserver = () => this.forceHideControlsWithMutationObserver()
  },
  destroyed() {
    this.$destroy('recordVideoPlayer')

    // 清理监控
    this.stopControlsMonitor()
    if (this.controlsMutationObserver) {
      this.controlsMutationObserver.disconnect()
      this.controlsMutationObserver = null
    }
  },
  methods: {
    sidebarControl() {
      console.log('侧边栏控制按钮被点击')
      this.showSidebar = !this.showSidebar
    },
    snap() {
      console.log('截图按钮被点击')
      if (this.$refs.recordVideoPlayer && typeof this.$refs.recordVideoPlayer.screenshot === 'function') {
        this.$refs.recordVideoPlayer.screenshot()
      } else {
        console.warn('播放器不支持截图功能')
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
      // 停止
      if (this.$refs.recordVideoPlayer && typeof this.$refs.recordVideoPlayer.destroy === 'function') {
        this.$refs.recordVideoPlayer.destroy()
      }
      this.videoUrl = null; // 停止播放时清空视频 URL
      this.playing = false
    },
    pausePlay() {
      console.log('暂停按钮被点击')
      // 暂停
      if (this.$refs.recordVideoPlayer && typeof this.$refs.recordVideoPlayer.pause === 'function') {
        this.$refs.recordVideoPlayer.pause()
      } else {
        console.warn('播放器不支持暂停功能')
      }
    },
    play() {
      console.log('播放按钮被点击')
      if (this.$refs.recordVideoPlayer) {
        if (this.$refs.recordVideoPlayer.loaded && typeof this.$refs.recordVideoPlayer.unPause === 'function') {
          this.$refs.recordVideoPlayer.unPause()
        } else {
          this.playRecord()
        }
      } else {
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
      screenfull.on('change', (event) => {
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

                // 播放器加载完成后启动所有控制栏隐藏和悬停禁用机制
                setTimeout(() => {
                  this.adjustPlayerControlBlocker();
                  this.hidePlayerControls(); // 隐藏原生控制栏
                  this.disablePlayerEvents(); // 禁用播放器悬停事件
                  this.disablePlayerHoverDetection(); // 禁用悬停检测机制
                  this.startControlsMonitor(); // 启动持续监控
                  this.forceHideControlsWithMutationObserver(); // 启动DOM监控
                }, 500);

                // 额外的延迟处理，确保播放器完全加载
                setTimeout(() => {
                  this.disablePlayerHoverDetection(); // 再次禁用悬停检测
                  this.hidePlayerControls(); // 再次隐藏控制栏
                }, 1000);

                // 定期重新禁用悬停功能
                setTimeout(() => {
                  this.disablePlayerHoverDetection();
                  this.hidePlayerControls();
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
      const newPlayTime = val * 1000; // 将秒转换为毫秒
      this.playTime = newPlayTime;

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
    },
    playingChange(val) {
      // 播放状态变化时触发
      this.playing = val;
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
    }
  }
}
</script>

<style>

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

/* 强制隐藏播放器原生控制栏 - 所有状态 */
.easy-player .controls,
.easy-player .control-bar,
.easy-player .player-controls,
.easy-player .video-controls,
.easy-player .bottom-controls,
.easy-player .control-panel,
.easy-player .player-bar,
.easy-player .media-controls,
.easy-player .buttons-box,
.easy-player .h265web-btn,
.easy-player .controlBar,
/* 常见的播放器控制栏类名 */
.easy-player .vjs-control-bar,
.easy-player .video-js .vjs-control-bar,
.easy-player .plyr__controls,
.easy-player .dplayer-controller,
.easy-player .jwplayer .jw-controlbar,
.easy-player .flowplayer .fp-controls,
.easy-player .clappr-media-control,
/* EasyPlayer 特定的控制栏 */
.easy-player .jessibuca-controls,
.easy-player .jessibuca-control-bar,
.easy-player .webrtc-controls,
.easy-player .flv-controls {
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

/* 强制隐藏悬停状态下的控制栏 */
.easy-player:hover .controls,
.easy-player:hover .control-bar,
.easy-player:hover .player-controls,
.easy-player:hover .video-controls,
.easy-player:hover .bottom-controls,
.easy-player:hover .control-panel,
.easy-player:hover .player-bar,
.easy-player:hover .media-controls,
.easy-player:hover .buttons-box,
.easy-player:hover .h265web-btn,
.easy-player:hover .controlBar,
.easy-player:hover .vjs-control-bar,
.easy-player:hover .video-js .vjs-control-bar,
.easy-player:hover .plyr__controls,
.easy-player:hover .dplayer-controller,
.easy-player:hover .jwplayer .jw-controlbar,
.easy-player:hover .flowplayer .fp-controls,
.easy-player:hover .clappr-media-control,
.easy-player:hover .jessibuca-controls,
.easy-player:hover .jessibuca-control-bar,
.easy-player:hover .webrtc-controls,
.easy-player:hover .flv-controls {
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

/* 禁用所有可能的控制栏动画和过渡 */
.easy-player .controls,
.easy-player .control-bar,
.easy-player .player-controls,
.easy-player .video-controls,
.easy-player .bottom-controls,
.easy-player .control-panel,
.easy-player .player-bar,
.easy-player .media-controls,
.easy-player .buttons-box,
.easy-player .h265web-btn,
.easy-player .controlBar,
.easy-player .vjs-control-bar,
.easy-player .plyr__controls,
.easy-player .dplayer-controller,
.easy-player .jessibuca-controls,
.easy-player .jessibuca-control-bar,
.easy-player .webrtc-controls,
.easy-player .flv-controls {
  transition: none !important;
  animation: none !important;
  transform: none !important;
}

/* 彻底禁用播放器的悬停效果 - 所有可能的悬停状态 */
.easy-player:hover,
.easy-player:focus,
.easy-player:active,
.easy-player:focus-within,
.easy-player.hover,
.easy-player.focused,
.easy-player.active {
  cursor: default !important;
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
}

/* 禁用播放器内所有元素的悬停效果 */
.easy-player *:hover,
.easy-player *:focus,
.easy-player *:active,
.easy-player *.hover,
.easy-player *.focused,
.easy-player *.active {
  cursor: default !important;
  outline: none !important;
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
  color: inherit !important;
}

/* 强制禁用所有可能的悬停显示控制栏 */
.easy-player:hover .controls,
.easy-player:focus .controls,
.easy-player:active .controls,
.easy-player.hover .controls,
.easy-player.focused .controls,
.easy-player.active .controls,
.easy-player:hover .control-bar,
.easy-player:focus .control-bar,
.easy-player:active .control-bar,
.easy-player.hover .control-bar,
.easy-player.focused .control-bar,
.easy-player.active .control-bar,
.easy-player:hover .player-controls,
.easy-player:focus .player-controls,
.easy-player:active .player-controls,
.easy-player.hover .player-controls,
.easy-player.focused .player-controls,
.easy-player.active .player-controls,
.easy-player:hover .video-controls,
.easy-player:focus .video-controls,
.easy-player:active .video-controls,
.easy-player.hover .video-controls,
.easy-player.focused .video-controls,
.easy-player.active .video-controls,
.easy-player:hover .bottom-controls,
.easy-player:focus .bottom-controls,
.easy-player:active .bottom-controls,
.easy-player.hover .bottom-controls,
.easy-player.focused .bottom-controls,
.easy-player.active .bottom-controls,
.easy-player:hover .control-panel,
.easy-player:focus .control-panel,
.easy-player:active .control-panel,
.easy-player.hover .control-panel,
.easy-player.focused .control-panel,
.easy-player.active .control-panel,
.easy-player:hover .player-bar,
.easy-player:focus .player-bar,
.easy-player:active .player-bar,
.easy-player.hover .player-bar,
.easy-player.focused .player-bar,
.easy-player.active .player-bar,
.easy-player:hover .media-controls,
.easy-player:focus .media-controls,
.easy-player:active .media-controls,
.easy-player.hover .media-controls,
.easy-player.focused .media-controls,
.easy-player.active .media-controls,
.easy-player:hover .buttons-box,
.easy-player:focus .buttons-box,
.easy-player:active .buttons-box,
.easy-player.hover .buttons-box,
.easy-player.focused .buttons-box,
.easy-player.active .buttons-box,
.easy-player:hover .h265web-btn,
.easy-player:focus .h265web-btn,
.easy-player:active .h265web-btn,
.easy-player.hover .h265web-btn,
.easy-player.focused .h265web-btn,
.easy-player.active .h265web-btn,
.easy-player:hover .controlBar,
.easy-player:focus .controlBar,
.easy-player:active .controlBar,
.easy-player.hover .controlBar,
.easy-player.focused .controlBar,
.easy-player.active .controlBar {
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
}

/* 但是禁用控制栏区域的指针事件 */
.easy-player .controls,
.easy-player .control-bar,
.easy-player .player-controls,
.easy-player .video-controls,
.easy-player .bottom-controls,
.easy-player .control-panel,
.easy-player .player-bar,
.easy-player .media-controls,
.easy-player .buttons-box,
.easy-player .h265web-btn,
.easy-player .controlBar,
.easy-player .vjs-control-bar,
.easy-player .plyr__controls,
.easy-player .dplayer-controller,
.easy-player .jessibuca-controls,
.easy-player .jessibuca-control-bar,
.easy-player .webrtc-controls,
.easy-player .flv-controls {
  pointer-events: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
  touch-action: none !important;
}

/* 使用CSS变量来强制覆盖可能的内联样式 */
.easy-player {
  --controls-display: none !important;
  --controls-visibility: hidden !important;
  --controls-opacity: 0 !important;
  --controls-pointer-events: none !important;
}

/* 应用CSS变量 */
.easy-player .controls,
.easy-player .control-bar,
.easy-player .player-controls {
  display: var(--controls-display) !important;
  visibility: var(--controls-visibility) !important;
  opacity: var(--controls-opacity) !important;
  pointer-events: var(--controls-pointer-events) !important;
}

/* 禁用可能的媒体查询中的悬停效果 */
@media (hover: hover) {
  .easy-player:hover .controls,
  .easy-player:hover .control-bar,
  .easy-player:hover .player-controls {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
}

@media (hover: none) {
  .easy-player .controls,
  .easy-player .control-bar,
  .easy-player .player-controls {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
}

/* 禁用触摸设备上的悬停效果 */
@media (pointer: coarse) {
  .easy-player .controls,
  .easy-player .control-bar,
  .easy-player .player-controls {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
}

/* 确保时间轴和侧边栏的鼠标事件正常工作 */
.player-option-box,
.player-option-box *,
.record-list-box,
.record-list-box *,
.record-play-control,
.record-play-control * {
  pointer-events: auto !important;
  user-select: auto !important;
  -webkit-user-select: auto !important;
  -moz-user-select: auto !important;
  -ms-user-select: auto !important;
}

/* 确保时间轴组件的鼠标事件正常 - 最高优先级 */
.timeline-container,
.timeline-container *,
.video-timeline,
.video-timeline *,
.timeline-ruler,
.timeline-ruler *,
.timeline-track,
.timeline-track *,
.timeline-segment,
.timeline-segment *,
.timeline-cursor,
.timeline-cursor *,
.timeline-handle,
.timeline-handle *,
.timeline-progress,
.timeline-progress *,
.timeline-time-marker,
.timeline-time-marker * {
  pointer-events: auto !important;
  user-select: auto !important;
  -webkit-user-select: auto !important;
  -moz-user-select: auto !important;
  -ms-user-select: auto !important;
  cursor: pointer !important;
  z-index: 300 !important; /* 最高层级 */
}

/* 确保侧边栏容器和所有子元素的鼠标事件正常 */
.record-list-box-box,
.record-list-box-box *,
.record-list-box,
.record-list-box *,
.sidebar-container,
.sidebar-container *,
.sidebar-header,
.sidebar-header *,
.record-list,
.record-list *,
.record-list-item,
.record-list-item *,
.infinite-list,
.infinite-list *,
.infinite-list-item,
.infinite-list-item *,
.el-tag,
.el-tag *,
.el-icon-video-camera,
.el-icon-download {
  pointer-events: auto !important;
  user-select: auto !important;
  -webkit-user-select: auto !important;
  -moz-user-select: auto !important;
  -ms-user-select: auto !important;
  cursor: pointer !important;
  z-index: 1002 !important; /* 确保在最上层 */
}

/* 确保Element UI组件的鼠标事件正常 */
.el-date-editor,
.el-date-editor *,
.el-dropdown,
.el-dropdown *,
.el-dropdown-menu,
.el-dropdown-menu *,
.el-dropdown-item,
.el-dropdown-item * {
  pointer-events: auto !important;
  user-select: auto !important;
}

/* 时间轴拖动时的视觉反馈 */
.timeline-dragging {
  cursor: grabbing !important;
}

.timeline-dragging * {
  cursor: grabbing !important;
}

/* 文件选择时的高亮效果 */
.record-list-item.selected .el-tag {
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.5);
  transform: scale(1.02);
  transition: all 0.3s ease;
}

/* 时间轴悬停效果 */
.video-timeline:hover {
  opacity: 1 !important;
}

/* 确保时间轴在拖动时保持最高优先级 */
.player-option-box.timeline-active {
  z-index: 999 !important;
}

.player-option-box.timeline-active * {
  z-index: 999 !important;
}
</style>
