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

- 群主动消息：每月每群 4 条；需群主允许发言
- C2C 互动召回：30 天 4 个周期各 1 条
- 被动回复：开启召回后约 60 分钟 4 次
- `set_menu`：约 5 QPM
- WS 建连次数：见 `get_gateway`

## 客户端差异

群全量消息授权页目前实测**仅安卓手机 QQ** 能打开；iOS / 电脑端可能「加载失败」。

## 项目定位

本项目按维护者自己的用法演进，核心服务 NoneBot2 消息段写法，不追求「彻底多框架通用」。
