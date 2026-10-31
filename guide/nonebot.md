# NoneBot2 接入

goqbot 的 QQ 特有消息段（markdown、按钮、流式、图文卡片等）以 **NoneBot2 + onebot v11 消息段写法**为参考设计，本页示例均以 NoneBot2 为准。NoneBot 与 AstrBot、MaiBot 等框架同时接入同一个 goqbot 的方法见 [接入概览](/guide/multi-framework)，AstrBot / MaiBot 的步骤见 [AstrBot 接入](/guide/astrbot)、[MaiBot 接入](/guide/maibot)。

---

## 准备工作

### 1. 准备好 goqbot

按 [快速开始](/guide/start) 下载 goqbot、填好 `qq.app_id` / `qq.client_secret`，确认能正常启动（日志出现 `goqbot x.y.z 已启动，等待连接...`）。

### 2. 准备 NoneBot2 项目

已有项目可跳过。没有的话用 nb-cli 新建：

```bash
pipx install nb-cli        # 或 pip install nb-cli
nb create                  # 按提示创建项目，适配器选 OneBot V11
```

已有项目补装 OneBot V11 适配器：

```bash
nb adapter install nonebot-adapter-onebot
```

### 3. 选择连接方式

| | 正向 WebSocket | 反向 WebSocket（推荐） |
|---|---|---|
| 谁是服务端 | goqbot 监听端口 | NoneBot 监听端口 |
| 谁主动连接 | NoneBot 连 goqbot | goqbot 连 NoneBot |
| NoneBot 需要的驱动器 | 客户端型（`~websockets` / `~aiohttp`） | 服务端型（`~fastapi`，nb-cli 新建项目时通常已选上） |
| 适合 | NoneBot 不方便开端口时 | 多个框架共用一个 goqbot（见 [接入概览](/guide/multi-framework)） |

两种方式**选一种**即可。下面两节都分「goqbot 侧」和「NoneBot 侧」，两边都要配。

::: tip access_token
两种方式都建议设置访问令牌。goqbot 的 `onebot.access_token` 和 NoneBot 的 `ONEBOT_ACCESS_TOKEN` 必须**完全一致**；都不设则不鉴权。
:::

---

## 反向 WebSocket（推荐）

goqbot 作为客户端，主动连 NoneBot 的 OneBot V11 适配器。NoneBot 的反向 WS 地址默认是 `ws://<HOST>:<PORT>/onebot/v11/ws`。

### NoneBot 侧

项目根目录的 `.env`（或 `.env.prod` / `.env.dev`）：

```dotenv
DRIVER=~fastapi
HOST=127.0.0.1
PORT=8080
ONEBOT_ACCESS_TOKEN=your-token
```

- `HOST` / `PORT`：NoneBot 监听的地址和端口。goqbot 与 NoneBot 不在同一台机器（或在容器里）时，`HOST` 改为 `0.0.0.0`。
- `DRIVER` 必须包含服务端型驱动器（`~fastapi`），否则 NoneBot 不会开启反向 WS 服务。

启动 NoneBot：

```bash
nb run
```

日志里出现 `Uvicorn running on http://127.0.0.1:8080` 即表示已在监听。

### goqbot 侧

`config.yml`：

```yaml
onebot:
  access_token: "your-token"          # 与 NoneBot 的 ONEBOT_ACCESS_TOKEN 一致
  servers:
    - ws-reverse:
        universal: ws://127.0.0.1:8080/onebot/v11/ws
        reconnect-interval: 3000      # 断线重连间隔（毫秒）
```

- `universal` 的主机和端口对应 NoneBot 的 `HOST` / `PORT`，路径固定 `/onebot/v11/ws`。
- 只需要 `universal` 一条（收发合一），不用另配 `api` / `event`。
- 启动顺序不限：NoneBot 还没起来时，goqbot 会按 `reconnect-interval` 不断重试。

### 确认连接成功

| 位置 | 日志 |
|---|---|
| goqbot | `[onebot] 反向 WS 连接成功 Universal -> ws://127.0.0.1:8080/onebot/v11/ws` |
| NoneBot | OneBot V11 适配器打印 `Bot <self_id> connected` |

`<self_id>` 是 goqbot 的机器人 ID（`qq.use_uin` 决定用 uin 还是 app_id），不是真实 QQ 号。

---

## 正向 WebSocket

goqbot 作为服务端监听端口，NoneBot 作为客户端连过来。

### goqbot 侧

`config.yml`：

```yaml
onebot:
  access_token: "your-token"
  servers:
    - ws:
        address: 0.0.0.0:6700         # 只给本机连可改为 127.0.0.1:6700
```

启动后日志出现 `[onebot] 正向 WS 服务器已启动: 0.0.0.0:6700`。

goqbot 提供 `/`（收发合一）、`/event`、`/api` 三个路径，NoneBot 连 `/` 即可，见 [连接协议](/guide/connect)。

### NoneBot 侧

`.env`：

```dotenv
DRIVER=~fastapi+~websockets
ONEBOT_WS_URLS=["ws://127.0.0.1:6700"]
ONEBOT_ACCESS_TOKEN=your-token
```

- `DRIVER` 必须包含客户端型驱动器（`~websockets` 或 `~aiohttp`），用 `+` 和已有驱动器组合。没装的话先安装：

  ```bash
  nb driver install websockets
  ```

- `ONEBOT_WS_URLS` 是 JSON 数组，可同时连多个协议端。goqbot 不在本机时，把 `127.0.0.1` 换成 goqbot 所在机器的 IP。

启动 NoneBot：

```bash
nb run
```

### 确认连接成功

| 位置 | 日志 |
|---|---|
| goqbot | `[onebot] 正向 WS 连接成功: ...` |
| NoneBot | OneBot V11 适配器打印 `Bot <self_id> connected` |

---

连不上或收发异常，见本页末尾的 [错误排查](#错误排查)。

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

---

## 错误排查

### 先打开调试输出

| 位置 | 怎么开 | 能看到什么 |
|---|---|---|
| goqbot | `config.yml` 中 `onebot.debug: true` | 每个动作的接口、参数、结果和耗时；每次发送用了哪种凭证（被动 / 主动 / 引用） |
| goqbot | 日志文件，默认可执行文件同级 `logs/goqbot-YYYY-MM-DD.log` | 与终端相同的内容，纯文本 |
| NoneBot | `.env` 中 `LOG_LEVEL=DEBUG` | 收到的事件、调用的动作和返回 |

NoneBot 里动作失败会抛 `ActionFailed`，`e.info` 里有 goqbot 返回的 `retcode` 和 `message`，排查时先看这两项：

```python
from nonebot.adapters.onebot.v11 import ActionFailed

try:
    await bot.send_group_msg(group_id=gid, message="hi")
except ActionFailed as e:
    logger.warning(f"retcode={e.info.get('retcode')} message={e.info.get('message')}")
```

### 连接问题

| 现象 | 原因与处理 |
|---|---|
| goqbot 反复打印反向连接失败、`connection refused` | NoneBot 没启动，或 `HOST` / `PORT` 与 `universal` 不一致；`HOST=127.0.0.1` 时其他机器 / 容器连不进来，改成 `0.0.0.0` |
| 握手被拒（401 / 403） | 两边令牌不一致。检查 goqbot `onebot.access_token` 与 NoneBot `ONEBOT_ACCESS_TOKEN`，注意多余的空格和引号 |
| 反向连接 404 | `universal` 路径写错，应为 `/onebot/v11/ws` |
| 正向模式下 NoneBot 没有任何连接动作 | `DRIVER` 里缺客户端型驱动器（`~websockets` / `~aiohttp`），或 `ONEBOT_WS_URLS` 不是合法 JSON 数组 |
| NoneBot 显示已连接，但 QQ 上完全没反应 | goqbot 自己没连上 QQ：goqbot 日志里应有 `[qq] ====== QQ 连接成功 ======`；没有的话检查 `app_id` / `client_secret`，以及 `qq.disabled` 是否为 `true` |
| goqbot 日志出现 `11298` | 本机公网 IP 没加入 QQ 开放平台的 IP 白名单。加白名单后按 `qq.ip_reject_action`（stop / retry / exit）的策略恢复，见 [配置说明](/guide/config) |

### 收不到消息

| 现象 | 原因与处理 |
|---|---|
| 群里只有 @机器人 的消息能收到 | 默认只订阅群 @ 消息。要收全部群消息，在 `qq.text_intent` 加 `GroupMessageEventHandler`，并请群主在手机 QQ 群设置里开启「获取群内全部消息」 |
| 收不到私聊消息 | `qq.text_intent` 里没有 `C2CMessageEventHandler` |
| 收不到入群、好友、按钮点击等通知 | 对应 handler 没开（如 `GroupMemberEventHandler`、`C2CFriendEventHandler`、`InteractionHandler`），见 [配置说明](/guide/config) |
| @机器人 不触发 `to_me()`，或 `event.message` 为空 | 默认 `qq.mention_mode: strip` 会删掉 @。改为 `mention_mode: at`，@机器人 会以 at 段（`qq=self_id`）下发 |
| 修改 `text_intent` 后没生效 | intent 在建立 QQ 连接时确定，改完需要重启 goqbot |

### 发送失败（按 retcode 查）

| retcode | message（节选） | 原因与处理 |
|---|---|---|
| `1400` | `未知 group_id（尚未收到该群消息）` / `未知 user_id（尚未收到该用户消息）` | ID 是由收到的消息映射出来的。该群 / 用户必须先给机器人发过消息，goqbot 才能反查到 openid |
| `1400` | `空消息` | 消息解析后没有可发送的内容：比如只有一个不合规的 `share` / `card` 段被丢弃了，或 at 的对象反查不到 |
| `1400` | `流式续帧(index>=1)必须在 stream 段带上首帧返回的 stream_id` | 续帧要把首帧返回的 `stream_id` 填进 `stream.id` |
| `1400` | `is_wakeup 与 passive_only 互斥` | 两个参数不能同时传 |
| `1404` | `QQ 发送通道未就绪` / `发送通道未就绪（QQ 连接尚未初始化）` | goqbot 还没连上 QQ（刚启动、断线重连中、`qq.disabled: true`） |
| `1404` | `消息不存在或未缓存` | `delete_msg` / `get_msg` 只能处理 goqbot 分配过、且仍在缓存里的 `message_id`；`idmap.disabled: true` 时重启后全部失效 |
| `1404` | `unsupported action: xxx` | goqbot 没有实现这个动作，见 [API 动作总览](/api/overview) |
| `1460` | `无可用被动凭证（passive_only=true，未降级为主动消息）` | 带了 `passive_only=true` 但没有可用被动凭证，按需改调 `send_*_active_msg`，见 [API-发送消息](/api/send#passive-only-仅被动) |
| `1500` | QQ 原始错误文案 | QQ 接口返回的错误，下表列出常见情况 |

`1500` 常见原因：

| QQ 返回 | 原因与处理 |
|---|---|
| `40034005` 已过期 | 被动凭证过期（群 5 分钟、单聊 60 分钟），或拿机器人自己发的消息当被动凭证。正常 `matcher.send` 不会遇到；手动传 `msg_id` / 引用旧消息时注意时效 |
| 回复次数超限 | 同一条消息群里最多被动回复 5 次、单聊 4 次。多个框架共用一个 goqbot 时额度是共用的 |
| 主动消息失败 / 频控 | 群主没开启「机器人在群聊内发言」，或超过主动频控（60 条/分钟，未认证 30；单群每天 1000 条）；私聊对方关闭了推送（可用 `get_c2c_msg_state` 查询） |
| `11253` | 白名单接口（`get_group_info`、`get_group_member_list` 等）需要向平台申请，见 [API-群聊管理](/api/group) |
| markdown 消息发送失败 | goqbot 发 markdown 固定带 `force_verify_image_resource=true`：正文里的图片转存失败，整条消息就不发出。检查图片链接能否公网访问，或改用 [素材](/api/media) 的 `qqbot-media://` 链接 |

### 其他常见问题

| 现象 | 原因与处理 |
|---|---|
| 发大文件时 NoneBot 报超时，但消息最后其实发出去了 | goqbot 会按文件体积放宽发送超时（最长 30 分钟），NoneBot 默认 `API_TIMEOUT=30` 秒先超时了。发大文件时在 `.env` 调大 `API_TIMEOUT` |
| 引用了消息，但 QQ 里没显示引用气泡 | 被引用的消息不在 goqbot 缓存里（日志会提示「未命中本机缓存」），或缺少引用索引（REFIDX），此时只发正文 |
| 图文卡片没发出去 | `share` / `card` 段的 `title` 须 1–50 字、`url` 与 `pic_url` 必须是 `https://`；不合规会整段丢弃，goqbot 日志里有原因 |
| 群里的流式消息变成了普通消息 | 流式只支持单聊；群里的 `stream` 段会被忽略，按普通消息发送 |
| `SUPERUSERS` 不生效 | `user_id` 不是 QQ 号。`SUPERUSERS` 要填 goqbot 映射出的数字 ID，可从私聊事件的 `user_id` 获取（同一个人在群聊里的 ID 不同） |
| 和其他框架同时接入后回复变少或失败 | 多个框架共用被动额度和主动频控，见 [接入概览 · 共存须知](/guide/multi-framework#共存须知) |

