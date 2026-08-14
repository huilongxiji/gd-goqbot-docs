# 已知限制

## 连接能力

| 方向 | 支持 | 不支持 |
|---|---|---|
| 上游 QQ | WebSocket | Webhook |
| 下游 OneBot | 正向 / 反向 WebSocket | 正向 / 反向 HTTP |

## 未接入：频道（guild）

底层 `internal/botgo` 已保留 handler，本程序尚未转换：

| QQ 事件 | 现状 |
|---|---|
| AT_MESSAGE_CREATE | 仅日志 |
| DIRECT_MESSAGE_CREATE | 仅日志 |
| MESSAGE_CREATE（频道非@） | 未接 |
| GUILD_* / CHANNEL_* / GUILD_MEMBER_* | 未接 |
| FORUM_THREAD_* | 未接 |

指令面板的 `scope=channel/dm` 会原样打到官方 API，但本程序**不会**把频道消息转成 OneBot 事件。

## 双方都未实现

- `AUDIO_*` 音频频道
- `MESSAGE_REACTION_*` 表态
- `MESSAGE_AUDIT_*` 审核

预留但未启用：`ENTER_AIO`、`SUBSCRIBE_MESSAGE_STATUS`。

## OneBot 标准动作缺口（有意）

| 动作 | 行为 |
|---|---|
| `set_group_whole_ban` | 固定 1404，官方无成员级以外的设置接口 |
| `get_group_member_info` 查他人 | 1404，官方无此接口 |
| `get_group_member_list` 等 | 未实现 → 空成功 `data={}` |
| 未识别 action | 空成功，不报错 |

## ID 语义

- `user_id` / `group_id` **不是**真实 QQ 号 / 群号
- 必须先收到过该会话才能对其发送 / 反查
- `get_msg` / `get_forward_msg` 仅内存，重启丢失；`delete_msg` 依赖持久化 idmap

## 官方频控（备忘，以平台为准）

群聊发送规则见官方 [发送群聊消息](https://bot.q.qq.com/wiki/develop/api-v2/autogen/api/v2_groups_group_openid_messages.post.html)。群消息**不支持流式参数**。用户或群主可在客户端关闭主动推送，关闭后主动消息一律失败。

### 被动消息

| 场景 | 有效期 | 每条消息最多回复 |
|---|---|---|
| 群聊 | **5 分钟** | **5 次** |
| 单聊 | 60 分钟 | 4 次 |

相同 `msg_id` + `msg_seq` 重复发送会失败（官方去重）。本程序被动发送会自动递增 `msg_seq`。

### 主动消息（群聊）

需群主打开「机器人在群聊内发言」。接口本身另有 **100 QPS** 限制。

| 认证类型 | Bot 维度（发送方） | 单关系维度（接收方） | 每日上限 |
|---|---|---|---|
| 企业认证 / 个人身份证认证 | **60/qpm** | **20/qpm** | 每个群最多 **1000** 条 |
| 未认证 | **30/qpm** | **20/qpm** | 每个群最多 **1000** 条 |

对应 `send_group_active_msg`，或 `send_group_msg` 未命中任何被动凭证时。沙箱环境以平台当前规则为准。

### 主动消息（单聊）

| 认证类型 | Bot 维度 | 单关系维度 | 每日上限 |
|---|---|---|---|
| 企业 / 个人认证 | 10/qps | 20/qpm | 每个用户最多 1000 条 |
| 未认证 | 5/qps 且 30/qpm | 20/qpm | 每个用户最多 1000 条 |

C2C 互动召回（`is_wakeup`）：用户主动对话后 30 天内分 4 个周期（当天 / 1–3 天 / 3–7 天 / 7–30 天），每周期 1 条。

### 其它

- `set_menu`：约 5 QPM
- WS 建连次数：见 `get_gateway`

## 客户端差异

群全量消息授权页目前实测**仅安卓手机 QQ** 能打开；iOS / 电脑端可能「加载失败」。

## 项目定位

本项目按维护者自己的用法演进，核心服务 NoneBot2 消息段写法，不追求「彻底多框架通用」。
