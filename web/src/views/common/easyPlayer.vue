<template>
  <div id="easyplayer" class="player-container" :style="playerStyle"></div>
</template>

<script>
export default {
    name: 'player',
    data() {
        return {
            easyPlayer: null,
            playerWidth: 0,
            playerHeight: 0,
            resizeObserver: null
        };
    },
    props: ['videoUrl', 'error', 'hasaudio', 'height'],
    computed: {
        playerStyle() {
            return {
                height: this.height ? this.height : '100%',
                width: '100%'
            }
        }
    },
    mounted () {
      let paramUrl = decodeURIComponent(this.$route.params.url)
      this.$nextTick(() => {
          if (typeof (this.videoUrl) == "undefined") {
            this.videoUrl = paramUrl;
          }
          console.log("初始化时的地址为: " + this.videoUrl)
          this.play(this.videoUrl)
          
          // 监听容器大小变化
          this.observeResize()
          
          // 监听窗口大小变化
          window.addEventListener('resize', this.handleResize)
      })
    },
    watch:{
        videoUrl(newData, oldData){
            this.play(newData)
        },
        height(newHeight, oldHeight) {
            this.$nextTick(() => {
                this.handleResize()
            })
        },
        immediate:true
    },
    methods: {
        play: function (url) {
            if (this.easyPlayer != null) {
              this.easyPlayer.destroy();
            }
            
            const playerElement = document.getElementById('easyplayer')
            if (playerElement) {
                this.playerWidth = playerElement.clientWidth
                this.playerHeight = playerElement.clientHeight
            }
            
            this.easyPlayer = new WasmPlayer(null, 'easyplayer', this.eventcallbacK, {
              Height: true,
              controlBar: false
            })
            
            if (url) {
                this.easyPlayer.play(url, 1)
            }
        },
        pause: function () {
            if (this.easyPlayer) {
                this.easyPlayer.pause()
            }
        },
        destroy: function() {
            if (this.easyPlayer) {
                this.easyPlayer.destroy()
                this.easyPlayer = null
            }
        },
        resize: function(width, height) {
            if (this.easyPlayer && this.easyPlayer.resize) {
                this.easyPlayer.resize(width, height)
                this.playerWidth = width
                this.playerHeight = height
            }
        },
        handleResize: function() {
            const playerElement = document.getElementById('easyplayer')
            if (playerElement && this.easyPlayer) {
                const width = playerElement.clientWidth
                const height = playerElement.clientHeight
                
                if (width !== this.playerWidth || height !== this.playerHeight) {
                    this.resize(width, height)
                }
            }
        },
        observeResize: function() {
            if (typeof ResizeObserver !== 'undefined') {
                const playerElement = document.getElementById('easyplayer')
                if (playerElement) {
                    this.resizeObserver = new ResizeObserver(this.handleResize)
                    this.resizeObserver.observe(playerElement)
                }
            }
        },
        eventcallbacK: function(type, message) {
            // 触发事件到父组件
            this.$emit(type.toLowerCase(), message)
        }
    },
    destroyed() {
        if (this.easyPlayer) {
            this.easyPlayer.destroy()
        }
        
        // 移除事件监听
        window.removeEventListener('resize', this.handleResize)
        
        // 停止观察大小变化
        if (this.resizeObserver) {
            this.resizeObserver.disconnect()
        }
    },
}
</script>

<style>
.player-container {
  width: 100%;
  height: 100%;
  background-color: #000;
  position: relative;
  overflow: hidden;
}

/* 确保播放器内部元素也能正确适配 */
.player-container video,
.player-container canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .player-container {
    max-height: calc(100vh - 180px);
  }
}

@media (min-width: 769px) and (max-width: 1200px) {
  .player-container {
    max-height: calc(100vh - 200px);
  }
}

@media (min-width: 1201px) {
  .player-container {
    max-height: calc(100vh - 220px);
  }
}
</style>

<style>
    .LodingTitle {
        min-width: 70px;
    }
    /* 隐藏logo */
    #easyplayer .iconqingxiLOGO {
        display: none !important;
    }
    /* 防止播放器初始化问题 */
    #easyplayer {
      position: relative;
      z-index: 1;
      height: 100% !important;
      width: 100% !important;
      padding-top: 0 !important;
    }
    /* 修复播放器高度 */
    #easyplayer canvas {
        height: 100% !important;
        width: 100% !important;
        max-height: none !important;
        max-width: none !important;
    }
</style>
