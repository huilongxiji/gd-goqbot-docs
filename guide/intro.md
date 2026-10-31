# 什么是 goqbot

`goqbot`（当前版本 **1.11.1**）是用 Go 编写的 **QQ 官方机器人 OneBot V11 协议端**：把 QQ 官方机器人（群 / 单聊）的上游事件转成 OneBot V11 事件，通过正向 / 反向 WebSocket 推给下游框架；再把下游下发的 OneBot 动作翻译为 QQ 官方接口调用。

**一个协议端，多个应用端。** 和 go-cqhttp 一样，goqbot 可以同时连接多个下游：NoneBot2、AstrBot、MaiBot 等框架通过反向 WebSocket 一起连到同一个 goqbot，共用一个 QQ 官方机器人。

仓库：[huilongxiji/gd-goqbot-framework](https://github.com/huilongxiji/gd-goqbot-framework)

## 它做什么

```
QQ 官方平台 (WebSocket)
        │  事件
        ▼
   goqbot（协议端）
        │  OneBot V11 事件 / 动作（广播给所有下游）
        ├──────────────┬──────────────┐
        ▼              ▼              ▼
     NoneBot2       AstrBot      MaiBot（适配插件）
```

- **上游**：仅支持 QQ 官方 **WebSocket**（不支持 Webhook）。
- **下游**：仅支持 OneBot V11 **正向 / 反向 WebSocket**（不支持 HTTP），可同时配置多条。
- **多下游**：每条事件广播给所有已连接的下游，各框架自己决定是否回复；动作响应只回给发起请求的那条连接。配置方法见 [框架接入](/guide/multi-framework)。
- **范围**：QQ **群** 与 **单聊 (C2C)**。频道（guild）线尚未接入。

## 核心能力

- 群 @ / 群全量 / 单聊消息双向收发
- 图片、视频、语音、文件（本地 / URL / base64；本地数据 ≤5MB 直传，>5MB 自动分片上传）
- Markdown + Keyboard 按钮；点击回调闭环（自动回执 + 被动回复）
- 图文卡片（`share` / `card` 段）
- 素材管理：预先上传图片，在 markdown 中用 `qqbot-media://` 引用
- 单聊流式消息（打字机效果，增量 / 全量两种模式）
- 被动优先发送；`passive_only` 只发被动，便于多个下游精确控制主动消息
- 入退群、好友增删、主动推送开关、入群申请
- 群管理：信息查询、成员列表、禁言、入群审批
- 自定义菜单、指令面板
- 正向 / 反向 WS，`access_token` 鉴权，lifecycle / heartbeat
- openid ↔ 数字 id 持久化（重启后仍可撤回 / 反查）

## 重要约定

::: warning 先读这三条
1. **`user_id` / `group_id` 不是真实 QQ 号 / 群号**，而是本程序把 QQ `openid` 做确定性哈希后的 int64。跨业务打通只能靠 `union_openid`（需向平台申请）。
2. 向某个用户 / 群**主动发消息前**，必须先收到过该会话的消息，否则 `group_id` / `user_id` 无法反查 openid。
3. 未识别的 `action` 返回 `status=failed`、`retcode=1404`（`unsupported action: xxx`）。
:::

## 项目定位

- goqbot 的目标是做**一个协议端对多个应用端**：只要框架支持 OneBot V11 正向 / 反向 WebSocket，就能和其他框架一起连在同一个 goqbot 上。MaiBot 不支持 OneBot V11，通过 [MaiBot-GoqBot-Adapter](https://github.com/huilongxiji/MaiBot-GoqBot-Adapter) 插件接入。
- 标准 OneBot V11 消息段（文本、@、图片、引用等）在各框架中通用；markdown、按钮、流式、图文卡片等 QQ 官方特有能力以 **NoneBot2 的消息段写法**为参考设计，其他框架需要按相同的段格式构造。
- 本项目由维护者个人长期维护，按自己的使用场景演进，开源供学习与交流，不保证适配所有框架的所有用法。

下一步：[快速开始](/guide/start) · [配置说明](/guide/config) · [框架接入](/guide/multi-framework) · [API 动作总览](/api/overview)
