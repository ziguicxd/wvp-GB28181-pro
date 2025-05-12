package com.genersoft.iot.vmp.vmanager.bean;

/**
 * 许可证信息
 */
public class LicenseInfo {

    /**
     * 序列号
     */
    private String serialNumber;

    /**
     * 最大通道数
     */
    private Integer maxChannelCount;

    /**
     * 当前通道数
     */
    private Integer currentChannelCount;

    /**
     * 许可证状态 0-未激活 1-已激活
     */
    private Integer status;

    /**
     * 许可证过期时间
     */
    private String expireDate;
    
    /**
     * 硬件码
     */
    private String hardwareCode;
    
    /**
     * 硬件码是否匹配
     */
    private Boolean hardwareMatch;

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

    public Integer getCurrentChannelCount() {
        return currentChannelCount;
    }

    public void setCurrentChannelCount(Integer currentChannelCount) {
        this.currentChannelCount = currentChannelCount;
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
    
    public Boolean getHardwareMatch() {
        return hardwareMatch;
    }

    public void setHardwareMatch(Boolean hardwareMatch) {
        this.hardwareMatch = hardwareMatch;
    }
}