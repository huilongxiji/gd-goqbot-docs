# 入站事件

订阅哪些事件由 `qq.text_intent` 决定，见 [配置说明](/guide/config)。下面每个事件给出完整字段。所有事件都有：

| 公共字段 | 类型 | 说明 |
|---|---|---|
| `time` | int64 | unix 秒 |
| `self_id` | int64 | 机器人数字 id |
| `post_type` | string | `message` / `notice` / `request` / `meta_event` |

`union_openid`：**仅当 QQ 下发时才写入**（需向平台申请跨 AppID 关联）。没有该字段不要当空字符串读。

元事件见 [连接协议](/guide/connect)。

---

## 支持矩阵

| QQ 事件 | handler | OneBot |
|---|---|---|
| GROUP_AT_MESSAGE_CREATE | `GroupATMessageEventHandler` | `message/group` |
| GROUP_MESSAGE_CREATE | `GroupMessageEventHandler` | `message/group`（需群主全量授权） |
| C2C_MESSAGE_CREATE | `C2CMessageEventHandler` | `message/private` |
| GROUP_ADD_ROBOT | `GroupAddRobotEventHandler` | `notice/group_increase` `invite` |
| GROUP_DEL_ROBOT | `GroupDelRobotEventHandler` | `notice/group_decrease` `kick_me` |
| GROUP_MEMBER_ADD | `GroupMemberEventHandler` | `notice/group_increase` `approve` |
| GROUP_MEMBER_REMOVE | `GroupMemberEventHandler` | `notice/group_decrease` `leave` |
| GROUP_MSG_REJECT | `GroupMsgRejectEventHandler` | `notice/group_msg_reject`（自定义） |
| GROUP_MSG_RECEIVE | `GroupMsgReceiveEventHandler` | `notice/group_msg_receive`（自定义） |
| GROUP_JOIN_REQUEST | `GroupJoinRequestEventHandler` | `request/group` |
| FRIEND_ADD | `C2CFriendEventHandler` | `notice/friend_add` |
| FRIEND_DEL | `C2CFriendEventHandler` | `notice/friend_decrease`（自定义） |
| C2C_MSG_REJECT | `C2CMsgRejectEventHandler` | `notice/c2c_msg_reject`（自定义） |
| C2C_MSG_RECEIVE | `C2CMsgReceiveEventHandler` | `notice/c2c_msg_receive`（自定义） |
| INTERACTION_CREATE | `InteractionHandler` | `notice/interaction` **以及** 一条 `message` |

同一条群消息若 AT 与全量各来一次，按 QQ `msg_id` 去重（内存 5000 条），只上报一次。

---

## 群消息 `message` / `group`

```json
{
  "post_type": "message",
  "message_type": "group",
  "sub_type": "normal",
  "time": 1710000000,
  "self_id": 1020,
  "group_id": 123456,
  "user_id": 789,
  "message_id": 881122,
  "raw_message": "你好",
  "font": 0,
  "message": [{"type":"text","data":{"text":"你好"}}],
  "user_openid": "E1...",
  "group_openid": "E2...",
  "qq_msg_id": "ROBOT1.0_xxx",
  "qq_message_type": 0,
  "msg_elements": null,
  "msg_scene_ext": {"msg_idx": "REFIDX_xxx"},
  "sender": {
    "user_id": 789,
    "nickname": "张三",
    "card": "",
    "sex": "unknown",
    "age": 0,
    "area": "",
    "level": "",
    "title": "",
    "role": "member"
  }
}
```

| 字段 | 说明 |
|---|---|
| `group_id` / `user_id` | 哈希后的数字 id |
| `message_id` | 对 QQ `msg_id` 哈希，重启稳定（idmap 持久化时） |
| `message` | 段数组，见 [消息段](/protocol/segments) |
| `raw_message` | CQ 字符串 |
| `user_openid` / `group_openid` | QQ 原始 openid |
| `qq_msg_id` | QQ 原始 `ROBOT1.0_...` |
| `qq_message_type` | QQ 数字类型：`0` 普通 / `102` 聊天记录 / `103` 最近十条。**不是** OneBot 的 `message_type` |
| `msg_elements` | 103 等场景的原始元素数组，可能为 null |
| `msg_scene_ext` | `message_scene.ext`（含 `msg_idx`/`auth_token` 等） |
| `sender.role` | 真实身份：`owner` / `admin` / `member`，可直接配 NoneBot `GROUP_OWNER` / `GROUP_ADMIN` |
| `union_openid` | 有才出现；同时写入 `sender.union_openid` |
| `recent_messages` | 102/103 解析出的摘要数组，见下 |
| `forward_title` | 102 聊天记录标题（如 `xxx的聊天记录`），有才出现 |
| `message_cq` | 仅 `message_format=string` |

`sender` 里 `card/sex/age/area/level/title` 为占位，官方不提供。

### `recent_messages[]`（103 / 102）

| 字段 | 说明 |
|---|---|
| `index` | 从 1 起 |
| `sender` | 昵称，103 常为空 |
| `content` | 纯文本 |
| `message` | 对应的段数组 |

103 时消息段会**额外**带 `forward`；102 则整条 `message` 替换为 `forward`。

---

## 私聊消息 `message` / `private`

```json
{
  "post_type": "message",
  "message_type": "private",
  "sub_type": "friend",
  "time": 1710000000,
  "self_id": 1020,
  "user_id": 789,
  "message_id": 881123,
  "raw_message": "hi",
  "font": 0,
  "message": [{"type":"text","data":{"text":"hi"}}],
  "user_openid": "E1...",
  "qq_msg_id": "ROBOT1.0_yyy",
  "qq_message_type": 0,
  "msg_elements": null,
  "msg_scene_ext": {},
  "sender": {
    "user_id": 789,
    "nickname": "张三",
    "sex": "unknown",
    "age": 0
  }
}
```

无私聊的 `group_*`。可能带 `union_openid`。

---

## 机器人入群 `notice/group_increase` (`invite`)

```json
{
  "post_type": "notice",
  "notice_type": "group_increase",
  "sub_type": "invite",
  "time": 1710000000,
  "self_id": 1020,
  "group_id": 123,
  "group_openid": "E2...",
  "operator_id": 456,
  "operator_openid": "E3...",
  "user_id": 1020
}
```

`user_id` 是机器人自己（被拉进群）。

---

## 机器人退群 `notice/group_decrease` (`kick_me`)

字段同入群，`sub_type` 为 `"kick_me"`。

---

## 成员加入 `notice/group_increase` (`approve`)

```json
{
  "post_type": "notice",
  "notice_type": "group_increase",
  "sub_type": "approve",
  "time": 1710000000,
  "self_id": 1020,
  "group_id": 123,
  "group_openid": "E2...",
  "user_id": 789,
  "user_openid": "E1...",
  "operator_id": 456,
  "operator_openid": "E3..."
}
```

`op_member_openid` 为空时，`operator_*` 回退为该成员自己。

---

## 成员退出 `notice/group_decrease` (`leave`)

字段同加入，`sub_type` 为 `"leave"`。

---

## 群关闭主动推送 `notice/group_msg_reject`（自定义）

```json
{
  "post_type": "notice",
  "notice_type": "group_msg_reject",
  "time": 1710000000,
  "self_id": 1020,
  "group_id": 123,
  "group_openid": "E2...",
  "operator_id": 456,
  "operator_openid": "E3...",
  "user_id": 456,
  "user_openid": "E3..."
}
```

`user_*` 与操作者相同。

---

## 群开启主动推送 `notice/group_msg_receive`（自定义）

字段同上，`notice_type` 为 `"group_msg_receive"`。

---

## 入群申请 `request/group`

需机器人为群管理员，且启用 `GroupJoinRequestEventHandler`。

```json
{
  "post_type": "request",
  "request_type": "group",
  "sub_type": "add",
  "time": 1710000000,
  "self_id": 1020,
  "group_id": 123,
  "group_openid": "E2...",
  "user_id": 789,
  "user_openid": "E1...",
  "comment": "我是xxx",
  "flag": "jr_xxx",
  "username": "李四",
  "apply_source": "self_apply",
  "join_request_id": "jr_xxx"
}
```

| 字段 | 说明 |
|---|---|
| `sub_type` | `apply_source=invited` → `"invite"`，否则 `"add"` |
| `flag` | = `join_request_id`，给 `set_group_add_request` |
| `comment` | 验证消息 |
| `invited_by` / `invited_by_id` | 仅邀请入群时出现 |
| `union_openid` | 有才出现 |
| `auto_approved` / `strategy_id` | 自动审批时出现 |

审批见 [API-群聊管理](/api/group)。

---

## 好友添加 `notice/friend_add`

```json
{
  "post_type": "notice",
  "notice_type": "friend_add",
  "time": 1710000000,
  "self_id": 1020,
  "user_id": 789,
  "user_openid": "E1..."
}
```

---

## 好友删除 `notice/friend_decrease`（自定义）

字段同上，`notice_type` 为 `"friend_decrease"`。

---

## C2C 关闭主动推送 `notice/c2c_msg_reject`（自定义）

```json
{
  "post_type": "notice",
  "notice_type": "c2c_msg_reject",
  "time": 1710000000,
  "self_id": 1020,
  "user_id": 789,
  "user_openid": "E1..."
}
```

同时写入 idmap，供 `get_c2c_msg_state`。

---

## C2C 开启主动推送 `notice/c2c_msg_receive`（自定义）

字段同上，`notice_type` 为 `"c2c_msg_receive"`，`allow=true` 落库。

---

## 按钮互动

启用 `InteractionHandler` 后，一次点击会推 **两条**：

1. `notice/interaction`
2. `message`（把 `button_data` 当文本，便于 `on_command` / 关键词匹配）

框架会：

- 把外层 `event_id` 存入 lazy（后续 `matcher.send` 自动走被动 event_id）
- 异步 `PUT /interactions/{id}` `code=0` 消除转圈

**不要**用互动 id 当发消息的 `event_id`（会 40034025）。回执用 `interaction_id`。

### notice

```json
{
  "post_type": "notice",
  "notice_type": "interaction",
  "sub_type": "inline_keyboard",
  "time": 1710000000,
  "self_id": 1020,
  "user_id": 789,
  "user_openid": "E1...",
  "chat_type": 1,
  "interaction_id": "int_xxx",
  "data_type": 11,
  "button_id": "btn1",
  "button_data": "callback_payload",
  "group_id": 123,
  "group_openid": "E2..."
}
```

群聊才有 `group_id` / `group_openid`。

| `data_type` | `sub_type` |
|---|---|
| 9 | `chat_search` |
| 11 | `inline_keyboard` |
| 12 | `callback_command` |
| 13 | `message_feedback` |
| 14 | `clear_session` |
| 其他 | `other` |

### 伴随的 message

```json
{
  "post_type": "message",
  "message_type": "group",
  "sub_type": "normal",
  "time": 1710000000,
  "self_id": 1020,
  "user_id": 789,
  "user_openid": "E1...",
  "group_id": 123,
  "group_openid": "E2...",
  "message_id": 667788,
  "raw_message": "callback_payload",
  "font": 0,
  "interaction_id": "int_xxx",
  "message": [{"type":"text","data":{"text":"callback_payload"}}],
  "sender": {"user_id": 789}
}
```

`message_id` 是对互动 id 做 FNV 哈希，**不是**普通消息 id，撤回无意义。私聊时 `message_type=private`，无 group 字段。
