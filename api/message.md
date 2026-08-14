# API · 消息管理

---

## `delete_msg`

按 `message_id` 反查 QQ 原始 `msg_id` 与场景，调用群或 C2C 撤回接口。

`message_id` 必须是本程序分配过的（入站消息或本程序发出的消息）。idmap 持久化开启时，重启后仍可撤回。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `message_id` | int64 | ✅ | OneBot 数字消息 id |

```json
{"action":"delete_msg","params":{"message_id":881122334455}}
```

### 成功 `data`

空对象 `{}`。

```json
{"status":"ok","retcode":0,"data":{}}
```

### 失败

| retcode | message |
|---|---|
| 1404 | `QQ 发送通道未就绪` |
| 1400 | `未知 message_id` |
| 1500 | QQ 撤回失败原文（超时窗口、无权限等） |

```python
await bot.delete_msg(message_id=event.message_id)
```

---

## `get_msg`

取回**入站时**缓存的消息快照。仅内存，FIFO，最多 **10000** 条；进程重启丢失。发出去的消息不会进入此缓存。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `message_id` | int64 | ✅ | 要取回的 id |
| `message` | int64 | ❌ | 兼容误把 id 写在 `message` 上 |

### 成功 `data`

即缓存的事件快照（不是完整原事件）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `time` | int64 | 收到时 unix 秒 |
| `message_type` | string | `"group"` / `"private"` |
| `message_id` | int64 | — |
| `real_id` | int64 | 同 `message_id` |
| `sender` | object | 与原事件 `sender` 相同 |
| `message` | array | 消息段数组 |
| `raw_message` | string | CQ 字符串 |
| `user_id` | int64 | — |
| `user_openid` | string | — |
| `qq_msg_id` | string | QQ 原始消息 id |
| `group_id` | int64 | 仅群消息 |
| `group_openid` | string | 仅群消息 |
| `message_cq` | string | 仅 `message_format=string` 时 |

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "time": 1710000000,
    "message_type": "group",
    "message_id": 8811,
    "real_id": 8811,
    "user_id": 789,
    "user_openid": "E1...",
    "group_id": 123,
    "group_openid": "E2...",
    "qq_msg_id": "ROBOT1.0_xxx",
    "raw_message": "你好",
    "message": [{"type":"text","data":{"text":"你好"}}],
    "sender": {"user_id":789,"nickname":"张三","role":"member"}
  }
}
```

### 失败

| retcode | message |
|---|---|
| 1400 | `缺少 message_id` |
| 1404 | `消息不存在或未缓存` |

---

## `get_forward_msg`

取回入站合并转发解析后的节点数组。缓存 FIFO，最多 **1000** 条，仅内存。

入站来源：

- QQ `message_type=103`：「最近十条」摘要（@ 事件附带）
- QQ `message_type=102`：全量聊天记录

事件里会带 `forward` 段，`id` 为 QQ 原始 `msg_id`。用这个 id 来取。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✅（或 `message_id`） | forward id，即 QQ `msg_id` |
| `message_id` | string | 与 `id` 二选一 | 兼容字段 |

```json
{"action":"get_forward_msg","params":{"id":"ROBOT1.0_xxxx"}}
```

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `messages` | array | OneBot node 数组 |

每个 node：

```json
{
  "type": "node",
  "data": {
    "user_id": 0,
    "nickname": "发送者昵称",
    "content": [
      {"type": "text", "data": {"text": "正文"}},
      {"type": "image", "data": {"url": "https://...", "file": "https://..."}}
    ],
    "time": 1710000000
  }
}
```

| node.data 字段 | 说明 |
|---|---|
| `user_id` | 摘要里通常没有真实 id，固定 `0` |
| `nickname` | 解析出的发送者；没有则为 `"群消息"` |
| `content` | 段数组：text / image / video / record |
| `time` | 外层事件时间 |

完整成功响应：

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "messages": [ { "type": "node", "data": { "...": "..." } } ]
  }
}
```

### 失败

| retcode | message |
|---|---|
| 1400 | `缺少 id` |
| 1404 | `未知 forward id` |

```python
nodes = await bot.get_forward_msg(id=seg.data["id"])
# NoneBot 得到的是 data，即 {"messages": [...]}
```

---

## `put_interaction` / `send_interaction_ack`

互动按钮回执。框架在收到 `INTERACTION_CREATE` 时会**自动**以 `code=0` 回执一次（消除客户端转圈）。插件仍可再调本动作覆盖回执码。

不回执则用户端按钮会显示失败提示。自动回执已覆盖「已收到」场景，一般只需在要表达失败/无权限时再调。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `interaction_id` | string | ✅ | 事件里的 `interaction_id`（QQ 互动 id，不是 event_id） |
| `code` | int | ❌ | 回执码，默认 `0`=成功 |

常用 `code`（以 QQ 官方为准）：

| code | 含义（惯例） |
|---|---|
| 0 | 成功 |
| 1 | 操作失败 |
| 2 | 操作频繁 |
| 3 | 重复操作 |
| 4 | 无权限 |
| 5 | 仅管理员可操作 |

```json
{"action":"put_interaction","params":{"interaction_id":"abc123","code":0}}
```

### 成功 `data`

`{}`

### 失败

| retcode | message |
|---|---|
| 1404 | `QQ 发送通道未就绪` |
| 1400 | `缺少 interaction_id` |
| 1500 | QQ 回执失败原文 |

```python
from nonebot import on_notice

@on_notice()
async def _(bot, event):
    if getattr(event, "notice_type", "") == "interaction":
        await bot.call_api("put_interaction",
                           interaction_id=event.interaction_id, code=0)
```
