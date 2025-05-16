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
      height="calc(100vh - 200px)"
      @node-expand="handleNodeExpand"
      @node-collapse="handleNodeCollapse"
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
          :content="data.leaf ? data.channelId : (data.deviceId || '')" 
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
        
        <!-- 刷新按钮 -->
        <span v-if="node.level === 1" class="refresh-button" @click.stop="refreshDeviceType(data, node)">
          <i class="el-icon-refresh"></i>
        </span>
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
    
    // 监听窗口大小变化，调整设备类型子节点容器的最大高度
    window.addEventListener('resize', this.adjustDeviceTypeContainerHeight);
    this.adjustDeviceTypeContainerHeight();
  },
  destroyed() {
    // 清理观察器
    if (this.tooltipObserver) {
      this.tooltipObserver.disconnect();
      this.tooltipObserver = null;
    }
    
    // 清理滚动观察器
    Object.values(this.scrollObservers).forEach(observer => {
      if (observer) {
        observer.disconnect();
      }
    });
    
    // 移除全局样式
    const styleElement = document.getElementById('device-tree-tooltip-style');
    if (styleElement) {
      document.head.removeChild(styleElement);
    }
    
    // 移除窗口大小变化事件监听
    window.removeEventListener('resize', this.adjustDeviceTypeContainerHeight);
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
      tooltipObserver: null, // 提示框观察器
      searchQuery: '', // 搜索关键字
      devicePageMap: {}, // 设备分页信息 {deviceType: {page: 1, hasMore: true}}
      channelPageMap: {}, // 通道分页信息 {deviceId: {page: 1, hasMore: true}}
      pageSize: 15, // 每页加载数量
      loadingMore: false, // 是否正在加载更多
      expandedNodes: new Set(), // 已展开的节点
      scrollObservers: {} // 滚动观察器 {nodeId: observer}
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
      // 初始化分页信息
      this.devicePageMap = {
        'gb': { page: 1, hasMore: true },
        'push': { page: 1, hasMore: true },
        'proxy': { page: 1, hasMore: true }
      };
      
      const categories = [
        { 
          id: 'gb', 
          name: '国标设备', 
          deviceType: 'gb', 
          leaf: false,
          children: [
            { id: 'gb_search', name: '搜索设备', isSearch: true, deviceType: 'gb', leaf: true }
          ]
        },
        { id: 'push', name: '推流列表', deviceType: 'push', leaf: false },
        { id: 'proxy', name: '拉流代理', deviceType: 'proxy', leaf: false }
      ];
      resolve(categories);
    },
    
    // 加载指定类型的设备
    loadDevicesByType(deviceType, resolve) {
      // 获取当前页码
      const pageInfo = this.devicePageMap[deviceType] || { page: 1, hasMore: true };
      
      // 如果没有更多数据，直接返回空数组
      if (!pageInfo.hasMore && pageInfo.page > 1) {
        resolve([]);
        return;
      }
      
      // 使用分页查询设备
      this.$store.dispatch('device/queryDevices', {
        page: pageInfo.page,
        count: this.pageSize,
        query: this.searchQuery,
        status: null,
        deviceType: deviceType // 添加设备类型参数，便于后端过滤
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
          
          // 更新分页信息
          this.devicePageMap[deviceType] = {
            page: pageInfo.page + 1,
            hasMore: filteredList.length >= this.pageSize
          };
          
          // 转换为树节点格式
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
          // 没有数据，标记为没有更多
          this.devicePageMap[deviceType].hasMore = false;
          resolve([]);
        }
      }).catch(error => {
        console.error('加载设备失败:', error);
        resolve([]);
      });
    },
    
    // 加载设备的通道
    loadChannels(deviceId, resolve) {
      // 初始化或获取通道分页信息
      if (!this.channelPageMap[deviceId]) {
        this.channelPageMap[deviceId] = { page: 1, hasMore: true };
      }
      
      const pageInfo = this.channelPageMap[deviceId];
      
      // 如果没有更多数据，直接返回空数组
      if (!pageInfo.hasMore && pageInfo.page > 1) {
        resolve([]);
        return;
      }
      
      // 使用分页查询通道
      const params = {
        page: pageInfo.page,
        count: this.pageSize,
        query: this.searchQuery,
        online: null,
        channelType: null,
        catalogUnderDevice: true
      };
      
      this.$store.dispatch('device/queryChannels', [deviceId, params])
        .then(data => {
          if (data && data.list) {
            // 更新分页信息
            this.channelPageMap[deviceId] = {
              page: pageInfo.page + 1,
              hasMore: data.list.length >= this.pageSize
            };
            
            // 转换为树节点格式
            const channels = data.list.map(channel => ({
              id: channel.id,
              name: channel.name || channel.channelId || channel.deviceId,
              channelId: channel.channelId || channel.deviceId,
              deviceId: deviceId,
              online: channel.status === 'ON',
              leaf: true
            }));
            
            resolve(channels);
          } else {
            // 没有数据，标记为没有更多
            this.channelPageMap[deviceId].hasMore = false;
            resolve([]);
          }
        }).catch(error => {
          console.error('加载通道失败:', error);
          resolve([]);
        });
    },
    
    // 加载更多通道
    loadMoreChannels(deviceId) {
      // 获取当前页码
      const pageInfo = this.channelPageMap[deviceId] || { page: 1, hasMore: true };
      
      // 使用分页查询通道
      const params = {
        page: pageInfo.page,
        count: this.pageSize,
        query: this.searchQuery,
        online: null,
        channelType: null,
        catalogUnderDevice: true
      };
      
      this.$store.dispatch('device/queryChannels', [deviceId, params])
        .then(data => {
          if (data && data.list) {
            // 更新分页信息
            this.channelPageMap[deviceId] = {
              page: pageInfo.page + 1,
              hasMore: data.list.length >= this.pageSize
            };
            
            // 转换为树节点格式
            const channels = data.list.map(channel => ({
              id: channel.id,
              name: channel.name || channel.channelId || channel.deviceId,
              channelId: channel.channelId || channel.deviceId,
              deviceId: deviceId,
              online: channel.status === 'ON',
              leaf: true
            }));
            
            // 添加到树中
            const node = this.$refs.tree.getNode(deviceId);
            if (node && channels.length > 0) {
              channels.forEach(channel => {
                node.insertChild({ data: channel });
              });
            }
          } else {
            // 没有数据，标记为没有更多
            this.channelPageMap[deviceId].hasMore = false;
          }
        }).catch(error => {
          console.error('加载通道失败:', error);
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
      if (this.lastClickedNode && this.$refs.tree.getNode(this.lastClickedNode.data.id)) {
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
      
      // 处理搜索节点点击
      if (data.isSearch) {
        this.showSearchDialog(data.deviceType);
        return;
      }
      
      // 如果是叶子节点（通道），触发回调
      if (data.leaf) {
        if (this.clickEvent) {
          // 明确传递通道ID (id)
          this.clickEvent(data.id);
        }
        return; // 叶子节点不需要展开/折叠操作
      }
      
      // 如果是设备类型节点，折叠其他设备类型节点
      if (node.level === 1) {
        const deviceTypes = ['gb', 'push', 'proxy'];
        deviceTypes.forEach(type => {
          if (type !== data.id) {
            const otherNode = this.$refs.tree.getNode(type);
            if (otherNode && otherNode.expanded) {
              otherNode.collapse();
              this.expandedNodes.delete(type);
            }
          }
        });
      }
      
      // 如果是非叶子节点，尝试展开/折叠
      if (node.expanded) {
        // 如果已经展开，则折叠
        node.collapse();
        this.expandedNodes.delete(node.data.id);
      } else {
        // 如果未展开，则展开
        node.expand();
        this.expandedNodes.add(node.data.id);
      }
    },
    
    // 处理节点展开事件
    handleNodeExpand(data, node) {
      // 记录展开的节点
      this.expandedNodes.add(data.id);
      
      // 如果是设备类型节点，折叠其他设备类型节点
      if (node.level === 1) {
        // 重置分页信息
        this.devicePageMap[data.id] = { page: 1, hasMore: true };
        
        // 折叠其他设备类型节点
        const deviceTypes = ['gb', 'push', 'proxy'];
        deviceTypes.forEach(type => {
          if (type !== data.id) {
            const otherNode = this.$refs.tree.getNode(type);
            if (otherNode && otherNode.expanded) {
              otherNode.collapse();
              this.expandedNodes.delete(type);
            }
          }
        });
        
        // 设置滚动监听
        this.$nextTick(() => {
          this.setupScrollObserver(data.id);
        });
      }
      
      // 如果是设备节点，重置通道分页信息
      if (node.level === 2 && data.deviceId) {
        this.channelPageMap[data.deviceId] = { page: 1, hasMore: true };
      }
    },
    
    // 处理节点折叠事件
    handleNodeCollapse(data, node) {
      // 移除展开的节点记录
      this.expandedNodes.delete(data.id);
      
      // 如果是设备类型节点，移除滚动监听
      if (node.level === 1) {
        this.removeScrollObserver(data.id);
      }
    },
    
    // 显示搜索对话框
    showSearchDialog(deviceType) {
      this.$prompt('请输入搜索关键字', '搜索设备', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '设备名称或ID'
      }).then(({ value }) => {
        if (value) {
          // 设置搜索关键字
          this.searchQuery = value;
          
          // 重置分页信息
          this.devicePageMap[deviceType] = { page: 1, hasMore: true };
          
          // 重新加载设备
          const node = this.$refs.tree.getNode(deviceType);
          if (node) {
            node.loaded = false;
            node.expand();
          }
        }
      }).catch(() => {
        // 取消搜索
      });
    },
    
    // 右键菜单事件
    handleRightClick(event, data, node) {
      const menuItems = [];
      
      // 设备类型节点
      if (node.level === 1) {
        menuItems.push({
          label: '刷新',
          icon: 'el-icon-refresh',
          onClick: () => this.refreshDeviceType(data, node)
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
            label: '刷新通道',
            icon: 'el-icon-refresh',
            onClick: () => this.refreshChannels(data, node)
          });
          
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
        // 明确传递 data.id
        this.clickEvent(data.id);
      }
    },
    
    // 处理节点悬停
    handleNodeHover(data, node, event) {
      // 清除之前的计时器并记录鼠标位置
      clearTimeout(this.hoverTimer);
      this.lastMouseEvent = event || window.event;
      
      // 设置新的计时器，延迟显示提示
      this.hoverTimer = setTimeout(() => {
        // 如果在延迟时间内没有点击，则设置当前悬停节点
        const notRecentlyClicked = !this.lastClickedNode || 
                                  this.lastClickedNode.data.id !== node.data.id || 
                                  (new Date().getTime() - this.lastClickTime) > 1000;
        
        if (notRecentlyClicked) {
          this.currentHoverNode = node.data.id;
        }
      }, 500);
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
          font-size: 11px !important;
          padding: 3px 6px !important;
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
      this.tooltipObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (!mutation.addedNodes.length) continue;
          
          for (const node of mutation.addedNodes) {
            // 检查是否是我们的tooltip
            if (node.classList && 
                node.classList.contains('el-tooltip__popper') && 
                node.classList.contains('device-id-tooltip') && 
                this.lastMouseEvent) {
              
              // 获取鼠标位置和图标大小
              const mouseX = this.lastMouseEvent.clientX;
              const mouseY = this.lastMouseEvent.clientY;
              const iconWidth = 16; // 估计的图标宽度
              const iconHeight = 16; // 估计的图标高度
              
              // 设置tooltip位置在鼠标图标的右下角
              node.style.position = 'fixed';
              node.style.top = `${mouseY + iconHeight}px`;
              node.style.left = `${mouseX + iconWidth}px`;
              // 隐藏箭头
              const arrow = node.querySelector('.popper__arrow');
              if (arrow) arrow.style.display = 'none';
            }
          }
        }
      });
      
      // 开始观察document.body的变化
      this.tooltipObserver.observe(document.body, { childList: true, subtree: false });
    },
    
    // 刷新整个树
    refresh() {
      this.$refs.tree.store.setData([]);
      this.$refs.tree.store.root.childNodes = [];
      this.$refs.tree.store.root.loaded = false;
      this.$refs.tree.store.root.expanded = false;
      this.$refs.tree.store.root.expand();
    },
    
    // 调整设备类型子节点容器的最大高度
    adjustDeviceTypeContainerHeight() {
      // 计算合适的高度
      const windowHeight = window.innerHeight;
      const maxHeight = Math.max(200, (windowHeight - 250) / 3); // 至少200px，最多屏幕高度的三分之一
      
      // 设置CSS变量
      document.documentElement.style.setProperty('--device-type-container-height', `${maxHeight}px`);
    },
    
    // 设置滚动监听
    setupScrollObserver(nodeId) {
      // 移除旧的观察器
      this.removeScrollObserver(nodeId);
      
      // 获取设备类型子节点容器
      const nodeEl = this.$refs.tree.getNode(nodeId).$el;
      if (!nodeEl) return;
      
      const childrenContainer = nodeEl.querySelector('.el-tree-node__children');
      if (!childrenContainer) return;
      
      // 创建新的观察器
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            // 如果最后一个元素进入视口，加载更多
            if (entry.isIntersecting && entry.target.classList.contains('last-visible-node')) {
              // 检查是否有更多数据
              if (this.devicePageMap[nodeId] && this.devicePageMap[nodeId].hasMore && !this.loadingMore) {
                this.loadMoreDevices(nodeId);
              }
            }
          });
        },
        {
          root: childrenContainer,
          threshold: 0.5
        }
      );
      
      // 观察最后一个可见节点
      this.$nextTick(() => {
        const lastNode = childrenContainer.querySelector('.el-tree-node:last-child');
        if (lastNode) {
          lastNode.classList.add('last-visible-node');
          observer.observe(lastNode);
        }
      });
      
      // 保存观察器
      this.scrollObservers[nodeId] = observer;
      
      // 添加滚动事件监听
      childrenContainer.addEventListener('scroll', this.handleDeviceTypeContainerScroll.bind(this, nodeId, childrenContainer));
    },
    
    // 移除滚动监听
    removeScrollObserver(nodeId) {
      if (this.scrollObservers[nodeId]) {
        this.scrollObservers[nodeId].disconnect();
        delete this.scrollObservers[nodeId];
      }
    },
    
    // 处理设备类型容器滚动事件
    handleDeviceTypeContainerScroll(nodeId, container) {
      // 检查是否滚动到底部
      if (container.scrollHeight - container.scrollTop - container.clientHeight < 20) {
        // 检查是否有更多数据
        if (this.devicePageMap[nodeId] && this.devicePageMap[nodeId].hasMore && !this.loadingMore) {
          this.loadMoreDevices(nodeId);
        }
      }
    },
    
    // 刷新设备类型
    refreshDeviceType(data, node) {
      // 重置分页信息
      this.devicePageMap[data.id] = { page: 1, hasMore: true };
      
      // 重新加载设备
      node.loaded = false;
      if (node.expanded) {
        node.collapse();
        setTimeout(() => {
          node.expand();
        }, 100);
      } else {
        node.expand();
      }
    },
    
    // 刷新通道
    refreshChannels(data, node) {
      // 重置通道分页信息
      if (data.deviceId) {
        this.channelPageMap[data.deviceId] = { page: 1, hasMore: true };
      }
      
      // 重新加载通道
      node.loaded = false;
      if (node.expanded) {
        node.collapse();
        setTimeout(() => {
          node.expand();
        }, 100);
      } else {
        node.expand();
      }
    },
    
    // 加载更多设备
    loadMoreDevices(deviceType) {
      // 标记正在加载
      this.loadingMore = true;
      
      // 获取当前页码
      const pageInfo = this.devicePageMap[deviceType] || { page: 1, hasMore: true };
      
      // 使用分页查询设备
      this.$store.dispatch('device/queryDevices', {
        page: pageInfo.page,
        count: this.pageSize,
        query: this.searchQuery,
        status: null,
        deviceType: deviceType
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
          
          // 更新分页信息
          this.devicePageMap[deviceType] = {
            page: pageInfo.page + 1,
            hasMore: filteredList.length >= this.pageSize
          };
          
          // 转换为树节点格式
          const devices = filteredList.map(device => ({
            id: device.id,
            name: device.name || device.deviceId,
            deviceId: device.deviceId,
            deviceType: deviceType,
            online: device.onLine,
            leaf: !this.hasChannel
          }));
          
          // 添加到树中
          const node = this.$refs.tree.getNode(deviceType);
          if (node && devices.length > 0) {
            devices.forEach(device => {
              node.insertChild({ data: device });
            });
            
            // 更新滚动监听
            this.$nextTick(() => {
              this.setupScrollObserver(deviceType);
            });
          }
        } else {
          // 没有数据，标记为没有更多
          this.devicePageMap[deviceType].hasMore = false;
        }
      }).catch(error => {
        console.error('加载设备失败:', error);
      }).finally(() => {
        // 取消加载标记
        this.loadingMore = false;
      });
    },
    
    // 获取已加载的通道
    getLoadedChannels() {
      const channels = [];
      if (!this.$refs.tree || !this.$refs.tree.store) {
        return channels;
      }
      
      // 遍历树节点，收集已加载的通道
      const root = this.$refs.tree.store.root;
      if (root && root.childNodes) {
        // 遍历设备类型节点
        root.childNodes.forEach(typeNode => {
          if (typeNode && typeNode.childNodes) {
            // 遍历设备节点
            typeNode.childNodes.forEach(deviceNode => {
              if (deviceNode && deviceNode.childNodes) {
                // 遍历通道节点
                deviceNode.childNodes.forEach(channelNode => {
                  if (channelNode && channelNode.data && channelNode.data.leaf) {
                    channels.push({
                      id: channelNode.data.id,
                      name: channelNode.data.name,
                      channelId: channelNode.data.channelId || channelNode.data.id,
                      deviceId: channelNode.data.deviceId,
                      online: channelNode.data.online
                    });
                  }
                });
              }
            });
          }
        });
      }
      
      return channels;
    }
  }
}
</script>

<style scoped>
:root {
  --device-type-container-height: 200px;
}

.device-list-tree {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  color: #252525;
}
.device-offline {
  color: #727272;
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
  max-width: 130px;
  font-size: 6px;
  padding: 3px 6px;
  word-break: break-all;
  margin-top: 0 !important;
  margin-left: 0 !important;
}

/* 设置树的最大高度和滚动 */
.el-tree {
  overflow-y: auto;
  max-height: calc(100vh - 180px);
  height: calc(100vh - 180px);
}

/* 设置设备类型子节点容器的最大高度 */
.el-tree-node[data-level="1"] > .el-tree-node__children {
  max-height: var(--device-type-container-height);
  overflow-y: auto;
  overflow-x: hidden;
  border-bottom: 1px solid #ebeef5;
}

/* 搜索节点样式 */
.el-tree-node[data-id$="_search"] > .el-tree-node__content {
  color: #409EFF;
  font-weight: bold;
}

/* 刷新按钮样式 */
.refresh-button {
  margin-left: auto;
  color: #909399;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.refresh-button:hover {
  opacity: 1;
  color: #409EFF;
}

/* 最后一个可见节点样式 */
.last-visible-node {
  position: relative;
}

/* 设备类型子节点容器滚动条样式 */
.el-tree-node[data-level="1"] > .el-tree-node__children::-webkit-scrollbar {
  width: 6px;
}

.el-tree-node[data-level="1"] > .el-tree-node__children::-webkit-scrollbar-thumb {
  background-color: #c0c4cc;
  border-radius: 3px;
}

.el-tree-node[data-level="1"] > .el-tree-node__children::-webkit-scrollbar-track {
  background-color: #f5f7fa;
}
</style>
