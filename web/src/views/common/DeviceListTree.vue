<template>
  <div class="device-list-tree">
    <el-tree
      ref="tree"
      :data="deviceTreeData"
      :props="defaultProps"
      :expand-on-click-node="false"
      node-key="id"
      default-expand-all
      @node-click="handleNodeClick"
    >
      <span class="custom-tree-node" slot-scope="{ node, data }">
        <span :class="data.online ? 'device-online' : 'device-offline'">{{ node.label }}</span>
      </span>
    </el-tree>
  </div>
</template>

<script>
export default {
  name: 'DeviceListTree',
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
      }
    }
  },
  created() {
    this.$nextTick(() => {
      this.getDeviceList()
    })
  },
  methods: {
    getDeviceList() {
      // 获取设备列表数据
      this.$axios.get('/api/device/query/devices').then(res => {
        if (res.data.code === 0) {
          const devices = res.data.data
          
          // 创建设备树结构
          const deviceTree = []
          
          // 国标设备分类
          const gbDevices = {
            id: 'gb-devices',
            name: '国标设备',
            children: [],
            leaf: false
          }
          
          // 推流设备分类
          const pushDevices = {
            id: 'push-devices',
            name: '推流设备',
            children: [],
            leaf: false
          }
          
          // 拉流代理设备分类
          const proxyDevices = {
            id: 'proxy-devices',
            name: '拉流代理设备',
            children: [],
            leaf: false
          }
          
          // 分类处理设备
          devices.forEach(device => {
            const deviceNode = {
              id: device.deviceId,
              name: device.name || device.deviceId,
              deviceId: device.deviceId,
              online: device.online,
              children: [],
              leaf: false
            }
            
            // 根据设备类型分类
            if (device.deviceType === 'gb') {
              gbDevices.children.push(deviceNode)
            } else if (device.deviceType === 'push') {
              pushDevices.children.push(deviceNode)
            } else if (device.deviceType === 'proxy') {
              proxyDevices.children.push(deviceNode)
            }
            
            // 如果有通道，获取通道信息
            if (this.hasChannel) {
              this.getChannels(deviceNode)
            }
          })
          
          // 添加到设备树
          if (gbDevices.children.length > 0) {
            deviceTree.push(gbDevices)
          }
          if (pushDevices.children.length > 0) {
            deviceTree.push(pushDevices)
          }
          if (proxyDevices.children.length > 0) {
            deviceTree.push(proxyDevices)
          }
          
          this.deviceTreeData = deviceTree
        }
      })
    },
    getChannels(deviceNode) {
      // 获取设备的通道
      this.$axios.get(`/api/device/query/channels/${deviceNode.deviceId}`).then(res => {
        if (res.data.code === 0) {
          const channels = res.data.data
          
          channels.forEach(channel => {
            deviceNode.children.push({
              id: channel.channelId,
              name: channel.name || channel.channelId,
              channelId: channel.channelId,
              deviceId: deviceNode.deviceId,
              online: channel.status === 'ON',
              leaf: true
            })
          })
        }
      })
    },
    handleNodeClick(data) {
      if (this.clickEvent) {
        this.clickEvent(data)
      }
    },
    refresh() {
      this.getDeviceList()
    }
  }
}
</script>

<style scoped>
.device-list-tree {
  width: 100%;
}
</style>