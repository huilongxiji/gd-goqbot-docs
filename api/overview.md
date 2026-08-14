# API 动作总览

下游通过 OneBot V11 动作调用。请求格式见 [连接协议](/guide/connect)。

`action` 会自动去掉 `_async` 后缀。未列出的 action 返回空成功 `{"status":"ok","retcode":0,"data":{}}`。

---

## 基础信息

| action | 别名 | 说明 | 文档 |
|---|---|---|---|
| `get_login_info` | — | 机器人 `user_id` 与昵称 | [API-基础信息](/api/basic) |
| `get_status` | — | `{online, good}` | [API-基础信息](/api/basic) |
| `get_version_info` | — | 程序名 / 版本 / 协议版本 | [API-基础信息](/api/basic) |
| `get_gateway` | `get_gateway_bot` / `_get_gateway` / `get_session_limit` | WS 接入点与建连频控 | [API-基础信息](/api/basic) |
| `get_openid` | — | 数字 id → QQ openid | [API-基础信息](/api/basic) |

## 发送消息

| action | 说明 | 文档 |
|---|---|---|
| `send_group_msg` | 发群消息（被动优先） | [API-发送消息](/api/send) |
| `send_private_msg` | 发单聊；可 `is_wakeup` / `stream` | [API-发送消息](/api/send) |
| `send_msg` | 按 `message_type` 或 id 分派 | [API-发送消息](/api/send) |
| `send_group_active_msg` | **强制主动**发群 | [API-发送消息](/api/send) |
| `send_private_active_msg` | **强制主动**发单聊 | [API-发送消息](/api/send) |

## 消息管理

| action | 别名 | 说明 | 文档 |
|---|---|---|---|
| `delete_msg` | — | 撤回 | [API-消息管理](/api/message) |
| `get_msg` | — | 取回入站缓存 | [API-消息管理](/api/message) |
| `get_forward_msg` | — | 取回合并转发节点 | [API-消息管理](/api/message) |
| `put_interaction` | `send_interaction_ack` | 互动按钮回执 | [API-消息管理](/api/message) |

## 群聊管理

| action | 别名 | 权限 | 文档 |
|---|---|---|---|
| `get_group_info` | — | 官方白名单 | [API-群聊管理](/api/group) |
| `get_group_bot_state` | — | 官方白名单 | [API-群聊管理](/api/group) |
| `get_group_member_info` | — | 仅 `user_id=self_id` | [API-群聊管理](/api/group) |
| `get_group_join_requests` | `get_group_system_msg` | 群管理员 | [API-群聊管理](/api/group) |
| `set_group_add_request` | — | 群管理员 | [API-群聊管理](/api/group) |
| `set_group_ban` | — | 群管理员 | [API-群聊管理](/api/group) |
| `get_group_ban` | `get_group_mute` | 群管理员 | [API-群聊管理](/api/group) |
| `set_group_whole_ban` | — | **不支持**，固定 1404 | [API-群聊管理](/api/group) |
| `get_c2c_msg_state` | `get_friend_msg_state` | 本地缓存，非官方接口 | [API-群聊管理](/api/group) |

## 自定义菜单与指令面板

| action | 对应官方接口 | 文档 |
|---|---|---|
| `get_menu` | `GET /v2/menu` | [API-菜单与指令面板](/api/menu) |
| `set_menu` | `PUT /v2/menu` | [API-菜单与指令面板](/api/menu) |
| `get_command_panels` | `GET /v2/panels` | [API-菜单与指令面板](/api/menu) |
| `get_command_panel` | `GET /v2/panels/{id}` | [API-菜单与指令面板](/api/menu) |
| `create_command_panel` | `POST /v2/panels` | [API-菜单与指令面板](/api/menu) |
| `set_command_panel` | `PUT /v2/panels/{id}` | [API-菜单与指令面板](/api/menu) |
| `delete_command_panel` | `DELETE /v2/panels/{id}` | [API-菜单与指令面板](/api/menu) |
| `set_command_panel_target` | `PUT /v2/panels/{id}/target` | [API-菜单与指令面板](/api/menu) |

官方说明：[自定义菜单与指令面板](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/menu-panel/)

---

## 通用失败情形

几乎所有需要调 QQ 的动作，在 QQ 连接尚未 READY 时返回：

```json
{"status":"failed","retcode":1404,"data":null,"message":"发送通道未就绪（QQ 连接尚未初始化）"}
```

需要 `group_id` / `user_id` 反查 openid 的动作，若从未收到过该会话：

```json
{"status":"failed","retcode":1400,"data":null,"message":"未知 group_id（尚未收到该群消息）"}
```

或 `1404`（查询类）。
