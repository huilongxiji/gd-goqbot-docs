# API · 群聊管理

权限约定：

- `get_group_info` / `get_group_bot_state`：官方 **白名单** 接口。非白名单机器人调用 QQ 返回 **11253**，本程序透传为 `retcode=1500`。
- 入群申请列表 / 审批、禁言查询 / 设置：机器人必须是 **群管理员**。
- `group_id` 必须能反查到 openid（先收到过该群消息）。

---

## `get_group_info`

获取群基本信息。

### 请求 `params`

| 字段 | 类型 | 必填 |
|---|---|---|
| `group_id` | int64 | ✅ |

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `group_id` | int64 | 入参原样 |
| `group_openid` | string | QQ 群 openid |
| `group_name` | string | 群名称 |
| `group_memo` | string | 群简介（同 `group_finger_memo`） |
| `group_finger_memo` | string | 群简介 |
| `group_class_text` | string | 群分类文案 |
| `group_tags` | string[] | 群标签 |
| `member_count` | int | 成员数 |
| `max_member_count` | int | 官方无此字段，固定 `0` |

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "group_id": 123456,
    "group_openid": "E2...",
    "group_name": "测试群",
    "group_memo": "简介",
    "group_finger_memo": "简介",
    "group_class_text": "同学",
    "group_tags": ["游戏"],
    "member_count": 42,
    "max_member_count": 0
  }
}
```

### 失败

| retcode | 说明 |
|---|---|
| 1400 | 缺少 `group_id` |
| 1404 | 未知 `group_id` / 发送通道未就绪 |
| 1500 | 含非白名单 `11253` 等 |

---

## `get_group_bot_state`

获取**机器人自己**在该群内的状态。

### 请求 `params`

| 字段 | 类型 | 必填 |
|---|---|---|
| `group_id` | int64 | ✅ |

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `group_id` | int64 | — |
| `group_openid` | string | — |
| `member_openid` | string | 机器人在该群的成员 openid |
| `joined_at` | string | 入群时间 |
| `allow_proactive_msg` | bool | 群是否允许机器人主动发言 |
| `recv_msg_setting` | string | 收消息范围：`all` / `only_mention` / `mention_and_context` |
| `member_role` | string | 机器人身份：`member` / `owner` / `admin` |

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "group_id": 123456,
    "group_openid": "E2...",
    "member_openid": "E1...",
    "joined_at": "2026-01-01T00:00:00+08:00",
    "allow_proactive_msg": true,
    "recv_msg_setting": "all",
    "member_role": "admin"
  }
}
```

---

## `get_group_member_info`

QQ 群 v2 **没有**查询其他成员信息的接口。仅当 `user_id == self_id` 时走 `bot_state`，查他人返回 1404。

### 请求 `params`

| 字段 | 类型 | 必填 |
|---|---|---|
| `group_id` | int64 | ✅ |
| `user_id` | int64 | ✅，且必须等于机器人 `self_id` |

### 成功 `data`（查自身）

兼容 OneBot 成员字段 + 官方 bot_state 扩展：

| 字段 | 值 |
|---|---|
| `group_id` | 入参 |
| `user_id` | self_id |
| `nickname` | 机器人昵称 |
| `card` | `""` |
| `sex` | `"unknown"` |
| `age` | `0` |
| `area` | `""` |
| `join_time` | `0` |
| `last_sent_time` | `0` |
| `level` | `"0"` |
| `role` | `owner` / `admin` / `member`（来自 bot_state，空则 `member`） |
| `unfriendly` | `false` |
| `title` | `""` |
| `title_expire_time` | `0` |
| `card_changeable` | `false` |
| `joined_at` | 官方入群时间 |
| `allow_proactive_msg` | bool |
| `recv_msg_setting` | string |
| `member_openid` | string |

### 失败

```json
{"status":"failed","retcode":1404,"message":"QQ群v2无获取其他成员信息的接口；仅支持查询机器人自身（user_id=self_id，走 bot_state）"}
```

---

## `get_group_join_requests` / `get_group_system_msg`

拉取入群申请列表。需群管理员。同时把每条 `join_request_id` 写入 idmap，供后续 `set_group_add_request` 使用。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `group_id` | int64 | ✅ | — |
| `cursor` | string | ❌ | 上一页返回的 `next_cursor` |
| `limit` | int | ❌ | 每页条数 |

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `group_id` | int64 | — |
| `group_openid` | string | — |
| `list` | array | 申请列表 |
| `next_cursor` | string | 下一页游标，空表示没有更多 |

`list[]` 每项：

| 字段 | 类型 | 说明 |
|---|---|---|
| `join_request_id` | string | 官方申请 id |
| `flag` | string | 同 `join_request_id`（OneBot 惯例） |
| `user_id` | int64 | 申请人数字 id |
| `user_openid` | string | 申请人 openid |
| `union_openid` | string | 可能为空 |
| `username` | string | 申请人昵称 |
| `apply_at` | string | 申请时间 RFC3339 |
| `apply_source` | string | `self_apply` / `invited` |
| `invited_by` | string | 邀请人 openid，可能空 |
| `bot` | bool | 申请人是否为机器人账号 |
| `comment` | string | 验证消息 |
| `verify_method` | string | `verify_message` / `admin_review_qa` |
| `risk_tips` | string | 安全提示 |

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "group_id": 123,
    "group_openid": "E2...",
    "next_cursor": "",
    "list": [
      {
        "join_request_id": "jr_xxx",
        "flag": "jr_xxx",
        "user_id": 111,
        "user_openid": "E1...",
        "union_openid": "",
        "username": "李四",
        "apply_at": "2026-08-01T12:00:00+08:00",
        "apply_source": "self_apply",
        "invited_by": "",
        "bot": false,
        "comment": "我是xxx",
        "verify_method": "verify_message",
        "risk_tips": ""
      }
    ]
  }
}
```

---

## `set_group_add_request`

审批入群申请。`flag` 优先从入群事件或列表接口写入的 idmap 取元数据；若没缓存，可额外传 `group_id` + `user_id` 兜底。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `flag` | string | ✅（或 `join_request_id`） | 官方 `join_request_id` |
| `join_request_id` | string | 与 `flag` 二选一 | 同义 |
| `approve` | bool | ❌ | 默认 `true`=同意；`false`=拒绝 |
| `reason` | string | ❌ | 拒绝理由（也可用 `reject_reason`） |
| `blacklist` | bool | ❌ | 拒绝时是否拉黑（也可用 `add_to_member_blacklist`） |
| `group_id` | int64 | flag 未缓存时 | 兜底反查群 |
| `user_id` | int64 | flag 未缓存时 | 兜底反查申请人 |

```json
{
  "action": "set_group_add_request",
  "params": {
    "flag": "jr_xxx",
    "approve": false,
    "reason": "请填写真实姓名",
    "blacklist": false
  }
}
```

### 成功 `data`

`{}`。成功后从 idmap 删除该 flag。

### 失败

| retcode | message |
|---|---|
| 1400 | `缺少 flag / join_request_id` |
| 1404 | `未知 flag：未收到对应入群申请事件，且未提供可反查的 group_id/user_id` |
| 1500 | QQ 审批失败 |

```python
await bot.set_group_add_request(flag=event.flag, approve=True)
```

---

## `set_group_ban`

设置 / 解除**单个成员**禁言。官方设置接口仅成员级。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `group_id` | int64 | ✅ | — |
| `user_id` | int64 | ✅ | 目标成员（须能反查 openid） |
| `duration` | int64 | ❌ | 秒。`>0` 禁言；`<=0` 或省略 0 = **解除** |

内部：`duration>0` → `op=add`，到期时间为 `now+duration`（RFC3339）；否则 `op=del`。

```json
{"action":"set_group_ban","params":{"group_id":123,"user_id":789,"duration":600}}
```

### 成功 `data`

`{}`

### 失败

| retcode | message |
|---|---|
| 1400 | 缺少 `group_id` / `user_id` |
| 1404 | 未知 id / 通道未就绪 |
| 1500 | 无管理员权限等 |

```python
await bot.set_group_ban(group_id=gid, user_id=uid, duration=600)  # 10 分钟
await bot.set_group_ban(group_id=gid, user_id=uid, duration=0)    # 解除
```

---

## `get_group_ban` / `get_group_mute`

查询群禁言状态（含全员规则模式 + 当前被禁成员列表）。需群管理员。

### 请求 `params`

| 字段 | 类型 | 必填 |
|---|---|---|
| `group_id` | int64 | ✅ |

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `group_id` | int64 | — |
| `group_openid` | string | — |
| `global_mode` | string | 全员禁言模式：`none` / `always` / `schedule`。无规则时可能为空串 |
| `members` | array | 当前成员级禁言列表 |

`members[]`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `user_id` | int64 | 数字 id |
| `user_openid` | string | — |
| `mute_expire_at` | string | 到期 RFC3339 |
| `username` | string | 可能空 |
| `union_openid` | string | 可能空 |

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "group_id": 123,
    "group_openid": "E2...",
    "global_mode": "none",
    "members": [
      {
        "user_id": 789,
        "user_openid": "E1...",
        "mute_expire_at": "2026-08-14T12:00:00+08:00",
        "username": "张三",
        "union_openid": ""
      }
    ]
  }
}
```

> 本程序**不能设置**全员禁言，只能查询 `global_mode`。

---

## `set_group_whole_ban`

**不支持**。官方设置接口仅成员级。

任意参数都会返回：

```json
{
  "status": "failed",
  "retcode": 1404,
  "data": null,
  "message": "QQ群v2设置禁言接口仅支持成员级，不支持全员禁言",
  "wording": "QQ群v2设置禁言接口仅支持成员级，不支持全员禁言"
}
```

---

## `get_c2c_msg_state` / `get_friend_msg_state`

查询用户是否开启 **C2C 主动消息推送**。官方**没有**查询接口，本程序把 `C2C_MSG_REJECT` / `C2C_MSG_RECEIVE` 事件写入 idmap（可持久化）后供查询。

必须启用 `C2CMsgRejectEventHandler` 与 `C2CMsgReceiveEventHandler`，否则永远 `known=false`。

从未手动拨过开关的用户也是 `known=false`。真正能否送达仍以发送结果为准。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `user_id` | int64 | 与 openid 二选一 | — |
| `user_openid` | string | 与 user_id 二选一 | 优先用这个 |

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `user_id` | int64 | 能反查则填，否则 0 |
| `user_openid` | string | — |
| `known` | bool | 本地是否有过开关事件 |
| `allow_proactive_msg` | bool 或 null | `known=true` 时为 bool；否则 `null` |
| `updated_at` | int64 | 上次开关事件 unix 秒；未知为 `0` |

命中：

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "user_id": 789,
    "user_openid": "E1...",
    "known": true,
    "allow_proactive_msg": false,
    "updated_at": 1710000000
  }
}
```

未命中：

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "user_id": 789,
    "user_openid": "E1...",
    "known": false,
    "allow_proactive_msg": null,
    "updated_at": 0
  }
}
```

### 失败

| retcode | message |
|---|---|
| 1400 | `缺少 user_id 或 user_openid` |
| 1404 | `未知 user_id 或未收到过该用户消息`（传了 user_id 但反查失败） |
