# API · 基础信息

下文每个动作给出：**请求 params**、**成功 data**、**失败条件**。外层封装见 [连接协议](/guide/connect)。

---

## `get_login_info`

查询当前登录的机器人身份。

### 请求

无参数。

```json
{"action":"get_login_info","params":{}}
```

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `user_id` | int64 | 上报用 `self_id`（见 [配置说明](/guide/config) 推导规则） |
| `nickname` | string | READY 之后为 QQ 返回的真实用户名；未就绪回退为 `app_id` |

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "user_id": 102012345,
    "nickname": "我的机器人"
  }
}
```

---

## `get_status`

### 请求

无参数。

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `online` | bool | 恒 `true`（不探测真实 QQ 连接状态） |
| `good` | bool | 恒 `true` |

```json
{"status":"ok","retcode":0,"data":{"online":true,"good":true}}
```

更细的收发计数在 heartbeat 的 `status.stat` 里，见 [连接协议](/guide/connect)。

---

## `get_version_info`

### 请求

无参数。

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `app_name` | string | 程序名，当前为 `"goqbot"` |
| `app_version` | string | 程序版本，当前为 `"1.9.1"` |
| `protocol_version` | object | OneBot 协议版本 `{major:1, minor:0, patch:0}` |

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "app_name": "goqbot",
    "app_version": "1.9.1",
    "protocol_version": {"major": 1, "minor": 0, "patch": 0}
  }
}
```

---

## `get_gateway`

别名：`get_gateway_bot`、`_get_gateway`、`get_session_limit`。

查询 QQ `/gateway/bot`：WebSocket 接入点与每日建连频控。启动时日志也会打印一份。

### 请求

无参数。

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `url` | string | WS 接入点 URL |
| `shards` | uint32 | 建议分片数 |
| `total` | uint32 | 每日可建连总次数 |
| `remaining` | uint32 | 当前剩余可建连次数 |
| `reset_after` | uint32 | 距离配额重置的秒数 |
| `max_concurrency` | uint32 | 每 5 秒允许的最大并发建连数 |

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "url": "wss://api.sgroup.qq.com/websocket",
    "shards": 1,
    "total": 1000,
    "remaining": 998,
    "reset_after": 86000,
    "max_concurrency": 1
  }
}
```

### 失败

| retcode | message |
|---|---|
| 1404 | `gateway 查询器未就绪（QQ 连接尚未初始化）` |
| 1500 | QQ 接口错误原文 |

---

## `get_openid`

把哈希后的数字 `user_id` / `group_id` 反查回 QQ 原始 openid。必须曾经收到过该用户/群的消息（idmap 里有记录）。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `user_id` | int64 | 与 `group_id` 至少一个 | 要反查的用户数字 id |
| `group_id` | int64 | 与 `user_id` 至少一个 | 要反查的群数字 id |

可同时传两个，返回里会带齐能查到的字段。

```json
{"action":"get_openid","params":{"user_id":111,"group_id":222}}
```

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `user_openid` | string | 仅当 `user_id` 命中时出现 |
| `group_openid` | string | 仅当 `group_id` 命中时出现 |

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "user_openid": "E1XXXX...",
    "group_openid": "E2XXXX..."
  }
}
```

### 失败

| retcode | message |
|---|---|
| 1404 | `未知 id 或未收到过相关消息`（两个都没命中） |

NoneBot 示例：

```python
data = await bot.call_api("get_openid", user_id=event.user_id)
print(data["user_openid"])
```
