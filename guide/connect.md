# 连接协议

本程序作为 OneBot V11 实现，只提供 **WebSocket**。不支持正向/反向 HTTP。

---

## 动作请求（下游 → goqbot）

所有 API 调用都是一条 JSON 文本帧：

```json
{
  "action": "send_group_msg",
  "params": {
    "group_id": 123456,
    "message": "hello"
  },
  "echo": "任意值，原样回传"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `action` | string | 动作名。自动去掉 `_async` 后缀，因此 `send_group_msg_async` 等价于 `send_group_msg` |
| `params` | object | 该动作的参数，见各 API 页 |
| `echo` | any | 可选。存在则原样写入响应，供调用方配对 |

NoneBot 的 `bot.call_api("xxx", **kwargs)` 会自动封装成上述格式。

---

## 动作响应（goqbot → 下游）

### 成功

```json
{
  "status": "ok",
  "retcode": 0,
  "data": { },
  "echo": "若请求带了 echo"
}
```

| 字段 | 说明 |
|---|---|
| `status` | 恒为 `"ok"` |
| `retcode` | 恒为 `0` |
| `data` | 动作返回数据；无数据时为 `{}` |
| `echo` | 仅当请求带 `echo` 时存在 |

### 失败

```json
{
  "status": "failed",
  "retcode": 1400,
  "data": null,
  "message": "缺少 group_id",
  "wording": "缺少 group_id",
  "echo": "若请求带了 echo"
}
```

### 本程序使用的 `retcode`

| retcode | 含义 | 典型原因 |
|---|---|---|
| `0` | 成功 | — |
| `1400` | 请求参数错误 | 缺必填字段、空消息、未知 `group_id`/`user_id`（还没收到过该会话） |
| `1404` | 找不到 / 不支持 | 消息未缓存、openid 反查失败、发送通道未就绪、接口能力不支持（如全员禁言、查他人成员信息） |
| `1500` | 上游 QQ 接口失败 | 原样带回 QQ 错误文案（含白名单 11253、权限不足、频控等） |

> QQ 原始错误**不做假成功**。权限不够、不在白名单，都会以 `1500` + 官方 message 返回。

> **未识别的 action** 返回 `status=ok`、`data={}`，不报错。

NoneBot 侧：成功时 `call_api` 直接得到 `data`；失败抛 `ActionFailed`，可从 `e.info` 读 `retcode` / `message`。

---

## 事件推送（goqbot → 下游）

事件同样是 JSON 文本帧，**没有** `action` / `echo`。用 `post_type` 区分：

| `post_type` | 含义 | 详见 |
|---|---|---|
| `message` | 群 / 私聊 / 按钮点击转成的消息 | [入站事件](/protocol/events) |
| `notice` | 通知（入退群、好友、推送开关、互动等） | [入站事件](/protocol/events) |
| `request` | 请求（目前仅入群申请） | [入站事件](/protocol/events) |
| `meta_event` | 元事件：lifecycle / heartbeat | 下文 |

---

## 元事件

### `lifecycle` / `connect`

正向 `/`、`/event` 以及反向 universal/event 连接建立后立刻下发：

```json
{
  "post_type": "meta_event",
  "meta_event_type": "lifecycle",
  "sub_type": "connect",
  "time": 1710000000,
  "self_id": 123456789
}
```

### `heartbeat`

按 `onebot.heartbeat_interval`（毫秒）周期推送。`<=0` 则关闭。

```json
{
  "post_type": "meta_event",
  "meta_event_type": "heartbeat",
  "time": 1710000000,
  "self_id": 123456789,
  "interval": 5000,
  "status": {
    "app_enabled": true,
    "app_good": true,
    "app_initialized": true,
    "good": true,
    "online": true,
    "plugins_good": null,
    "stat": {
      "packet_received": 0,
      "packet_sent": 0,
      "packet_lost": 0,
      "message_received": 12,
      "message_sent": 8,
      "disconnect_times": 0,
      "lost_times": 0,
      "last_message_time": 1710000000
    }
  }
}
```

`interval` 单位毫秒，NoneBot 必填。`stat.message_received` / `message_sent` / `last_message_time` 来自进程内计数。

---

## 正向 WebSocket

本程序作为 **服务端** 监听 `onebot.servers[].ws.address`。

### 路由

| 路径 | 事件下行 | 动作上行 | 握手 lifecycle |
|---|---|---|---|
| `/` | ✅ | ✅ | ✅ |
| `/event` | ✅ | ❌ | ✅ |
| `/api` | ❌ | ✅ | ❌ |

NoneBot 官方适配器默认连 `/`。

### 鉴权 `checkAuth`

若 `onebot.access_token` 为空，全部放行。

否则按顺序取：

1. HTTP 头 `Authorization`（支持 `Token xxx` / `Bearer xxx`，空格后为 token）
2. 否则 query `?access_token=xxx`

不匹配返回 HTTP **401**，不升级 WebSocket。

### 连接行为

- 升级后 CORS 不校验（`CheckOrigin` 恒 true）。
- 每条连接由独立 writer goroutine 串行写，队列 256，写超时 15s；写失败即关闭。
- `/` 与 `/event` 登记为事件推送连接，心跳只发给这些连接。

---

## 反向 WebSocket

本程序作为 **客户端** 主动连 NoneBot。

### 拓扑

- 配了 `universal`：只连这一条（收发合一），忽略 `api`/`event`。
- 否则可分别连 `api` + `event`。

### 请求头

```
X-Client-Role: Universal   # 或 API / Event
X-Self-ID: <self_id>
User-Agent: goqbot/0.1.0
Authorization: Token <access_token>   # 仅配置了才带
```

### 断线与失败缓存

- 断开后按 `reconnect-interval` 重连。
- 事件写失败会缓存，新连接建立后 `flushFailures` 重投（避免短暂断线丢通知）。

---

## 全下游掉线兜底

`EventBus.PushRaw` 返回成功投递的连接数。若为 **0** 且配置了 `onebot.downtime_message`，则对刚收到的那条 QQ 消息直接用被动 `msg_id` 回发兜底文本（不经过 NoneBot）。
