package com.genersoft.iot.vmp.conf;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 许可证配置类
 */
@Component
@ConfigurationProperties(prefix = "license")
public class LicenseConfig {

    /**
     * 序列号
     */
    private String serialNumber;

    /**
     * 最大通道数
     */
    private Integer maxChannelCount = 0;

    /**
     * 许可证状态 0-未激活 1-已激活
     */
    private Integer status = 0;

    /**
     * 许可证过期时间
     */
    private String expireDate;
    
    /**
     * 硬件码
     */
    private String hardwareCode;

    public String getSerialNumber() {
        return serialNumber;
    }

    public void setSerialNumber(String serialNumber) {
        this.serialNumber = serialNumber;
    }

    public Integer getMaxChannelCount() {
        return maxChannelCount;
    }

    public void setMaxChannelCount(Integer maxChannelCount) {
        this.maxChannelCount = maxChannelCount;
    }

    public Integer getStatus() {
        return status;
    }

    public void setStatus(Integer status) {
        this.status = status;
    }

    public String getExpireDate() {
        return expireDate;
    }

    public void setExpireDate(String expireDate) {
        this.expireDate = expireDate;
    }
    
    public String getHardwareCode() {
        return hardwareCode;
    }

    public void setHardwareCode(String hardwareCode) {
        this.hardwareCode = hardwareCode;
    }
}