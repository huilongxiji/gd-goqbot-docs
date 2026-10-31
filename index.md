---
layout: home

title: goqbot
titleTemplate: false

hero:
  name: goqbot
  text: 一个协议端，接入多个框架
  tagline: 一个由 Go 单文件构成的 QQ 官方机器人 OneBot V11 协议端，让 NoneBot2、AstrBot、MaiBot 等框架同时共用一个官方机器人。
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
    details: 正向 / 反向 WebSocket，可同时连接多个下游；消息段写法与 go-cqhttp 生态对齐，QQ 特有能力参考 NoneBot2 写法。
  - icon: 🔀
    title: 多框架共存
    details: 事件广播给所有下游，各框架独立回复；passive_only 帮助多个下游精确控制主动消息额度。
  - icon: 🧠
    title: 低内存常驻
    details: Go 单进程协议端，消息 / 转发 / 被动凭证等缓存均有上限与淘汰，长期挂机不易无限涨内存。
---
