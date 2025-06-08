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
          <easyPlayer ref="recordVideoPlayer" :videoUrl="videoUrl" :height="'calc(100vh - 250px)'" :show-button="false" class="disabled-player-events" />
          <!-- 添加鼠标事件拦截层 -->
          <div class="mouse-event-blocker" @mousemove.stop @click.stop @mousedown.stop @mouseup.stop @contextmenu.stop @dblclick="fullScreen"></div>
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
      playSpeedRange: [1, 2, 4, 6, 8, 16, 20]
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
      // 停止
      if (this.$refs.recordVideoPlayer && typeof this.$refs.recordVideoPlayer.destroy === 'function') {
        this.$refs.recordVideoPlayer.destroy()
      }
      this.videoUrl = null; // 停止播放时清空视频 URL
      this.playing = false
    },
    pausePlay() {
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
      this.chooseFileIndex = index
      let timeLength = 0
      for (let i = 0; i < this.detailFiles.length; i++) {
        if (i < index) {
          timeLength += this.detailFiles[i].timeLen
        }
      }
      this.playSeekValue = timeLength
      this.initTime = Number.parseInt(this.detailFiles[index].startTime) // 更新initTime为当前选择文件的开始时间
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
      if (val === this.playTime) {
        return
      }

      // 更新播放时间
      this.playTime = val

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
    mouseupTimeline(event) {
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
        this.$message.warning('该时间没有录像')
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

/* 添加鼠标事件拦截层样式 */
.mouse-event-blocker {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%; /* 覆盖整个播放区域 */
  z-index: 1; /* 很低的z-index，只覆盖播放器本身 */
  pointer-events: auto; /* 启用指针事件来拦截播放窗口的鼠标事件 */
  background-color: transparent;
  user-select: none; /* 禁止文本选择 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 禁用播放器的鼠标事件 */
.disabled-player-events {
  pointer-events: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
}

/* 禁用播放器内部所有元素的鼠标事件 */
.disabled-player-events * {
  pointer-events: none !important;
  user-select: none !important;
  -webkit-user-select: none !important;
  -moz-user-select: none !important;
  -ms-user-select: none !important;
}

/* 禁用播放器可能的控制栏 */
.disabled-player-events .buttons-box,
.disabled-player-events .h265web-btn,
.disabled-player-events .controlBar {
  display: none !important;
  pointer-events: none !important;
}
</style>
