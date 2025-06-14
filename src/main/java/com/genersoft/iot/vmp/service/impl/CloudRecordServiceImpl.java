package com.genersoft.iot.vmp.service.impl;

import com.alibaba.fastjson2.JSONArray;
import com.alibaba.fastjson2.JSONObject;
import com.genersoft.iot.vmp.common.StreamInfo;
import com.genersoft.iot.vmp.conf.UserSetting;
import com.genersoft.iot.vmp.conf.exception.ControllerException;
import com.genersoft.iot.vmp.media.bean.MediaInfo;
import com.genersoft.iot.vmp.media.bean.MediaServer;
import com.genersoft.iot.vmp.media.event.hook.Hook;
import com.genersoft.iot.vmp.media.event.hook.HookSubscribe;
import com.genersoft.iot.vmp.media.event.hook.HookType;
import com.genersoft.iot.vmp.media.event.media.MediaRecordMp4Event;
import com.genersoft.iot.vmp.media.service.IMediaServerService;
import com.genersoft.iot.vmp.media.zlm.AssistRESTfulUtils;
import com.genersoft.iot.vmp.media.zlm.dto.StreamAuthorityInfo;
import com.genersoft.iot.vmp.service.ICloudRecordService;
import com.genersoft.iot.vmp.service.bean.CloudRecordItem;
import com.genersoft.iot.vmp.service.bean.DownloadFileInfo;
import com.genersoft.iot.vmp.service.bean.ErrorCallback;
import com.genersoft.iot.vmp.service.redisMsg.IRedisRpcPlayService;
import com.genersoft.iot.vmp.storager.IRedisCatchStorage;
import com.genersoft.iot.vmp.storager.dao.CloudRecordServiceMapper;
import com.genersoft.iot.vmp.utils.CloudRecordUtils;
import com.genersoft.iot.vmp.utils.DateUtil;
import com.genersoft.iot.vmp.vmanager.bean.ErrorCode;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ObjectUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;

import java.io.File;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;

@Slf4j
@Service
public class CloudRecordServiceImpl implements ICloudRecordService {

    @Autowired
    private CloudRecordServiceMapper cloudRecordServiceMapper;

    @Autowired
    private IMediaServerService mediaServerService;

    @Autowired
    private IRedisCatchStorage redisCatchStorage;

    @Autowired
    private AssistRESTfulUtils assistRESTfulUtils;

    @Autowired
    private UserSetting userSetting;

    @Autowired
    private IRedisRpcPlayService redisRpcPlayService;

    @Autowired
    private HookSubscribe subscribe;

    @Override
    public PageInfo<CloudRecordItem> getList(int page, int count, String query, String app, String stream,
            String startTime,
            String endTime, List<MediaServer> mediaServerItems, String callId, Boolean ascOrder) {
        // 开始时间和结束时间在数据库中都是以秒为单位的
        Long startTimeStamp = null;
        Long endTimeStamp = null;
        if (startTime != null) {
            if (!DateUtil.verification(startTime, DateUtil.formatter)) {
                throw new ControllerException(ErrorCode.ERROR100.getCode(), "开始时间格式错误，正确格式为： " + DateUtil.formatter);
            }
            startTimeStamp = DateUtil.yyyy_MM_dd_HH_mm_ssToTimestampMs(startTime);

        }
        if (endTime != null) {
            if (!DateUtil.verification(endTime, DateUtil.formatter)) {
                throw new ControllerException(ErrorCode.ERROR100.getCode(), "结束时间格式错误，正确格式为： " + DateUtil.formatter);
            }
            endTimeStamp = DateUtil.yyyy_MM_dd_HH_mm_ssToTimestampMs(endTime);

        }
        PageHelper.startPage(page, count);
        if (query != null) {
            query = query.replaceAll("/", "//")
                    .replaceAll("%", "/%")
                    .replaceAll("_", "/_");
        }
        List<CloudRecordItem> all = cloudRecordServiceMapper.getList(query, app, stream, startTimeStamp, endTimeStamp,
                callId, mediaServerItems, null, ascOrder);
        return new PageInfo<>(all);
    }

    @Override
    public List<String> getDateList(String app, String stream, int year, int month,
            List<MediaServer> mediaServerItems) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate;
        if (month == 12) {
            endDate = LocalDate.of(year + 1, 1, 1);
        } else {
            endDate = LocalDate.of(year, month + 1, 1);
        }
        long startTimeStamp = startDate.atStartOfDay().toInstant(ZoneOffset.ofHours(8)).toEpochMilli();
        long endTimeStamp = endDate.atStartOfDay().toInstant(ZoneOffset.ofHours(8)).toEpochMilli();
        List<CloudRecordItem> cloudRecordItemList = cloudRecordServiceMapper.getList(null, app, stream, startTimeStamp,
                endTimeStamp, null, mediaServerItems, null, null);
        if (cloudRecordItemList.isEmpty()) {
            return new ArrayList<>();
        }
        Set<String> resultSet = new HashSet<>();
        cloudRecordItemList.stream().forEach(cloudRecordItem -> {
            String date = DateUtil.timestampTo_yyyy_MM_dd(cloudRecordItem.getStartTime());
            resultSet.add(date);
        });
        return new ArrayList<>(resultSet);
    }

    @Async("taskExecutor")
    @EventListener
    public void onApplicationEvent(MediaRecordMp4Event event) {
        CloudRecordItem cloudRecordItem = CloudRecordItem.getInstance(event);
        cloudRecordItem.setServerId(userSetting.getServerId());
        if (ObjectUtils.isEmpty(cloudRecordItem.getCallId())) {
            StreamAuthorityInfo streamAuthorityInfo = redisCatchStorage.getStreamAuthorityInfo(event.getApp(),
                    event.getStream());
            if (streamAuthorityInfo != null) {
                cloudRecordItem.setCallId(streamAuthorityInfo.getCallId());
            }
        }
        log.info("[添加录像记录] {}/{}, callId: {}, 内容：{}", event.getApp(), event.getStream(), cloudRecordItem.getCallId(),
                event.getRecordInfo());
        cloudRecordServiceMapper.add(cloudRecordItem);
    }

    @Override
    public String addTask(String app, String stream, MediaServer mediaServerItem, String startTime, String endTime,
            String callId, String remoteHost, boolean filterMediaServer) {
        // 参数校验
        Assert.notNull(app, "应用名为NULL");
        Assert.notNull(stream, "流ID为NULL");
        if (mediaServerItem.getRecordAssistPort() == 0) {
            throw new ControllerException(ErrorCode.ERROR100.getCode(), "为配置Assist服务");
        }
        Long startTimeStamp = null;
        Long endTimeStamp = null;
        if (startTime != null) {
            startTimeStamp = DateUtil.yyyy_MM_dd_HH_mm_ssToTimestamp(startTime);
        }
        if (endTime != null) {
            endTimeStamp = DateUtil.yyyy_MM_dd_HH_mm_ssToTimestamp(endTime);
        }

        List<MediaServer> mediaServers = new ArrayList<>();
        mediaServers.add(mediaServerItem);
        // 检索相关的录像文件
        List<String> filePathList = cloudRecordServiceMapper.queryRecordFilePathList(app, stream, startTimeStamp,
                endTimeStamp, callId, filterMediaServer ? mediaServers : null);
        if (filePathList == null || filePathList.isEmpty()) {
            throw new ControllerException(ErrorCode.ERROR100.getCode(), "未检索到视频文件");
        }
        JSONObject result = assistRESTfulUtils.addTask(mediaServerItem, app, stream, startTime, endTime, callId,
                filePathList, remoteHost);
        if (result.getInteger("code") != 0) {
            throw new ControllerException(result.getInteger("code"), result.getString("msg"));
        }
        return result.getString("data");
    }

    @Override
    public JSONArray queryTask(String app, String stream, String callId, String taskId, String mediaServerId,
            Boolean isEnd, String scheme) {
        MediaServer mediaServerItem = null;
        if (mediaServerId == null) {
            mediaServerItem = mediaServerService.getDefaultMediaServer();
        } else {
            mediaServerItem = mediaServerService.getOne(mediaServerId);
        }
        if (mediaServerItem == null) {
            throw new ControllerException(ErrorCode.ERROR100.getCode(), "未找到可用的流媒体");
        }

        JSONObject result = assistRESTfulUtils.queryTaskList(mediaServerItem, app, stream, callId, taskId, isEnd,
                scheme);
        if (result == null || result.getInteger("code") != 0) {
            throw new ControllerException(ErrorCode.ERROR100.getCode(),
                    result == null ? "查询任务列表失败" : result.getString("msg"));
        }
        return result.getJSONArray("data");
    }

    @Override
    public int changeCollect(boolean result, String app, String stream, String mediaServerId, String startTime,
            String endTime, String callId) {
        // 开始时间和结束时间在数据库中都是以秒为单位的
        Long startTimeStamp = null;
        Long endTimeStamp = null;
        if (startTime != null) {
            if (!DateUtil.verification(startTime, DateUtil.formatter)) {
                throw new ControllerException(ErrorCode.ERROR100.getCode(), "开始时间格式错误，正确格式为： " + DateUtil.formatter);
            }
            startTimeStamp = DateUtil.yyyy_MM_dd_HH_mm_ssToTimestamp(startTime);

        }
        if (endTime != null) {
            if (!DateUtil.verification(endTime, DateUtil.formatter)) {
                throw new ControllerException(ErrorCode.ERROR100.getCode(), "结束时间格式错误，正确格式为： " + DateUtil.formatter);
            }
            endTimeStamp = DateUtil.yyyy_MM_dd_HH_mm_ssToTimestamp(endTime);

        }

        List<MediaServer> mediaServerItems;
        if (!ObjectUtils.isEmpty(mediaServerId)) {
            mediaServerItems = new ArrayList<>();
            MediaServer mediaServerItem = mediaServerService.getOne(mediaServerId);
            if (mediaServerItem == null) {
                throw new ControllerException(ErrorCode.ERROR100.getCode(), "未找到流媒体: " + mediaServerId);
            }
            mediaServerItems.add(mediaServerItem);
        } else {
            mediaServerItems = null;
        }

        List<CloudRecordItem> all = cloudRecordServiceMapper.getList(null, app, stream, startTimeStamp, endTimeStamp,
                callId, mediaServerItems, null, null);
        if (all.isEmpty()) {
            throw new ControllerException(ErrorCode.ERROR100.getCode(), "未找到待收藏的视频");
        }
        int limitCount = 50;
        int resultCount = 0;
        if (all.size() > limitCount) {
            for (int i = 0; i < all.size(); i += limitCount) {
                int toIndex = i + limitCount;
                if (i + limitCount > all.size()) {
                    toIndex = all.size();
                }
                resultCount += cloudRecordServiceMapper.updateCollectList(result, all.subList(i, toIndex));

            }
        } else {
            resultCount = cloudRecordServiceMapper.updateCollectList(result, all);
        }
        return resultCount;
    }

    @Override
    public int changeCollectById(Integer recordId, boolean result) {
        return cloudRecordServiceMapper.changeCollectById(result, recordId);
    }

    @Override
    public DownloadFileInfo getPlayUrlPath(Integer recordId) {
        CloudRecordItem recordItem = cloudRecordServiceMapper.queryOne(recordId);
        if (recordItem == null) {
            throw new ControllerException(ErrorCode.ERROR400.getCode(), "资源不存在");
        }
        if (!userSetting.getServerId().equals(recordItem.getServerId())) {
            return redisRpcPlayService.getRecordPlayUrl(recordItem.getServerId(), recordId);
        }
        String filePath = recordItem.getFilePath();
        MediaServer mediaServerItem = mediaServerService.getOne(recordItem.getMediaServerId());
        return CloudRecordUtils.getDownloadFilePath(mediaServerItem, filePath);
    }

    @Override
    public List<CloudRecordItem> getAllList(String query, String app, String stream, String startTime, String endTime,
            List<MediaServer> mediaServerItems, String callId, List<Integer> ids) {
        // 开始时间和结束时间在数据库中都是以秒为单位的
        Long startTimeStamp = null;
        Long endTimeStamp = null;
        if (startTime != null) {
            if (!DateUtil.verification(startTime, DateUtil.formatter)) {
                throw new ControllerException(ErrorCode.ERROR100.getCode(), "开始时间格式错误，正确格式为： " + DateUtil.formatter);
            }
            startTimeStamp = DateUtil.yyyy_MM_dd_HH_mm_ssToTimestampMs(startTime);

        }
        if (endTime != null) {
            if (!DateUtil.verification(endTime, DateUtil.formatter)) {
                throw new ControllerException(ErrorCode.ERROR100.getCode(), "结束时间格式错误，正确格式为： " + DateUtil.formatter);
            }
            endTimeStamp = DateUtil.yyyy_MM_dd_HH_mm_ssToTimestampMs(endTime);

        }
        return cloudRecordServiceMapper.getList(query, app, stream, startTimeStamp, endTimeStamp,
                callId, mediaServerItems, ids, null);
    }

    @Override
    public void loadRecord(String app, String stream, String date, ErrorCallback<StreamInfo> callback) {
        log.info("[云录像加载] 开始加载录像文件 - app: {}, stream: {}, date: {}", app, stream, date);

        long startTimestamp = DateUtil.yyyy_MM_dd_HH_mm_ssToTimestampMs(date + " 00:00:00");
        long endTimestamp = startTimestamp + 24 * 60 * 60 * 1000;
        log.debug("[云录像加载] 查询时间范围 - startTimestamp: {}, endTimestamp: {}", startTimestamp, endTimestamp);

        List<CloudRecordItem> recordItemList = cloudRecordServiceMapper.getList(null, app, stream, startTimestamp,
                endTimestamp, null, null, null, true);
        log.info("[云录像加载] 查询到录像文件数量: {}", recordItemList.size());

        if (recordItemList.isEmpty()) {
            log.warn("[云录像加载] 未找到录像文件 - app: {}, stream: {}, date: {}", app, stream, date);
            throw new ControllerException(ErrorCode.ERROR100.getCode(), "此时间无录像");
        }

        // 记录找到的录像文件信息
        for (int i = 0; i < recordItemList.size(); i++) {
            CloudRecordItem item = recordItemList.get(i);
            log.debug("[云录像加载] 录像文件[{}] - fileName: {}, filePath: {}, startTime: {}, endTime: {}, timeLen: {}ms",
                    i, item.getFileName(), item.getFilePath(),
                    DateUtil.timestampMsTo_yyyy_MM_dd_HH_mm_ss(item.getStartTime()),
                    DateUtil.timestampMsTo_yyyy_MM_dd_HH_mm_ss(item.getEndTime()),
                    item.getTimeLen());
        }

        String mediaServerId = recordItemList.get(0).getMediaServerId();
        log.info("[云录像加载] 使用媒体服务器: {}", mediaServerId);

        MediaServer mediaServer = mediaServerService.getOne(mediaServerId);
        if (mediaServer == null) {
            log.error("[云录像加载] 媒体节点不存在 - mediaServerId: {}", mediaServerId);
            throw new ControllerException(ErrorCode.ERROR100.getCode(), "媒体节点不存在： " + mediaServerId);
        }
        log.info("[云录像加载] 媒体服务器信息 - ip: {}, httpPort: {}, id: {}",
                mediaServer.getIp(), mediaServer.getHttpPort(), mediaServer.getId());

        String buildApp = "mp4_record";
        String buildStream = app + "_" + stream + "_" + date;
        log.info("[云录像加载] 构建播放流标识 - buildApp: {}, buildStream: {}", buildApp, buildStream);

        MediaInfo mediaInfo = mediaServerService.getMediaInfo(mediaServer, buildApp, buildStream);
        if (mediaInfo != null) {
            log.info("[云录像加载] 录像流已存在，直接返回流信息 - buildApp: {}, buildStream: {}", buildApp, buildStream);
            if (callback != null) {
                StreamInfo streamInfo = mediaServerService.getStreamInfoByAppAndStream(mediaServer, buildApp,
                        buildStream, mediaInfo, null);
                log.info("[云录像加载] 返回已存在的流信息 - fmp4: {}, ts: {}",
                        streamInfo.getFmp4(), streamInfo.getTs());
                callback.run(ErrorCode.SUCCESS.getCode(), ErrorCode.SUCCESS.getMsg(), streamInfo);
            }
            return;
        }

        log.info("[云录像加载] 录像流不存在，开始创建新的播放流 - buildApp: {}, buildStream: {}", buildApp, buildStream);
        Hook hook = Hook.getInstance(HookType.on_media_arrival, buildApp, buildStream, mediaServerId);
        log.info("[云录像加载] 注册Hook事件监听 - hookType: {}, buildApp: {}, buildStream: {}, mediaServerId: {}",
                HookType.on_media_arrival, buildApp, buildStream, mediaServerId);

        subscribe.addSubscribe(hook, (hookData) -> {
            log.info("[云录像加载] 收到媒体流到达事件 - buildApp: {}, buildStream: {}", buildApp, buildStream);

            try {
                StreamInfo streamInfo = mediaServerService.getStreamInfoByAppAndStream(mediaServer, buildApp,
                        buildStream, hookData.getMediaInfo(), null);
                if (streamInfo != null) {
                    log.info("[云录像加载] 成功创建流信息 - fmp4: {}, ts: {}",
                            streamInfo.getFmp4(), streamInfo.getTs());
                } else {
                    log.error("[云录像加载] 创建流信息失败 - streamInfo为null");
                }

                if (callback != null) {
                    callback.run(ErrorCode.SUCCESS.getCode(), ErrorCode.SUCCESS.getMsg(), streamInfo);
                } else {
                    log.warn("[云录像加载] 回调函数为null，无法返回结果");
                }
            } catch (Exception e) {
                log.error("[云录像加载] Hook事件处理异常 - buildApp: {}, buildStream: {}, error: {}",
                        buildApp, buildStream, e.getMessage(), e);
                if (callback != null) {
                    callback.run(ErrorCode.ERROR100.getCode(), "Hook事件处理异常: " + e.getMessage(), null);
                }
            }
        });

        // 使用时间最早的录像文件的路径进行加载
        CloudRecordItem firstRecord = recordItemList.get(0);
        String firstFilePath = firstRecord.getFilePath();
        log.info("[云录像加载] 开始加载MP4文件（时间最早） - fileName: {}, filePath: {}",
                firstRecord.getFileName(), firstFilePath);

        try {
            mediaServerService.loadMP4File(mediaServer, buildApp, buildStream, firstFilePath);
            log.info("[云录像加载] MP4文件加载请求已发送");
        } catch (Exception e) {
            log.error("[云录像加载] MP4文件加载失败 - filePath: {}, error: {}",
                    firstFilePath, e.getMessage(), e);
            throw e;
        }
    }

    @Override
    public void seekRecord(String mediaServerId, String app, String stream, Double seek, String schema) {
        log.info("[云录像定位] 开始定位播放位置 - seek: {}ms", seek);

        MediaServer mediaServer = mediaServerService.getOne(mediaServerId);
        if (mediaServer == null) {
            log.error("[云录像定位] 媒体节点不存在 - mediaServerId: {}", mediaServerId);
            throw new ControllerException(ErrorCode.ERROR100.getCode(), "媒体节点不存在： " + mediaServerId);
        }

        try {
            mediaServerService.seekRecordStamp(mediaServer, app, stream, seek, schema);
            log.info("[云录像定位] 定位操作成功");
        } catch (Exception e) {
            // 如果是"can not find the stream"错误，静默忽略此错误（流可能还在准备中）
            if (e.getMessage() != null && e.getMessage().contains("can not find the stream")) {
                return; // 不抛出异常，允许播放继续
            }
            log.error("[云录像定位] 定位失败 - error: {}", e.getMessage());
            throw e;
        }
    }

    @Override
    public void setRecordSpeed(String mediaServerId, String app, String stream, Integer speed, String schema) {
        log.info("[云录像倍速] 开始设置播放倍速 - mediaServerId: {}, app: {}, stream: {}, speed: {}x, schema: {}",
                mediaServerId, app, stream, speed, schema);

        MediaServer mediaServer = mediaServerService.getOne(mediaServerId);
        if (mediaServer == null) {
            log.error("[云录像倍速] 媒体节点不存在 - mediaServerId: {}", mediaServerId);
            throw new ControllerException(ErrorCode.ERROR100.getCode(), "媒体节点不存在： " + mediaServerId);
        }

        log.info("[云录像倍速] 媒体服务器信息 - ip: {}, httpPort: {}, id: {}",
                mediaServer.getIp(), mediaServer.getHttpPort(), mediaServer.getId());

        try {
            mediaServerService.setRecordSpeed(mediaServer, app, stream, speed, schema);
            log.info("[云录像倍速] 倍速设置请求已发送 - speed: {}x", speed);
        } catch (Exception e) {
            log.error("[云录像倍速] 倍速设置失败 - mediaServerId: {}, app: {}, stream: {}, speed: {}x, error: {}",
                    mediaServerId, app, stream, speed, e.getMessage(), e);
            throw e;
        }
    }

    @Override
    public void deleteFileByIds(Set<Integer> ids) {
        log.info("[删除录像文件] ids: {}", ids.toArray());
        List<CloudRecordItem> cloudRecordItemList = cloudRecordServiceMapper.queryRecordByIds(ids);
        if (cloudRecordItemList.isEmpty()) {
            return;
        }
        List<CloudRecordItem> cloudRecordItemIdListForDelete = new ArrayList<>();
        StringBuilder stringBuilder = new StringBuilder();
        for (CloudRecordItem cloudRecordItem : cloudRecordItemList) {
            String date = new File(cloudRecordItem.getFilePath()).getParentFile().getName();
            MediaServer mediaServer = mediaServerService.getOne(cloudRecordItem.getMediaServerId());
            try {
                boolean deleteResult = mediaServerService.deleteRecordDirectory(mediaServer, cloudRecordItem.getApp(),
                        cloudRecordItem.getStream(), date, cloudRecordItem.getFileName());
                if (deleteResult) {
                    log.warn("[录像文件] 删除磁盘文件成功： {}", cloudRecordItem.getFilePath());
                    cloudRecordItemIdListForDelete.add(cloudRecordItem);
                }
            } catch (ControllerException e) {
                if (stringBuilder.length() > 0) {
                    stringBuilder.append(", ");
                }
                stringBuilder.append(cloudRecordItem.getFileName());
            }

        }
        if (!cloudRecordItemIdListForDelete.isEmpty()) {
            cloudRecordServiceMapper.deleteList(cloudRecordItemIdListForDelete);
        }
        if (stringBuilder.length() > 0) {
            stringBuilder.append(" 删除失败");
            throw new ControllerException(ErrorCode.ERROR100.getCode(), stringBuilder.toString());
        }
    }
}
