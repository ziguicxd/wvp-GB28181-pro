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
          <h265web ref="recordVideoPlayer" :video-url="videoUrl" :height="'calc(100vh - 250px)'" :show-button="false" @playTimeChange="showPlayTimeChange" @playStatusChange="playingChange"/>
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
      // 播放上一个
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
      this.playRecord()
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
<<<<<<< HEAD
=======
    playRecordByFileIndex(fileIndex) {
      console.log('播放指定文件索引:', fileIndex)
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
<<<<<<< HEAD
          // 不需要seek，直接播放新文件
=======

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
            // 计算当前文件内的相对seek值
            let baseSeekValue = 0
            for (let i = 0; i < fileIndex; i++) {
              baseSeekValue += this.detailFiles[i].timeLen
            }
            const fileSeekValue = this.playSeekValue - baseSeekValue

            console.log('执行seek定位 - 全局seek值:', this.playSeekValue, '，文件内seek值:', fileSeekValue)

            // 检查seek值是否在当前文件范围内
            if (fileSeekValue >= 0 && fileSeekValue <= this.detailFiles[fileIndex].timeLen) {
              this.seekRecord()
            } else {
              console.warn('seek值超出当前文件范围，跳过seek操作 - fileSeekValue:', fileSeekValue, '，文件时长:', this.detailFiles[fileIndex].timeLen)
            }
          }
>>>>>>> 1eb0c96c5 (屏蔽H265播放器原始日志)
        })
        .catch((error) => {
          console.log('加载文件失败:', error)
        })
        .finally(() => {
          this.playLoading = false
        })
    },
>>>>>>> 5d981ee5c (优化h265webjs播放器的销毁和事件处理)
    seekRecord() {
<<<<<<< HEAD
=======
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

      // 计算当前文件内的相对seek值
      let baseSeekValue = 0
      if (this.chooseFileIndex !== null) {
        for (let i = 0; i < this.chooseFileIndex; i++) {
          baseSeekValue += this.detailFiles[i].timeLen
        }
      }

      // 当前文件内的seek值（毫秒）
      const fileSeekValue = this.playSeekValue - baseSeekValue

      console.log('执行seek定位 - 全局seek值:', this.playSeekValue, 'ms，文件内seek值:', fileSeekValue, 'ms')

      // 验证seek值是否在合理范围内
      if (this.chooseFileIndex !== null && this.detailFiles[this.chooseFileIndex]) {
        const currentFile = this.detailFiles[this.chooseFileIndex]
        if (fileSeekValue < 0 || fileSeekValue > currentFile.timeLen) {
          console.warn('seek值超出当前文件范围，调整到文件边界 - fileSeekValue:', fileSeekValue, '，文件时长:', currentFile.timeLen)
          // 调整到文件边界
          const adjustedSeekValue = Math.max(0, Math.min(fileSeekValue, currentFile.timeLen))
          this.playSeekValue = baseSeekValue + adjustedSeekValue
          console.log('调整后的seek值:', this.playSeekValue)
        }
      }

      // 记录播放状态，用于seek后恢复
      const wasPlaying = this.$refs.recordVideoPlayer.playing

      // 暂停播放器，避免seek时的状态冲突
      if (wasPlaying && this.$refs.recordVideoPlayer.pause) {
        this.$refs.recordVideoPlayer.pause()
      }

      // 重新计算最终的文件内seek值（可能已经被调整过）
      const finalFileSeekValue = this.playSeekValue - baseSeekValue

      // 关键修复：对于按文件索引加载的流，ZLMediaKit期望的是文件内的相对时间
      // 但是对于第一个文件（索引0），如果是通过loadRecord加载的，可能期望全局时间
      let seekValueToSend = finalFileSeekValue

      // 检查流名称是否包含文件索引（_0, _1, _2等）
      if (this.streamInfo.stream && this.streamInfo.stream.includes('_' + this.chooseFileIndex)) {
        // 这是按文件索引加载的流，使用文件内相对时间
        seekValueToSend = finalFileSeekValue
        console.log('检测到按文件索引加载的流，使用文件内seek值:', seekValueToSend, 'ms')
      } else {
        // 这可能是整体录像流，使用全局时间
        seekValueToSend = this.playSeekValue
        console.log('检测到整体录像流，使用全局seek值:', seekValueToSend, 'ms')
      }

>>>>>>> 1eb0c96c5 (屏蔽H265播放器原始日志)
      this.$store.dispatch('cloudRecord/seek', {
        mediaServerId: this.streamInfo.mediaServerId,
        app: this.streamInfo.app,
        stream: this.streamInfo.stream,
        seek: seekValueToSend,
        schema: 'fmp4'
      })
<<<<<<< HEAD
=======
        .then(() => {
          console.log('后端seek操作成功 - 发送的seek值:', seekValueToSend, 'ms')

          // 后端seek成功后，同步前端播放器
          this.syncPlayerSeek(wasPlaying)
        })
>>>>>>> 1eb0c96c5 (屏蔽H265播放器原始日志)
        .catch((error) => {
          console.log(error)
        })
    },
<<<<<<< HEAD
=======
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

        // 立即更新显示时间，不等待播放器回调
        this.updateDisplayTime()

        // 延迟一点时间，确保后端seek操作完成
        setTimeout(() => {
          console.log('开始前端播放器seek操作')
          console.log('播放器状态检查:', {
            playerExists: !!this.$refs.recordVideoPlayer,
            seekMethodExists: !!(this.$refs.recordVideoPlayer && this.$refs.recordVideoPlayer.seek),
            playerLoaded: !!(this.$refs.recordVideoPlayer && this.$refs.recordVideoPlayer.loaded),
            playing: !!(this.$refs.recordVideoPlayer && this.$refs.recordVideoPlayer.playing)
          })

          if (this.$refs.recordVideoPlayer && this.$refs.recordVideoPlayer.seek) {
            console.log('调用播放器seek方法，目标时间:', seekTimeInSeconds, '秒')
            const seekSuccess = this.$refs.recordVideoPlayer.seek(seekTimeInSeconds)
            console.log('播放器seek方法返回值:', seekSuccess)

            // seek成功后再次更新显示时间
            if (seekSuccess) {
              console.log('前端播放器seek成功')
              // 延迟一点时间再更新，确保播放器内部状态已更新
              setTimeout(() => {
                this.updateDisplayTime()
              }, 100)
            } else {
              console.warn('前端播放器seek失败，尝试重新加载播放器')
              // 如果seek失败，尝试重新加载播放器到目标位置
              if (this.chooseFileIndex !== null) {
                this.playRecordByFileIndex(this.chooseFileIndex)
              }
            }

            // 恢复播放状态
            if (wasPlaying) {
              setTimeout(() => {
                if (this.$refs.recordVideoPlayer && !this.$refs.recordVideoPlayer.playing) {
                  console.log('恢复播放状态')
                  this.$refs.recordVideoPlayer.unPause()
                }
              }, 300) // 增加延迟时间
            }
          } else {
            console.warn('播放器不支持seek操作，尝试重新加载播放器')
            // 如果不支持seek，重新加载播放器到目标位置
            if (this.chooseFileIndex !== null) {
              this.playRecordByFileIndex(this.chooseFileIndex)
            }

            // 如果不支持seek，至少恢复播放状态
            if (wasPlaying) {
              setTimeout(() => {
                if (this.$refs.recordVideoPlayer && !this.$refs.recordVideoPlayer.playing) {
                  this.$refs.recordVideoPlayer.unPause()
                }
              }, 300)
            }
          }
        }, 800) // 增加延迟时间，给后端seek操作更多时间
      }
    },
    updateDisplayTime() {
      // 手动更新显示时间，确保seek后时间显示正确
      if (this.chooseFileIndex !== null && this.detailFiles[this.chooseFileIndex]) {
        const selectedFile = this.detailFiles[this.chooseFileIndex]

        // 计算当前文件的基础seek值
        let baseSeekValue = 0
        for (let i = 0; i < this.chooseFileIndex; i++) {
          baseSeekValue += this.detailFiles[i].timeLen
        }

        // 计算在当前文件内的偏移时间（毫秒）
        const offsetInFile = this.playSeekValue - baseSeekValue

        // 更新playTime为目标时间
        this.playTime = selectedFile.startTime + offsetInFile

        // 同时更新playerTime
        this.playerTime = offsetInFile

        console.log('手动更新显示时间:', {
          playTime: this.playTime,
          playerTime: this.playerTime,
          offsetInFile: offsetInFile,
          selectedFileStartTime: selectedFile.startTime
        })
      }
    },
>>>>>>> 1eb0c96c5 (屏蔽H265播放器原始日志)
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
<<<<<<< HEAD
      this.playTime += (val * 1000 - this.playerTime)
      this.playerTime = val * 1000
=======
      // val是播放器的当前播放时间（秒），需要转换为绝对时间戳
      if (this.chooseFileIndex !== null && this.detailFiles[this.chooseFileIndex]) {
        const selectedFile = this.detailFiles[this.chooseFileIndex]

        // 计算当前播放的绝对时间：文件开始时间 + 播放器当前时间
        const newPlayTime = selectedFile.startTime + (val * 1000)
        const newPlayerTime = val * 1000

        // 如果正在拖动时间轴，忽略播放器的时间回调，避免冲突
        if (this.timelineControl) {
          console.log('正在拖动时间轴，忽略播放器时间回调')
          return
        }

        // 更新时间
        this.playTime = newPlayTime
        this.playerTime = newPlayerTime

        // console.log('播放器时间更新:', {
        //   playerSeconds: val,
        //   playTime: this.playTime,
        //   playerTime: this.playerTime
        // })
      }
>>>>>>> 1eb0c96c5 (屏蔽H265播放器原始日志)
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
<<<<<<< HEAD
    mouseupTimeline(event) {
=======
    onSeekFinish() {
      console.log('播放器seek完成回调')
      // 播放器seek完成后，确保显示时间正确
      this.updateDisplayTime()
    },
    mouseupTimeline() {
>>>>>>> 1eb0c96c5 (屏蔽H265播放器原始日志)
      if (!this.timelineControl) {
        this.timelineControl = false
        return
      }
      this.timelineControl = false
      let timeLength = 0
      for (let i = 0; i < this.detailFiles.length; i++) {
        const item = this.detailFiles[i]
        if (this.playTime > item.endTime) {
          timeLength += item.timeLen
        } else if (this.playTime === item.endTime) {
          timeLength += item.timeLen
          this.chooseFileIndex = i
          break
        } else if (this.playTime > item.startTime && this.playTime < item.endTime) {
          timeLength += (this.playTime - item.startTime)
          this.chooseFileIndex = i
          break
        }
      }
      this.playSeekValue = timeLength
      this.playRecord()
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
