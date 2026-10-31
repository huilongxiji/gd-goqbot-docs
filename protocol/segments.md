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
| `at` | ✅（识别 `<qqbot-at-user id="" />`、`<qqbot-at-everyone />` 与旧 `<@openid>`；`mentions.is_you` → at self） | ✅ 转官方 `<qqbot-at-user id="openid" />`；at self / all 跳过 |
| `image` | ✅ go-cqhttp 风格 `file=<md5>.image` | ✅ |
| `video` | ✅ | ✅ |
| `record` / `voice` / `audio` | ✅ 上报为 `record` | ✅ 三种别名都能发 |
| `file` | ✅ 带 `name` / `file_size` | ✅ |
| `forward` | ✅ 合并转发 | ❌ 不能主动构造发出 |
| `markdown` + `keyboard` | — | ✅（可与 `reply` 同发） |
| `share` / `card` | — | ✅ 图文卡片（msg_type=8） |
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

内部转成 QQ 官方的 `<qqbot-at-user id="openid" />`。openid 反查失败则这段被丢弃。

**接收**

QQ 正文里的 @ 标记有三种写法，都能识别：新语法 `<qqbot-at-user id="openid" />`、`<qqbot-at-everyone />`，以及官方标注废弃中的旧语法 `<@openid>` / `<@!openid>`。下面统称「@ 标记」。

怎么上报由 `qq.mention_mode` 决定，不再段首额外插入 at。

| `mention_mode` | 行为 |
|---|---|
| `strip`（默认） | 正文里的 @ 标记全部剥掉，不出现 at 段 |
| `raw` | @ 标记原样留在 text 里，不切段 |
| `at` | 按原文位置转成 at 段；官机 → `qq=self_id`，其它人 → 映射后的数字 id；`name` 取 `mentions.username`（有则带） |

`at` 模式下示例：

```json
{"type":"at","data":{"qq":"<self_id>","name":"机器人名"}}
{"type":"at","data":{"qq":"88112233","name":"张三"}}
```

`raw_message` 同步为 `[CQ:at,qq=...,name=...]`。`<qqbot-at-everyone />` 以及旧语法的 `everyone` / `all`，`qq` 为 `all`。

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
| `file_name` | QQ 下发的原始文件名，有则带。可用于素材上传的 `name`，或 `get_media_image` 按文件名查询 |
| `width` | 有则带 |
| `height` | 有则带 |

```json
{"type":"image","data":{"file":"abc123.image","subType":"0","url":"https://...","file_name":"photo.jpg","width":800,"height":600}}
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

本地数据 **≤5MB** 先用 `file_data` 直传，失败自动回退分片；**>5MB** 直接走分片上传（prepare → 并发 PUT OSS → finish → 换 file_info）。URL 来源交给 QQ 拉取，不经过本地。发送整体超时按体积放大（保底 30s，按约 512KB/s 估算，封顶 30 分钟）。

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
| `custom_template_id` + `params` | 自定义模板（**官方已标注废弃**，仍可发送，首次使用时告警一次） |
| `template_id` | 官方模板 id（**官方已标注废弃**，同上） |
| `style.main_font_size` | `small` / `middle` / `large` |
| `style.layout` | `hide_avatar_and_center` |
| `process_msg` | 引导消息 |
| `force_verify_image_resource` | 框架发送群/单聊 markdown 时固定为 `true`：正文图片转存失败则消息不发出，下游收到失败（`retcode=1500`） |

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
| `click_limit` | **官方已废弃**，框架不再下发该字段（首次出现时告警一次） |
| `modal` | 二次确认 `{content, confirm_text, cancel_text}` |

`render_data.style`：0 灰线框 / 1 蓝线框 / 3 白底红字 / 4 蓝底白字。

回调要闭环请开 `InteractionHandler`，见 [入站事件](/protocol/events) 与 [API-消息管理](/api/message) 的 `put_interaction`。

唤起相册：`action.type=2` + `anchor=1`。

### 引用素材图片

markdown 正文里可以直接引用素材图片，宽高写在描述里：

```markdown
![描述 #800px #400px](qqbot-media://image/v1/xxxxxxxx)
```

`qqbot-media://` 链接由 `upload_media_image` 上传后获得，见 [API-素材管理](/api/media)。它只能在 markdown 中使用，不能放进 `image` 段。

---

## `share` / `card`（图文卡片）

发送为 QQ 图文卡片（msg_type=8，`type=tuwen`）。`share` 与 `card` 两个段名等价，字段兼容两种写法：

| 字段 | 别名 | 必填 | 说明 |
|---|---|---|---|
| `title` | — | ✅ | 标题，1–50 字符 |
| `description` | `content` / `desc` | ❌ | 描述，≤200 字符；缺省时用 `title` |
| `url` | — | ✅ | 点击跳转链接，必须 `https://`，≤1024 字符 |
| `pic_url` | `image` | ✅ | 封面图链接，必须 `https://`，≤1024 字符 |

OneBot V11 的 share 写法：

```json
{"type":"share","data":{"url":"https://example.com/post/1","title":"标题","content":"一段描述","image":"https://example.com/cover.png"}}
```

官方字段写法：

```json
{"type":"card","data":{"title":"标题","description":"一段描述","url":"https://example.com/post/1","pic_url":"https://example.com/cover.png"}}
```

不合规（长度越界、链接不是 https）时**不会截断改写**，该段直接丢弃，日志告警并在发送日志里注明原因。

NoneBot：

```python
await matcher.send(MessageSegment.share(url="https://example.com/post/1", title="标题",
                                        content="一段描述", image="https://example.com/cover.png"))
```

---

## `stream`（仅 C2C）

打字机式分帧，走官方独立接口 `POST /v2/users/{openid}/stream_messages`。正文取同一条消息里的 `text` 段（或 `markdown` 段）。状态由**下游插件自己维护**，框架无状态，只负责回传 `stream_id`。

```json
{"type":"stream","data":{"state":1,"index":0}}
```

| data 字段 | 别名 | 说明 |
|---|---|---|
| `state` | `input_state` | `1` 生成中 / `10` 结束。旧值 `11` / `20` 自动按 `1` / `10` 处理 |
| `id` | `stream_msg_id` | 首帧不填；续帧必填，= 首帧返回的 `stream_id`（缺失时框架直接拒绝） |
| `index` | — | 首帧必须 `0`；之后逐帧 +1 |
| `input_mode` | — | `append`（默认，本帧文本为增量）/ `replace`（本帧文本为当前全量，必须以已发送内容为前缀） |
| `reset` | — | 旧字段，`reset=true` 等同 `input_mode=replace` |
| `content_type` | — | `text`（默认）/ `markdown`；不填且同条消息带 `markdown` 段时自动按 markdown 发送 |

发送成功的 `data` 额外返回：

| 字段 | 说明 |
|---|---|
| `stream_id` | 本条流的 id，续帧回填到 `id` |
| `remain_msg_len` | 该流剩余可写字符数；平台未返回时为 `-1` |

其他规则：

- 同一条流的各帧自动沿用首帧的 `msg_seq`。
- 流式只发文字：同条消息里的图片等富媒体段会被忽略并告警。
- **群聊不支持流式**：群里的 `stream` 段会被忽略，按普通消息发送并告警。

**流程**

1. 首帧：`index=0` 且不带 `id`，相邻 `text` 为这一帧内容。响应 `data.stream_id`。
2. 续帧：`id=stream_id`，`index` 递增，`state=1`。
3. 末帧：`state=10`。

`index>=1` 却缺 `id` → 框架直接返回 `1400`（`流式续帧(index>=1)必须在 stream 段带上首帧返回的 stream_id`）。

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
