# 消息段

发送时 `message` 支持两种入参：

1. **array**：`[{"type":"text","data":{"text":"hi"}}]`
2. **CQ 字符串**：`你好[CQ:image,file=https://...]`

下游上报时 `message` **始终是段数组**；`raw_message` 始终是 CQ。`message_format=string` 时额外带 `message_cq`。

---

## 收发对照

| 段类型 | 收（QQ → OneBot） | 发（OneBot → QQ） |
|---|---|---|
| `text` | ✅ | ✅ |
| `at` | ✅（`mentions.is_you` → at self） | ✅ 转 `<@openid>`；at self / all 跳过 |
| `image` | ✅ go-cqhttp 风格 `file=<md5>.image` | ✅ |
| `video` | ✅ | ✅ |
| `record` / `voice` / `audio` | ✅ 上报为 `record` | ✅ 三种别名都能发 |
| `file` | ✅ 带 `name` / `file_size` | ✅ |
| `forward` | ✅ 合并转发 | ❌ 不能主动构造发出 |
| `markdown` + `keyboard` | — | ✅（可与 `reply` 同发） |
| `stream` | — | ✅ 仅 C2C |
| `reply` | — | ✅ 被动凭证 + 引用气泡 |

发送时：**每个非文本段单独变成一条 QQ 消息按序发出**（连续 text/at 会合并）。例外见下方「单图快路径」。

---

## `text`

```json
{"type":"text","data":{"text":"你好"}}
```

CQ：普通文本，`[` `]` `&` 会转义。

---

## `at`

**发送**

```json
{"type":"at","data":{"qq":"123456"}}
```

| data 字段 | 说明 |
|---|---|
| `qq` | 数字 user_id 字符串。`all` 或空 → 忽略；等于 `self_id` → 忽略 |

内部转成 QQ 的 `<@openid>`。openid 反查失败则这段被丢弃。

**接收**

由 `qq.mention_mode` 决定，不再段首额外插入 at。

| `mention_mode` | 行为 |
|---|---|
| `strip`（默认） | 正文里的 `<@openid>` 全部剥掉，不出现 at 段 |
| `raw` | `<@openid>` 留在 text 里，不切段 |
| `at` | 按原文位置转成 at 段；官机 → `qq=self_id`，其它人 → 映射后的数字 id；`name` 取 `mentions.username`（有则带） |

`at` 模式下示例：

```json
{"type":"at","data":{"qq":"<self_id>","name":"机器人名"}}
{"type":"at","data":{"qq":"88112233","name":"张三"}}
```

`raw_message` 同步为 `[CQ:at,qq=...,name=...]`。`everyone` / `all` 的 `qq` 为 `all`。

旧配置 `add_at_group: true`（且未写 `mention_mode`）等同于 `at`。

---

## `image`

**发送 `data`**

| 字段 | 说明 |
|---|---|
| `file` | 见下方「富媒体来源」 |
| `url` | `file` 为空时的备用来源 |

**接收 `data`**

| 字段 | 说明 |
|---|---|
| `file` | `<处理后的FileName>.image` |
| `subType` | `"0"` |
| `url` | 真实下载地址（自动补 `https://`） |
| `width` | 有则带 |
| `height` | 有则带 |

```json
{"type":"image","data":{"file":"abc123.image","subType":"0","url":"https://...","width":800,"height":600}}
```

### 单图快路径

整条待发消息恰好是「若干文本 + **1 张图片**」、且没有 markdown 时：所有文本并入该图片的富媒体消息，**一个气泡**（文字在上、图在下），而不是拆成两条。

---

## `video` / `record` / `file`

**发送 `data`**

| 字段 | 说明 |
|---|---|
| `file` | 来源 |
| `url` | 备用 |
| `name` | 建议带扩展名。视频分片上传会自动补 `.mp4`；`file` 段透传文件名 |

发送别名：`record` = `voice` = `audio`。

**接收**

```json
{"type":"video","data":{"url":"https://...","file":"https://..."}}
{"type":"record","data":{"url":"https://...","file":"https://..."}}
{"type":"file","data":{"url":"https://...","file":"https://...","name":"a.pdf","file_size":12345}}
```

归类按附件 `content_type`：`image/*`→image，`video/*`→video，`voice`/`audio`→record，其余 `application/*`→file。

---

## 富媒体来源（发）

`file` / `url` 支持：

| 前缀 | 行为 |
|---|---|
| `base64://` | 裸 base64（不含 `data:` 前缀），直传 |
| `http://` / `https://` | 交给 QQ 拉取 |
| `file://` | 读本地文件再 base64 |
| 以 `/` 开头的绝对路径 | 同上 |

本地文件 **>10MB** 自动走分片上传（prepare → 并发 PUT OSS → finish → 换 file_info）。发送整体超时按体积放大（保底 30s，按约 512KB/s 估算，封顶 30 分钟）。

无需自建图床。`file_info` 有 TTL，群/单聊上传结果不互通。

QQ `file_type`：1 图片 / 2 视频 / 3 语音 / 4 文件。

```python
from nonebot.adapters.onebot.v11 import MessageSegment

await matcher.send(MessageSegment("record", {
    "file": "base64://....",
    "name": "demo.mp3",
}))
await matcher.send(MessageSegment.image("file:///tmp/a.png"))
await matcher.send(MessageSegment.image("https://example.com/a.png"))
```

---

## `reply`

引用一条**本程序缓存过**的消息。

```json
{"type":"reply","data":{"id":"88112233"}}
```

| 效果 | 说明 |
|---|---|
| 被动 `msg_id` | 仅当 `id` 指向**用户入站且未过期**的消息时占用被动窗口；引用机器人自己发的消息时改走 lazy |
| 引用气泡 | 需要 REFIDX（入站 `msg_idx` 或出站回包 `ext_info.ref_idx`） |

文本、图片、**markdown** 都可以带引用气泡（与 `reply` 段同条发送即可）。引用只挂在第一条已发出的气泡上。

可引用的目标：
- **别人发的消息**（含 markdown）：入站时缓存的 `msg_idx`；同时可作为被动凭证（窗口内）
- **机器人自己发过的消息**（含 markdown）：发消息回包 `ext_info.ref_idx`。被动窗口仍用当前会话 lazy（用户那条指令），不能拿机器人自己的 `msg_id` 当被动凭证（平台会 `40034005 已过期`）

`id` 可以是数字或字符串。未命中缓存会告警并退化（可能变成主动消息）。

与 `*_active_msg` 同时用时，active 会清空 `msg_id`，引用失效。

---

## `markdown` + `keyboard`

`type` 必须为 `markdown`。`data.data` 是一个 JSON 对象（或该对象的 `base64://` 字符串）。

可与 `reply` 段同条发送，引用用户指令或机器人自己发过的消息（含 markdown）：`MessageSegment.reply(event.message_id)` + markdown。

```json
{
  "type": "markdown",
  "data": {
    "data": {
      "markdown": {
        "content": "**粗体** 原生 markdown"
      },
      "keyboard": {
        "content": {
          "rows": [
            {
              "buttons": [
                {
                  "id": "btn1",
                  "render_data": {"label": "点我", "style": 1},
                  "action": {"type": 1, "data": "callback_payload", "permission": {"type": 2}}
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

也可把 `rows` 放在 `data.data` 顶层（与 `keyboard` 二选一，`keyboard` 优先）。

### markdown 字段

| 字段 | 说明 |
|---|---|
| `content` | 原生 markdown（2026-04-23 起群/单聊全量开放） |
| `custom_template_id` + `params` | 自定义模板 |
| `template_id` | 官方模板 id |
| `style.main_font_size` | `small` / `middle` / `large` |
| `style.layout` | `hide_avatar_and_center` |
| `process_msg` | 引导消息 |

### 按钮 `action.type`

| 值 | 含义 |
|---|---|
| 0 | URL / 小程序，`data` 为链接 |
| 1 | **回调**，点击上报 `INTERACTION_CREATE`，`data` 进 `button_data` |
| 2 | 指令按钮（at 机器人并填入 `data`）；`anchor=1` **唤起手机相册** |
| 3 | 客户端 native 跳转 |
| 4 | 订阅按钮 |

### 常用 action 字段

| 字段 | 说明 |
|---|---|
| `data` | 回调 payload 或指令文本 |
| `permission.type` | 0 仅指定用户 / 1 管理员 / 2 所有人 / 3 指定身份组 |
| `enter` | 指令按钮：点击后直接发送 `data` |
| `reply` | 指令是否带引用 |
| `anchor` | `1`=唤起相册（仅指令按钮；设置后忽略 `enter`） |
| `unsupport_tips` | 客户端不支持时的 toast |
| `click_limit` | 可点击次数 |
| `modal` | 二次确认 `{content, confirm_text, cancel_text}` |

`render_data.style`：0 灰线框 / 1 蓝线框 / 3 白底红字 / 4 蓝底白字。

回调要闭环请开 `InteractionHandler`，见 [入站事件](/protocol/events) 与 [API-消息管理](/api/message) 的 `put_interaction`。

唤起相册：`action.type=2` + `anchor=1`。

---

## `stream`（仅 C2C）

打字机式分帧。状态由**下游插件自己维护**，框架无状态，只负责回传 `stream_id`。

```json
{"type":"stream","data":{"state":1,"index":0}}
```

| data 字段 | 说明 |
|---|---|
| `state` | 1 正文生成中 / 10 正文结束 / 11 引导生成中 / 20 引导结束 |
| `id` | 续帧必填，= 首帧返回的 `stream_id` |
| `index` | 首帧必须 `0`；之后逐帧 +1 |
| `reset` | 未完成时重新生成；需带 id 且 index 从 0 |

**流程**

1. 首帧：`index=0` 且不带 `id`，相邻 `text` 为这一帧内容。响应 `data.stream_id`。
2. 续帧：`id=stream_id`，`index` 递增，`state=1`。
3. 末帧：`state=10`。

`index>=1` 却缺 `id` → 平台报 `stream.id无效`。

```python
r = await bot.send_private_msg(
    user_id=uid,
    message=MessageSegment("stream", {"state": 1, "index": 0})
            + MessageSegment.text("这是"),
)
sid = r["stream_id"]
await bot.send_private_msg(
    user_id=uid,
    message=MessageSegment("stream", {"state": 1, "id": sid, "index": 1})
            + MessageSegment.text("续帧"),
)
await bot.send_private_msg(
    user_id=uid,
    message=MessageSegment("stream", {"state": 10, "id": sid, "index": 2})
            + MessageSegment.text("收尾\n"),
)
```

---

## `forward`（仅接收）

```json
{
  "type": "forward",
  "data": {
    "id": "ROBOT1.0_xxxx",
    "content": [ {"type":"node","data":{}} ]
  }
}
```

- 103「最近十条」：保留用户 @ 命令文本，**追加** forward 段。
- 102 聊天记录：整条替换为单个 forward 段。

节点完整内容用 `get_forward_msg`，见 [API-消息管理](/api/message)。
