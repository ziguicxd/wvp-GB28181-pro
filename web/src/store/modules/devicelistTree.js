export function loadDevicesByType(context, deviceType, resolve) {
  const pageInfo = context.devicePageMap[deviceType] || { page: 1, hasMore: true };

  if (!pageInfo.hasMore && pageInfo.page > 1) {
    resolve([]);
    return;
  }

  const queryParams = {
    page: pageInfo.page,
    count: context.pageSize,
    query: context.searchQuery,
    status: context.deviceStatusFilter[deviceType],
    deviceType
  };

  context.$store.dispatch('device/queryDevices', queryParams).then(data => {
    if (data?.list) {
      const filteredList = data.list.map(device => ({
        id: device.id,
        name: device.name || device.deviceId,
        deviceId: device.deviceId,
        deviceType,
        online: device.onLine,
        leaf: !context.hasChannel
      }));

      context.devicePageMap[deviceType] = {
        page: pageInfo.page + 1,
        hasMore: filteredList.length >= context.pageSize
      };

      const result = [...filteredList];
      if (context.devicePageMap[deviceType].hasMore) {
        result.push({
          id: `${deviceType}_loadmore`,
          name: '加载更多',
          deviceType,
          isLoadMore: true,
          leaf: true
        });
      }
      resolve(result);
    } else {
      context.devicePageMap[deviceType].hasMore = false;
      resolve([]);
    }
  }).catch(error => {
    console.error('加载设备失败:', error);
    resolve([]);
  });
}

export function loadChannels(context, deviceId, resolve) {
  const pageInfo = context.channelPageMap[deviceId] || { page: 1, hasMore: true };

  if (!pageInfo.hasMore && pageInfo.page > 1) {
    resolve([]);
    return;
  }

  const params = {
    page: pageInfo.page,
    count: context.pageSize,
    query: context.searchQuery,
    online: null,
    channelType: null,
    catalogUnderDevice: true
  };

  context.$store.dispatch('device/queryChannels', [deviceId, params]).then(data => {
    if (data?.list) {
      const channels = data.list.map(channel => ({
        id: channel.id,
        name: channel.name || channel.channelId || channel.deviceId,
        channelId: channel.channelId || channel.deviceId,
        deviceId,
        online: channel.status === 'ON',
        leaf: true
      }));

      context.channelPageMap[deviceId] = {
        page: pageInfo.page + 1,
        hasMore: channels.length >= context.pageSize
      };

      resolve(channels);
    } else {
      context.channelPageMap[deviceId].hasMore = false;
      resolve([]);
    }
  }).catch(error => {
    console.error('加载通道失败:', error);
    resolve([]);
  });
}
