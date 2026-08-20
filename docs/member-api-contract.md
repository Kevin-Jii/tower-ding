# 会员列表接口补充契约

前端会员列表已接入以下字段；基础字段保持现有 `GET /members` 与 `POST /members` 不变。

## `GET /members`

支持现有查询参数：

```text
store_id?: number
keyword?: string
page?: number
page_size?: number
```

列表项建议补充：

```json
{
  "id": 10086,
  "store_id": 1,
  "uid": "10086",
  "name": "向长伟",
  "phone": "15869030541",
  "balance": 620,
  "points": 620,
  "level": 1,
  "recent_consumption_at": "2026-08-20T14:30:00+08:00",
  "consumption_count": 5,
  "total_consumption_amount": 12560
}
```

分页响应继续兼容项目现有格式：`{ list, total, page, page_size, page_num }`。`recent_consumption_at` 没有记录时返回 `null`，`consumption_count` 和 `total_consumption_amount` 建议返回 `0`。

## `GET /members/stats`

用于会员列表顶部统计卡片，按当前门店权限返回：

```json
{
  "total": 128,
  "total_consumption_amount": 12560,
  "active_30_days": 36,
  "total_points": 2560
}
```

查询参数：`store_id?: number`。其中 `active_30_days` 按最近 30 天存在已完成消费记录的去重会员数统计，`total_consumption_amount` 只统计已完成消费金额。

## 后续详情接口

会员卡片点击详情暂未开放，建议后端补充 `GET /members/:id`，返回会员基础信息、消费汇总、消费流水分页和积分变动分页；前端已有 `id` 和会员号展示，可直接对接详情页。

## 会员消费记录查询

会员消费记录页复用 `GET /store-accounts` 和 `GET /store-accounts/stats`，后端需要支持以下参数：

```text
member_id?: number
start_date?: string
end_date?: string
payment_status?: 1 | 2
page?: number
page_size?: number
```

统计接口建议在现有响应基础上补充：`paid_amount`、`unpaid_amount`、`paid_count`、`unpaid_count`。列表接口的账单项建议包含 `account_no`、`payment_status`、`created_at`、`operator`、`item_count`、`items`，这样消费记录页可以直接展示账单摘要和商品明细。

## 待结账页面接口

`GET /members/unsettled-accounts` 按门店权限一次性返回会员分组的未支付账单，支持 `store_id`、`keyword`，不分页。每个分组建议返回 `unsettled_amount` 和 `unsettled_accounts`，账单项至少包含 `id`、`created_at`、`account_date`、`title`、`account_no`、`amount` 或 `total_amount`、`payment_status`、`remark`、`items`。

`GET /store-accounts/stats` 支持 `store_id`、`member_id`、`payment_status`、`start_date`、`end_date`，补充返回 `paid_amount`、`unpaid_amount`、`paid_count`、`unpaid_count`。结账页以 `unpaid_amount` 和 `unpaid_count` 展示顶部待收摘要；接口暂未返回新统计字段时，前端会回退到当前页数据。

账单确认沿用现有 `PUT /store-accounts/:id`，请求体为 `{ "payment_status": 1 }`。批量确认由前端按账单逐条调用，服务端应保证单条更新的权限校验、作废账单保护和幂等性；后续如需要原子批量操作，可补充 `POST /store-accounts/batch-payment`。
