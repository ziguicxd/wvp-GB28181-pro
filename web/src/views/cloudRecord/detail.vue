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
        <div class="playBox" style="height: calc(100% - 90px); width: 100%; background-color: #000000">
          <div v-if="playLoading" style="position: relative; left: calc(50% - 32px); top: 43%; z-index: 100;color: #fff;float: left; text-align: center;">
            <div class="el-icon-loading" />
            <div style="width: 100%; line-height: 2rem">正在加载</div>
          </div>
          <h265web ref="recordVideoPlayer" :video-url="videoUrl" :height="'calc(100vh - 250px)'" :show-button="false" @playTimeChange="showPlayTimeChange" @playStatusChange="playingChange" @seekFinish="onSeekFinish"/>
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
        <div style="height: 40px; background-color: #383838; display: grid; grid-template-columns: 1fr 600px 1fr">
          <div style="text-align: left;">
            <div class="record-play-control" style="background-color: transparent; box-shadow: 0 0 10px transparent">
              <a target="_blank" class="record-play-control-item iconfont icon-list" title="列表" @click="sidebarControl()" />
              <a target="_blank" class="record-play-control-item iconfont icon-camera1196054easyiconnet" title="截图" @click="snap()" />
              <!--              <a target="_blank" class="record-play-control-item iconfont icon-xiazai011" title="下载" @click="gbPause()" />-->
            </div>
          </div>
          <div style="text-align: center;">
            <div class="record-play-control">
              <a v-if="chooseFileIndex > 0" target="_blank" class="record-play-control-item iconfont icon-diyigeshipin" title="上一个" @click="playLast()" />
              <a v-else style="color: #acacac; cursor: not-allowed" target="_blank" class="record-play-control-item iconfont icon-diyigeshipin" title="上一个" />
              <a target="_blank" class="record-play-control-item iconfont icon-kuaijin" title="快退五秒" @click="seekBackward()" />
              <a target="_blank" class="record-play-control-item iconfont icon-stop1" style="font-size: 14px" title="停止" @click="stopPLay()" />
              <a v-if="playing" target="_blank" class="record-play-control-item iconfont icon-zanting" title="暂停" @click="pausePlay()" />
              <a v-if="!playing" target="_blank" class="record-play-control-item iconfont icon-kaishi" title="播放" @click="play()" />
              <a target="_blank" class="record-play-control-item iconfont icon-houtui" title="快进五秒" @click="seekForward()" />
              <a v-if="chooseFileIndex < detailFiles.length - 1" target="_blank" class="record-play-control-item iconfont icon-zuihouyigeshipin" title="下一个" @click="playNext()" />
              <a v-else style="color: #acacac; cursor: not-allowed" target="_blank" class="record-play-control-item iconfont icon-zuihouyigeshipin" title="下一个" @click="playNext()" />
              <el-dropdown @command="changePlaySpeed">
                <a target="_blank" class="record-play-control-item record-play-control-speed" title="倍速播放">{{ playSpeed }}X</a>
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
              <a v-if="!isFullScreen" target="_blank" class="record-play-control-item iconfont icon-fangdazhanshi" title="全屏" @click="fullScreen()" />
              <a v-else target="_blank" class="record-play-control-item iconfont icon-suoxiao1" title="全屏" @click="fullScreen()" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

import h265web from '../common/h265web.vue'
import VideoTimeline from '../common/VideoTimeLine/index.vue'
import moment from 'moment'
import screenfull from 'screenfull'

export default {
  name: 'CloudRecordDetail',
  components: {
    h265web, VideoTimeline
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
      seekTimer: null, // seek防抖定时器
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
      playSpeedRange: [1, 2, 4, 6, 8, 16]
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
  },
  destroyed() {
    this.$destroy('recordVideoPlayer')
    // 清理定时器
    if (this.seekTimer) {
      clearTimeout(this.seekTimer)
      this.seekTimer = null
    }
  },
  methods: {
    sidebarControl() {
      this.showSidebar = !this.showSidebar
    },
    snap() {
      this.$refs.recordVideoPlayer.screenshot()
    },
    playLast() {
      // 播放上一个
      if (this.chooseFileIndex === 0) {
        return
      }
      this.chooseFile(this.chooseFileIndex - 1)
    },
    playNext() {
      // 播放下一个
      if (this.chooseFileIndex === this.detailFiles.length - 1) {
        return
      }
      this.chooseFile(this.chooseFileIndex + 1)
    },
    changePlaySpeed(speed) {
      console.log(speed)
      // 倍速播放
      this.playSpeed = speed
      if (this.streamInfo) {
        this.$store.dispatch('cloudRecord/speed', {
          mediaServerId: this.streamInfo.mediaServerId,
          app: this.streamInfo.app,
          stream: this.streamInfo.stream,
          speed: this.playSpeed,
          schema: 'ts'
        })
      }
      try {
        if (this.$refs.recordVideoPlayer) {
          this.$refs.recordVideoPlayer.setPlaybackRate(this.playSpeed)
        }
      } catch (error) {
        console.warn('设置播放倍速时出现错误:', error)
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
      // 停止
      try {
        if (this.$refs.recordVideoPlayer) {
          this.$refs.recordVideoPlayer.destroy()
        }
      } catch (error) {
        console.warn('停止播放时出现错误:', error)
      }
      // 重置播放状态和视频URL，确保下次播放时重新加载
      this.playing = false
      this.videoUrl = null
      this.playLoading = false

      // 重置到第一个文件和初始时间
      this.chooseFileIndex = 0
      this.playSeekValue = 0
      this.playerTime = 0
      if (this.detailFiles && this.detailFiles.length > 0) {
        this.playTime = this.detailFiles[0].startTime
        // 同步更新时间轴显示到第一个文件的开始时间
        if (this.$refs.Timeline) {
          this.$refs.Timeline.setTime(this.playTime)
        }
      }

      // 停止时重置倍速为1X
      if (this.playSpeed !== 1) {
        this.changePlaySpeed(1)
      }
    },
    pausePlay() {
      // 暂停
      try {
        if (this.$refs.recordVideoPlayer) {
          this.$refs.recordVideoPlayer.pause()
        }
      } catch (error) {
        console.warn('暂停播放时出现错误:', error)
      }
    },
    play() {
      // 检查播放器是否存在且已加载
      if (this.$refs.recordVideoPlayer &&
          this.$refs.recordVideoPlayer.loaded &&
          !this.playLoading) {
        // 尝试恢复播放
        try {
          this.$refs.recordVideoPlayer.unPause()
        } catch (error) {
          console.warn('恢复播放失败，重新加载视频:', error)
          this.playRecord()
        }
      } else {
        // 播放器未加载或已被销毁，重新加载视频
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
      const playerWidth = this.$refs.recordVideoPlayer.playerWidth
      const playerHeight = this.$refs.recordVideoPlayer.playerHeight
      screenfull.request(document.getElementById('playerBox'))
      screenfull.on('change', (event) => {
        this.$refs.recordVideoPlayer.resize(playerWidth, playerHeight)
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
          // 初始化播放时间为第一个文件的开始时间
          if (this.playTime === null) {
            this.playTime = this.detailFiles[0].startTime
            this.playerTime = 0
          }
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
      // 设置播放时间为选中文件的开始时间
      const selectedFile = this.detailFiles[index]
      this.playTime = selectedFile.startTime
      this.playerTime = 0 // 重置播放器时间

      // 计算到选中文件的seek值（累计前面所有文件的时长）
      let seekValue = 0
      for (let i = 0; i < index; i++) {
        seekValue += this.detailFiles[i].timeLen
      }
      this.playSeekValue = seekValue

      // 同步更新时间轴显示到文件开始时间
      if (this.$refs.Timeline) {
        this.$refs.Timeline.setTime(this.playTime)
      }

      this.playRecordByFileIndex(index)
    },
    playRecord() {
      // 确保播放器状态正确，如果没有在播放则销毁重建
      try {
        if (this.$refs.recordVideoPlayer && !this.$refs.recordVideoPlayer.playing) {
          this.$refs.recordVideoPlayer.destroy()
        }
      } catch (error) {
        console.warn('销毁播放器时出现错误:', error)
      }

      this.playLoading = true
      this.$store.dispatch('cloudRecord/loadRecord', {
        app: this.app,
        stream: this.stream,
        date: this.chooseDate
      })
        .then(data => {
          this.streamInfo = data
          if (location.protocol === 'https:') {
            this.videoUrl = data['https_fmp4'] + '&time=' + new Date().getTime()
          } else {
            this.videoUrl = data['fmp4'] + '&time=' + new Date().getTime()
          }
          this.seekRecord()
        })
        .catch((error) => {
          console.log(error)
        })
        .finally(() => {
          this.playLoading = false
        })
    },
    playRecordByFileIndex(fileIndex) {
      console.log('播放指定文件索引:', fileIndex, '，seek值:', this.playSeekValue)
      // 确保播放器状态正确，如果没有在播放则销毁重建
      try {
        if (this.$refs.recordVideoPlayer && !this.$refs.recordVideoPlayer.playing) {
          this.$refs.recordVideoPlayer.destroy()
        }
      } catch (error) {
        console.warn('销毁播放器时出现错误:', error)
      }

      this.playLoading = true
      this.$store.dispatch('cloudRecord/loadRecordByFileIndex', {
        app: this.app,
        stream: this.stream,
        date: this.chooseDate,
        fileIndex: fileIndex
      })
        .then(data => {
          console.log('加载文件成功:', data)
          this.streamInfo = data
          if (location.protocol === 'https:') {
            this.videoUrl = data['https_fmp4'] + '&time=' + new Date().getTime()
          } else {
            this.videoUrl = data['fmp4'] + '&time=' + new Date().getTime()
          }

          // 更新播放时间状态
          if (this.detailFiles[fileIndex]) {
            const selectedFile = this.detailFiles[fileIndex]
            // 计算文件内的偏移时间
            let baseSeekValue = 0
            for (let i = 0; i < fileIndex; i++) {
              baseSeekValue += this.detailFiles[i].timeLen
            }
            const offsetInFile = this.playSeekValue - baseSeekValue
            this.playTime = selectedFile.startTime + offsetInFile
            this.playerTime = offsetInFile
          }

          // 如果有seek值，则进行seek定位
          if (this.playSeekValue > 0) {
            console.log('执行seek定位到:', this.playSeekValue)
            this.seekRecord()
          }
        })
        .catch((error) => {
          console.log('加载文件失败:', error)
        })
        .finally(() => {
          this.playLoading = false
        })
    },
    seekRecord() {
      // 检查播放器和流信息是否准备好
      if (!this.$refs.recordVideoPlayer || !this.streamInfo) {
        console.warn('播放器或流信息未准备好，跳过seek操作')
        return
      }

      // 防抖处理：清除之前的定时器
      if (this.seekTimer) {
        clearTimeout(this.seekTimer)
      }

      // 延迟执行seek，避免频繁操作
      this.seekTimer = setTimeout(() => {
        this.doSeekRecord()
      }, 300) // 300ms防抖
    },
    doSeekRecord() {
      // 再次检查状态
      if (!this.$refs.recordVideoPlayer || !this.streamInfo) {
        console.warn('播放器或流信息未准备好，取消seek操作')
        return
      }

      console.log('执行seek定位到:', this.playSeekValue, 'ms')

      // 记录播放状态，用于seek后恢复
      const wasPlaying = this.$refs.recordVideoPlayer.playing

      // 暂停播放器，避免seek时的状态冲突
      if (wasPlaying && this.$refs.recordVideoPlayer.pause) {
        this.$refs.recordVideoPlayer.pause()
      }

      this.$store.dispatch('cloudRecord/seek', {
        mediaServerId: this.streamInfo.mediaServerId,
        app: this.streamInfo.app,
        stream: this.streamInfo.stream,
        seek: this.playSeekValue,
        schema: 'fmp4'
      })
        .then(() => {
          console.log('后端seek操作成功')

          // 后端seek成功后，同步前端播放器
          this.syncPlayerSeek(wasPlaying)
        })
        .catch((error) => {
          // 静默处理seek错误，不影响用户体验
          console.warn('seek操作失败:', error)

          // 即使后端seek失败，也尝试前端seek
          this.syncPlayerSeek(wasPlaying)
        })
    },
    syncPlayerSeek(wasPlaying) {
      // 计算播放器需要seek到的时间（秒）
      // playSeekValue是从录像开始的毫秒数，需要转换为当前文件内的秒数
      if (this.chooseFileIndex !== null && this.detailFiles[this.chooseFileIndex]) {
        let baseSeekValue = 0
        for (let i = 0; i < this.chooseFileIndex; i++) {
          baseSeekValue += this.detailFiles[i].timeLen
        }

        // 计算在当前文件内的偏移时间（毫秒）
        const offsetInFile = this.playSeekValue - baseSeekValue
        // 转换为秒
        const seekTimeInSeconds = offsetInFile / 1000

        console.log('前端播放器seek到:', seekTimeInSeconds, '秒（文件内偏移）')

        // 延迟一点时间，确保后端seek操作完成
        setTimeout(() => {
          if (this.$refs.recordVideoPlayer && this.$refs.recordVideoPlayer.seek) {
            const seekSuccess = this.$refs.recordVideoPlayer.seek(seekTimeInSeconds)

            // 恢复播放状态
            if (wasPlaying) {
              setTimeout(() => {
                if (this.$refs.recordVideoPlayer && !this.$refs.recordVideoPlayer.playing) {
                  this.$refs.recordVideoPlayer.unPause()
                }
              }, 200)
            }

            if (seekSuccess) {
              console.log('前端播放器seek成功')
            } else {
              console.warn('前端播放器seek失败')
            }
          } else {
            console.warn('播放器不支持seek操作')
            // 如果不支持seek，至少恢复播放状态
            if (wasPlaying) {
              setTimeout(() => {
                if (this.$refs.recordVideoPlayer && !this.$refs.recordVideoPlayer.playing) {
                  this.$refs.recordVideoPlayer.unPause()
                }
              }, 200)
            }
          }
        }, 500) // 给后端seek操作一些时间
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
      // val是播放器的当前播放时间（秒），需要转换为绝对时间戳
      if (this.chooseFileIndex !== null && this.detailFiles[this.chooseFileIndex]) {
        const selectedFile = this.detailFiles[this.chooseFileIndex]
        // 计算当前播放的绝对时间：文件开始时间 + 播放器当前时间
        this.playTime = selectedFile.startTime + (val * 1000)
        this.playerTime = val * 1000
      }
    },
    playingChange(val) {
      this.playing = val
    },
    playTimeChange(val) {
      if (val === this.playTime) {
        return
      }
      this.playTime = val
    },
    timelineMouseDown() {
      this.timelineControl = true
    },
    onSeekFinish() {
      console.log('播放器seek完成回调')
    },
    mouseupTimeline() {
      if (!this.timelineControl) {
        this.timelineControl = false
        return
      }
      this.timelineControl = false

      console.log('时间轴拖动结束，当前时间:', this.playTime, '，文件列表长度:', this.detailFiles.length)

      // 查找拖动时间点对应的文件
      let targetFileIndex = -1
      let timeOffsetInFile = 0 // 在文件内的时间偏移（毫秒）

      for (let i = 0; i < this.detailFiles.length; i++) {
        const item = this.detailFiles[i]
        console.log(`检查文件${i}: ${item.startTime} - ${item.endTime}, 当前时间: ${this.playTime}`)
        if (this.playTime >= item.startTime && this.playTime <= item.endTime) {
          targetFileIndex = i
          timeOffsetInFile = this.playTime - item.startTime
          console.log(`找到目标文件${i}，文件内偏移：${timeOffsetInFile}ms`)
          break
        }
      }

      if (targetFileIndex === -1) {
        console.warn('拖动时间点不在任何文件范围内，查找最近的文件')
        // 如果没有找到精确匹配，查找最近的文件
        let minDistance = Infinity
        for (let i = 0; i < this.detailFiles.length; i++) {
          const item = this.detailFiles[i]
          const distanceToStart = Math.abs(this.playTime - item.startTime)
          const distanceToEnd = Math.abs(this.playTime - item.endTime)
          const minFileDistance = Math.min(distanceToStart, distanceToEnd)

          if (minFileDistance < minDistance) {
            minDistance = minFileDistance
            targetFileIndex = i
            // 如果更接近开始时间，偏移为0；如果更接近结束时间，偏移为文件时长
            timeOffsetInFile = distanceToStart < distanceToEnd ? 0 : item.timeLen
          }
        }

        if (targetFileIndex === -1) {
          console.error('无法找到任何可播放的文件')
          return
        }

        console.log(`使用最近的文件${targetFileIndex}，偏移：${timeOffsetInFile}ms`)
      }

      console.log(`拖动到文件${targetFileIndex}，时间偏移：${timeOffsetInFile}ms`)

      // 检查是否需要切换文件
      if (this.chooseFileIndex !== targetFileIndex) {
        console.log(`切换文件：从${this.chooseFileIndex}到${targetFileIndex}`)
        // 切换到目标文件
        this.chooseFileIndex = targetFileIndex

        // 计算到目标文件的seek值（累计前面所有文件的时长）
        let seekValue = 0
        for (let i = 0; i < targetFileIndex; i++) {
          seekValue += this.detailFiles[i].timeLen
        }
        // 加上文件内的偏移时间
        seekValue += timeOffsetInFile
        this.playSeekValue = seekValue

        console.log(`计算的seek值：${seekValue}ms`)

        // 加载目标文件并seek到指定位置
        this.playRecordByFileIndex(targetFileIndex)
      } else {
        console.log(`在当前文件${targetFileIndex}内seek到偏移：${timeOffsetInFile}ms`)
        // 在当前文件内seek
        // 计算当前文件的基础seek值
        let baseSeekValue = 0
        for (let i = 0; i < targetFileIndex; i++) {
          baseSeekValue += this.detailFiles[i].timeLen
        }
        // 加上文件内的偏移时间
        this.playSeekValue = baseSeekValue + timeOffsetInFile

        console.log(`文件内seek值：${this.playSeekValue}ms`)

        // 优化：如果流信息存在，直接seek；否则重新加载
        if (this.streamInfo && this.streamInfo.app && this.streamInfo.stream) {
          this.seekRecord()
        } else {
          console.log('流信息不存在，重新加载文件')
          this.playRecordByFileIndex(targetFileIndex)
        }
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
}
.record-play-control-item:hover {
  color: #1f83e6;
}
.record-play-control-speed {
  font-weight: bold;
  color: #fff;
  user-select: none;
}
.player-option-box {
  height: 50px
}
.time-line-show {
  position: relative;
  color: rgba(250, 249, 249, 0.89);
  left: calc(50% - 85px);
  top: -72px;
  text-shadow: 1px 0 #5f6b7c, -1px 0 #5f6b7c, 0 1px #5f6b7c, 0 -1px #5f6b7c, 1.1px 1.1px #5f6b7c, 1.1px -1.1px #5f6b7c, -1.1px 1.1px #5f6b7c, -1.1px -1.1px #5f6b7c;
}
</style>
