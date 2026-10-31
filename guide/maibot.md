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

goqbot 连上后，插件连接状态变为「已连接」，MaiBot 日志出现 `[goqbot] 网关已就绪：platform=qq self_id=...`。

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

---

## 使用须知

- **@ 识别**：建议 goqbot 设置 `qq.mention_mode: at`，@机器人 才会以 `at` 段下发，MaiBot 才能识别「被提及」。
- **群全量消息**：想让 MaiBot 看到群里全部消息，在 goqbot `text_intent` 中开启 `GroupMessageEventHandler`，并请群主开启「获取群内全部消息」。
- **群名**：goqbot 群事件不带群名，插件会尝试一次 `get_group_info`（白名单接口），失败则显示为 `群<group_id>`。
- **支持范围**：入站支持文本、@、引用、图片（下载后交给 MaiBot 识图），其余类型转为占位文本；出站支持文本、@、引用、图片、语音，合并转发平铺发送。

更多细节见插件仓库 [README](https://github.com/huilongxiji/MaiBot-GoqBot-Adapter#readme)。
