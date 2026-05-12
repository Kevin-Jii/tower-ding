<template>
  <view class="page">
    <scroll-view scroll-y class="legalScroll" :show-scrollbar="true">
      <view class="legalDoc">
        <view class="legalTitle">用户服务协议</view>
        <view class="legalUpdated">更新日期：2026 年 5 月 10 日</view>

        <view class="legalSection">
          <view class="legalH">一、协议范围</view>
          <view class="legalP">
            欢迎使用本小程序（下称「本产品」）。本产品由运营方向门店工作人员提供库存、记账及门店协同等管理辅助能力。您在使用登录及相关功能前，应仔细阅读本协议及《隐私政策》。当您点击同意或实际使用服务时，即视为您已阅读并接受本协议全部条款。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">二、账号与登录</view>
          <view class="legalP">
            您应使用本人真实、有效的手机号及账号密码登录。您须妥善保管账号与密码，因您保管不当或交由他人使用而产生的风险与责任，由您自行承担。如发现账号异常，请立即联系门店管理员或运营方处理。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">三、服务内容与变更</view>
          <view class="legalP">
            本产品具体功能以实际页面展示为准。因业务调整、合规要求或技术原因，运营方有权对服务内容、规则进行变更或中断，并将通过合理方式予以提示。若您不同意变更，应停止使用服务。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">四、用户行为规范</view>
          <view class="legalP">
            您承诺不利用本产品从事违法违规、侵犯他人合法权益、干扰系统正常运行等行为。您录入的业务数据应真实、合法，因数据不实导致的后果由您及所属门店依法承担。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">五、知识产权</view>
          <view class="legalP">
            本产品中的界面设计、文案、标识等知识产权归运营方或权利人所有。未经许可，您不得复制、传播或用于其他商业目的。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">六、责任限制</view>
          <view class="legalP">
            在法律允许的范围内，因不可抗力、网络故障、第三方原因等导致的服务中断或数据异常，运营方将尽力修复，但不承担由此造成的间接损失。因您违反本协议而产生的责任，由您自行承担。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">七、协议终止</view>
          <view class="legalP">
            您可随时停止使用本产品。运营方有权依据法律法规或本协议约定，中止或终止向违规用户提供服务。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">八、联系我们</view>
          <view class="legalP">
            如您对本协议有疑问，可通过小程序内「我的」等入口提供的联系方式，或联系您所属门店管理员进行咨询。
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import './legal-doc.less'
</script>

<style scoped>
.legalScroll {
  max-height: 100vh;
  box-sizing: border-box;
}
</style>
