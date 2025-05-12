package com.genersoft.iot.vmp.service.impl;

import com.genersoft.iot.vmp.conf.LicenseConfig;
import com.genersoft.iot.vmp.service.ILicenseService;
import com.genersoft.iot.vmp.utils.HardwareUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * 许可证服务实现类
 */
@Service
public class LicenseServiceImpl implements ILicenseService {

    private final static Logger logger = LoggerFactory.getLogger(LicenseServiceImpl.class);

    @Autowired
    private LicenseConfig licenseConfig;

    // 预定义的序列号和对应的通道数量
    private static final Map<String, Integer> LICENSE_MAP = new HashMap<>();

    static {
        // 这里可以预设一些序列号和对应的通道数量，实际应用中可能需要更复杂的验证逻辑
        LICENSE_MAP.put("WVP-BASIC-100", 100);
        LICENSE_MAP.put("WVP-STANDARD-500", 500);
        LICENSE_MAP.put("WVP-PROFESSIONAL-1000", 1000);
        LICENSE_MAP.put("WVP-ENTERPRISE-5000", 5000);
        LICENSE_MAP.put("WVP-UNLIMITED-0", 0); // 0表示无限制
    }
    
    @PostConstruct
    public void init() {
        // 初始化时获取并保存硬件码
        String hardwareCode = HardwareUtils.getHardwareCode();
        licenseConfig.setHardwareCode(hardwareCode);
        logger.info("[许可证] 系统硬件码: {}", hardwareCode);
    }

    @Override
    public boolean validateSerialNumber(String serialNumber) {
        if (serialNumber == null || serialNumber.isEmpty()) {
            return false;
        }
        
        // 简单验证序列号是否存在于预定义的映射中
        return LICENSE_MAP.containsKey(serialNumber);
    }

    @Override
    public int getMaxChannelCount() {
        // 如果许可证未激活，返回默认值0
        if (licenseConfig.getStatus() != 1) {
            return 0;
        }
        
        // 检查许可证是否过期
        if (isLicenseExpired()) {
            logger.warn("[许可证] 许可证已过期");
            return 0;
        }
        
        // 检查硬件码是否匹配
        if (!validateHardwareCode()) {
            logger.warn("[许可证] 硬件码不匹配，许可证无效");
            return 0;
        }
        
        return licenseConfig.getMaxChannelCount();
    }

    @Override
    public boolean isExceedMaxChannelCount(int currentCount) {
        int maxCount = getMaxChannelCount();
        // 如果maxCount为0，表示无限制
        return maxCount > 0 && currentCount >= maxCount;
    }

    @Override
    public boolean activateLicense(String serialNumber) {
        if (!validateSerialNumber(serialNumber)) {
            logger.warn("[许可证] 无效的序列号: {}", serialNumber);
            return false;
        }
        
        // 获取序列号对应的通道数量
        Integer maxChannelCount = LICENSE_MAP.get(serialNumber);
        
        // 获取当前硬件码
        String hardwareCode = getHardwareCode();
        
        // 设置许可证信息
        licenseConfig.setSerialNumber(serialNumber);
        licenseConfig.setMaxChannelCount(maxChannelCount);
        licenseConfig.setStatus(1);
        licenseConfig.setHardwareCode(hardwareCode);
        
        // 设置过期时间为一年后
        Calendar calendar = Calendar.getInstance();
        calendar.add(Calendar.YEAR, 1);
        Date expireDate = calendar.getTime();
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        licenseConfig.setExpireDate(sdf.format(expireDate));
        
        logger.info("[许可证] 成功激活许可证，序列号: {}, 最大通道数: {}, 过期时间: {}, 硬件码: {}", 
                serialNumber, maxChannelCount, licenseConfig.getExpireDate(), hardwareCode);
        
        return true;
    }

    @Override
    public int getLicenseStatus() {
        return licenseConfig.getStatus();
    }

    @Override
    public String getCurrentSerialNumber() {
        return licenseConfig.getSerialNumber();
    }

    @Override
    public String getExpireDate() {
        return licenseConfig.getExpireDate();
    }
    
    @Override
    public String getHardwareCode() {
        // 如果配置中没有硬件码，则重新获取
        if (licenseConfig.getHardwareCode() == null || licenseConfig.getHardwareCode().isEmpty()) {
            String hardwareCode = HardwareUtils.getHardwareCode();
            licenseConfig.setHardwareCode(hardwareCode);
        }
        return licenseConfig.getHardwareCode();
    }
    
    @Override
    public boolean validateHardwareCode() {
        // 如果许可证未激活，不需要验证硬件码
        if (licenseConfig.getStatus() != 1) {
            return true;
        }
        
        // 获取当前硬件码
        String currentHardwareCode = HardwareUtils.getHardwareCode();
        
        // 获取许可证中保存的硬件码
        String savedHardwareCode = licenseConfig.getHardwareCode();
        
        // 如果许可证中没有保存硬件码，则更新
        if (savedHardwareCode == null || savedHardwareCode.isEmpty()) {
            licenseConfig.setHardwareCode(currentHardwareCode);
            return true;
        }
        
        // 比较硬件码是否匹配
        boolean match = savedHardwareCode.equals(currentHardwareCode);
        if (!match) {
            logger.warn("[许可证] 硬件码不匹配，当前: {}, 保存的: {}", currentHardwareCode, savedHardwareCode);
        }
        
        return match;
    }
    
    /**
     * 检查许可证是否过期
     * @return 是否过期
     */
    private boolean isLicenseExpired() {
        String expireDateStr = licenseConfig.getExpireDate();
        if (expireDateStr == null || expireDateStr.isEmpty()) {
            return true;
        }
        
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            Date expireDate = sdf.parse(expireDateStr);
            Date now = new Date();
            return now.after(expireDate);
        } catch (Exception e) {
            logger.error("[许可证] 解析过期时间出错", e);
            return true;
        }
    }
}