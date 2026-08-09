# 每日营业额订阅通知云函数

该函数每天上午 10:30 调用 Go 服务的内部日报接口，再向各门店管理员发送微信小程序订阅消息。

## 环境变量

必须在云函数配置中设置：

```text
GO_API_BASE_URL=https://tower.usove.online
INTERNAL_SERVICE_TOKEN=与Go服务相同的强随机令牌
WECHAT_APP_ID=微信小程序AppID
WECHAT_APP_SECRET=微信小程序AppSecret
WECHAT_TEMPLATE_ID=7aaQQAMYqAzfyffKov5MDNp85FfeO_6-TzKbIEh8M4Y
WECHAT_TEMPLATE_AMOUNT_KEY=amount2
WECHAT_TEMPLATE_TIME_KEY=time1
```

可选配置：

```text
WECHAT_NOTIFY_PAGE=pages/accounting/index
SKIP_ZERO_TURNOVER=false
```

当前模板编号 70040 包含「总业绩 `amount2`」和「时间 `time1`」。`time1` 根据日报接口返回的 `business_date` 显示营业日，例如 `2026年08月07日`，不使用推送时刻。
`WECHAT_APP_SECRET` 只能保存在云函数环境变量中，不得写入小程序前端或提交到代码库。
云函数通过微信 HTTPS 接口获取 `stable_token` 并发送通知，因此定时触发和云端手动测试都不依赖小程序调用上下文。

## 部署与测试

1. 在微信开发者工具中选中 `dailyTurnoverNotify`，安装依赖并上传部署。
2. 在云函数配置中完整设置上述必填环境变量。
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
