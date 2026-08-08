# 每日营业额订阅通知云函数

该函数每天上午 10:30 调用 Go 服务的内部日报接口，再向各门店管理员发送微信小程序订阅消息。

## 环境变量

必须在云函数配置中设置：

```text
GO_API_BASE_URL=https://tower.usove.online
INTERNAL_SERVICE_TOKEN=与Go服务相同的强随机令牌
WECHAT_TEMPLATE_ID=微信订阅消息模板ID
WECHAT_TEMPLATE_STORE_KEY=thing1
WECHAT_TEMPLATE_DATE_KEY=date2
WECHAT_TEMPLATE_AMOUNT_KEY=amount3
WECHAT_TEMPLATE_ORDER_COUNT_KEY=number4
```

可选配置：

```text
WECHAT_TEMPLATE_CHANNELS_KEY=thing5
WECHAT_NOTIFY_PAGE=pages/accounting/index
SKIP_ZERO_TURNOVER=false
```

模板字段编号必须以微信公众平台实际模板为准，示例中的 `thing1/date2/amount3/number4` 不能直接假定正确。

## 部署与测试

1. 在微信开发者工具中选中 `dailyTurnoverNotify`，安装依赖并上传部署。
2. 确认云函数已开通 `subscribeMessage.send` 权限。
3. 确认定时触发器显示为北京时间每天 10:30。
4. 先使用以下测试事件执行，不会发送消息：

```json
{
  "dryRun": true
}
```

5. 确认门店金额、订单数和 `admin_count` 后，再用空事件执行真实发送：

```json
{}
```

管理员必须先在小程序内主动授权对应订阅模板；一次性订阅授权通常发送一次后即消耗。
