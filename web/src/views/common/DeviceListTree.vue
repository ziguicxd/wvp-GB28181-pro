<template>
  <div class="device-list-tree">
    <!-- 设备树 -->
    <el-tree
      ref="tree"
      :data="deviceTreeData"
      :props="defaultProps"
      :expand-on-click-node="false"
      node-key="id"
      lazy
      :load="loadNode"
      @node-click="handleNodeClick"
      @node-contextmenu="handleRightClick"
    >
      <span class="custom-tree-node" slot-scope="{ node, data }">
        <!-- 设备图标 -->
        <span v-if="!data.leaf" class="device-icon">
          <svg-icon v-if="data.deviceType === 'gb'" icon-class="device" class="icon-svg" />
          <svg-icon v-else-if="data.deviceType === 'push'" icon-class="streamPush" class="icon-svg" />
          <svg-icon v-else-if="data.deviceType === 'proxy'" icon-class="streamProxy" class="icon-svg" />
          <svg-icon v-else icon-class="tree" class="icon-svg" />
        </span>
        
        <!-- 通道图标 -->
        <span v-if="data.leaf" class="channel-icon">
          <span class="iconfont icon-shexiangtou2" :style="{ color: data.online ? '#409EFF' : '#909399' }"></span>
        </span>
        
        <!-- 名称 -->
        <el-tooltip 
          :content="data.leaf ? data.id : (data.deviceId || '')" 
          placement="right" 
          :disabled="node.level === 1 || (!data.deviceId && !data.id) || (currentHoverNode !== node.data.id)"
          :open-delay="1000"
          :enterable="false"
          popper-class="device-id-tooltip"
        >
          <span 
            :class="data.online ? 'device-online' : 'device-offline'"
            @mouseenter="handleNodeHover(data, node, $event)"
            @mouseleave="handleNodeLeave()"
          >{{ node.label }}</span>
        </el-tooltip>
      </span>
    </el-tree>
  </div>
</template>

<script>


export default {
  name: 'DeviceListTree',
  mounted() {
    // 添加全局样式，确保tooltip位置正确
    this.addGlobalStyle();
  },
  destroyed() {
    // 清理观察器
    if (this.tooltipObserver) {
      this.tooltipObserver.disconnect();
      this.tooltipObserver = null;
    }
    
    // 移除全局样式
    const styleElement = document.getElementById('device-tree-tooltip-style');
    if (styleElement) {
      document.head.removeChild(styleElement);
    }
  },
  props: {
    edit: {
      type: Boolean,
      default: false
    },
    showHeader: {
      type: Boolean,
      default: true
    },
    hasChannel: {
      type: Boolean,
      default: false
    },
    clickEvent: {
      type: Function
    }
  },
  data() {
    return {
      deviceTreeData: [],
      defaultProps: {
        children: 'children',
        label: 'name',
        isLeaf: 'leaf'
      },
      lastClickedNode: null, // 记录最后点击的节点
      lastClickTime: 0, // 记录最后点击的时间
      hoverTimer: null, // 鼠标悬停计时器
      currentHoverNode: null, // 当前悬停的节点
      lastMouseEvent: null, // 记录最后的鼠标事件
      tooltipObserver: null // 提示框观察器
    }
  },
  watch: {
  },
  methods: {
    // 加载节点数据（懒加载）
    loadNode(node, resolve) {
      if (node.level === 0) {
        // 根节点，加载设备类型分类
        this.loadDeviceCategories(resolve);
      } else if (node.level === 1) {
        // 设备类型节点，加载该类型下的设备
        this.loadDevicesByType(node.data.id, resolve);
      } else if (node.level === 2 && this.hasChannel) {
        // 设备节点，加载通道
        this.loadChannels(node.data.deviceId, resolve);
      } else {
        resolve([]);
      }
    },
    
    // 加载设备类型分类
    loadDeviceCategories(resolve) {
      const categories = [
        { id: 'gb', name: '国标设备', deviceType: 'gb', leaf: false },
        { id: 'push', name: '推流列表', deviceType: 'push', leaf: false },
        { id: 'proxy', name: '拉流代理', deviceType: 'proxy', leaf: false }
      ];
      resolve(categories);
    },
    
    // 加载指定类型的设备
    loadDevicesByType(deviceType, resolve) {
      // 使用与主菜单相同的API查询设备
      this.$store.dispatch('device/queryDevices', {
        page: 1,
        count: 9999,
        query: '',
        status: null
      }).then(data => {
        if (data && data.list) {
          // 根据设备类型过滤设备
          const filteredList = deviceType === 'gb' ? 
            data.list.filter(device => !device.pushingStreamDevice && !device.proxyDevice) : 
            data.list.filter(device => {
              if (deviceType === 'push') return device.pushingStreamDevice;
              if (deviceType === 'proxy') return device.proxyDevice;
              return false;
            });
          
          const devices = filteredList.map(device => ({
            id: device.id,
            name: device.name || device.deviceId,
            deviceId: device.deviceId,
            deviceType: deviceType,
            online: device.onLine,
            leaf: !this.hasChannel
          }));
          resolve(devices);
        } else {
          resolve([]);
        }
      }).catch(error => {
        console.error('加载设备失败:', error);
        resolve([]);
      });
    },
    
    // 加载设备的通道
    loadChannels(deviceId, resolve) {
      // 使用与主菜单相同的API查询通道
      const params = {
        page: 1,
        count: 9999,
        query: '',
        online: null,
        channelType: null,
        catalogUnderDevice: true
      };
      
      this.$store.dispatch('device/queryChannels', [deviceId, params])
        .then(data => {
          if (data && data.list) {

            const channels = data.list.map(channel => ({
              id: channel.id,
              name: channel.name || channel.deviceId,
              channelId: channel.deviceId,
              deviceId: deviceId,
              online: channel.status === 'ON',
              leaf: true
            }));
            resolve(channels);
          } else {
            resolve([]);
          }
        }).catch(error => {
          console.error('加载通道失败:', error);
          resolve([]);
        });
    },
    
    // 节点点击事件
    handleNodeClick(data, node) {
      const currentTime = new Date().getTime();
      
      // 检查是否是重复点击同一节点（300毫秒内的重复点击视为无效）
      if (this.lastClickedNode === node && (currentTime - this.lastClickTime) < 300) {
        return; // 忽略重复点击
      }
      
      // 移除之前点击节点的样式
      if (this.lastClickedNode) {
        const el = this.$refs.tree.getNode(this.lastClickedNode.data.id).$el;
        if (el) {
          el.classList.remove('is-clicked');
        }
      }
      
      // 更新最后点击的节点和时间
      this.lastClickedNode = node;
      this.lastClickTime = currentTime;
      
      // 添加当前点击节点的样式
      if (node.$el) {
        node.$el.classList.add('is-clicked');
      }
      
      // 点击时隐藏提示
      this.currentHoverNode = null;
      
      // 如果是叶子节点（通道）或者是设备节点，触发回调
      if (data.leaf) {
        if (this.clickEvent) {
          this.clickEvent(data);
        }
        return; // 叶子节点不需要展开/折叠操作
      }
      
      // 如果是非叶子节点，尝试展开/折叠
      if (!data.leaf) {
        if (node.expanded) {
          // 如果已经展开，则折叠
          node.collapse();
        } else {
          // 如果未展开，则展开
          node.expand();
        }
      }
    },
    
    // 右键菜单事件
    handleRightClick(event, data, node) {
      if (!this.edit) return;
      
      const menuItems = [];
      
      // 设备类型节点
      if (node.level === 1) {
        menuItems.push({
          label: '刷新',
          icon: 'el-icon-refresh',
          onClick: () => this.refreshNode(node)
        });
      }
      
      // 设备节点
      if (node.level === 2) {
        menuItems.push({
          label: '刷新',
          icon: 'el-icon-refresh',
          onClick: () => this.refreshNode(node)
        });
        
        if (data.online) {
          menuItems.push({
            label: '查看详情',
            icon: 'el-icon-view',
            onClick: () => this.viewDeviceDetails(data.deviceId)
          });
        }
      }
      
      // 通道节点
      if (node.level === 3 && data.leaf) {
        if (data.online) {
          menuItems.push({
            label: '播放',
            icon: 'el-icon-video-play',
            onClick: () => this.playChannel(data)
          });
        }
      }
      
      if (menuItems.length > 0) {
        this.$contextmenu({
          items: menuItems,
          event,
          customClass: 'custom-context-menu',
          zIndex: 3000
        });
      }
    },
    
    // 刷新节点
    refreshNode(node) {
      // 重置节点状态
      node.loaded = false;
      
      // 如果节点已经展开，则先折叠再展开以确保重新加载
      if (node.expanded) {
        node.collapse();
        setTimeout(() => {
          node.expand();
        }, 100);
      } else {
        node.expand();
      }
      
      // 重置最后点击的节点记录，避免刷新后的点击冲突
      if (this.lastClickedNode === node) {
        this.lastClickedNode = null;
      }
    },
    
    // 查看设备详情
    viewDeviceDetails(deviceId) {
      // 不跳转页面，只打开详情窗口
      if (this.clickEvent) {
        const data = { deviceId: deviceId, action: 'viewDetails' };
        this.clickEvent(data);
      }
    },
    
    // 播放通道
    playChannel(data) {
      if (this.clickEvent) {
        this.clickEvent(data);
      }
    },
    
    // 处理节点悬停
    handleNodeHover(data, node, event) {
      // 清除之前的计时器
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
      }
      
      // 记录当前鼠标位置
      this.lastMouseEvent = event || window.event;
      
      // 设置新的计时器，延迟显示提示
      this.hoverTimer = setTimeout(() => {
        // 如果在延迟时间内没有点击，则设置当前悬停节点
        if (!this.lastClickedNode || this.lastClickedNode.data.id !== node.data.id || 
            (new Date().getTime() - this.lastClickTime) > 1000) {
          this.currentHoverNode = node.data.id;
        }
      }, 500); // 500毫秒延迟，可以根据需要调整
    },
    
    // 处理节点离开
    handleNodeLeave() {
      // 清除计时器
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
      
      // 重置当前悬停节点
      this.currentHoverNode = null;
      this.lastMouseEvent = null;
    },
    
    // 添加全局样式
    addGlobalStyle() {
      // 创建样式元素
      const style = document.createElement('style');
      style.type = 'text/css';
      style.id = 'device-tree-tooltip-style';
      
      // 添加样式规则
      style.innerHTML = `
        .el-tooltip__popper.device-id-tooltip {
          transform: translate3d(0, 0, 0) !important;
        }
        .el-tooltip__popper.device-id-tooltip .popper__arrow {
          display: none !important;
        }
      `;
      
      // 将样式添加到文档头部
      document.head.appendChild(style);
      
      // 设置MutationObserver监听tooltip的出现
      this.setupTooltipObserver();
    },
    
    // 设置tooltip观察器
    setupTooltipObserver() {
      // 创建MutationObserver实例
      this.tooltipObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.addedNodes.length) {
            // 检查是否有tooltip被添加到DOM
            mutation.addedNodes.forEach((node) => {
              if (node.classList && node.classList.contains('el-tooltip__popper') && 
                  node.classList.contains('device-id-tooltip') && this.lastMouseEvent) {
                // 获取鼠标位置
                const mouseX = this.lastMouseEvent.clientX;
                const mouseY = this.lastMouseEvent.clientY;
                
                // 设置tooltip位置
                node.style.position = 'fixed';
                node.style.top = (mouseY + 5) + 'px';
                node.style.left = (mouseX + 10) + 'px';
              }
            });
          }
        });
      });
      
      // 开始观察document.body的变化
      this.tooltipObserver.observe(document.body, { 
        childList: true, 
        subtree: false 
      });
    },
    
    // 刷新整个树
    refresh() {
      this.$refs.tree.store.setData([]);
      this.$refs.tree.store.root.childNodes = [];
      this.$refs.tree.store.root.loaded = false;
      this.$refs.tree.store.root.expanded = false;
      this.$refs.tree.store.root.expand();
    },
    
    // 获取所有通道
    getAllChannels() {
      return new Promise((resolve) => {
        // 使用与主菜单相同的API查询所有通道
        const params = {
          page: 1,
          count: 9999,
          query: '',
          online: null
        };
        
        this.$store.dispatch('device/queryDevices', params)
          .then(data => {
            if (data && data.list && data.list.length > 0) {
              // 获取所有设备ID
              const deviceIds = data.list.map(device => device.deviceId);
              const allChannels = [];
              
              // 创建一个Promise数组，每个Promise获取一个设备的通道
              const promises = deviceIds.map(deviceId => {
                return this.$store.dispatch('device/queryChannels', [deviceId, {
                  page: 1,
                  count: 9999,
                  query: '',
                  online: null,
                  channelType: null,
                  catalogUnderDevice: true
                }]).then(channelData => {
                  if (channelData && channelData.list) {
                    const deviceChannels = channelData.list.map(channel => ({
                      id: channel.channelId,
                      name: channel.name || channel.channelId,
                      deviceId: deviceId,
                      online: channel.status === 'ON'
                    }));
                    allChannels.push(...deviceChannels);
                  }
                }).catch(error => {
                  console.error(`获取设备 ${deviceId} 的通道失败:`, error);
                });
              });
              
              // 等待所有Promise完成
              Promise.all(promises).then(() => {
                resolve(allChannels);
              }).catch(() => {
                resolve(allChannels); // 即使有错误也返回已获取的通道
              });
            } else {
              resolve([]);
            }
          })
          .catch(error => {
            console.error('获取设备列表失败:', error);
            resolve([]);
          });
      });
    }
  }
}
</script>

<style scoped>
.device-list-tree {
  width: 100%;
}
.device-icon, .channel-icon {
  margin-right: 5px;
}
/* 保持树状结构，防止点击时位置前移 */
.el-tree-node__content {
  position: relative !important;
}
.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  padding-right: 8px;
}
.icon-svg {
  margin-right: 4px;
}
.iconfont {
  margin-right: 4px;
  font-size: 14px;
}
.device-online {
  color: #409EFF;
}
.device-offline {
  color: #909399;
}

/* 添加点击效果样式 */
.el-tree-node__content:active {
  background-color: #e6f1fc;
}

/* 添加已点击节点的样式 */
.el-tree-node.is-clicked > .el-tree-node__content {
  background-color: #f0f7ff;
  border-left: 2px solid #409EFF;
}

/* 添加悬停效果 */
.custom-tree-node span:hover {
  cursor: pointer;
}

/* 自定义提示样式 */
.el-tooltip__popper.device-id-tooltip {
  max-width: 200px;
  font-size: 12px;
  padding: 5px 8px;
  word-break: break-all;
  margin-top: 0 !important;
  margin-left: 0 !important;
}
</style>
