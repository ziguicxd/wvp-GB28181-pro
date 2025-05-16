<template>
  <div id="DeviceTree" :class="{'collapsed': isCollapsed}" style="width: 100%;height: 100%; background-color: #FFFFFF; overflow: auto; padding: 30px 30px 30px 10px">
    <div v-if="!isCollapsed" style="height: 30px; display: grid; grid-template-columns: auto auto auto; align-items: center; margin-bottom: 10px; padding-left: 10px">
      <div>通道列表</div>
      <div style="width: 120px">
        <el-select v-model="viewMode" size="small" placeholder="请选择">
          <el-option label="设备树" value="device"></el-option>          
          <el-option label="行政区划" value="region"></el-option>
          <el-option label="业务分组" value="group"></el-option>
        </el-select>
      </div>
      <div style="text-align: right">
        <el-button type="text" @click="toggleCollapse">
          <i class="el-icon-d-arrow-left"></i>
        </el-button>
      </div>
    </div>
    <div v-else class="collapsed-button">
      <el-button type="text" @click="toggleCollapse">
        <i class="el-icon-d-arrow-right"></i>
      </el-button>
    </div>
    <div v-if="!isCollapsed" class="tree-container">
      <div v-if="viewMode === 'region'" class="region-tree">
        <RegionTree ref="regionTree" :edit="false" :show-header="false" :has-channel="true" :click-event="treeNodeClickEvent" />
      </div>
      <div v-if="viewMode === 'group'" class="group-tree">
        <GroupTree ref="groupTree" :edit="false" :show-header="false" :has-channel="true" :click-event="treeNodeClickEvent" />
      </div>
      <div v-if="viewMode === 'device'" class="device-tree">
        <DeviceListTree ref="deviceListTree" :edit="false" :show-header="false" :has-channel="true" :click-event="treeNodeClickEvent" />
      </div>
    </div>
  </div>
</template>

<script>
import RegionTree from './RegionTree.vue'
import GroupTree from './GroupTree.vue'
import DeviceListTree from './DeviceListTree.vue'

export default {
  name: 'DeviceTree',
  components: { GroupTree, RegionTree, DeviceListTree },
  props: ['device', 'onlyCatalog', 'clickEvent', 'contextMenuEvent'],
  data() {
    return {
      viewMode: 'device',
      isCollapsed: false,
      defaultProps: {
        children: 'children',
        label: 'name',
        isLeaf: 'isLeaf'
      }
    }
  },
  watch: {
    viewMode(newVal) {
      this.$nextTick(() => {
        if (newVal === 'device' && this.$refs.deviceListTree) {
          this.$refs.deviceListTree.refresh && this.$refs.deviceListTree.refresh();
        } else if (newVal === 'region' && this.$refs.regionTree) {
          this.$refs.regionTree.reset && this.$refs.regionTree.reset();
        } else if (newVal === 'group' && this.$refs.groupTree) {
          this.$refs.groupTree.reset && this.$refs.groupTree.reset();
        }
      });
    }
  },
  destroyed() {
    // if (this.jessibuca) {
    //   this.jessibuca.destroy();
    // }
    // this.playing = false;
    // this.loaded = false;
    // this.performance = "";
  },
  methods: {
    handleClick: function(tab, event) {
    },
    treeNodeClickEvent: function(data) {
      if (data.leaf) {
        console.log(23111)
        console.log(data)
        if (this.clickEvent) {
          this.clickEvent(data.id)
        }
      }
    },
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
      this.$emit('collapse-change', this.isCollapsed);
    }
  }
}
</script>

<style>
.device-tree-main-box{
  text-align: left;
}
.device-online{
  color: #252525;
}
.device-offline{
  color: #727272;
}
.el-select {
  width: 100%;
}
#DeviceTree {
  transition: width 0.3s;
  position: relative;
}
#DeviceTree.collapsed {
  width: 50px !important;
  padding: 30px 0 !important;
}
.collapsed-button {
  position: absolute;
  top: 30px;
  left: 0;
  width: 50px;
  display: flex;
  justify-content: center;
}
.tree-container {
  margin-top: 10px;
  padding-left: 1px;
}
/* 调整树组件的样式，使第一级节点靠左对齐，但排除设备树 */
.tree-container .region-tree .el-tree > .el-tree-node,
.tree-container .group-tree .el-tree > .el-tree-node {
  padding-left: 0 !important;
}
.tree-container .region-tree .el-tree-node__content,
.tree-container .group-tree .el-tree-node__content {
  padding-left: 0 !important;
}
.tree-container .region-tree .el-tree-node__children .el-tree-node__content,
.tree-container .group-tree .el-tree-node__children .el-tree-node__content {
  padding-left: 18px !important;
}
/* 确保搜索结果也左对齐，但排除设备树 */
.tree-container .region-tree .el-tree .el-tree-node.is-current > .el-tree-node__content,
.tree-container .group-tree .el-tree .el-tree-node.is-current > .el-tree-node__content {
  padding-left: 0 !important;
}
.tree-container .region-tree .el-tree-node.is-current > .el-tree-node__content,
.tree-container .group-tree .el-tree-node.is-current > .el-tree-node__content {
  padding-left: 0 !important;
}
/* 修复搜索过滤时的对齐问题，但排除设备树 */
.tree-container .region-tree .el-tree .el-tree-node:not(.is-expanded) > .el-tree-node__children,
.tree-container .group-tree .el-tree .el-tree-node:not(.is-expanded) > .el-tree-node__children {
  padding-left: 0 !important;
}
.tree-container .region-tree .el-tree .el-tree__empty-block,
.tree-container .group-tree .el-tree .el-tree__empty-block {
  padding-left: 0 !important;
}
</style>