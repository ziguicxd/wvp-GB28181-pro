<template>
  <div class="carousel-player">
    <!-- 轮播配置对话框 -->
    <el-dialog
      title="选择轮巡播放通道"
      :visible.sync="carouselDialogVisible"
      width="60%"
      class="carousel-dialog"
      :show-close="true"
    >
      <div class="carousel-config">
        <!-- 搜索、在线状态、轮播间隔、开始轮播 在同一行 -->
        <div class="search-form-container">
          <el-form :inline="true" class="search-form">
            <el-form-item label="搜索">
              <el-input
                v-model="searchQuery"
                placeholder="设备/通道编号/名称"
                prefix-icon="el-icon-search"
                clearable
                @input="filterChannels"
              ></el-input>
            </el-form-item>
            
            <el-form-item label="状态">
              <el-select v-model="onlineStatus" placeholder="全部" @change="filterChannels">
                <el-option label="全部" value=""></el-option>
                <el-option label="在线" value="online"></el-option>
                <el-option label="离线" value="offline"></el-option>
              </el-select>
            </el-form-item>
            
            <el-form-item label="轮播间隔">
              <el-select v-model="carouselConfig.interval" placeholder="请选择轮播间隔">
                <el-option :label="'10秒'" :value="10"></el-option>
                <el-option :label="'30秒'" :value="30"></el-option>
                <el-option :label="'1分钟'" :value="60"></el-option>
                <el-option :label="'3分钟'" :value="180"></el-option>
                <el-option :label="'5分钟'" :value="300"></el-option>
              </el-select>
            </el-form-item>
          </el-form>
          
          <div class="start-carousel-btn">
            <el-button type="primary" @click="startCarousel">开始轮播</el-button>
          </div>
        </div>
        
        <!-- 通道列表 -->
        <div class="channel-table-container">
          <el-table
            ref="channelTable"
            :data="filteredChannels"
            style="width: 100%"
            @selection-change="handleSelectionChange"
            height="350"
          >
            <el-table-column
              type="selection"
              width="55">
            </el-table-column>
            <el-table-column
              prop="deviceId"
              label="设备国标编号"
              width="200"
              show-overflow-tooltip>
              <template slot-scope="scope">
                <span class="id-column">{{ scope.row.deviceId }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="id"
              label="通道国标编号"
              width="200"
              show-overflow-tooltip>
              <template slot-scope="scope">
                <span class="id-column">{{ scope.row.id }}</span>
              </template>
            </el-table-column>
            <el-table-column
              prop="name"
              label="通道名称"
              show-overflow-tooltip>
            </el-table-column>
            <el-table-column
              prop="status"
              label="状态"
              width="100"
              align="center">
              <template slot-scope="scope">
                <el-tag :type="scope.row.status === 'online' ? 'success' : 'info'">
                  {{ scope.row.status === 'online' ? '在线' : '离线' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          
          <div class="pagination-container">
            <el-pagination
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
              :current-page="currentPage"
              :page-sizes="[10, 20, 50, 100]"
              :page-size="pageSize"
              layout="total, sizes, prev, pager, next, jumper"
              :total="totalChannels">
            </el-pagination>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  name: 'CarouselPlayer',
  props: {
    // 当前分屏索引
    spiltIndex: {
      type: Number,
      required: true
    },
    // 分屏布局配置
    layout: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      // 轮播相关数据
      carouselActive: false,
      carouselDialogVisible: false,
      carouselConfig: {
        interval: 30, // 默认30秒
        selectedChannels: [],
        currentIndex: 0
      },
      carouselTimer: null,
      allChannels: [], // 所有可选通道
      filteredChannels: [], // 过滤后的通道列表
      searchQuery: '', // 搜索关键词
      onlineStatus: '', // 在线状态过滤
      currentPage: 1, // 当前页码
      pageSize: 10, // 每页显示数量
      totalChannels: 0, // 通道总数
      loading: false
    }
  },
  methods: {
    // 打开轮播对话框
    openCarouselDialog() {
      console.log('轮播按钮被点击');
      
      if (this.carouselActive) {
        // 如果轮播已经激活，则停止轮播
        console.log('停止轮播');
        this.stopCarousel();
        return;
      }
      
      console.log('打开轮播配置对话框');
      this.carouselDialogVisible = true;
      this.searchQuery = '';
      this.onlineStatus = '';
      this.currentPage = 1;
      
      // 每次打开对话框都重新获取通道列表
      this.fetchAllChannels();
    },
    
    // 获取所有通道
    fetchAllChannels() {
      this.loading = true;
      console.log('开始获取通道列表');
      
      // 使用正确的store action
      this.$store.dispatch('device/getDeviceChannelList', {
        page: this.currentPage,
        count: this.pageSize,
        query: this.searchQuery,
        online: this.onlineStatus === 'online' ? true : (this.onlineStatus === 'offline' ? false : null)
      })
      .then(data => {
        if (data && data.list) {
          this.allChannels = data.list.map(item => ({
            id: item.channelId,
            deviceId: item.deviceId || '',
            name: item.name || item.channelId,
            status: item.status === 'ON' ? 'online' : 'offline'
          }));
          this.totalChannels = data.total;
          this.filteredChannels = this.allChannels;
          console.log('处理后的通道列表:', this.filteredChannels);
        } else {
          // 如果store方法失败，尝试直接使用axios
          axios.get('/api/device/query/devices/channels', {
            params: {
              page: this.currentPage,
              count: this.pageSize,
              query: this.searchQuery,
              online: this.onlineStatus === 'online' ? 'true' : (this.onlineStatus === 'offline' ? 'false' : '')
            }
          })
          .then(res => {
            if (res.data && res.data.code === 0 && res.data.data) {
              const data = res.data.data;
              this.allChannels = data.list.map(item => ({
                id: item.channelId,
                deviceId: item.deviceId || '',
                name: item.name || item.channelId,
                status: item.status === 'ON' ? 'online' : 'offline'
              }));
              this.totalChannels = data.total;
              this.filteredChannels = this.allChannels;
            }
          });
        }
      })
      .catch(err => {
        console.error('获取通道列表失败', err);
        this.$message.error('获取通道列表失败: ' + (err.message || '未知错误'));
      })
      .finally(() => {
        this.loading = false;
      });
    },
    
    // 过滤通道列表
    filterChannels() {
      console.log('过滤通道列表，重新获取数据');
      // 直接通过API查询过滤后的数据
      this.fetchAllChannels();
    },
    
    // 处理表格选择变化
    handleSelectionChange(selection) {
      this.carouselConfig.selectedChannels = selection.map(item => item.id);
    },
    
    // 处理页码变化
    handleCurrentChange(currentPage) {
      this.currentPage = currentPage;
      this.fetchAllChannels();
    },
    
    // 处理每页显示数量变化
    handleSizeChange(pageSize) {
      this.pageSize = pageSize;
      this.currentPage = 1;
      this.fetchAllChannels();
    },
    
    // 全选当前页通道
    selectAllChannels() {
      this.$refs.channelTable.toggleAllSelection();
    },
    
    // 开始轮播
    startCarousel() {
      if (this.carouselConfig.selectedChannels.length === 0) {
        this.$message.warning('请选择至少一个轮播通道');
        return;
      }
      
      this.carouselDialogVisible = false;
      this.carouselActive = true;
      this.carouselConfig.currentIndex = 0;
      
      // 获取当前分屏数量
      const windowCount = this.layout[this.spiltIndex].spilt;
      console.log(`开始轮播，分屏模式: ${this.spiltIndex}, 窗口数量: ${windowCount}, 选中通道数: ${this.carouselConfig.selectedChannels.length}`);
      
      // 立即播放通道
      this.playNextChannels();
      
      // 设置定时器，定时切换通道
      this.carouselTimer = setInterval(() => {
        this.playNextChannels();
      }, this.carouselConfig.interval * 1000);
      
      // 触发轮播状态变更事件
      this.$emit('carousel-state-change', true);
    },

    // 停止轮播
    stopCarousel() {
      if (this.carouselTimer) {
        clearInterval(this.carouselTimer);
        this.carouselTimer = null;
      }
      this.carouselActive = false;
      
      // 触发轮播状态变更事件
      this.$emit('carousel-state-change', false);
    },

    // 播放通道（多窗口）
    playNextChannels() {
      const { selectedChannels, currentIndex } = this.carouselConfig;
      const windowCount = this.layout[this.spiltIndex].spilt;
      
      if (selectedChannels.length === 0) {
        return;
      }
      
      // 如果选择的通道数量小于等于窗口数量，每个窗口播放一个通道
      if (selectedChannels.length <= windowCount) {
        selectedChannels.forEach((channelId, index) => {
          this.$emit('play-channel', channelId, index);
        });
      } else {
        // 如果选择的通道数量大于窗口数量，在窗口中轮流播放
        for (let i = 0; i < windowCount; i++) {
          const channelIndex = (currentIndex + i) % selectedChannels.length;
          const channelId = selectedChannels[channelIndex];
          
          this.$emit('play-channel', channelId, i);
          console.log(`轮播播放通道: ${channelId}, 索引: ${channelIndex}/${selectedChannels.length-1}, 窗口: ${i}`);
        }
        
        // 更新索引，循环播放
        this.carouselConfig.currentIndex = (currentIndex + windowCount) % selectedChannels.length;
      }
    },
    
  },
  mounted() { 

  },
  beforeDestroy() {
    // 清除轮播定时器
    this.stopCarousel();
  }
}
</script>

<style>
/* 轮播相关样式 */
.carousel-active:after {
  content: "轮播中";
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 12px;
}

.carousel-dialog {
  display: flex;
  align-items: center;
  justify-content: center;
}

.carousel-dialog .el-dialog {
  margin: 0 auto !important;
  max-height: 80vh;
  overflow-y: auto;
}

.search-form-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.search-form {
  flex: 1;
}

.start-carousel-btn {
  margin-left: 20px;
}

.channel-table-container {
  overflow-x: auto;
}

.pagination-container {
  margin-top: 15px;
  text-align: right;
}

.id-column {
  font-family: monospace;
  letter-spacing: 0.5px;
}
</style>