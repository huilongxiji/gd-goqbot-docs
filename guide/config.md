# 配置说明

配置文件为 YAML，默认路径是可执行文件同级的 `config.yml`。可用 `-config /path/to.yml` 覆盖。

启动时会对照内置模板补齐缺失键（不覆盖已有值与注释）。补全后会暂停并提示重启。

---

## `qq.*` 上游（连 QQ 官方）

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `app_id` | string | 必填 | QQ 开放平台分配的机器人 AppID |
| `uin` | int64 | `0` | 机器人 QQ 号；仅当 `use_uin=true` 时用作 `self_id` |
| `use_uin` | bool | `false` | `true`=`self_id` 用 `uin`；`false`=把 `app_id` 解析为整数 |
| `token` | string | `""` | 机器人令牌，仅留存；`client_secret` 为空时回退用它鉴权 |
| `client_secret` | string | 必填 | botgo AppSecret，用于换取 access_token |
| `sandbox` | bool | `false` | `true`=沙箱环境 openapi；`false`=正式环境 |
| `intents` | int64 | 不设 | 硬覆盖自动推导的 intent 位掩码。不配则按 `text_intent` 推导 |
| `shard_count` | uint32 | `1` | 分片总数，`0` 会归一为 `1` |
| `shard_id` | uint32 | `0` | 本进程分片号，从 0 开始 |
| `text_intent` | string[] | 见下 | 按 **handler 名**订阅事件，intent 自动 OR |
| `mention_mode` | string | `"strip"` | 用户 @ 官机时上报怎么处理这段 @，见下 |
| `self_id` | int64 | `0` | 覆盖上报用 `self_id`。`0` 时按下面规则推导 |
| `disabled` | bool | `false` | `true`=跳过 QQ 上游连接（只测 OneBot 侧） |
| `ip_reject_action` | string | `"stop"` | IP 白名单被拒（错误码 11298）后的策略，见下 |
| `ip_reject_retry_interval` | int | `60` | 仅 `retry` 生效；重试间隔秒，最小 `5` |

### `self_id` 推导顺序

1. 显式 `qq.self_id > 0` → 用它
2. 否则 `use_uin && uin != 0` → 用 `uin`
3. 否则把 `app_id` 解析为 int64

上报给 NoneBot 的 `self_id`、心跳、`get_login_info.user_id` 都取这个值。

### `mention_mode`

用户发「@机器人 你好」时，QQ 正文会带 `<@官机openid>`。由此决定上报形态：

| 值 | 行为 | 下游 `message` 示例 |
|---|---|---|
| `strip`（默认） | 丢掉所有 `<@...>`，不补 at | `[{"type":"text","data":{"text":"你好"}}]` |
| `raw` | 正文原样保留 `<@openid>`，交给下游自己处理 | `[{"type":"text","data":{"text":"<@E1F2...> 你好"}}]` |
| `at` | 按位置切成 OneBot at / text | `[{"type":"at","data":{"qq":"<self_id>","name":"机器人名"}},{"type":"text","data":{"text":" 你好"}}]` |

`at` 会同时写入 `message` 段数组和 `raw_message` CQ（`[CQ:at,qq=...,name=...]`）。`onebot.message_format: string` 时还有 `message_cq`。NoneBot `to_me()` 需要消息里有 at self，因此应设 `mention_mode: at`。

大小写不敏感。空或未知值按 `strip`。

已废弃的 `qq.add_at_group` 仍能读：仅当 **未配置** `mention_mode` 时，`true` 视为 `at`，`false` 视为 `strip`。新配置请只用 `mention_mode`。

### `ip_reject_action`

本机公网 IP 未加入 QQ 开放平台白名单时，鉴权会返回 11298。

| 值 | 行为 |
|---|---|
| `stop` | 停止 QQ 上游连接与重连，**进程不退出**（默认） |
| `retry` | 等待 `ip_reject_retry_interval` 秒后重试；IP 加白后可自动恢复 |
| `exit` | 打印提示后关闭整个框架，需手动重启 |

非法值启动失败。

### `text_intent` 可选 handler

真正订阅哪些 QQ 事件，由这里列出的 handler **动态推导 intent**。没写的 handler 即使平台下发也不会转换上报。

| handler 名 | 作用 | 建议 |
|---|---|---|
| `ReadyHandler` | 连接成功，写入真实昵称 | 必开 |
| `ErrorNotifyHandler` | WS 错误仅打日志 | 必开 |
| `GroupATMessageEventHandler` | 群 @ 机器人 → `message/group` | 常用 |
| `GroupMessageEventHandler` | 群全量消息（需群主授权） | 按需 |
| `C2CMessageEventHandler` | 单聊消息 → `message/private` | 常用 |
| `C2CFriendEventHandler` | 好友添加/删除 | 按需 |
| `GroupAddRobotEventHandler` | 机器人被拉入群 | 按需 |
| `GroupDelRobotEventHandler` | 机器人被移出群 | 按需 |
| `GroupMsgRejectEventHandler` | 群关闭主动推送 | 按需 |
| `GroupMsgReceiveEventHandler` | 群开启主动推送 | 按需 |
| `GroupJoinRequestEventHandler` | 入群申请（需机器人为群管理员） | 按需 |
| `GroupMemberEventHandler` | 群成员进退（需开放平台开启群成员事件，intent `1<<24`） | 按需 |
| `C2CMsgRejectEventHandler` | 用户关闭 C2C 推送；同时落库供 `get_c2c_msg_state` | 要用查询就开 |
| `C2CMsgReceiveEventHandler` | 用户开启 C2C 推送；同时落库 | 同上 |
| `InteractionHandler` | 按钮点击 → notice + message；自动 `PUT /interactions` 回执 | 用按钮必开 |
| `ATMessageEventHandler` | 频道 @（目前仅打日志，不转换） | 不要开 |
| `DirectMessageEventHandler` | 频道私信（目前仅打日志） | 不要开 |

---

## `onebot.*` 下游（连 NoneBot）

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `access_token` | string | `""` | 下游鉴权口令。空=不校验 |
| `heartbeat_interval` | int | `5000` | 心跳间隔**毫秒**。`<=0` 关闭心跳 |
| `message_format` | string | `"array"` | 见下 |
| `debug` | bool | `false` | `true` 时动作边框额外输出接口名、参数、返回状态、耗时；同时显示 botgo 心跳 |
| `downtime_message` | string | `""` | 所有下游都掉线时，直接被动回发 QQ 的兜底文本。空=关闭 |
| `servers` | list | 必配至少一条有效连接 | 正向 / 反向 WS 列表 |

### `message_format`

- `array`（默认）：事件里 `message` 为消息段数组；`raw_message` 始终是 CQ 字符串。
- `string`：`message` **仍是段数组**（OneBot v11 标准）；额外输出 `message_cq` 字段为 CQ 字符串。`raw_message` 始终含 CQ。

### `servers[].ws` 正向服务端

| 字段 | 说明 |
|---|---|
| `address` | 监听地址，如 `0.0.0.0:6700`。也可写 `ws://0.0.0.0:6700` |
| `disabled` | `true`=不启用 |

### `servers[].ws-reverse` 反向客户端

| 字段 | 说明 |
|---|---|
| `universal` | API+Event 合一端点。设置后优先，不再连 `api`/`event` |
| `api` | 仅收动作的端点 |
| `event` | 仅推事件的端点 |
| `reconnect-interval` | 断线重连间隔**毫秒**，默认 `3000`；未配时内部回退 5s |
| `disabled` | `true`=不启用 |

### 校验规则

- 同一 `servers[i]` 不能同时启用 `ws` 与 `ws-reverse`
- 正向必须有非空 `address`
- 反向必须配置 `universal` / `api` / `event` 至少之一

---

## `idmap.*`

| 字段 | 默认 | 说明 |
|---|---|---|
| `disabled` | `false` | `true`=纯内存，不落盘。重启后 `message_id` 反查、openid 反查、C2C 推送状态、入群申请 flag 全部丢失 |
| `path` | `"idmap.db"` | bbolt 文件。相对路径=可执行文件同级；不存在则创建 |

持久化内容：`int64 → openid` 反向映射、消息元数据（QQ 原始 `msg_id` / 场景 / openid）、C2C 推送开关。lazy 凭证与 `msg_seq` 仍仅内存。

---

## `log.*`

| 字段 | 默认 | 说明 |
|---|---|---|
| `enabled` | `true` | `false`=只打终端，不写文件 |
| `path` | `"logs"` | 日志目录。相对路径=可执行文件同级。按天滚动 `goqbot-YYYY-MM-DD.log` |

格式：`[Level] 2006-01-02 15:04:05 [来源] 消息`。终端 `[Error]` 红、`[Warning]` 黄（仅 TTY）；文件恒为纯文本去色。
