<template>
  <div class="device-list-tree">
    <!-- 全局搜索框 -->
    <div class="global-search">
      <el-input
        v-model="searchQuery"
        placeholder="搜索设备"
        prefix-icon="el-icon-search"
        clearable
        @input="handleGlobalSearch"
        size="small"
      >
        <el-button slot="append" icon="el-icon-search" @click="handleGlobalSearch"></el-button>
      </el-input>
    </div>
    
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
      height="calc(100vh - 220px)"
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
          :content="getTooltipContent(data)" 
          placement="right" 
          :disabled="isTooltipDisabled(node, data)"
          :open-delay="500"
          :enterable="false"
          popper-class="device-id-tooltip"
        >
          <span 
            :class="data.online ? 'device-online' : 'device-offline'"
            @mouseenter="handleNodeHover(data, node, $event)"
            @mouseleave="handleNodeLeave"
          >{{ node.label }}</span>
        </el-tooltip>
        
        <!-- 状态过滤按钮和刷新按钮 -->
        <span v-if="node.level === 1" class="button-group">
          <el-dropdown trigger="click" @command="(cmd) => filterDevicesByStatus(cmd, data, node)" @click.stop>
            <span class="filter-button">
              <i :class="getStatusFilterIcon(data.id)"></i>
            </span>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="online">在线</el-dropdown-item>
              <el-dropdown-item command="offline">离线</el-dropdown-item>
              <el-dropdown-item command="clear">全部</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          <span class="refresh-button" @click.stop="refreshDeviceType(data, node)">
            <i class="el-icon-refresh"></i>
          </span>
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
      loadMoreNodes: {},
      deviceStatusFilter: {
        gb: null,
        push: null,
        proxy: null
      }
    }
  },
  
  computed: {
    isGbExpanded() {
      const isExpanded = this.expandedNodes.has('gb');
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
      return node.level === 1 || data.isLoadMore || (!data.deviceId && !data.id) || (this.currentHoverNode !== node.data.id);
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
        if (!node.data?.id) {
          console.warn('节点数据缺少 id:', node.data);
          resolve([]);
          return;
        }
        this.loadDevicesByType(node.data.id, resolve); // 根据节点类型加载设备
      } else if (node.level === 2 && this.hasChannel) {
        if (!node.data?.deviceId) {
          console.warn('节点数据缺少 deviceId:', node.data);
          resolve([]);
          return;
        }
        this.loadChannels(node.data.deviceId, resolve);
      } else {
        resolve([]);
      }
    },
    
    loadDevicesByType(deviceType, resolve) {
      if (!['gb', 'push', 'proxy'].includes(deviceType)) {
        console.warn('无效的设备类型:', deviceType);
        resolve([]);
        return;
      }

      if (deviceType === 'gb') {
        this.loadGbDevices(resolve);
      } else if (deviceType === 'push') {
        this.loadPushDevices(resolve);
      } else if (deviceType === 'proxy') {
        this.loadProxyDevices(resolve); // 加载拉流代理设备
      }
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
    
    loadGbDevices(resolve) {
      const queryParams = this.getGbQueryParams();
      this.$store.dispatch('device/queryDevices', queryParams).then(data => {
        this.processGbDeviceData(data, resolve);
      }).catch(error => {
        console.error('加载国标设备失败:', error);
        resolve([]);
      });
    },

    loadPushDevices(resolve) {
      if (this.loadingMore) {
        resolve([]);
        return;
      }

      this.loadingMore = true;
      const queryParams = this.getPushQueryParams();
      this.$store.dispatch('streamPush/queryList', queryParams)
        .then((data) => {
          const pushList = data.list || [];
          const filteredList = pushList.map(item => ({
            id: `push/${item.app}/${item.stream}`, // 添加前缀 "push/"
            name: item.stream,
            deviceId: null,
            deviceType: 'push',
            online: item.pushing === true,
            leaf: true
          }));

          this.devicePageMap.push = {
            page: (this.devicePageMap.push?.page || 1) + 1,
            hasMore: filteredList.length >= this.pageSize
          };

          const result = [...filteredList];
          if (this.devicePageMap.push.hasMore) {
            result.push({
              id: 'push_loadmore',
              name: '加载更多',
              deviceType: 'push',
              isLoadMore: true,
              leaf: true
            });
          }

          resolve(result);
        })
        .catch((error) => {
          console.error('加载推流设备失败:', error);
          resolve([]);
        })
        .finally(() => {
          this.loadingMore = false;
        });
    },

    loadProxyDevices(resolve) {
      if (this.loadingMore) {
        resolve([]);
        return;
      }

      this.loadingMore = true;
      const queryParams = this.getProxyQueryParams();
      this.$store.dispatch('streamProxy/queryList', queryParams)
        .then((data) => {
          const proxyList = data.list || [];
          const filteredList = proxyList.map(item => ({
            id: `proxy/${item.app}/${item.stream}`, // 添加前缀 "proxy/"
            name: item.stream,
            deviceId: null,
            deviceType: 'proxy',
            online: item.pulling === true,
            leaf: true
          }));

          this.devicePageMap.proxy = {
            page: (this.devicePageMap.proxy?.page || 1) + 1,
            hasMore: filteredList.length >= this.pageSize
          };

          const result = [...filteredList];
          if (this.devicePageMap.proxy.hasMore) {
            result.push({
              id: 'proxy_loadmore',
              name: '加载更多',
              deviceType: 'proxy',
              isLoadMore: true,
              leaf: true
            });
          }

          resolve(result);
        })
        .catch((error) => {
          console.error('加载拉流代理设备失败:', error);
          resolve([]);
        })
        .finally(() => {
          this.loadingMore = false;
        });
    },

    getGbQueryParams() {
      const pageInfo = this.devicePageMap.gb || { page: 1, hasMore: true };
      return {
        page: pageInfo.page,
        count: this.pageSize,
        query: this.searchQuery,
        status: this.deviceStatusFilter.gb,
        deviceType: 'gb'
      };
    },

    getPushQueryParams() {
      const pageInfo = this.devicePageMap.push || { page: 1, hasMore: true };
      return {
        page: pageInfo.page,
        count: this.pageSize,
        query: this.searchQuery,
        status: this.deviceStatusFilter.push,
        app: 'live', // 示例参数，表示推流应用名称
        stream: this.searchQuery // 示例参数，表示推流流名称
      };
    },

    getProxyQueryParams() {
      const pageInfo = this.devicePageMap.proxy || { page: 1, hasMore: true };
      return {
        page: pageInfo.page,
        count: this.pageSize,
        query: this.searchQuery,
        pulling: this.deviceStatusFilter.proxy,
        mediaServerId: null // 示例参数，可根据实际需求调整
      };
    },

    processGbDeviceData(data, resolve) {
      this.processDeviceData(data, 'gb', resolve);
    },

    processPushDeviceData(data, resolve) {
      if (data?.records) {
        const filteredList = data.records.map(item => ({
          id: `${item.app}/${item.stream}`,
          name: item.stream,
          deviceId: null,
          deviceType: 'push',
          online: item.status === 'ON',
          leaf: true
        }));

        this.devicePageMap.push = {
          page: (this.devicePageMap.push?.page || 1) + 1,
          hasMore: filteredList.length >= this.pageSize
        };

        const result = [...filteredList];
        if (this.devicePageMap.push.hasMore) {
          result.push({
            id: 'push_loadmore',
            name: '加载更多',
            deviceType: 'push',
            isLoadMore: true,
            leaf: true
          });
        }

        resolve(result);
      } else {
        this.devicePageMap.push.hasMore = false;
        resolve([]);
      }
    },

    processProxyDeviceData(data, resolve) {
      this.processDeviceData(data, 'proxy', resolve);
    },

    processDeviceData(data, deviceType, resolve) {
      if (!data?.list) {
        console.warn(`设备类型 ${deviceType} 的数据列表为空或无效`);
        this.devicePageMap[deviceType].hasMore = false;
        resolve([]);
        return;
      }

      const filteredList = this.filterDevicesByType(data.list, deviceType);

      this.devicePageMap[deviceType] = {
        page: (this.devicePageMap[deviceType]?.page || 1) + 1,
        hasMore: filteredList.length >= this.pageSize
      };

      const devices = filteredList.map(device => ({
        id: device.id || `${deviceType}/${device.app}/${device.stream}`,
        name: device.name || device.stream || device.deviceId,
        deviceId: device.deviceId,
        deviceType,
        online: device.onLine || device.status === 'ON',
        leaf: !this.hasChannel
      }));

      const result = [...devices];
      if (this.devicePageMap[deviceType].hasMore) {
        result.push({
          id: `${deviceType}_loadmore`,
          name: '加载更多',
          deviceType,
          isLoadMore: true,
          leaf: true
        });
      }

      resolve(result);
    },
    
    // 获取状态过滤图标
    getStatusFilterIcon(deviceType) {
      const status = this.deviceStatusFilter[deviceType];
      if (status === true) {
        return 'el-icon-circle-check filter-button-active';
      } else if (status === false) {
        return 'el-icon-circle-close filter-button-active';
      } else {
        return 'el-icon-menu';
      }
    },
    
    // 按在线状态过滤设备
    filterDevicesByStatus(command, data, node) {
      const deviceType = data.id;
      
      if (command === 'online') {
        this.deviceStatusFilter[deviceType] = true;
      } else if (command === 'offline') {
        this.deviceStatusFilter[deviceType] = false;
      } else if (command === 'clear') {
        this.deviceStatusFilter[deviceType] = null;
      }
      
      // 重置分页信息
      this.devicePageMap[deviceType] = { page: 1, hasMore: true };
      
      // 刷新节点
      node.loaded = false;
      node.expand();
      
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

        if (data.deviceType === 'proxy') {
          if (node.expanded) {
            node.collapse();
            this.expandedNodes.delete(data.id);
          } else {
            // 只在未展开时重置分页并直接展开，触发el-tree懒加载
            this.devicePageMap.proxy = { page: 1, hasMore: true };
            this.loadingMore = false;
            node.loaded = false; // 关键：让el-tree重新触发load
            node.expand();
            this.expandedNodes.add(data.id);
          }
          return;
        }
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
      } else {
        node.expand();
        this.expandedNodes.add(node.data.id);
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
      
      const menuItems = this.buildContextMenuItems(data, node);
      
      if (menuItems.length > 0) {
        this.$contextmenu({
          items: menuItems,
          event,
          customClass: 'custom-context-menu custom-small-menu',
          zIndex: 3000,
          minWidth: 0
        });
      }
    },
    
    buildContextMenuItems(data, node) {
      if (data.isSearch || data.isLoadMore) return [];
      
      const menuItems = [];
      const level = node.level;
      
      if (level === 1) {
        menuItems.push({ label: '刷新设备', icon: 'el-icon-refresh', onClick: () => this.refreshDeviceType(data, node) });
      } else if (level === 2 && !data.isSearch && !data.isLoadMore) {
        menuItems.push({ label: '刷新通道', icon: 'el-icon-refresh', onClick: () => this.refreshChannels(data, node) });
      } else if (level === 3 && data.leaf && data.online) {
        menuItems.push({ label: '播放', icon: 'el-icon-video-play', onClick: () => this.playChannel(data) });
      }
      
      return menuItems;
    },
    // 节点操作方法
    refreshNode(node) {
      node.loaded = false;
      node.expanded ? (node.collapse(), setTimeout(() => node.expand(), 100)) : node.expand();
      if (this.lastClickedNode === node) this.lastClickedNode = null;
    },
    
    refreshDeviceType(data, node) {
      // 只刷新当前节点，其他同级节点全部合上
      this.deviceTypes.forEach(type => {
        if (type !== data.id) {
          const otherNode = this.$refs.tree.getNode(type);
          if (otherNode?.expanded) {
            otherNode.collapse();
            this.expandedNodes.delete(type);
          }
        }
      });
      this.devicePageMap[data.id] = { page: 1, hasMore: true };
      this.refreshNode(node);
    },
    
    refreshChannels(data, node) {
      if (data.deviceId) this.channelPageMap[data.deviceId] = { page: 1, hasMore: true };
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
    
    // 全局搜索相关
    handleGlobalSearch() {
      // 重置所有设备类型的分页信息
      this.deviceTypes.forEach(type => {
        this.devicePageMap[type] = { page: 1, hasMore: true };
        const node = this.$refs.tree.getNode(type);
        if (node) {
          node.loaded = false;
          node.expand();
        }
      });
    },
    
    getDeviceTypeName(deviceType) {
      const typeNames = {
        'gb': '国标设备',
        'push': '推流设备',
        'proxy': '拉流代理'
      };
      return typeNames[deviceType] || '设备';
    },
    
    getTooltipContent(data) {
      if (data.isLoadMore) {
        return '点击加载更多设备';
      } else if (data.leaf) {
        return data.channelId || '';
      } else {
        return data.deviceId || '';
      }
    },
    
    clearSearch() {
      if (!this.searchQuery) return;
      
      this.searchQuery = '';
      this.handleGlobalSearch();
    },
    
    // 悬停提示相关
    handleNodeHover(data, node, event) {
      clearTimeout(this.hoverTimer);
      this.lastMouseEvent = event || window.event;
      
      this.hoverTimer = setTimeout(() => {
        if (!this.lastClickedNode || 
            this.lastClickedNode.data.id !== node.data.id || 
            (Date.now() - this.lastClickTime) > 1000) {
          this.currentHoverNode = node.data.id;
        }
      }, 500);
    },
    
    handleNodeLeave() {
      clearTimeout(this.hoverTimer);
      this.hoverTimer = this.currentHoverNode = this.lastMouseEvent = null;
    },
    // UI 相关方法
    addGlobalStyle() {
      const style = document.createElement('style');
      style.type = 'text/css';
      style.id = 'device-tree-tooltip-style';
      
      style.innerHTML = `
        .el-tooltip__popper.device-id-tooltip {
          transform: translate3d(0, 0, 0) !important;
          font-size: 12px !important;
          padding: 5px 10px !important;
          max-width: fit-content !important;
        }
        .el-tooltip__popper.device-id-tooltip .popper__arrow { display: none !important; }
        .custom-small-menu {
          min-width: 0 !important;
          width: auto !important;
          padding: 0 !important;
        }
        .custom-small-menu .el-menu-item {
          height: 24px !important;
          line-height: 24px !important;
          padding: 0 8px !important;
          font-size: 12px !important;
          min-width: 0 !important;
          width: fit-content !important;
        }`;
      
      document.head.appendChild(style);
      this.setupTooltipObserver();
    },
    
    setupTooltipObserver() {
      this.tooltipObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (!mutation.addedNodes.length) return;
          
          mutation.addedNodes.forEach(node => {
            if (node.classList && 
                node.classList.contains('el-tooltip__popper') && 
                node.classList.contains('device-id-tooltip') && 
                this.lastMouseEvent) {
              
              node.style.position = 'fixed';
              node.style.top = `${this.lastMouseEvent.clientY + 16}px`;
              node.style.left = `${this.lastMouseEvent.clientX + 16}px`;
              
              const arrow = node.querySelector('.popper__arrow');
              if (arrow) arrow.style.display = 'none';
            }
          });
        });
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
        entries => entries.forEach(entry => {
          if (entry.isIntersecting && 
              entry.target.classList.contains('last-visible-node') &&
              this.devicePageMap[nodeId]?.hasMore && 
              !this.loadingMore) {
            this.loadMoreDevices(nodeId);
          }
        }),
        { root: childrenContainer, threshold: 0.5 }
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
      if (container.scrollHeight - container.scrollTop - container.clientHeight < 20 &&
          this.devicePageMap[nodeId]?.hasMore && !this.loadingMore) {
        this.loadMoreDevices(nodeId);
      }
    },
    
    // 加载更多数据
    loadMoreData() {
      if (this.loadingMore) return; // 修复语法错误

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
      if (this.loadingMore) return;

      this.loadingMore = true;

      // 移除原有的加载更多节点
      const loadMoreNodeId = `${deviceType}_loadmore`;
      const loadMoreNode = this.$refs.tree.getNode(loadMoreNodeId);
      const parentNode = this.$refs.tree.getNode(deviceType);
      if (loadMoreNode && parentNode) parentNode.removeChild(loadMoreNode);

      if (deviceType === 'gb') {
        this.loadMoreGbDevices(parentNode, loadMoreNodeId);
      } else if (deviceType === 'push') {
        this.loadMorePushDevices(parentNode, loadMoreNodeId);
      } else if (deviceType === 'proxy') {
        this.loadMoreProxyDevices(parentNode, loadMoreNodeId);
      }
    },

    loadMoreGbDevices(parentNode, loadMoreNodeId) {
      const queryParams = this.getGbQueryParams();
      this.$store.dispatch('device/queryDevices', queryParams)
        .then(data => {
          const filteredList = this.filterDevicesByType(data.list || [], 'gb');
          this.updateDevicePageMap('gb', filteredList.length);

          if (parentNode && filteredList.length > 0) {
            filteredList.forEach(device => parentNode.insertChild({ data: device }));
            this.addLoadMoreNode(parentNode, loadMoreNodeId, 'gb');
          }
        })
        .catch(error => console.error('加载国标设备失败:', error))
        .finally(() => this.loadingMore = false);
    },

    loadMorePushDevices(parentNode, loadMoreNodeId) {
      const queryParams = this.getPushQueryParams();
      this.$store.dispatch('streamPush/queryList', queryParams)
        .then(data => {
          const pushList = data.list || [];
          const filteredList = pushList.map(item => ({
            id: `push/${item.app}/${item.stream}`,
            name: item.stream,
            deviceId: null,
            deviceType: 'push',
            online: item.pushing === true,
            leaf: true
          }));
          this.updateDevicePageMap('push', filteredList.length);

          if (parentNode && filteredList.length > 0) {
            filteredList.forEach(device => parentNode.insertChild({ data: device }));
            this.addLoadMoreNode(parentNode, loadMoreNodeId, 'push');
          }
        })
        .catch(error => console.error('加载推流设备失败:', error))
        .finally(() => this.loadingMore = false);
    },

    loadMoreProxyDevices(parentNode, loadMoreNodeId) {
      const queryParams = this.getProxyQueryParams();
      this.$store.dispatch('streamProxy/queryList', queryParams)
        .then(data => {
          const proxyList = data.list || [];
          const filteredList = proxyList.map(item => ({
            id: `proxy/${item.app}/${item.stream}`,
            name: item.stream,
            deviceId: null,
            deviceType: 'proxy',
            online: item.pulling === true,
            leaf: true
          }));
          this.updateDevicePageMap('proxy', filteredList.length);

          if (parentNode && filteredList.length > 0) {
            filteredList.forEach(device => parentNode.insertChild({ data: device }));
            this.addLoadMoreNode(parentNode, loadMoreNodeId, 'proxy');
          }
        })
        .catch(error => console.error('加载拉流代理失败:', error))
        .finally(() => this.loadingMore = false);
    },

    updateDevicePageMap(deviceType, listLength) {
      this.devicePageMap[deviceType] = {
        page: (this.devicePageMap[deviceType]?.page || 1) + 1,
        hasMore: listLength >= this.pageSize
      };
    },

    addLoadMoreNode(parentNode, loadMoreNodeId, deviceType) {
      if (this.devicePageMap[deviceType].hasMore) {
        parentNode.insertChild({
          data: {
            id: loadMoreNodeId,
            name: '加载更多',
            deviceType,
            isLoadMore: true,
            leaf: true
          }
        });
      }
    },

    /**
     * 强制刷新树结构
     */
    forceRefresh() {
      const tree = this.$refs.tree;
      if (tree) {
        // 清空树数据并重新加载根节点
        tree.store.setData([]);
        tree.store.root.childNodes = [];
        tree.store.root.loaded = false;
        tree.store.root.expanded = false;

        // 重新加载根节点
        setTimeout(() => {
          tree.store.root.expand();
        }, 100);
      } else {
        console.warn('树组件未正确挂载，无法执行 forceRefresh');
      }
    },
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

.global-search {
  padding: 10px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
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
  max-width: fit-content;
  font-size: 12px;
  padding: 5px 10px;
  word-break: keep-all;
  white-space: nowrap;
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

.button-group {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.filter-button, .refresh-button {
  color: #909399;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.3s;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-button {
  margin-right: 5px;
}

.filter-button:hover, .refresh-button:hover {
  opacity: 1;
  color: #409EFF;
}

.filter-button-active {
  color: #409EFF;
  opacity: 1;
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

/* 右键菜单样式 */
.custom-small-menu {
  min-width: 0 !important;
  width: auto !important;
  padding: 0 !important;
}

.custom-small-menu .el-menu-item {
  height: 24px !important;
  line-height: 24px !important;
  padding: 0 8px !important;
  font-size: 12px !important;
  min-width: 0 !important;
  width: fit-content !important;
}
</style>