package com.genersoft.iot.vmp.service;

/**
 * 许可证服务接口
 */
public interface ILicenseService {

    /**
     * 验证序列号
     * @param serialNumber 序列号
     * @return 验证结果
     */
    boolean validateSerialNumber(String serialNumber);

    /**
     * 获取最大通道数
     * @return 最大通道数
     */
    int getMaxChannelCount();

    /**
     * 检查是否超过最大通道数
     * @param currentCount 当前通道数
     * @return 是否超过
     */
    boolean isExceedMaxChannelCount(int currentCount);

    /**
     * 激活许可证
     * @param serialNumber 序列号
     * @return 激活结果
     */
    boolean activateLicense(String serialNumber);

    /**
     * 获取当前许可证状态
     * @return 许可证状态
     */
    int getLicenseStatus();

    /**
     * 获取当前序列号
     * @return 序列号
     */
    String getCurrentSerialNumber();

    /**
     * 获取许可证过期时间
     * @return 过期时间
     */
    String getExpireDate();
    
    /**
     * 获取系统硬件码
     * @return 硬件码
     */
    String getHardwareCode();
    
    /**
     * 验证许可证是否与当前硬件匹配
     * @return 是否匹配
     */
    boolean validateHardwareCode();
}