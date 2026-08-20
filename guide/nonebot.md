# NoneBot 接入

核心目标是服务 **NoneBot2 + onebot v11 消息段写法**。不保证其它框架的兼容。

适配器：`nonebot-adapter-onebot`。

---

## 连接

正向（goqbot 监听 6700）：

```python
# nonebot 配置
# ONEBOT_WS_URLS=["ws://127.0.0.1:6700/"]
```

反向（NoneBot 开 OneBot V11 适配器默认反向服务，goqbot 连）：

```yaml
# goqbot config.yml
onebot:
  servers:
    - ws-reverse:
        universal: ws://127.0.0.1:8080/onebot/v11/ws
```

`access_token` 两边保持一致。

---

## 收消息

```python
from nonebot import on_message
from nonebot.adapters.onebot.v11 import Bot, GroupMessageEvent, PrivateMessageEvent

m = on_message(priority=10, block=False)

@m.handle()
async def _(bot: Bot, event: GroupMessageEvent):
    # 扩展字段在 event 上可能是 Extra，也可用 event.dict() / model_extra
    gid = event.group_id          # 数字 id，不是真群号
    role = event.sender.role      # owner / admin / member
    await m.send("收到")          # 自动被动回复
```

群里用户「@机器人 命令」时，默认 `qq.mention_mode: strip` 会裁掉这段 @，`event.message` 只剩后面的文本，`to_me()` 为假。若插件依赖 `to_me()` 或要按消息段切开 at，设 `mention_mode: at`。

自定义 notice：

```python
from nonebot import on_notice

@on_notice()
async def _(bot, event):
    nt = getattr(event, "notice_type", "")
    # group_increase / group_decrease / friend_add / friend_decrease
    # group_msg_reject / group_msg_receive
    # c2c_msg_reject / c2c_msg_receive
    # interaction
```

入群申请：

```python
from nonebot import on_request

@on_request()
async def _(bot, event):
    if getattr(event, "request_type", "") == "group":
        await bot.set_group_add_request(flag=event.flag, approve=True)
```

---

## 发消息

```python
# 被动（推荐，matcher.send 即可）
await matcher.send("收到")

# 强制主动
await bot.call_api("send_group_active_msg", group_id=123456, message="公告")
await bot.call_api("send_private_active_msg", user_id=789, message="提醒")

# 互动召回
await bot.send_private_msg(user_id=uid, message="该交周报了", is_wakeup=True)

# 富媒体
from nonebot.adapters.onebot.v11 import MessageSegment
await matcher.send(MessageSegment.image("/tmp/a.png"))
await matcher.send(MessageSegment("file", {
    "file": "file:///tmp/a.pdf",
    "name": "a.pdf",
}))

# 引用用户指令（文本 / 图片 / markdown 均可）
await matcher.send(MessageSegment.reply(event.message_id) + "收到")
```

引用 + markdown 正文 + 按钮（同一条 `send`；不要在 markdown 前面再加纯文本，引用只挂在第一条已发出的气泡上）：

```python
md = MessageSegment("markdown", {
    "data": {
        "markdown": {"content": "**收到**"},
        "keyboard": {
            "content": {
                "rows": [{
                    "buttons": [{
                        "id": "ok",
                        "render_data": {"label": "确认", "style": 1},
                        "action": {
                            "type": 1,
                            "data": "ok",
                            "permission": {"type": 2},
                        },
                    }]
                }]
            }
        },
    }
})
await matcher.send(MessageSegment.reply(event.message_id) + md)
```

反查 openid：

```python
data = await bot.call_api("get_openid", user_id=event.user_id, group_id=event.group_id)
```

互动回执（框架已自动 code=0，一般可省略）：

```python
await bot.call_api("put_interaction", interaction_id=event.interaction_id, code=0)
```

流式、相册、markdown 键盘：见 [消息段](/protocol/segments)。菜单面板：见 [API-菜单与指令面板](/api/menu)。

---

## 参考插件（仓库外 `src/plugins/`）

若你在完整工作区里，这些示例不随 goqbot 二进制发布：

| 文件 | 内容 |
|---|---|
| `menu_panel_demo.py` | 8 个菜单/面板动作的命令测试 |
| `c2c_stream_demo.py` | 流式 + 唤起相册 |
| `media_upload_demo.py` | 图/视频/语音/文件 |
| `md_keyboard_demo.py` | markdown 按钮 |

---

## 权限

`sender.role` 已是真实 `owner`/`admin`/`member`，可直接：

```python
from nonebot.adapters.onebot.v11.permission import GROUP_ADMIN, GROUP_OWNER
from nonebot.permission import SUPERUSER
```

注意：`user_id` 不是 QQ 号，NoneBot `SUPERUSER` 应填 **self 映射后的数字 id**（启动日志里的 `self_id` 以及私聊事件里的 `user_id`）。
