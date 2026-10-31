# AstrBot 接入

[AstrBot](https://github.com/AstrBotDevs/AstrBot) 原生支持 OneBot V11（aiocqhttp），作为**反向 WebSocket 服务端**，goqbot 作为客户端连过去即可。可以和 NoneBot2、MaiBot 等框架同时连在同一个 goqbot 上，见 [接入概览](/guide/multi-framework)。

---

## 1. 在 AstrBot 中添加 OneBot v11 平台

1. 打开 AstrBot WebUI，点击左侧栏「机器人」。
2. 点击列表上方的「创建机器人」，适配器类型选择 **OneBot v11**。
3. 填写配置：

| 配置项 | 填写 |
|---|---|
| ID | 自定义，用于区分不同的平台实例，例如 `goqbot` |
| 启用 | 勾选 |
| 反向 WebSocket 主机地址 | `0.0.0.0`；goqbot 与 AstrBot 在同一台机器时也可填 `127.0.0.1` |
| 反向 WebSocket 端口 | 默认 `6199` |
| 反向 Websocket Token | 填 goqbot 的 `onebot.access_token`；goqbot 未设置时留空 |

4. 点击「保存」。

## 2. 在 goqbot 中添加反向连接

`config.yml` 的 `onebot.servers` 里加一条 `ws-reverse`，地址为 `ws://<AstrBot 所在主机>:6199/ws`：

```yaml
onebot:
  access_token: "your-token"          # 与 AstrBot 的「反向 Websocket Token」一致
  servers:
    - ws-reverse:
        universal: ws://127.0.0.1:6199/ws
        reconnect-interval: 3000
```

已经接了其他框架的话，在原有 `servers` 列表里**追加**这一条即可，不影响其他连接。

## 3. 确认连接

重启 goqbot（或等它自动重连）后，在 AstrBot WebUI「数据与日志 → 日志」里出现 `aiocqhttp(OneBot v11) 适配器已连接` 即为成功。如果几秒后又出现 `aiocqhttp 适配器已被关闭`，说明连接超时，检查端口、路径和 Token 是否一致。

goqbot 侧日志会出现 `反向 WS 连接成功 Universal -> ws://127.0.0.1:6199/ws`。

---

## 使用须知

### 群聊唤醒

AstrBot 在群聊里默认需要「唤醒」：@机器人，或以唤醒前缀（默认 `/`）开头。goqbot 默认的 `qq.mention_mode: strip` 会把用户 @ 机器人的那段删掉，AstrBot 就识别不到「被 @」，只能靠唤醒前缀触发。

想让 @机器人 也能唤醒，把 goqbot 设为：

```yaml
qq:
  mention_mode: at
```

此时 @机器人 会以 `at` 段（`qq=self_id`）下发。见 [配置说明](/guide/config)。

### 消息段

AstrBot 消息链里的文本、@、图片、引用、语音、文件，对应 goqbot 的标准 OneBot V11 段，可以直接收发。

markdown、按钮、流式、图文卡片等 QQ 官方特有能力，AstrBot 没有对应的消息链组件。需要时，在 AstrBot 插件里通过 aiocqhttp 平台的客户端直接调用 OneBot 动作，按 [消息段](/protocol/segments) 的格式构造 `message`，例如：

```python
# AstrBot 插件中（aiocqhttp 平台）
await event.bot.api.call_action(
    "send_group_msg",
    group_id=int(event.get_group_id()),
    message=[{"type": "markdown", "data": {"data": {"markdown": {"content": "**你好**"}}}}],
)
```

### ID 与名单

AstrBot 里看到的用户 ID、群号是 goqbot 映射出的数字，不是真实 QQ 号；同一个人在群聊和私聊里的 ID 不同。AstrBot 的白名单、管理员等设置都要填这些数字 ID。

### 回复额度

与其他框架共用同一个 goqbot 时，被动回复次数和主动消息频控是**所有框架共用**的，见 [接入概览 · 共存须知](/guide/multi-framework#共存须知)。
