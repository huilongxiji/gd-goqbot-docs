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
  - icon: 🧠
    title: 低内存常驻
    details: Go 单进程协议端，消息 / 转发 / 被动凭证等缓存均有上限与淘汰，长期挂机不易无限涨内存。
---
