package com.genersoft.iot.vmp.gb28181.task.platformStatus;

import com.genersoft.iot.vmp.conf.UserSetting;
import com.genersoft.iot.vmp.gb28181.bean.SipTransactionInfo;
import com.genersoft.iot.vmp.utils.redis.RedisUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.DelayQueue;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class PlatformStatusTaskRunner {

    private final Map<String, PlatformRegisterTask> registerSubscribes = new ConcurrentHashMap<>();

    private final DelayQueue<PlatformRegisterTask> registerDelayQueue = new DelayQueue<>();

    private final Map<String, PlatformKeepaliveTask> keepaliveSubscribes = new ConcurrentHashMap<>();

    private final DelayQueue<PlatformKeepaliveTask> keepaliveTaskDelayQueue = new DelayQueue<>();

    @Autowired
    private RedisTemplate<Object, Object> redisTemplate;

    @Autowired
    private UserSetting userSetting;

    private final String prefix = "VMP_PLATFORM_STATUS";

    // 订阅过期检查
    @Scheduled(fixedDelay = 500, timeUnit = TimeUnit.MILLISECONDS)
    public void expirationCheckForRegister(){
        while (!registerDelayQueue.isEmpty()) {
            PlatformRegisterTask take = null;
            try {
                take = registerDelayQueue.take();
                try {
                    removeRegisterTask(take.getPlatformServerId());
                    take.expired();
                }catch (Exception e) {
                    log.error("[平台注册到期] 到期处理时出现异常， 平台上级编号: {} ", take.getPlatformServerId());
                }
            } catch (InterruptedException e) {
                log.error("[平台注册到期] ", e);
            }
        }
    }
    @Scheduled(fixedDelay = 500, timeUnit = TimeUnit.MILLISECONDS)
    public void expirationCheckForKeepalive(){
        while (!keepaliveTaskDelayQueue.isEmpty()) {
            PlatformKeepaliveTask take = null;
            try {
                take = keepaliveTaskDelayQueue.take();
                try {
                    removeKeepAliveTask(take.getPlatformServerId());
                    take.expired();
                }catch (Exception e) {
                    log.error("[平台心跳到期] 到期处理时出现异常， 平台上级编号: {} ", take.getPlatformServerId());
                }
            } catch (InterruptedException e) {
                log.error("[平台心跳到期] ", e);
            }
        }
    }

    public void addRegisterTask(PlatformRegisterTask task) {
        Duration duration = Duration.ofSeconds((task.getDelayTime() - System.currentTimeMillis())/1000);
        if (duration.getSeconds() < 0) {
            return;
        }
        registerSubscribes.put(task.getPlatformServerId(), task);
        String key = String.format("%s_%s_%s", prefix, userSetting.getServerId(), task.getPlatformServerId());
        redisTemplate.opsForValue().set(key, task.getInfo(), duration);
        registerDelayQueue.offer(task);
    }

    public boolean removeRegisterTask(String platformServerId) {
        PlatformRegisterTask task = registerSubscribes.get(platformServerId);
        if (task != null) {
            registerSubscribes.remove(platformServerId);
        }
        String redisKey = String.format("%s_%s_%s", prefix, userSetting.getServerId(), platformServerId);
        redisTemplate.delete(redisKey);
        if (registerDelayQueue.contains(task)) {
            boolean remove = registerDelayQueue.remove(task);
            if (!remove) {
                log.info("[移除平台注册任务] 从延时队列内移除失败： {}", platformServerId);
            }
        }
        return true;
    }

    public SipTransactionInfo getRegisterTransactionInfo(String platformServerId) {
        PlatformRegisterTask task = registerSubscribes.get(platformServerId);
        if (task == null) {
            return null;
        }
        return task.getSipTransactionInfo();
    }



    public boolean containsRegister(String platformServerId) {
        return registerSubscribes.containsKey(platformServerId);
    }

    public List<PlatformRegisterTaskInfo> getAllRegisterTaskInfo(){
        return getRegisterTransactionInfoByServerId(userSetting.getServerId());
    }

    public void addKeepAliveTask(PlatformKeepaliveTask task) {
        Duration duration = Duration.ofSeconds((task.getDelayTime() - System.currentTimeMillis())/1000);
        if (duration.getSeconds() < 0) {
            return;
        }
        keepaliveSubscribes.put(task.getPlatformServerId(), task);
        keepaliveTaskDelayQueue.offer(task);
    }

    public boolean removeKeepAliveTask(String platformServerId) {
        PlatformKeepaliveTask task = keepaliveSubscribes.get(platformServerId);
        if (task != null) {
            keepaliveSubscribes.remove(platformServerId);
        }
        if (keepaliveTaskDelayQueue.contains(task)) {
            boolean remove = keepaliveTaskDelayQueue.remove(task);
            if (!remove) {
                log.info("[移除平台心跳任务] 从延时队列内移除失败： {}", platformServerId);
            }
        }
        return true;
    }


    public boolean containsKeepAlive(String platformServerId) {
        return keepaliveSubscribes.containsKey(platformServerId);
    }

    public List<PlatformRegisterTaskInfo> getRegisterTransactionInfoByServerId(String serverId) {
        String scanKey = String.format("%s_%s_*", prefix, serverId);
        List<Object> values = RedisUtil.scan(redisTemplate, scanKey);
        if (values.isEmpty()) {
            return new ArrayList<>();
        }
        List<PlatformRegisterTaskInfo> result = new ArrayList<>();
        for (Object value : values) {
            String redisKey = (String)value;
            PlatformRegisterTaskInfo taskInfo = (PlatformRegisterTaskInfo)redisTemplate.opsForValue().get(redisKey);
            if (taskInfo == null) {
                continue;
            }
            Long expire = redisTemplate.getExpire(redisKey, TimeUnit.MILLISECONDS);
            taskInfo.setExpireTime(expire);
            result.add(taskInfo);
        }
        return result;
    }
}
