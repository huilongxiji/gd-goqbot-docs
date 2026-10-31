# 多框架接入

**一个协议端，多个应用端。** goqbot 可以同时连接多个 OneBot V11 下游。NoneBot2、AstrBot、MaiBot 等框架一起连到同一个 goqbot，共用一个 QQ 官方机器人：

```
                                   ┌── ws-reverse ──▶ NoneBot2   ws://127.0.0.1:8080/onebot/v11/ws
QQ 官方机器人 ⇄ goqbot（协议端）───┼── ws-reverse ──▶ AstrBot    ws://127.0.0.1:6199/ws
                                   └── ws-reverse ──▶ MaiBot     ws://127.0.0.1:8095/onebot/v11/ws
```

- 每条事件**广播给所有已连接的下游**，各框架自己决定要不要回复。goqbot 不做消息分流，也不协调谁来回复。
- 每个框架发起的动作，响应只回给发起请求的那条连接，互不干扰。
- 所有框架的回复都由 goqbot 统一发到 QQ。

---

## 推荐方式：反向 WebSocket

每个框架在本地开一个 OneBot V11 反向 WebSocket 服务端，goqbot 作为客户端逐个连过去。在 `config.yml` 的 `onebot.servers` 里，每个框架加一条 `ws-reverse`：

```yaml
onebot:
  access_token: "your-token"          # 对所有下游生效
  servers:
    - ws-reverse:                     # NoneBot2
        universal: ws://127.0.0.1:8080/onebot/v11/ws
        reconnect-interval: 3000
    - ws-reverse:                     # AstrBot
        universal: ws://127.0.0.1:6199/ws
        reconnect-interval: 3000
    - ws-reverse:                     # MaiBot（适配插件）
        universal: ws://127.0.0.1:8095/onebot/v11/ws
        reconnect-interval: 3000
```

- 不需要的框架删掉对应那一条即可。各框架的端口、路径以它们自己的配置为准，上面是常见默认值。
- 启动顺序不限：反向连接里各框架是服务端，goqbot 会按 `reconnect-interval` 自动重连；某一条断开不影响其他连接。
- 反向连接写失败的消息会缓存，重连后补发，见 [连接协议](/guide/connect)。

### 各框架侧设置

| 框架 | 接入方式 | 需要设置 |
|---|---|---|
| NoneBot2 | `nonebot-adapter-onebot`（OneBot V11 适配器）自带反向 WS 服务 | 默认路径 `/onebot/v11/ws`；`.env` 中 `ONEBOT_ACCESS_TOKEN` 填 goqbot 的 `access_token`。详见 [NoneBot 接入](/guide/nonebot) |
| AstrBot | WebUI 中添加「OneBot v11」（aiocqhttp）消息平台，开启反向 WebSocket | 默认端口 `6199`、路径 `/ws`；「反向 Websocket Token」填 goqbot 的 `access_token` |
| MaiBot | MaiBot 本身不支持 OneBot V11，安装 [MaiBot-GoqBot-Adapter](https://github.com/huilongxiji/MaiBot-GoqBot-Adapter) 插件 | 插件配置页：连接方式选「反向」，地址填插件监听地址（如 `ws://127.0.0.1:8095/onebot/v11/ws`），访问令牌填 goqbot 的 `access_token` |

::: tip access_token 是全局的
goqbot 的 `onebot.access_token` 对所有下游生效，每个框架都要填同一个值。
:::

---

## 也可以用正向 WebSocket

goqbot 开一个正向 ws，多个框架作为客户端同时连同一个端口：

```yaml
onebot:
  access_token: "your-token"
  servers:
    - ws:
        address: 0.0.0.0:6700
```

各框架把连接地址指向 `ws://127.0.0.1:6700`。正向与反向可以混用，例如 NoneBot 用正向、MaiBot 用反向。

---

## 共存须知

### 消息不分流

每个框架都会收到全部消息。如果某个框架不该处理某些群或某些人，请在**那个框架自己的**黑白名单 / 权限设置里限制。例如 MaiBot 在 WebUI「适配器设置 → 黑白名单规则」里按 `group_id` / `user_id` 设置。

### 回复额度共享

QQ 官方对回复的限制按**机器人**计算，所有框架共用：

| 类型 | 限制 |
|---|---|
| 群被动回复 | 每条消息 5 分钟内最多回复 5 次 |
| 单聊被动回复 | 每条消息 60 分钟内最多回复 4 次 |
| 群主动消息 | 机器人维度 60 条/分钟（未认证 30），单群每天 1000 条，需群主开启「机器人在群聊内发言」 |

多个框架同时回复同一条消息，被动次数会更快用完，超出次数后 QQ 会拒绝这条回复；被动时间窗过了之后，goqbot 默认会把回复降级为主动消息，消耗主动额度。需要精确控制时，下游可在发送时带 [`passive_only=true`](/api/send#passive-only-仅被动)：没有被动凭证就返回 `1460`，由下游决定是否改发主动消息。MaiBot 适配插件就是这样实现「主动消息开关 + 单群频率限制」的。

### @ 识别

用户「@机器人」时，默认的 `qq.mention_mode: strip` 会把这段 @ 删掉，各框架都无法知道自己被 @ 了。多框架场景建议设为 `mention_mode: at`：@ 机器人会以 `at` 段（`qq=self_id`）下发，NoneBot 的 `to_me()`、MaiBot 的「被提及」都能正常识别。见 [配置说明](/guide/config)。

### ID 一致

`user_id` / `group_id` 由 openid 确定性映射得到，在所有框架里都相同（但不是真实 QQ 号）。同一个人在群聊和私聊里的 ID 不同。

### 兜底文本

`downtime_message` 只在**所有**下游都断开时才会触发；只要还有一个框架在线，就不会发兜底文本。
