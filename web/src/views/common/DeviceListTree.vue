<template>
  <div class="device-list-tree">
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
      height="calc(100vh - 180px)"
      @node-expand="handleNodeExpand"
      @node-collapse="handleNodeCollapse"
    >
      <span class="custom-tree-node" slot-scope="{ node, data }">
        <!-- 设备/通道图标 -->
        <span v-if="!data.leaf" class="device-icon">
          <svg-icon :icon-class="getDeviceIcon(data.deviceType)" class="icon-svg" />
        </span>
        <span v-else class="channel-icon">
          <span class="iconfont icon-shexiangtou2" :style="{ color: data.online ? '#409EFF' : '#909399' }"></span>
        </span>
        
        <!-- 名称和提示 -->
        <el-tooltip 
          :content="data.leaf ? data.channelId : (data.deviceId || '')" 
          placement="right" 
          :disabled="isTooltipDisabled(node, data)"
          :open-delay="1000"
          :enterable="false"
          popper-class="device-id-tooltip"
        >
          <span 
            :class="data.online ? 'device-online' : 'device-offline'"
            @mouseenter="handleNodeHover(data, node, $event)"
            @mouseleave="handleNodeLeave"
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
  props: {
    edit: { type: Boolean, default: false },
    showHeader: { type: Boolean, default: true },
    hasChannel: { type: Boolean, default: false },
    clickEvent: { type: Function }
  },
  
  data() {
    return {
      deviceTreeData: [],
      defaultProps: {
        children: 'children',
        label: 'name',
        isLeaf: 'leaf'
      },
      lastClickedNode: null,
      lastClickTime: 0,
      hoverTimer: null,
      currentHoverNode: null,
      lastMouseEvent: null,
      tooltipObserver: null,
      searchQuery: '',
      devicePageMap: {
        gb: { page: 1, hasMore: true },
        push: { page: 1, hasMore: true },
        proxy: { page: 1, hasMore: true }
      },
      channelPageMap: {},
      pageSize: 15,
      loadingMore: false,
      expandedNodes: new Set(),
      scrollObservers: {},
      deviceTypes: ['gb', 'push', 'proxy'],
      currentDeviceType: 'gb',
      currentDeviceId: null,
      noMoreData: false,
      showLoadMoreButton: true,
      loadMoreNodes: {}
    }
  },
  
  computed: {
    isGbExpanded() {
      const isExpanded = this.expandedNodes.has('gb');
      console.log('isGbExpanded:', isExpanded, 'expandedNodes:', Array.from(this.expandedNodes));
      return isExpanded;
    }
  },
  
  mounted() {
    this.addGlobalStyle();
    window.addEventListener('resize', this.adjustDeviceTypeContainerHeight);
    this.adjustDeviceTypeContainerHeight();
    
    // 初始化devicePageMap
    this.devicePageMap = {
      gb: { page: 1, hasMore: true },
      push: { page: 1, hasMore: true },
      proxy: { page: 1, hasMore: true }
    };
    
    // 组件挂载后强制刷新一次，确保标题正确显示
    this.$nextTick(() => {
      this.forceRefresh();
      
      // 初始化时自动展开国标设备
      setTimeout(() => {
        const gbNode = this.$refs.tree?.getNode('gb');
        if (gbNode) {
          gbNode.expand();
          this.currentDeviceType = 'gb';
          console.log('初始化时展开国标设备节点');
        }
      }, 500);
    });
  },
  
  destroyed() {
    this.cleanupResources();
  },
  
  methods: {
    // 工具方法
    getDeviceIcon(deviceType) {
      const iconMap = {
        'gb': 'device',
        'push': 'streamPush',
        'proxy': 'streamProxy'
      };
      return iconMap[deviceType] || 'tree';
    },
    
    isTooltipDisabled(node, data) {
      return node.level === 1 || data.isSearch || data.isLoadMore || (!data.deviceId && !data.id) || (this.currentHoverNode !== node.data.id);
    },
    
    cleanupResources() {
      if (this.tooltipObserver) {
        this.tooltipObserver.disconnect();
        this.tooltipObserver = null;
      }
      
      Object.values(this.scrollObservers).forEach(observer => {
        observer?.disconnect();
      });
      
      const styleElement = document.getElementById('device-tree-tooltip-style');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
      
      window.removeEventListener('resize', this.adjustDeviceTypeContainerHeight);
    },
    
    // 节点加载方法
    loadNode(node, resolve) {
      if (node.level === 0) {
        this.loadDeviceCategories(resolve);
      } else if (node.level === 1) {
        this.loadDevicesByType(node.data.id, resolve);
      } else if (node.level === 2 && this.hasChannel) {
        this.loadChannels(node.data.deviceId, resolve);
      } else {
        resolve([]);
      }
    },
    
    // 强制刷新树结构
    forceRefresh() {
      this.$nextTick(() => {
        const tree = this.$refs.tree;
        if (tree) {
          tree.store.setData([]);
          tree.store.root.childNodes = [];
          tree.store.root.loaded = false;
          tree.store.root.expanded = false;
          
          // 重新加载根节点
          setTimeout(() => {
            tree.store.root.expand();
          }, 100);
        }
      });
    },
    
    loadDeviceCategories(resolve) {
      // 不再重置devicePageMap，保留初始化的值
      
      const categories = [
        { 
          id: 'gb', 
          name: '国标设备', 
          deviceType: 'gb', 
          leaf: false,
          hasSearch: true
        },
        { id: 'push', name: '推流列表', deviceType: 'push', leaf: false, hasSearch: true },
        { id: 'proxy', name: '拉流代理', deviceType: 'proxy', leaf: false, hasSearch: true }
      ];
      
      resolve(categories);
    },
    
    loadDevicesByType(deviceType, resolve) {
      const pageInfo = this.devicePageMap[deviceType] || { page: 1, hasMore: true };
      
      if (!pageInfo.hasMore && pageInfo.page > 1) {
        resolve([]);
        return;
      }
      
      // 添加搜索框和加载更多按钮
      const searchItem = {
        id: `${deviceType}_search`,
        name: this.searchQuery ? `搜索: ${this.searchQuery}` : '搜索设备',
        deviceType,
        isSearch: true,
        leaf: true
      };
      
      const loadMoreItem = {
        id: `${deviceType}_loadmore`,
        name: '加载更多',
        deviceType,
        isLoadMore: true,
        leaf: true,
        hidden: !pageInfo.hasMore
      };
      
      this.$store.dispatch('device/queryDevices', {
        page: pageInfo.page,
        count: this.pageSize,
        query: this.searchQuery,
        status: null,
        deviceType
      }).then(data => {
        if (data?.list) {
          const filteredList = this.filterDevicesByType(data.list, deviceType);
          
          this.devicePageMap[deviceType] = {
            page: pageInfo.page + 1,
            hasMore: filteredList.length >= this.pageSize
          };
          
          const devices = filteredList.map(device => ({
            id: device.id,
            name: device.name || device.deviceId,
            deviceId: device.deviceId,
            deviceType,
            online: device.onLine,
            leaf: !this.hasChannel
          }));
          
          // 添加搜索和加载更多选项
          const result = [searchItem, ...devices];
          
          // 如果有更多数据，添加加载更多选项
          if (this.devicePageMap[deviceType].hasMore) {
            result.push(loadMoreItem);
          }
          
          resolve(result);
        } else {
          this.devicePageMap[deviceType].hasMore = false;
          resolve([searchItem]);
        }
      }).catch(error => {
        console.error('加载设备失败:', error);
        resolve([searchItem]);
      });
    },
    
    filterDevicesByType(devices, deviceType) {
      if (deviceType === 'gb') {
        return devices.filter(device => !device.pushingStreamDevice && !device.proxyDevice);
      } else if (deviceType === 'push') {
        return devices.filter(device => device.pushingStreamDevice);
      } else if (deviceType === 'proxy') {
        return devices.filter(device => device.proxyDevice);
      }
      return [];
    },
    loadChannels(deviceId, resolve) {
      if (!this.channelPageMap[deviceId]) {
        this.channelPageMap[deviceId] = { page: 1, hasMore: true };
      }
      
      const pageInfo = this.channelPageMap[deviceId];
      
      if (!pageInfo.hasMore && pageInfo.page > 1) {
        resolve([]);
        return;
      }
      
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
          if (data?.list) {
            this.channelPageMap[deviceId] = {
              page: pageInfo.page + 1,
              hasMore: data.list.length >= this.pageSize
            };
            
            const channels = data.list.map(channel => ({
              id: channel.id,
              name: channel.name || channel.channelId || channel.deviceId,
              channelId: channel.channelId || channel.deviceId,
              deviceId,
              online: channel.status === 'ON',
              leaf: true
            }));
            
            resolve(channels);
          } else {
            this.channelPageMap[deviceId].hasMore = false;
            resolve([]);
          }
        }).catch(error => {
          console.error('加载通道失败:', error);
          resolve([]);
        });
    },
    
    // 节点交互方法
    handleNodeClick(data, node) {
      const currentTime = Date.now();
      
      if (this.lastClickedNode === node && (currentTime - this.lastClickTime) < 300) {
        return;
      }
      
      this.updateNodeClickState(data, node, currentTime);
      
      if (data.isSearch) {
        this.showSearchDialog(data.deviceType);
        return;
      }
      
      if (data.isLoadMore) {
        this.loadMoreDevices(data.deviceType);
        return;
      }
      
      if (data.leaf && !data.isSearch && !data.isLoadMore) {
        this.clickEvent?.(data.id);
        return;
      }
      
      if (node.level === 1) {
        this.collapseOtherDeviceTypes(data.id);
      }
      
      this.toggleNodeExpansion(node);
    },
    
    updateNodeClickState(data, node, currentTime) {
      if (this.lastClickedNode && this.$refs.tree.getNode(this.lastClickedNode.data.id)) {
        const el = this.$refs.tree.getNode(this.lastClickedNode.data.id).$el;
        el?.classList.remove('is-clicked');
      }
      
      this.lastClickedNode = node;
      this.lastClickTime = currentTime;
      
      if (node.$el) {
        node.$el.classList.add('is-clicked');
      }
      
      this.currentHoverNode = null;
    },
    
    toggleNodeExpansion(node) {
      if (node.expanded) {
        node.collapse();
        this.expandedNodes.delete(node.data.id);
        console.log('折叠节点:', node.data.id, '当前expandedNodes:', Array.from(this.expandedNodes));
      } else {
        node.expand();
        this.expandedNodes.add(node.data.id);
        console.log('展开节点:', node.data.id, '当前expandedNodes:', Array.from(this.expandedNodes));
      }
    },
    collapseOtherDeviceTypes(currentTypeId) {
      this.deviceTypes.forEach(type => {
        if (type !== currentTypeId) {
          const otherNode = this.$refs.tree.getNode(type);
          if (otherNode?.expanded) {
            otherNode.collapse();
            this.expandedNodes.delete(type);
          }
        }
      });
    },
    
    handleNodeExpand(data, node) {
      this.expandedNodes.add(data.id);
      
      if (node.level === 1) {
        this.devicePageMap[data.id] = { page: 1, hasMore: true };
        this.collapseOtherDeviceTypes(data.id);
        this.currentDeviceType = data.id;
        this.showLoadMoreButton = true;
        this.noMoreData = false;
        
        console.log('展开节点:', data.id, '当前设备类型:', this.currentDeviceType);
        
        this.$nextTick(() => {
          this.setupScrollObserver(data.id);
        });
      }
      
      if (node.level === 2 && data.deviceId) {
        this.channelPageMap[data.deviceId] = { page: 1, hasMore: true };
        this.currentDeviceId = data.deviceId;
        this.showLoadMoreButton = this.hasChannel;
        this.noMoreData = false;
      }
    },
    
    handleNodeCollapse(data, node) {
      this.expandedNodes.delete(data.id);
      
      if (node.level === 1) {
        this.removeScrollObserver(data.id);
        if (this.currentDeviceType === data.id) {
          this.showLoadMoreButton = false;
        }
      }
      
      if (node.level === 2 && this.currentDeviceId === data.deviceId) {
        this.showLoadMoreButton = false;
      }
    },
    
    // 右键菜单处理
    handleRightClick(event, data, node) {
      // 如果是搜索节点，右键点击清除搜索
      if (data.isSearch) {
        this.clearSearch();
        return;
      }
      
      const menuItems = this.buildContextMenuItems(data, node);
      
      if (menuItems.length > 0) {
        this.$contextmenu({
          items: menuItems,
          event,
          customClass: 'custom-context-menu',
          zIndex: 3000
        });
      }
    },
    
    buildContextMenuItems(data, node) {
      const menuItems = [];
      
      // 不为搜索节点和加载更多节点添加右键菜单
      if (data.isSearch || data.isLoadMore) {
        return menuItems;
      }
      
      if (node.level === 1) {
        menuItems.push({
          label: '刷新',
          icon: 'el-icon-refresh',
          onClick: () => this.refreshDeviceType(data, node)
        });
      }
      
      if (node.level === 2 && !data.isSearch && !data.isLoadMore) {
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
      
      if (node.level === 3 && data.leaf && data.online) {
        menuItems.push({
          label: '播放',
          icon: 'el-icon-video-play',
          onClick: () => this.playChannel(data)
        });
      }
      
      return menuItems;
    },
    // 节点操作方法
    refreshNode(node) {
      node.loaded = false;
      
      if (node.expanded) {
        node.collapse();
        setTimeout(() => node.expand(), 100);
      } else {
        node.expand();
      }
      
      if (this.lastClickedNode === node) {
        this.lastClickedNode = null;
      }
    },
    
    refreshDeviceType(data, node) {
      this.devicePageMap[data.id] = { page: 1, hasMore: true };
      this.refreshNode(node);
    },
    
    refreshChannels(data, node) {
      if (data.deviceId) {
        this.channelPageMap[data.deviceId] = { page: 1, hasMore: true };
      }
      this.refreshNode(node);
    },
    
    viewDeviceDetails(deviceId) {
      if (this.clickEvent) {
        this.clickEvent({ deviceId, action: 'viewDetails' });
      }
    },
    
    playChannel(data) {
      this.clickEvent?.(data.id);
    },
    
    // 搜索相关
    showSearchDialog(deviceType) {
      this.$prompt('请输入搜索关键字', `搜索${this.getDeviceTypeName(deviceType)}`, {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '设备名称或ID'
      }).then(({ value }) => {
        if (value) {
          this.searchQuery = value;
          this.devicePageMap[deviceType] = { page: 1, hasMore: true };
          
          const node = this.$refs.tree.getNode(deviceType);
          if (node) {
            node.loaded = false;
            node.expand();
          }
        }
      }).catch(() => {});
    },
    
    getDeviceTypeName(deviceType) {
      const typeNames = {
        'gb': '国标设备',
        'push': '推流设备',
        'proxy': '拉流代理'
      };
      return typeNames[deviceType] || '设备';
    },
    
    clearSearch() {
      if (!this.searchQuery) return; // 如果没有搜索关键字，不执行任何操作
      
      this.searchQuery = '';
      // 重置所有设备类型的分页信息
      this.deviceTypes.forEach(type => {
        this.devicePageMap[type] = { page: 1, hasMore: true };
        const node = this.$refs.tree.getNode(type);
        if (node && node.expanded) {
          node.loaded = false;
          node.expand();
        }
      });
      
      // 显示清除搜索成功的提示
      this.$message({
        message: '已清除搜索条件',
        type: 'success',
        duration: 1500
      });
    },
    
    handleSearch() {
      // 对当前展开的设备类型进行搜索
      this.deviceTypes.forEach(type => {
        if (this.expandedNodes.has(type)) {
          this.devicePageMap[type] = { page: 1, hasMore: true };
          const node = this.$refs.tree.getNode(type);
          if (node) {
            node.loaded = false;
            node.expand();
          }
        }
      });
    },
    
    // 悬停提示相关
    handleNodeHover(data, node, event) {
      clearTimeout(this.hoverTimer);
      this.lastMouseEvent = event || window.event;
      
      this.hoverTimer = setTimeout(() => {
        const notRecentlyClicked = !this.lastClickedNode || 
                                  this.lastClickedNode.data.id !== node.data.id || 
                                  (Date.now() - this.lastClickTime) > 1000;
        
        if (notRecentlyClicked) {
          this.currentHoverNode = node.data.id;
        }
      }, 500);
    },
    
    handleNodeLeave() {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = null;
      this.currentHoverNode = null;
      this.lastMouseEvent = null;
    },
    // UI 相关方法
    addGlobalStyle() {
      const style = document.createElement('style');
      style.type = 'text/css';
      style.id = 'device-tree-tooltip-style';
      
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
      
      document.head.appendChild(style);
      this.setupTooltipObserver();
    },
    
    setupTooltipObserver() {
      this.tooltipObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (!mutation.addedNodes.length) continue;
          
          for (const node of mutation.addedNodes) {
            if (node.classList && 
                node.classList.contains('el-tooltip__popper') && 
                node.classList.contains('device-id-tooltip') && 
                this.lastMouseEvent) {
              
              const mouseX = this.lastMouseEvent.clientX;
              const mouseY = this.lastMouseEvent.clientY;
              const iconWidth = 16;
              const iconHeight = 16;
              
              node.style.position = 'fixed';
              node.style.top = `${mouseY + iconHeight}px`;
              node.style.left = `${mouseX + iconWidth}px`;
              
              const arrow = node.querySelector('.popper__arrow');
              if (arrow) arrow.style.display = 'none';
            }
          }
        }
      });
      
      this.tooltipObserver.observe(document.body, { childList: true, subtree: false });
    },
    
    adjustDeviceTypeContainerHeight() {
      const windowHeight = window.innerHeight;
      const maxHeight = Math.max(200, (windowHeight - 250) / 3);
      document.documentElement.style.setProperty('--device-type-container-height', `${maxHeight}px`);
    },
    // 滚动加载相关
    setupScrollObserver(nodeId) {
      this.removeScrollObserver(nodeId);
      
      const nodeEl = this.$refs.tree.getNode(nodeId)?.$el;
      if (!nodeEl) return;
      
      const childrenContainer = nodeEl.querySelector('.el-tree-node__children');
      if (!childrenContainer) return;
      
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && 
                entry.target.classList.contains('last-visible-node') &&
                this.devicePageMap[nodeId]?.hasMore && 
                !this.loadingMore) {
              this.loadMoreDevices(nodeId);
            }
          });
        },
        {
          root: childrenContainer,
          threshold: 0.5
        }
      );
      
      this.$nextTick(() => {
        const lastNode = childrenContainer.querySelector('.el-tree-node:last-child');
        if (lastNode) {
          lastNode.classList.add('last-visible-node');
          observer.observe(lastNode);
        }
      });
      
      this.scrollObservers[nodeId] = observer;
      childrenContainer.addEventListener('scroll', 
        e => this.handleDeviceTypeContainerScroll(nodeId, e.target));
    },
    
    removeScrollObserver(nodeId) {
      if (this.scrollObservers[nodeId]) {
        this.scrollObservers[nodeId].disconnect();
        delete this.scrollObservers[nodeId];
      }
    },
    
    handleDeviceTypeContainerScroll(nodeId, container) {
      if (container.scrollHeight - container.scrollTop - container.clientHeight < 20) {
        if (this.devicePageMap[nodeId]?.hasMore && !this.loadingMore) {
          this.loadMoreDevices(nodeId);
        }
      }
    },
    
    // 加载更多数据
    loadMoreData() {
      if (this.loadingMore) return;
      
      if (this.currentDeviceType && !this.currentDeviceId) {
        // 加载更多设备
        if (this.devicePageMap[this.currentDeviceType]?.hasMore) {
          this.loadMoreDevices(this.currentDeviceType);
        } else {
          this.noMoreData = true;
        }
      } else if (this.currentDeviceId && this.hasChannel) {
        // 加载更多通道
        if (this.channelPageMap[this.currentDeviceId]?.hasMore) {
          this.loadMoreChannels(this.currentDeviceId);
        } else {
          this.noMoreData = true;
        }
      }
    },
    
    loadMoreDevices(deviceType) {
      this.loadingMore = true;
      
      const pageInfo = this.devicePageMap[deviceType] || { page: 1, hasMore: true };
      
      // 先移除原有的加载更多节点
      const loadMoreNodeId = `${deviceType}_loadmore`;
      const loadMoreNode = this.$refs.tree.getNode(loadMoreNodeId);
      if (loadMoreNode) {
        const parentNode = this.$refs.tree.getNode(deviceType);
        if (parentNode) {
          parentNode.removeChild(loadMoreNode);
        }
      }
      
      this.$store.dispatch('device/queryDevices', {
        page: pageInfo.page,
        count: this.pageSize,
        query: this.searchQuery,
        status: null,
        deviceType
      }).then(data => {
        if (data?.list) {
          const filteredList = this.filterDevicesByType(data.list, deviceType);
          const hasMore = filteredList.length >= this.pageSize;
          
          this.devicePageMap[deviceType] = {
            page: pageInfo.page + 1,
            hasMore: hasMore
          };
          
          const devices = filteredList.map(device => ({
            id: device.id,
            name: device.name || device.deviceId,
            deviceId: device.deviceId,
            deviceType,
            online: device.onLine,
            leaf: !this.hasChannel
          }));
          
          const node = this.$refs.tree.getNode(deviceType);
          if (node && devices.length > 0) {
            devices.forEach(device => {
              node.insertChild({ data: device });
            });
            
            // 如果有更多数据，添加新的加载更多节点
            if (hasMore) {
              node.insertChild({
                data: {
                  id: loadMoreNodeId,
                  name: '加载更多',
                  deviceType,
                  isLoadMore: true,
                  leaf: true
                }
              });
            }
          }
        } else {
          this.devicePageMap[deviceType].hasMore = false;
        }
      }).catch(error => {
        console.error('加载设备失败:', error);
      }).finally(() => {
        this.loadingMore = false;
      });
    },
    loadMoreChannels(deviceId) {
      this.loadingMore = true;
      
      const pageInfo = this.channelPageMap[deviceId] || { page: 1, hasMore: true };
      
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
          if (data?.list) {
            const hasMore = data.list.length >= this.pageSize;
            
            this.channelPageMap[deviceId] = {
              page: pageInfo.page + 1,
              hasMore: hasMore
            };
            
            this.noMoreData = !hasMore;
            
            const channels = data.list.map(channel => ({
              id: channel.id,
              name: channel.name || channel.channelId || channel.deviceId,
              channelId: channel.channelId || channel.deviceId,
              deviceId,
              online: channel.status === 'ON',
              leaf: true
            }));
            
            const node = this.$refs.tree.getNode(deviceId);
            if (node && channels.length > 0) {
              channels.forEach(channel => {
                node.insertChild({ data: channel });
              });
            } else if (channels.length === 0) {
              this.noMoreData = true;
            }
          } else {
            this.channelPageMap[deviceId].hasMore = false;
            this.noMoreData = true;
          }
        }).catch(error => {
          console.error('加载通道失败:', error);
        }).finally(() => {
          this.loadingMore = false;
        });
    },
    
    // 公共方法
    refresh() {
      const tree = this.$refs.tree;
      if (!tree) return;
      
      // 清空数据
      this.deviceTreeData = [];
      this.devicePageMap = {};
      this.channelPageMap = {};
      this.currentDeviceType = null;
      this.currentDeviceId = null;
      this.showLoadMoreButton = false;
      this.noMoreData = false;
      
      // 重置树结构
      tree.store.setData([]);
      tree.store.root.childNodes = [];
      tree.store.root.loaded = false;
      tree.store.root.expanded = false;
      
      // 重新加载
      setTimeout(() => {
        tree.store.root.expand();
      }, 100);
    },
    
    getLoadedChannels() {
      const channels = [];
      if (!this.$refs.tree?.store) return channels;
      
      const root = this.$refs.tree.store.root;
      if (!root?.childNodes) return channels;
      
      root.childNodes.forEach(typeNode => {
        if (!typeNode?.childNodes) return;
        
        typeNode.childNodes.forEach(deviceNode => {
          if (!deviceNode?.childNodes) return;
          
          deviceNode.childNodes.forEach(channelNode => {
            if (channelNode?.data?.leaf) {
              channels.push({
                id: channelNode.data.id,
                name: channelNode.data.name,
                channelId: channelNode.data.channelId || channelNode.data.id,
                deviceId: channelNode.data.deviceId,
                online: channelNode.data.online
              });
            }
          });
        });
      });
      
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

.el-tree-node__content {
  position: relative !important;
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  padding-right: 8px;
}

.icon-svg, .iconfont {
  margin-right: 4px;
}

.device-online {
  color: #252525;
}

.device-offline {
  color: #727272;
}

.el-tree-node__content:active {
  background-color: #e6f1fc;
}

.el-tree-node.is-clicked > .el-tree-node__content {
  background-color: #f0f7ff;
  border-left: 2px solid #409EFF;
}

.custom-tree-node span:hover {
  cursor: pointer;
}

.el-tooltip__popper.device-id-tooltip {
  max-width: 130px;
  font-size: 6px;
  padding: 3px 6px;
  word-break: break-all;
  margin-top: 0 !important;
  margin-left: 0 !important;
}

.el-tree {
  overflow-y: auto;
  max-height: calc(100vh - 220px);
  height: calc(100vh - 220px);
}

.el-tree-node[data-level="1"] > .el-tree-node__children {
  max-height: var(--device-type-container-height);
  overflow-y: auto;
  overflow-x: hidden;
  border-bottom: 1px solid #ebeef5;
}

.el-tree-node[data-id$="_search"] > .el-tree-node__content {
  color: #409EFF;
  font-weight: bold;
  background-color: #f0f7ff;
  cursor: pointer;
}

.el-tree-node[data-id$="_search"] > .el-tree-node__content:hover {
  background-color: #ecf5ff;
}

.el-tree-node[data-id$="_search"] > .el-tree-node__content:active {
  background-color: #d9ecff;
}

.el-tree-node[data-id$="_loadmore"] > .el-tree-node__content {
  color: #409EFF;
  text-align: center;
  background-color: #f5f7fa;
  border-top: 1px dashed #ebeef5;
  cursor: pointer;
}

.el-tree-node[data-id$="_loadmore"] > .el-tree-node__content:hover {
  background-color: #ecf5ff;
}

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

/* 搜索框样式 */
.search-container {
  padding: 8px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  z-index: 10;
}

/* 加载更多按钮样式 */
.load-more-container {
  text-align: center;
  padding: 8px 0;
  border-top: 1px solid #ebeef5;
  background-color: #f5f7fa;
  cursor: pointer;
  margin-top: 5px;
}

.load-more-container:hover {
  background-color: #edf2fc;
}

.no-more-text {
  color: #909399;
  font-size: 12px;
  padding: 5px 0;
  text-align: center;
  background-color: #f5f7fa;
}
</style>