<template>
  <div class="login-container">
<<<<<<< HEAD
    <div
      style="justify-content: center;
      align-items: center;
      width: 100%;
      height: 100vh;
      display: flex;
      background-image: url(/static/images/bg19.webp);
      background-position: center center;
      background-repeat: no-repeat;
      background-size: cover;"
    >
=======
    <div class="background">
>>>>>>> 56c82d60b (增加验证码图标)
      <el-form
        ref="loginForm"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        auto-complete="on"
        label-position="left"
      >
        <!-- 标题 -->
        <div class="title-container">
          <h3 class="title">WVP视频平台</h3>
        </div>

        <!-- 用户名 -->
        <el-form-item prop="username">
          <span class="svg-container">
            <svg-icon icon-class="user" />
          </span>
          <el-input
            ref="username"
            v-model="loginForm.username"
            placeholder="用户名"
            name="username"
            type="text"
            tabindex="1"
            auto-complete="on"
          />
        </el-form-item>

        <!-- 密码 -->
        <el-form-item prop="password">
          <span class="svg-container">
            <svg-icon icon-class="password" />
          </span>
          <el-input
            :key="passwordType"
            ref="password"
            v-model="loginForm.password"
            :type="passwordType"
            placeholder="密码"
            name="password"
            tabindex="2"
            auto-complete="on"
            @keyup.enter="handleLogin"
          />
          <span class="show-pwd" @click="togglePasswordVisibility">
            <svg-icon :icon-class="passwordType === 'password' ? 'eye' : 'eye-open'" />
          </span>
        </el-form-item>

        <!-- 验证码 -->
        <el-form-item prop="captcha">
          <div class="captcha-container">
            <span class="svg-container">
              <svg-icon icon-class="captcha" />
            </span>
            <el-input
              v-model="loginForm.captcha"
              placeholder="验证码"
              name="captcha"
              tabindex="3"
              auto-complete="off"
            />
            <img
              :src="captchaSrc"
              @click="refreshCaptcha"
              class="captcha-image"
              alt="验证码"
            />
          </div>
        </el-form-item>

        <!-- 登录按钮 -->
        <el-button
          :loading="loading"
          type="primary"
          class="login-button"
          @click.prevent="handleLogin"
        >
          登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script>
<<<<<<< HEAD
import {validUsername} from '@/utils/validate'
=======
import { validUsername } from '@/utils/validate';
>>>>>>> 22bc05998 (增加登录验证码)

export default {
  name: 'Login',
  data() {
    // 定义验证规则
    const validateUsername = (rule, value, callback) => {
      if (!validUsername(value)) {
        callback(new Error('请输入用户名'));
      } else {
        callback();
      }
    };

    const validatePassword = (rule, value, callback) => {
      if (!value) {
        callback(new Error('请输入密码'));
      } else {
        callback();
      }
    };

    const validateCaptcha = (rule, value, callback) => {
      if (!value) {
        callback(new Error('请输入验证码'));
      } else {
        callback();
      }
    };

    return {
      loginForm: {
        username: '',
        password: '',
        captcha: '',
      },
      loginRules: {
        username: [{ required: true, trigger: 'blur', validator: validateUsername }],
        password: [{ required: true, trigger: 'blur', validator: validatePassword }],
        captcha: [{ required: true, trigger: 'blur', validator: validateCaptcha }],
      },
      loading: false,
      passwordType: 'password', // 密码显示类型
      captchaSrc: '/api/captcha?' + new Date().getTime(), // 验证码图片地址
    };
  },
  methods: {
    // 切换密码可见性
    togglePasswordVisibility() {
      this.passwordType = this.passwordType === 'password' ? 'text' : 'password';
      this.$nextTick(() => {
        this.$refs.password.focus();
      });
    },
    // 刷新验证码
    refreshCaptcha() {
      this.captchaSrc = '/api/captcha?' + new Date().getTime();
    },
    // 登录处理
    handleLogin() {
      this.$refs.loginForm.validate((valid) => {
        if (valid) {
          this.loading = true;
          this.$store
            .dispatch('user/login', this.loginForm)
            .then(() => {
              this.$router.push({ path: this.redirect || '/' });
              this.loading = false;
            })
            .catch(() => {
              this.loading = false;
              this.refreshCaptcha(); // 登录失败时刷新验证码
            });
        } else {
          console.log('表单验证失败');
          return false;
        }
      });
    },
  },
};
</script>

<style lang="scss">
/* 样式变量 */
$bg-color: #162e46;
$text-color-light: #eee;
$text-color-dark: #454545;
$input-bg: rgba(0, 0, 0, 0.1);

.login-container {
  min-height: 100%;
  width: 100%;
  background-color: $bg-color;
  overflow: hidden;

  .background {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100vh;
    background-image: url(/static/images/bg19.png);
    background-position: center center;
    background-repeat: no-repeat;
    background-size: cover;
  }

  .login-form {
    position: relative;
    width: 448px;
    max-width: 100%;
    min-height: 420px;
    max-height: 80vh;
    padding: 40px 35px;
    margin: 0 auto;
    border-radius: 24px;
    border: 1px solid rgba(160, 174, 192, 0.25);
    -webkit-backdrop-filter: blur(30px);
    backdrop-filter: blur(30px);
    display: flex;
    flex-direction: column;
    justify-content: center;

    .title-container {
      text-align: center;
      margin-bottom: 30px;

      .title {
        font-size: 26px;
        color: $text-color-light;
        font-weight: bold;
      }
    }

    .svg-container {
      padding: 6px 5px 6px 15px;
      color: $text-color-light;
      vertical-align: middle;
      width: 30px;
      display: inline-block;
    }

    .captcha-container {
      display: flex;
      align-items: center;

      .captcha-image {
        cursor: pointer;
        margin-left: 10px;
        height: 36px;
      }
    }

    .login-button {
      width: 100%;
      margin-bottom: 10px;
      margin-top: 10px;
    }
  }

  .el-input {
    display: inline-block;
    height: 47px;
    width: 85%;

    input {
      background: transparent;
      border: 0;
      padding: 12px 5px 12px 15px;
      color: $text-color-light;
      caret-color: $text-color-light;

      &:-webkit-autofill {
        box-shadow: 0 0 0px 1000px $bg-color inset !important;
        -webkit-text-fill-color: $text-color-light !important;
      }
    }
  }

  .el-form-item {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: $input-bg;
    border-radius: 5px;
    color: $text-color-dark;
    margin-bottom: 20px;
  }

  .show-pwd {
    position: absolute;
    right: 10px;
    top: 7px;
    font-size: 16px;
    color: $text-color-light;
    cursor: pointer;
    user-select: none;
  }
}
</style>