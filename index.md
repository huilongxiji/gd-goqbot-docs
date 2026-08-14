---
layout: home

title: goqbot
titleTemplate: QQ 官方机器人 ↔ OneBot V11 适配器

hero:
  name: goqbot
  text: QQ 官方机器人 ↔ OneBot V11 适配器
  tagline: 用 Go 编写的单文件协议端，让官方机器人无缝接入 NoneBot2。
  actions:
    - theme: brand
      text: 开始使用
      link: /guide/start
    - theme: alt
      text: API 文档
      link: /api/overview
    - theme: alt
      text: GitHub
      link: https://github.com/huilongxiji/gd-goqbot-framework

features:
  - icon: 📦
    title: 开箱即用
    details: 单个静态二进制 + 一份 YAML。首次运行自动生成配置，Windows / Linux / macOS 均可直接跑。
  - icon: 🔌
    title: OneBot V11
    details: 正向 / 反向 WebSocket 对接 NoneBot2。消息段写法与 go-cqhttp 生态对齐。
  - icon: 💬
    title: 群与单聊打通
    details: 收发文本、富媒体、Markdown 按钮、流式消息；入退群、禁言、入群审批、自定义菜单均可调用。
  - icon: 🪪
    title: 持久化 ID 映射
    details: openid ↔ 数字 id、message_id 基于 bbolt 落盘，重启后仍可撤回与反查。
  - icon: ⚡
    title: 被动优先发送
    details: 自动选用 msg_id / event_id 占用免费被动窗口，也可强制主动推送或互动召回。
  - icon: 🛡️
    title: 官方接口原样透传
    details: 白名单、权限、频控失败不做假成功，错误码与原文返回给下游。
---
