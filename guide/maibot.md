# MaiBot 接入

[MaiBot](https://github.com/Mai-with-u/MaiBot) 本身不支持 OneBot V11，需要安装适配插件 **[MaiBot-GoqBot-Adapter](https://github.com/huilongxiji/MaiBot-GoqBot-Adapter)**（插件 ID `onebot-ws.goqbot-adapter`）。插件在 MaiBot 里开一个 OneBot V11 WebSocket 端点，让 goqbot 连进来，可以和 NoneBot2、AstrBot 等框架同时连在同一个 goqbot 上，见 [接入概览](/guide/multi-framework)。

版本要求：MaiBot ≥ 1.3.18，goqbot ≥ 1.11.0（主动消息开关依赖 [`passive_only`](/api/send#passive-only-仅被动)）。

---

## 1. 安装插件

两种方式任选：

- 在 MaiBot WebUI 的插件市场搜索并安装（上架后）；
- 或把插件仓库下载 / 克隆到 MaiBot 的 `plugins/` 目录下（目录名任意）。

重启 MaiBot，在 WebUI 插件页启用「goqbot 适配器」。

## 2. 配置插件（反向 WebSocket，推荐）

在插件配置页的「连接」分组中：

| 配置项 | 填写 |
|---|---|
| 连接方式 | 反向 |
| 地址 | 插件监听的完整地址，如 `ws://127.0.0.1:8095/onebot/v11/ws`；端口不要和其他框架冲突 |
| 访问令牌 | 与 goqbot 的 `onebot.access_token` 相同 |
| 重连等待 / 心跳间隔 / 动作超时 | 一般保持默认 |

地址规则：反向时必须是 `ws://`、端口必填、路径可省略（默认 `/`）。监听 `0.0.0.0` 时，goqbot 那边要填插件所在机器的实际 IP，并务必设置访问令牌。

保存后配置页顶部的连接状态显示「等待 goqbot」。

## 3. 在 goqbot 中添加反向连接

```yaml
onebot:
  access_token: "your-token"
  servers:
    - ws-reverse:
        universal: ws://127.0.0.1:8095/onebot/v11/ws   # 与插件「地址」一致
        reconnect-interval: 3000
```

goqbot 连上后，插件连接状态变为「QQ <机器人 ID>，goqbot 程序版本 x.x.x」，MaiBot 日志出现 `[goqbot] 网关已就绪：platform=qq self_id=...`。

::: tip 也可以用正向
插件「连接方式」选「正向」，地址填 goqbot 正向 ws 的地址（如 `ws://127.0.0.1:6700`）。此时「重连等待」生效；反向时重连间隔由 goqbot 的 `reconnect-interval` 决定。
:::

---

## 插件设置说明

### 连接标识

位于「插件设置」分组，默认 `qq`，即这条连接在 MaiBot 里的平台名。同一个 MaiBot 还接了其他协议端（如另一个 goqbot、NapCat）时，给每个协议端填不同的标识（如 `qq_official`），避免用户、群号混在一起。

### 主动消息

插件发送时总是先以 `passive_only=true` 尝试被动回复。没有可用被动凭证时：

| 场景 | 开关关闭（默认） | 开关开启 |
|---|---|---|
| 私聊 | 丢弃并记录日志 | 改发主动消息（独立开关） |
| 群聊 | 丢弃并记录日志 | 在「单群频率限制」内改发主动消息，超出则丢弃 |

群聊主动消息还需要群主在 QQ 里开启「机器人主动在群聊内发言」。

### 黑白名单

插件不自带名单，使用 MaiBot WebUI「适配器设置 → 黑白名单规则」里为本适配器自动生成的规则面板。**只能填 goqbot 下发的数字 ID**：群聊规则填 `group_id`，私聊规则填 `user_id`；openid 填进去不会生效。这份名单只影响 MaiBot，不影响同一个 goqbot 上的其他框架。

### 聊天工具

「聊天工具」分组让 MaiBot 的模型在聊天中直接使用 goqbot 特有能力。每个工具单独开关，**默认全部关闭**，保存后立即生效，只在本连接的会话中可用：

| 开关 | 工具 | 作用 |
|---|---|---|
| Markdown 消息 | `goqbot_send_markdown` | 发送原生 Markdown，可带跳转 / 指令按钮（遵循主动消息开关） |
| 图文卡片 | `goqbot_send_card` | 发送[图文卡片](/protocol/segments)（链接与封面图须为 https，遵循主动消息开关） |
| 互动召回 | `goqbot_send_wakeup` | 给当前私聊的用户发[互动召回](/api/send#is-wakeup-互动召回)消息，只能召回当前聊天的用户，不受主动消息开关影响 |
| 主动消息权限查询 | `goqbot_get_push_state` | 查当前群 / 私聊是否允许主动消息 |
| 撤回消息 | `goqbot_recall_message` | 撤回机器人自己发过的消息 |
| 群成员禁言 | `goqbot_mute_member` | 执行白名单用户发出的「禁言 @某人 时长」/「解禁 @某人」指令，模型不能自行禁言 |

**互动召回**默认开启「禁止聊天触发召回」：用户最近 60 分钟内在该私聊发过消息时拒绝召回，召回只能由 AI 在用户长时间未互动时自行发起。

**禁言**只执行「允许触发的用户」本人发出的固定格式指令：`禁言 @某人 时长`（如 `10分钟` / `2小时`，纯数字按分钟，不写默认 10 分钟）或 `解禁 @某人`。禁言对象和时长由插件从它亲自收到的原始群消息中解析，模型只能指出是哪条指令；指令需在 10 分钟内，且只能执行一次。@ 成员需要 goqbot 设置 `qq.mention_mode: at`。

相关配置在「禁言工具」分组：

| 配置项 | 说明 |
|---|---|
| 允许触发的用户 | 只有名单内用户本人发出的指令才会执行；**留空表示任何人都无法触发** |
| 禁言保护名单 | 名单里的人不会被禁言（解除禁言不受影响） |
| 允许禁言的群 | 填 `group_id`，留空表示所有群都可用 |
| 最长禁言时长 | 超过时按该值禁言 |

名单都填 goqbot 下发的数字 ID；同一个人在私聊和不同群中的 `user_id` 可能不同，请按该群聊天记录中显示的 ID 填写。

### 开放接口

「开放接口」分组把 goqbot 动作开放给其他 MaiBot 插件，通过 `ctx.api.call("adapter.goqbot.<分组>.<名称>", ...)` 调用。每组单独开关，**默认全部关闭**，关闭后立即下线：

| 开关 | 包含 |
|---|---|
| 消息发送 | `message.send`：发送任意消息段，`mode` 可选 `auto` / `passive` / `active` / `wakeup` |
| 素材库 | [素材管理](/api/media)的上传、查询、列表、删除 |
| 菜单与指令面板 | 快捷菜单读写、指令面板增删改 |
| 状态查询 | 私聊推送权限、机器人群内状态、openid、禁言列表、群成员、进群申请 |
| 群管理 | 禁言 / 解禁、处理进群申请 |
| 通用动作透传 | `raw.call_action`：调用任意 goqbot 动作，权限最大，谨慎开启 |

参数与 goqbot 同名动作一致，完整 API 名对照见插件 [README](https://github.com/huilongxiji/MaiBot-GoqBot-Adapter#开放接口)。

---

## 使用须知

- **@ 识别**：建议 goqbot 设置 `qq.mention_mode: at`，@机器人 才会以 `at` 段下发，MaiBot 才能识别「被提及」。
- **群全量消息**：想让 MaiBot 看到群里全部消息，在 goqbot `text_intent` 中开启 `GroupMessageEventHandler`，并请群主开启「获取群内全部消息」。
- **群名**：goqbot 群事件不带群名，插件会尝试一次 `get_group_info`（白名单接口），失败则显示为 `群<group_id>`。
- **支持范围**：入站支持文本、@、引用、图片（下载后交给 MaiBot 识图），其余类型转为占位文本；出站支持文本、@、引用、图片、语音，合并转发平铺发送；Markdown、按钮、图文卡片通过「聊天工具」或「开放接口」发送。

更多细节见插件仓库 [README](https://github.com/huilongxiji/MaiBot-GoqBot-Adapter#readme)。
