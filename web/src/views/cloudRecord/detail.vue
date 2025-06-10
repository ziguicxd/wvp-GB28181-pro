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
                  <!-- 播放器控制栏拦截层已移除 -->
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

    // 截图功能已移除
  },
  destroyed() {
    this.$destroy('recordVideoPlayer')

    // 清理监控
    this.stopTimeUpdateMonitor()
  },
  methods: {
    sidebarControl() {
      this.showSidebar = !this.showSidebar
    },
    snap() {
      this.$message.info('截图功能暂不可用')
    },

    playLast() {
      // 播放上一个
      if (this.chooseFileIndex === 0) {
        return
      }
      this.chooseFile(this.chooseFileIndex - 1)
    },
    playNext() {
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
      // 快退五秒
      this.playSeekValue -= 5 * 1000
      this.playRecord()
    },
    seekForward() {
      // 快进五秒
      this.playSeekValue += 5 * 1000
      this.playRecord()
    },
    stopPLay() {
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
    },
    pausePlay() {
      const player = this.$refs.recordVideoPlayer

      if (!player) {
        return
      }

      try {
        // 保存当前播放位置和时间
        this.pausedPosition = this.getCurrentPlayerTime(player)
        this.pausedPlayTime = this.playTime

        // 使用播放器的pause方法
        if (typeof player.pause === 'function') {
          player.pause()
        }
        
        this.playing = false
        this.stopTimeUpdateMonitor()
      } catch (error) {
        console.error('暂停失败:', error)
        this.playing = false
      }
    },
    play() {
      const player = this.$refs.recordVideoPlayer

      if (!player) {
        this.playRecord()
        return
      }

      try {
        // 检查是否有暂停位置需要恢复
        if (this.pausedPosition !== null || this.pausedPlayTime !== null) {
          this.resumeFromPausedPosition()
          return
        }

        // 如果有视频URL且播放器已加载，尝试恢复播放
        if (this.videoUrl && player.loaded) {
          // 使用播放器的play方法
          if (typeof player.play === 'function') {
            player.play()
            this.playing = true
            this.startTimeUpdateMonitor()
          } else {
            this.playRecord()
          }
        } else {
          this.playRecord()
        }
      } catch (error) {
        console.error('播放失败:', error)
        this.playRecord()
      }
    },
    resumeFromPausedPosition() {
      // 从暂停位置恢复播放
      try {
        const player = this.$refs.recordVideoPlayer

        if (!player) {
          this.playRecord()
          return
        }

        // 恢复播放时间
        if (this.pausedPlayTime !== null) {
          this.playTime = this.pausedPlayTime
          if (this.$refs.Timeline) {
            this.$refs.Timeline.setTime(this.playTime)
          }
        }

        // 设置播放位置
        if (this.pausedPosition !== null && typeof player.seek === 'function') {
          player.seek(this.pausedPosition)
        }

        // 开始播放
        if (typeof player.play === 'function') {
          player.play()
        }

        this.playing = true
        this.pausedPosition = null
        this.pausedPlayTime = null
        this.startTimeUpdateMonitor()

      } catch (error) {
        console.error('从暂停位置恢复播放失败:', error)
        this.pausedPosition = null
        this.pausedPlayTime = null
        this.playRecord()
      }
    },
    fullScreen() {
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
      // 清除之前的暂停状态
      this.pausedPosition = null
      this.pausedPlayTime = null

      // 设置加载状态
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
      }
    },
    getCurrentPlayerTime(player) {
      // 获取播放器当前时间
      try {
        // 使用播放器的currentTime属性
        if (player.currentTime !== undefined && player.currentTime !== null) {
          return player.currentTime < 1000000000 ? player.currentTime * 1000 : player.currentTime
        }
        
        // 备用：使用当前的playTime
        if (this.playTime !== null && this.playTime !== undefined) {
          return this.playTime
        }
        
        return null
      } catch (error) {
        console.error('获取播放器时间失败:', error)
        return null
      }
    },
    playingChange(val) {
      // 播放状态变化时触发
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
    },
    getPlayerPlayingState(player) {
      // 获取播放器播放状态
      try {
        // 使用播放器的playing属性
        if (player.playing !== undefined) {
          return player.playing
        }
        
        return false
      } catch (error) {
        console.error('获取播放器状态失败:', error)
        return false
      }
    },
    onPlayerLoaded() {
      // 播放器加载完成回调
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
            this.chooseFileIndex = i
            this.playSeekValue = this.playTime - file.startTime
            this.playRecord()
          }
          break
        }
      }
    },
    timelineMouseDown() {
      // 标记时间轴拖动开始
      this.timelineControl = true
    },
    mouseupTimeline() {
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
        if (this.playTime > item.endTime) {
          timeLength += item.timeLen
        } else if (this.playTime >= item.startTime && this.playTime <= item.endTime) {
          timeLength += (this.playTime - item.startTime)
          this.chooseFileIndex = i // 更新当前选择的文件索引
          fileFound = true
          break
        }
      }

      if (fileFound) {
        // 更新播放时间和播放位置
        this.playSeekValue = timeLength
        this.playRecordFromCurrentTime() // 播放对应文件从当前时间开始
      } else {
        // 提示没有视频文件
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
    },
    stopTimeUpdateMonitor() {
      // 停止时间更新监控
      if (this.timeUpdateInterval) {
        clearInterval(this.timeUpdateInterval)
        this.timeUpdateInterval = null
      }
    },

  }
}
</script>

<style>
/* 播放器和控制栏样式 */

/* 播放器样式 */

/* 记录列表样式 */
.easy-play.record-list-box-box {
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

.record-list-item:hover {
  background-color: rgba(64, 158, 255, 0.1);
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
</style>
