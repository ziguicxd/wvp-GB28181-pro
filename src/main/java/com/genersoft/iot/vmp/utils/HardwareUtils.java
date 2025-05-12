package com.genersoft.iot.vmp.utils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.InputStreamReader;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;

/**
 * 硬件信息工具类
 */
public class HardwareUtils {

    private final static Logger logger = LoggerFactory.getLogger(HardwareUtils.class);
    private static final String HARDWARE_CODE_FILE = "/data/wvp/hardware_code";
    private static final String HARDWARE_CODE_ENV = "WVP_HARDWARE_CODE";
    private static String cachedHardwareCode = null;

    /**
     * 获取系统硬件码
     * 
     * @return 硬件码
     */
    public static String getHardwareCode() {
        // 如果已经缓存了硬件码，直接返回
        if (cachedHardwareCode != null) {
            return cachedHardwareCode;
        }

        // 1. 首先检查环境变量中是否有预设的硬件码
        String hardwareCode = System.getenv(HARDWARE_CODE_ENV);
        if (!StringUtils.isEmpty(hardwareCode)) {
            logger.info("[硬件码] 使用环境变量中的硬件码: {}", hardwareCode);
            cachedHardwareCode = hardwareCode;
            return hardwareCode;
        }

        // 2. 检查是否有持久化的硬件码文件
        hardwareCode = readHardwareCodeFromFile();
        if (!StringUtils.isEmpty(hardwareCode)) {
            logger.info("[硬件码] 使用持久化文件中的硬件码: {}", hardwareCode);
            cachedHardwareCode = hardwareCode;
            return hardwareCode;
        }

        // 3. 检测是否在容器环境中
        if (isRunningInContainer()) {
            hardwareCode = generateContainerHardwareCode();
            logger.info("[硬件码] 在容器环境中生成硬件码: {}", hardwareCode);
        } else {
            // 4. 物理机或虚拟机环境，使用硬件信息生成
            hardwareCode = generatePhysicalHardwareCode();
            logger.info("[硬件码] 在物理/虚拟机环境中生成硬件码: {}", hardwareCode);
        }

        // 缓存并尝试持久化硬件码
        cachedHardwareCode = hardwareCode;
        saveHardwareCodeToFile(hardwareCode);
        
        return hardwareCode;
    }

    /**
     * 检测是否在容器环境中运行
     * 
     * @return 是否在容器中
     */
    private static boolean isRunningInContainer() {
        // 检查是否存在Docker环境的标志文件
        File dockerEnv = new File("/.dockerenv");
        if (dockerEnv.exists()) {
            return true;
        }

        // 检查cgroup信息
        try {
            File cgroupFile = new File("/proc/1/cgroup");
            if (cgroupFile.exists()) {
                BufferedReader reader = new BufferedReader(new FileReader(cgroupFile));
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.contains("docker") || line.contains("kubepods")) {
                        reader.close();
                        return true;
                    }
                }
                reader.close();
            }
        } catch (Exception e) {
            logger.debug("[硬件码] 检查容器环境时出错", e);
        }

        return false;
    }

    /**
     * 为容器环境生成相对稳定的硬件码
     * 
     * @return 容器环境的硬件码
     */
    private static String generateContainerHardwareCode() {
        StringBuilder sb = new StringBuilder();

        try {
            // 1. 使用容器ID（如果可用）
            String containerId = getContainerId();
            if (!StringUtils.isEmpty(containerId)) {
                sb.append(containerId);
            }

            // 2. 使用挂载的卷路径的哈希值
            String volumeHash = getVolumePathsHash();
            if (!StringUtils.isEmpty(volumeHash)) {
                sb.append(volumeHash);
            }

            // 3. 使用环境变量中的一些稳定值
            String envHash = getEnvironmentHash();
            if (!StringUtils.isEmpty(envHash)) {
                sb.append(envHash);
            }

            // 4. 如果以上方法都无法获取到稳定的标识，则生成一个随机UUID并保存
            if (sb.length() == 0) {
                sb.append(UUID.randomUUID().toString());
            }

            // 使用MD5生成最终的硬件码
            return getMD5(sb.toString());
        } catch (Exception e) {
            logger.error("[硬件码] 生成容器硬件码失败", e);
            // 出错时生成一个随机UUID
            return getMD5(UUID.randomUUID().toString());
        }
    }

    /**
     * 获取容器ID
     * 
     * @return 容器ID
     */
    private static String getContainerId() {
        try {
            // 尝试从/proc/self/cgroup中获取容器ID
            File cgroupFile = new File("/proc/self/cgroup");
            if (cgroupFile.exists()) {
                BufferedReader reader = new BufferedReader(new FileReader(cgroupFile));
                String line;
                while ((line = reader.readLine()) != null) {
                    // Docker容器ID通常在cgroup路径的最后部分
                    if (line.contains("docker")) {
                        String[] parts = line.split("/");
                        if (parts.length > 0) {
                            String lastPart = parts[parts.length - 1];
                            if (lastPart.length() > 8) {
                                reader.close();
                                return lastPart;
                            }
                        }
                    }
                }
                reader.close();
            }
        } catch (Exception e) {
            logger.debug("[硬件码] 获取容器ID失败", e);
        }
        return "";
    }

    /**
     * 获取挂载卷路径的哈希值
     * 
     * @return 卷路径哈希
     */
    private static String getVolumePathsHash() {
        try {
            // 检查一些常见的挂载点
            String[] commonPaths = {
                "/data", 
                "/config", 
                "/app/config", 
                "/var/lib/wvp"
            };
            
            StringBuilder sb = new StringBuilder();
            for (String path : commonPaths) {
                File file = new File(path);
                if (file.exists() && file.isDirectory()) {
                    sb.append(path).append(file.lastModified());
                }
            }
            
            if (sb.length() > 0) {
                return getMD5(sb.toString());
            }
        } catch (Exception e) {
            logger.debug("[硬件码] 获取卷路径哈希失败", e);
        }
        return "";
    }

    /**
     * 获取环境变量的哈希值
     * 
     * @return 环境变量哈希
     */
    private static String getEnvironmentHash() {
        try {
            // 使用一些可能在容器重启后保持不变的环境变量
            String[] envVars = {
                "HOSTNAME",
                "WVP_SERVER_ID",
                "WVP_INSTANCE_ID",
                "KUBERNETES_SERVICE_HOST"
            };
            
            StringBuilder sb = new StringBuilder();
            for (String env : envVars) {
                String value = System.getenv(env);
                if (!StringUtils.isEmpty(value)) {
                    sb.append(env).append("=").append(value);
                }
            }
            
            if (sb.length() > 0) {
                return getMD5(sb.toString());
            }
        } catch (Exception e) {
            logger.debug("[硬件码] 获取环境变量哈希失败", e);
        }
        return "";
    }

    /**
     * 为物理机或虚拟机环境生成硬件码
     * 
     * @return 物理/虚拟机环境的硬件码
     */
    private static String generatePhysicalHardwareCode() {
        StringBuilder sb = new StringBuilder();
        try {
            // 获取CPU序列号
            String cpuId = getCPUSerial();
            sb.append(cpuId);

            // 获取主板序列号
            String mainBoardSerial = getMainBoardSerial();
            sb.append(mainBoardSerial);

            // 获取MAC地址
            String macAddress = getMACAddress();
            sb.append(macAddress);

            // 使用MD5生成最终的硬件码
            return getMD5(sb.toString());
        } catch (Exception e) {
            logger.error("[硬件码] 获取物理硬件码失败", e);
            return getMD5(UUID.randomUUID().toString());
        }
    }

    /**
     * 从文件中读取硬件码
     * 
     * @return 硬件码或null
     */
    private static String readHardwareCodeFromFile() {
        try {
            File file = new File(HARDWARE_CODE_FILE);
            if (file.exists() && file.isFile()) {
                BufferedReader reader = new BufferedReader(new FileReader(file));
                String hardwareCode = reader.readLine();
                reader.close();
                return hardwareCode;
            }
        } catch (Exception e) {
            logger.debug("[硬件码] 从文件读取硬件码失败", e);
        }
        return null;
    }

    /**
     * 将硬件码保存到文件
     * 
     * @param hardwareCode 硬件码
     */
    private static void saveHardwareCodeToFile(String hardwareCode) {
        try {
            File file = new File(HARDWARE_CODE_FILE);
            // 确保目录存在
            File parent = file.getParentFile();
            if (!parent.exists()) {
                parent.mkdirs();
            }
            
            // 尝试写入文件
            java.io.FileWriter writer = new java.io.FileWriter(file);
            writer.write(hardwareCode);
            writer.close();
            logger.info("[硬件码] 硬件码已保存到文件: {}", HARDWARE_CODE_FILE);
        } catch (Exception e) {
            logger.warn("[硬件码] 保存硬件码到文件失败", e);
        }
    }

    /**
     * 获取CPU序列号
     * 
     * @return CPU序列号
     */
    private static String getCPUSerial() {
        String result = "";
        try {
            String[] command;
            String osName = System.getProperty("os.name").toLowerCase();
            if (osName.contains("windows")) {
                command = new String[]{"wmic", "cpu", "get", "ProcessorId"};
            } else if (osName.contains("linux")) {
                command = new String[]{"bash", "-c", "cat /proc/cpuinfo | grep Serial | cut -d ':' -f 2"};
            } else if (osName.contains("mac")) {
                command = new String[]{"bash", "-c", "system_profiler SPHardwareDataType | grep 'Serial Number (system)' | awk '{print $4}'"};
            } else {
                return "UNKNOWN";
            }

            Process process = Runtime.getRuntime().exec(command);
            process.getOutputStream().close();
            BufferedReader br = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = br.readLine()) != null) {
                if (!line.trim().isEmpty() && !line.contains("ProcessorId")) {
                    result = line.trim();
                    break;
                }
            }
            br.close();
        } catch (Exception e) {
            logger.debug("[硬件码] 获取CPU序列号失败", e);
            result = "UNKNOWN_CPU";
        }
        return result;
    }

    /**
     * 获取主板序列号
     * 
     * @return 主板序列号
     */
    private static String getMainBoardSerial() {
        String result = "";
        try {
            String[] command;
            String osName = System.getProperty("os.name").toLowerCase();
            if (osName.contains("windows")) {
                command = new String[]{"wmic", "baseboard", "get", "serialnumber"};
            } else if (osName.contains("linux")) {
                command = new String[]{"bash", "-c", "dmidecode -t 2 | grep 'Serial Number' | awk '{print $3}'"};
            } else if (osName.contains("mac")) {
                command = new String[]{"bash", "-c", "system_profiler SPHardwareDataType | grep 'Hardware UUID' | awk '{print $3}'"};
            } else {
                return "UNKNOWN";
            }

            Process process = Runtime.getRuntime().exec(command);
            process.getOutputStream().close();
            BufferedReader br = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = br.readLine()) != null) {
                if (!line.trim().isEmpty() && !line.contains("SerialNumber")) {
                    result = line.trim();
                    break;
                }
            }
            br.close();
        } catch (Exception e) {
            logger.debug("[硬件码] 获取主板序列号失败", e);
            result = "UNKNOWN_BOARD";
        }
        return result;
    }

    /**
     * 获取MAC地址
     * 
     * @return MAC地址
     */
    private static String getMACAddress() {
        try {
            InetAddress ip = InetAddress.getLocalHost();
            NetworkInterface network = NetworkInterface.getByInetAddress(ip);
            byte[] mac = network.getHardwareAddress();
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < mac.length; i++) {
                sb.append(String.format("%02X%s", mac[i], (i < mac.length - 1) ? "-" : ""));
            }
            return sb.toString();
        } catch (Exception e) {
            logger.debug("[硬件码] 获取MAC地址失败", e);
            return "UNKNOWN_MAC";
        }
    }

    /**
     * 计算MD5值
     * 
     * @param input 输入字符串
     * @return MD5值
     */
    private static String getMD5(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] messageDigest = md.digest(input.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : messageDigest) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            logger.error("[硬件码] 计算MD5失败", e);
            return null;
        }
    }
}