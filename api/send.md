# API · 发送消息

相关概念（被动 / 主动 / 凭证优先级）见 [消息发送机制](/protocol/send-mechanism)。消息段格式见 [消息段](/protocol/segments)。

---

## 通用返回

发送成功时 `data` 至少包含：

| 字段 | 类型 | 说明 |
|---|---|---|
| `message_id` | int64 | 本程序分配的数字消息 id（对 QQ 原始 `msg_id` 做哈希）。可用于 `delete_msg` / `get_msg` |

单聊若带了 `stream` 段，额外返回：

| 字段 | 类型 | 说明 |
|---|---|---|
| `stream_id` | string | QQ 侧原始消息 id，后续续帧必须回填到 `stream.id` |
| `remain_msg_len` | int | 该流剩余可写字符数；平台未返回时为 `-1` |

```json
{"status":"ok","retcode":0,"data":{"message_id":881122334455}}
```

流式首帧：

```json
{"status":"ok","retcode":0,"data":{"message_id":881122334455,"stream_id":"ROBOT1.0_xxxx","remain_msg_len":4096}}
```

### 通用失败

| retcode | message |
|---|---|
| 1404 | `QQ 发送通道未就绪` |
| 1400 | `未知 group_id（尚未收到该群消息）` / `未知 user_id（尚未收到该用户消息）` |
| 1400 | `空消息`（解析后没有任何可发送内容，且不是纯 stream 帧） |
| 1460 | `无可用被动凭证（passive_only=true，未降级为主动消息）`，见下方 [`passive_only`](#passive-only-仅被动) |
| 1500 | QQ 发送失败原文（频控、未授权主动发言、文件过大等） |

---

## `send_group_msg`

向群发送消息。默认**被动优先**：有 `reply` 段用其 `msg_id`；否则取该群（优先群+用户维度）最近一条 lazy 凭证。都没有则走主动。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `group_id` | int64 | ✅ | 目标群数字 id |
| `message` | array 或 string | ✅ | 消息段数组或 CQ 字符串，见 [消息段](/protocol/segments) |
| `user_id` | int64 | ❌ | 可选。传入时 lazy 凭证优先匹配「该群+该用户」维度（更准的被动窗口） |
| `passive_only` | bool | ❌ | `true`=只发被动消息：没有可用被动凭证时返回 `1460`，不降级为主动。见下方 [`passive_only`](#passive-only-仅被动) |

```json
{
  "action": "send_group_msg",
  "params": {
    "group_id": 123456,
    "user_id": 789,
    "message": [
      {"type": "text", "data": {"text": "收到"}}
    ]
  }
}
```

NoneBot：

```python
await bot.send_group_msg(group_id=gid, message="收到")
await matcher.send("收到")          # 会自动带上当前 event 的 group/user
```

---

## `send_private_msg`

向单聊 (C2C) 用户发送。被动优先逻辑同群聊（按 `user_id` 取 lazy）。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `user_id` | int64 | ✅ | 目标用户数字 id |
| `message` | array 或 string | ✅ | 消息内容 |
| `is_wakeup` | bool | ❌ | `true`=互动召回消息。与 reply / 被动 `event_id` **互斥**，强制不套被动凭证 |
| `passive_only` | bool | ❌ | 同 `send_group_msg`。与 `is_wakeup` **互斥**，同时传返回 `1400` |

```json
{
  "action": "send_private_msg",
  "params": {
    "user_id": 789,
    "message": "提醒：任务完成",
    "is_wakeup": false
  }
}
```

### `is_wakeup` 互动召回

用户主动对话后 **30 天内**分 4 个周期，每周期可下发 **1 条**：

| 周期 | 时间窗 |
|---|---|
| 1 | 当天 |
| 2 | 第 1–3 天 |
| 3 | 第 3–7 天 |
| 4 | 第 7–30 天 |

仅 C2C。消息类型须与机器人已有权限一致。

```python
await bot.send_private_msg(user_id=uid, message="该交周报了", is_wakeup=True)
```

### 流式消息

`message` 中带 `stream` 段时走 C2C 流式（打字机）。详见 [消息段](/protocol/segments)。成功 `data` 含 `stream_id`。

群聊会忽略 `stream` 并打告警。

---

## `send_msg`

按类型分派到 `send_group_msg` 或 `send_private_msg`。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `message` | array / string | ✅ | 消息内容 |
| `message_type` | string | ❌ | `"group"` / `"private"`。省略时：有非 0 的 `group_id` → group，否则 private |
| `group_id` | int64 | 群时必填 | — |
| `user_id` | int64 | 私聊时必填 | 群聊时可选，用于 lazy 匹配 |
| `is_wakeup` | bool | ❌ | 仅私聊生效 |
| `passive_only` | bool | ❌ | 群聊、私聊都生效 |

```json
{"action":"send_msg","params":{"message_type":"group","group_id":123,"message":"hi"}}
```

---

## `passive_only` 仅被动

`send_group_msg` / `send_private_msg` / `send_msg` 的可选参数。

默认情况下，找不到被动凭证（`reply` 命中的入站消息，或 lazy 窗口内的凭证）时，这三个动作会**自动降级为主动消息**。带上 `passive_only=true` 后不再降级，而是直接返回：

```json
{"status":"failed","retcode":1460,"data":null,"message":"无可用被动凭证（passive_only=true，未降级为主动消息）"}
```

由下游自己决定下一步：放弃发送，或者改调 `send_group_active_msg` / `send_private_active_msg`。

适合多个框架共用一个 goqbot 的场景：被动回复额度是所有下游共用的，下游自己无法准确判断某次发送会不会变成主动消息；用 `passive_only` 先试被动，就能精确控制主动消息的数量（例如 MaiBot 适配插件的主动消息开关与单群限速）。

- 与 `is_wakeup` 互斥，同时传返回 `1400`。
- 对 `send_*_active_msg` 无效（它们本来就是强制主动）。
- 需要 goqbot ≥ 1.11.0；更早的版本会忽略该参数，照常降级。

```python
from nonebot.adapters.onebot.v11 import ActionFailed

try:
    await bot.send_group_msg(group_id=gid, message="收到", passive_only=True)
except ActionFailed as e:
    if e.info.get("retcode") == 1460:
        ...  # 没有被动凭证：放弃，或改调 send_group_active_msg
```

---

## `send_group_active_msg`

**强制主动**发群：忽略 `reply` 段、不套 lazy 凭证，`msg_id`/`event_id` 均清空。

生产环境受主动消息频控：需群主打开「机器人在群聊内发言」；Bot 维度 60/qpm（未认证 30/qpm），单关系 20/qpm，每个群每天最多 1000 条。详见 [已知限制](/guide/limits)。

### 请求 `params`

| 字段 | 类型 | 必填 |
|---|---|---|
| `group_id` | int64 | ✅ |
| `message` | array / string | ✅ |

```python
await bot.call_api("send_group_active_msg", group_id=123456, message="公告：今晚维护")
```

返回同 `send_group_msg`。

---

## `send_private_active_msg`

**强制主动**发单聊。不含 `is_wakeup` 语义（要召回请用 `send_private_msg` + `is_wakeup=true`）。

### 请求 `params`

| 字段 | 类型 | 必填 |
|---|---|---|
| `user_id` | int64 | ✅ |
| `message` | array / string | ✅ |

```python
await bot.call_api("send_private_active_msg", user_id=789, message="提醒：任务完成")
```

---

## 发送时凭证选择（摘要）

```
active=true（*_active_msg）     → 主动
is_wakeup=true                  → 互动召回（主动语义）
reply 段命中真实 msg_id         → 被动 msg_id + 引用气泡（若有 REFIDX）
lazy 命中 kind=event            → 被动 event_id（按钮回调后）
lazy 命中 kind=msg              → 被动 msg_id
都没有 + passive_only=true      → 失败 1460，不发送
都没有                          → 主动
```

lazy TTL：群 **5 分钟**，单聊 **60 分钟**。
