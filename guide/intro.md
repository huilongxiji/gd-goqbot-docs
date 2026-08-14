# 什么是 goqbot

`goqbot`（当前版本 **1.9.1**）是用 Go 编写的 **QQ 官方机器人 ↔ OneBot V11** 适配器：把 QQ 官方机器人（群 / 单聊）的上游事件转成 OneBot V11 事件，通过正向 / 反向 WebSocket 对接 NoneBot2；并把下游下发的 OneBot 动作翻译为 QQ 官方接口调用。

仓库：[huilongxiji/gd-goqbot-framework](https://github.com/huilongxiji/gd-goqbot-framework)

## 它做什么

```
QQ 官方平台 (WebSocket)
        │  事件
        ▼
   goqbot (本程序)
        │  OneBot V11 事件 / 动作
        ▼
   NoneBot2 等下游
```

- **上游**：仅支持 QQ 官方 **WebSocket**（不支持 Webhook）。
- **下游**：仅支持 OneBot V11 **正向 / 反向 WebSocket**（不支持 HTTP）。
- **范围**：QQ **群** 与 **单聊 (C2C)**。频道（guild）线尚未接入。

## 核心能力

- 群 @ / 群全量 / 单聊消息双向收发
- 图片、视频、语音、文件（本地 / URL / base64；>10MB 自动分片上传）
- Markdown + Keyboard 按钮；点击回调闭环（自动回执 + 被动回复）
- 单聊流式消息（打字机效果）
- 入退群、好友增删、主动推送开关、入群申请
- 群管理：信息查询、禁言、入群审批
- 自定义菜单、指令面板
- 正向 / 反向 WS，`access_token` 鉴权，lifecycle / heartbeat
- openid ↔ 数字 id 持久化（重启后仍可撤回 / 反查）

## 重要约定

::: warning 先读这三条
1. **`user_id` / `group_id` 不是真实 QQ 号 / 群号**，而是本程序把 QQ `openid` 做确定性哈希后的 int64。跨业务打通只能靠 `union_openid`（需向平台申请）。
2. 向某个用户 / 群**主动发消息前**，必须先收到过该会话的消息，否则 `group_id` / `user_id` 无法反查 openid。
3. 未识别的 `action` 会返回空成功（`status=ok, data={}`），不会报错。
:::

## 项目定位

本项目按维护者自己的用法演进，核心服务 NoneBot2 消息段写法，不追求「彻底多框架通用」。开源供学习与交流。

下一步：[快速开始](/guide/start) · [配置说明](/guide/config) · [API 动作总览](/api/overview)
