<template>
<div class="login" id="login">
  <div class="limiter">
    <div class="container-login100">
      <div class="wrap-login100">
					<span class="login100-form-title p-b-26">视频汇聚平台</span>
          <span class="login100-form-title p-b-48">
						<i class="fa fa-video-camera"></i>
					</span>

          <div class="wrap-input100 validate-input" data-validate = "Valid email is: a@b.c">
            <input :class="'input100 ' + (username==''?'':'has-val')" type="text" v-model="username" name="username">
            <span class="focus-input100" data-placeholder="用户名"></span>
          </div>

          <div class="wrap-input100 validate-input" data-validate="Enter password">
						<span class="btn-show-pass">
							<i :class="'fa ' + (!showPassword?'fa-eye':'fa-eye-slash')" @click="showPassword = !showPassword"></i>
						</span>
            <input :class="'input100 ' + (password==''?'':'has-val')" :type="(!showPassword?'password':'text')" v-model="password" name="password">
            <span class="focus-input100" data-placeholder="密码"></span>
          </div>

          <div class="container-login100-form-btn">
            <div class="wrap-login100-form-btn" :class="{'login-loading': isLoging}" v-loading="isLoging" element-loading-background="rgb(0 0 0 / 0%);" element-loading-custom-class="login-loading-class">
              <div class="login100-form-bgbtn"></div>
              <button class="login100-form-btn" @click="login">登录</button>
            </div>
          </div>
      </div>
    </div>
  </div>
</div>
</template>

<script>
import crypto from 'crypto'
import userService from "./service/UserService";
export default {
  name: 'Login',
  data(){
  	return {
      isLoging: false,
      showPassword: false,
      loginLoading: false,
  		username: '',
  		password: ''
  	}
  },
  created(){
    var that = this;
    document.onkeydown = function(e) {
      var key = window.event.keyCode;
      if (key == 13) {
        that.login();
      }
    }
  },
  methods:{

  	//登录逻辑
  	login(){
  		if(this.username!='' && this.password!=''){
  			this.toLogin();
  		}
  	},

  	//登录请求
  	toLogin(){
  		//需要想后端发送的登录参数
  		let loginParam = {
  			username: this.username,
  			password: crypto.createHash('md5').update(this.password, "utf8").digest('hex')
  		}
      var that = this;
      //设置在登录状态
      this.isLoging = true;
      let timeoutTask = setTimeout(()=>{
        that.$message.error("登录超时");
        that.isLoging = false;
      }, 1000)

      this.$axios({
      	method: 'get',
        url:"/api/user/login",
        params: loginParam
      }).then(function (res) {
        window.clearTimeout(timeoutTask)
        console.log(res);
        console.log("登录成功");
          if (res.data.code === 0 ) {
            userService.setUser(res.data.data)
            //登录成功后
            that.cancelEnterkeyDefaultAction();
            that.$router.push('/');
          }else{
            that.isLoging = false;
            that.$message({
                  showClose: true,
                  message: '登录失败，用户名或密码错误',
                  type: 'error'
              });
          }
      }).catch(function (error) {
        console.log(error)
        window.clearTimeout(timeoutTask)
        that.$message.error(error.response.data.msg);
        that.isLoging = false;
      });
    },
    cancelEnterkeyDefaultAction: function() {
        document.onkeydown = function(e) {
        var key = window.event.keyCode;
        if (key == 13) {
          return false;
        }
      }
    }
  }
}
</script>

