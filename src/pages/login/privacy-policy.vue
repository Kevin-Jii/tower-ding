<template>
  <view class="page">
    <scroll-view scroll-y class="legalScroll" :show-scrollbar="true">
      <view class="legalDoc">
        <view class="legalTitle">隐私政策</view>
        <view class="legalUpdated">更新日期：2026 年 5 月 10 日</view>

        <view class="legalSection">
          <view class="legalH">引言</view>
          <view class="legalP">
            我们深知个人信息对您的重要性。本政策说明在您使用本小程序登录及门店管理相关功能时，我们如何收集、使用、存储和保护您的个人信息，特别是手机号码等敏感信息。请您在使用前仔细阅读。您点击同意本政策并完成授权后，我们才会按本政策所述处理您的相关信息。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">一、我们收集的信息</view>
          <view class="legalP">
            为实现登录与身份校验，我们会收集您主动输入的手机号码、登录密码（密码将以安全方式传输至服务端用于校验，我们不会以明文形式展示或不当存储您的完整密码）。
          </view>
          <view class="legalP">
            为维持登录状态，我们会在您的设备本地存储认证令牌（token）及必要的账号信息摘要，用于减少重复登录、保障账号安全。
          </view>
          <view class="legalP">
            在您使用库存、记账等业务功能时，我们会根据操作产生业务数据（如商品、数量、单据等），该类数据与您的门店角色相关，用于完成您所请求的服务。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">二、我们如何使用信息</view>
          <view class="legalP">
            手机号码用于：识别门店工作人员身份、接收安全相关通知（如适用）、防范欺诈与滥用。
          </view>
          <view class="legalP">
            账号与业务数据用于：向您及您所属门店提供掌上工作台各项功能、履行合同、改进服务体验、满足法律法规要求。
          </view>
          <view class="legalP">
            我们不会将您的个人信息用于本政策未载明的其他用途；如需变更用途，我们将再次征得您的同意，法律法规另有规定的除外。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">三、存储与安全</view>
          <view class="legalP">
            您的个人信息主要存储在中华人民共和国境内。我们采取合理的技术与管理措施（如传输加密、访问控制等）保护信息安全，防止未经授权的访问、披露或丢失。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">四、共享与披露</view>
          <view class="legalP">
            我们不会向无关第三方出售您的个人信息。仅在以下情形下可能共享或披露：获得您的明确同意；法律法规、司法机关或行政主管部门依法要求；为履行与您或您所属门店的合同所必需，且在合理范围内向受托处理方提供（受托方须承担同等保护义务）。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">五、您的权利</view>
          <view class="legalP">
            在符合法律法规的前提下，您有权查阅、更正与您相关的个人信息，或联系门店管理员协助处理。您也可通过停止使用、清除小程序数据等方式限制本地信息的留存（可能影响登录状态与使用体验）。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">六、未成年人</view>
          <view class="legalP">
            本产品面向门店工作人员使用。若您为未成年人，请在监护人指导下阅读本政策，并在取得监护人同意后使用。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">七、政策更新</view>
          <view class="legalP">
            我们可能适时修订本政策。更新后，我们将在小程序内通过适当方式提示；若修订涉及重大权益变化，我们将重新征求您的同意。
          </view>
        </view>

        <view class="legalSection">
          <view class="legalH">八、联系我们</view>
          <view class="legalP">
            如您对本隐私政策有任何疑问、意见或投诉，可通过小程序内「我的」等入口提供的联系方式，或联系您所属门店管理员。
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
