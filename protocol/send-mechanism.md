# 消息发送机制

## 被动 vs 主动

QQ 官方发消息接口：

| 方式 | 条件 | 费用 / 频控 |
|---|---|---|
| 被动 | 请求带 `msg_id`（回复某条消息）或 `event_id`（回复互动等事件） | 免费，但有时间窗与次数 |
| 主动 | 两者都不带 | 生产环境严格限频；沙箱不限 |

被动窗口（本程序 lazy 池）：

| 场景 | TTL |
|---|---|
| 群 | 5 分钟 |
| 单聊 | 60 分钟 |

开启互动召回后，官方把被动回复从「60 分钟 5 次」调整为「60 分钟 4 次」（以平台当前规则为准）。

群主动推送（2026-06-22 起全量）：需群主打开【机器人在群聊内发言】；**每月每群最多 4 条**。对应 `send_group_active_msg`，或 `send_group_msg` 未命中任何被动凭证时。

---

## 凭证从哪来

收到普通消息 → lazy `kind=msg`（值为 QQ `msg_id`）。  
收到互动 → lazy `kind=event`（值为 payload **外层 event_id**，不是互动 id）。

群维度：优先 `group+user`，再回退到仅 group。

`reply` 段：用缓存的 `MsgMeta.MsgID` 作被动 `msg_id`；若有 `msg_idx` 则写入 `message_reference` 渲染引用条（平台要 REFIDX，直接塞 `ROBOT1.0_` 会 200 但不显示引用）。

---

## 发送优先级

```
*_active_msg          → 清空凭证，强制主动
is_wakeup=true        → 互动召回（主动语义，仅 C2C）
reply 命中            → 被动 msg_id（+ 引用）
lazy kind=event       → 被动 event_id
lazy kind=msg         → 被动 msg_id
否则                  → 主动
```

`msg_seq` 以实际凭证为键去重（`event_id` 优先）。主动消息不带 `msg_seq`。

---

## ID 映射（idmap）

| 映射 | 算法 / 存储 |
|---|---|
| `openid → int64` | FNV64a 正整数，确定性，重启不变 |
| 反向 `int64 → openid` | 持久化到 bbolt `ids` 桶 |
| `message_id` | `hash(QQ msg_id)`，同一 QQ 消息恒等 |
| `MsgMeta` | 原始 `msg_id`、场景、openid、时间、REFIDX；持久化 `msgmeta` 桶 |
| lazy / msg_seq | **仅内存** |
| C2C 推送开关 | 可持久化 |
| 入群申请 flag | 内存（进程内） |

`idmap.disabled=true` 则全部内存，重启后无法 `delete_msg` / `get_openid` / 按旧 id 发消息。

**所有 `user_id`/`group_id` 都不是真实 QQ 号。** 跨机器人打通只能申请并使用 `union_openid`。

---

## 为何第一次不能主动私聊陌生人

数字 id 必须先由入站事件写入 idmap。从未说过话的用户没有 `user_id`，`send_private_msg` 会 `1400 未知 user_id`。

主动推送也受官方「用户是否允许」限制，见 `get_c2c_msg_state` 与 `notice/c2c_msg_reject`。
