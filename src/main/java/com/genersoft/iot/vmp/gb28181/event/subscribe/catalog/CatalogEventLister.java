package com.genersoft.iot.vmp.gb28181.event.subscribe.catalog;

import com.genersoft.iot.vmp.conf.UserSetting;
import com.genersoft.iot.vmp.gb28181.bean.CommonGBChannel;
import com.genersoft.iot.vmp.gb28181.bean.Platform;
import com.genersoft.iot.vmp.gb28181.bean.SubscribeHolder;
import com.genersoft.iot.vmp.gb28181.bean.SubscribeInfo;
import com.genersoft.iot.vmp.gb28181.service.IPlatformChannelService;
import com.genersoft.iot.vmp.gb28181.service.IPlatformService;
import com.genersoft.iot.vmp.gb28181.transmit.cmd.ISIPCommanderForPlatform;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

import javax.sip.InvalidArgumentException;
import javax.sip.SipException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * catalog事件
 */
@Slf4j
@Component
public class CatalogEventLister implements ApplicationListener<CatalogEvent> {

    @Autowired
    private IPlatformService platformService;

    @Autowired
    private IPlatformChannelService platformChannelService;

    @Autowired
    private ISIPCommanderForPlatform sipCommanderFroPlatform;

    @Autowired
    private SubscribeHolder subscribeHolder;

    @Autowired
    private UserSetting userSetting;

    @Override
    public void onApplicationEvent(CatalogEvent event) {
        SubscribeInfo subscribe = null;
        Platform parentPlatform = null;
        log.info("[Catalog事件: {}]通道数量： {}", event.getType(), event.getChannels().size());
        Map<String, List<Platform>> platformMap = new HashMap<>();
        Map<String, CommonGBChannel> channelMap = new HashMap<>();
        if (event.getPlatform() != null) {
            parentPlatform = event.getPlatform();
            if (parentPlatform.getServerGBId() == null) {
                log.info("[Catalog事件: {}] 平台服务国标编码未找到", event.getType());
                return;
            }
            subscribe = subscribeHolder.getCatalogSubscribe(parentPlatform.getServerGBId());
            if (subscribe == null) {
                log.info("[Catalog事件: {}] 未订阅目录事件", event.getType());
                return;
            }

        } else {
            List<Platform> allPlatform = platformService.queryAll(userSetting.getServerId());
            log.debug("[Catalog事件: {}] 查询到所有平台数量: {}", event.getType(), allPlatform.size());
            if (log.isDebugEnabled()) {
                for (Platform p : allPlatform) {
                    log.debug("[Catalog事件: {}] 平台信息: id={}, serverGBId={}, name={}", event.getType(), p.getId(), p.getServerGBId(), p.getName());
                }
            }
            // 获取所用订阅
            List<String> platforms = subscribeHolder.getAllCatalogSubscribePlatform(allPlatform);
            log.info("[Catalog事件: {}] 已订阅目录事件的平台数量: {}, 平台列表: {}", event.getType(), platforms.size(), platforms);
            if (platforms.isEmpty() && !allPlatform.isEmpty()) {
                log.warn("[Catalog事件: {}] 所有平台都未订阅目录事件，请检查Redis订阅信息", event.getType());
            }
            if (event.getChannels() != null) {
                if (!platforms.isEmpty()) {
                    for (CommonGBChannel deviceChannel : event.getChannels()) {
                        List<Platform> parentPlatformsForGB = platformChannelService.queryPlatFormListByChannelDeviceId(
                                deviceChannel.getGbId(), platforms);
                        log.debug("[Catalog事件: {}] 通道{}查询到上级平台数量: {}", event.getType(), deviceChannel.getGbDeviceId(),
                                parentPlatformsForGB.size());
                        // 统一使用gbId作为key，避免字段混用
                        String gbIdKey = String.valueOf(deviceChannel.getGbId());
                        platformMap.put(gbIdKey, parentPlatformsForGB);
                        channelMap.put(gbIdKey, deviceChannel);
                    }
                } else {
                    log.warn("[Catalog事件: {}] 未订阅目录事件，跳过处理。总平台数: {}", event.getType(), allPlatform.size());
                }
            } else {
                log.warn("[Catalog事件: {}] 事件内通道数为0", event.getType());
            }
        }
        switch (event.getType()) {
            case CatalogEvent.ON:
            case CatalogEvent.OFF:
            case CatalogEvent.DEL:

                if (parentPlatform != null) {
                    List<CommonGBChannel> channels = new ArrayList<>();
                    if (event.getChannels() != null) {
                        channels.addAll(event.getChannels());
                    }
                    if (!channels.isEmpty()) {
                        log.info("[Catalog事件: {}]平台：{}，影响通道{}个", event.getType(), parentPlatform.getServerGBId(),
                                channels.size());
                        try {
                            sipCommanderFroPlatform.sendNotifyForCatalogOther(event.getType(), parentPlatform, channels,
                                    subscribe, null);
                            log.debug("[Catalog事件: {}] 成功发送通知到指定平台: {}", event.getType(),
                                    parentPlatform.getServerGBId());
                        } catch (InvalidArgumentException | ParseException | NoSuchFieldException | SipException
                                | IllegalAccessException e) {
                            log.error("[命令发送失败] 国标级联 Catalog通知到指定平台{}: {}", parentPlatform.getServerGBId(),
                                    e.getMessage());
                        }
                    }
                } else if (!platformMap.keySet().isEmpty()) {
                    log.info("[Catalog事件: {}] 开始处理广播模式，影响通道数: {}", event.getType(), platformMap.keySet().size());
                    for (String gbIdKey : platformMap.keySet()) {
                        List<Platform> platformList = platformMap.get(gbIdKey);
                        if (platformList != null && !platformList.isEmpty()) {
                            CommonGBChannel originalChannel = channelMap.get(gbIdKey);
                            for (Platform platform : platformList) {
                                SubscribeInfo subscribeInfo = subscribeHolder
                                        .getCatalogSubscribe(platform.getServerGBId());
                                if (subscribeInfo == null) {
                                    log.debug("[Catalog事件: {}] 平台{}未找到订阅信息，跳过", event.getType(),
                                            platform.getServerGBId());
                                    continue;
                                }
                                log.info("[Catalog事件: {}]平台：{}，影响通道{}", event.getType(), platform.getServerGBId(),
                                        originalChannel.getGbDeviceId());
                                List<CommonGBChannel> deviceChannelList = new ArrayList<>();
                                CommonGBChannel deviceChannel = new CommonGBChannel();
                                deviceChannel.setGbDeviceId(originalChannel.getGbDeviceId());
                                deviceChannelList.add(deviceChannel);
                                try {
                                    sipCommanderFroPlatform.sendNotifyForCatalogOther(event.getType(), platform,
                                            deviceChannelList, subscribeInfo, null);
                                    log.debug("[Catalog事件: {}] 成功发送通知到平台: {}", event.getType(),
                                            platform.getServerGBId());
                                } catch (InvalidArgumentException | ParseException | NoSuchFieldException | SipException
                                        | IllegalAccessException e) {
                                    log.error("[命令发送失败] 国标级联 Catalog通知到平台{}: {}", platform.getServerGBId(),
                                            e.getMessage());
                                }
                            }
                        } else {
                            CommonGBChannel originalChannel = channelMap.get(gbIdKey);
                            String channelDeviceId = originalChannel != null ? originalChannel.getGbDeviceId()
                                    : gbIdKey;
                            log.info("[Catalog事件: {}] 未找到上级平台： {}", event.getType(), channelDeviceId);
                        }
                    }
                }
                break;
            case CatalogEvent.VLOST:
                break;
            case CatalogEvent.DEFECT:
                break;
            case CatalogEvent.ADD:
            case CatalogEvent.UPDATE:
                if (parentPlatform != null) {
                    List<CommonGBChannel> deviceChannelList = new ArrayList<>();
                    if (event.getChannels() != null) {
                        deviceChannelList.addAll(event.getChannels());
                    }
                    if (!deviceChannelList.isEmpty()) {
                        log.info("[Catalog事件: {}]平台：{}，影响通道{}个", event.getType(), parentPlatform.getServerGBId(),
                                deviceChannelList.size());
                        try {
                            sipCommanderFroPlatform.sendNotifyForCatalogAddOrUpdate(event.getType(), parentPlatform,
                                    deviceChannelList, subscribe, null);
                            log.debug("[Catalog事件: {}] 成功发送ADD/UPDATE通知到指定平台: {}", event.getType(),
                                    parentPlatform.getServerGBId());
                        } catch (InvalidArgumentException | ParseException | NoSuchFieldException | SipException
                                | IllegalAccessException e) {
                            log.error("[命令发送失败] 国标级联 Catalog ADD/UPDATE通知到指定平台{}: {}", parentPlatform.getServerGBId(),
                                    e.getMessage());
                        }
                    }
                } else if (!platformMap.keySet().isEmpty()) {
                    log.info("[Catalog事件: {}] 开始处理ADD/UPDATE广播模式，影响通道数: {}", event.getType(),
                            platformMap.keySet().size());
                    for (String gbIdKey : platformMap.keySet()) {
                        List<Platform> parentPlatforms = platformMap.get(gbIdKey);
                        if (parentPlatforms != null && !parentPlatforms.isEmpty()) {
                            CommonGBChannel originalChannel = channelMap.get(gbIdKey);
                            for (Platform platform : parentPlatforms) {
                                SubscribeInfo subscribeInfo = subscribeHolder
                                        .getCatalogSubscribe(platform.getServerGBId());
                                if (subscribeInfo == null) {
                                    log.debug("[Catalog事件: {}] 平台{}未找到订阅信息，跳过", event.getType(),
                                            platform.getServerGBId());
                                    continue;
                                }
                                log.info("[Catalog事件: {}]平台：{}，影响通道{}", event.getType(), platform.getServerGBId(),
                                        originalChannel.getGbDeviceId());
                                List<CommonGBChannel> channelList = new ArrayList<>();
                                channelList.add(originalChannel);
                                try {
                                    sipCommanderFroPlatform.sendNotifyForCatalogAddOrUpdate(event.getType(), platform,
                                            channelList, subscribeInfo, null);
                                    log.debug("[Catalog事件: {}] 成功发送ADD/UPDATE通知到平台: {}", event.getType(),
                                            platform.getServerGBId());
                                } catch (InvalidArgumentException | ParseException | NoSuchFieldException | SipException
                                        | IllegalAccessException e) {
                                    log.error("[命令发送失败] 国标级联 Catalog ADD/UPDATE通知到平台{}: {}", platform.getServerGBId(),
                                            e.getMessage());
                                }
                            }
                        }
                    }
                }
                break;
            default:
                break;
        }
    }
}
