# 快速开始

## 1. 下载

前往仓库 [Releases](https://github.com/huilongxiji/gd-goqbot-framework/releases) 下载对应平台的可执行文件：

| 平台 | 文件 |
|---|---|
| Linux x86_64 | `goqbot-linux-amd64` |
| Linux ARM64 | `goqbot-linux-arm64` |
| Windows x64 | `goqbot-windows-amd64.exe` |
| Windows ARM64 | `goqbot-windows-arm64.exe` |
| macOS Intel | `goqbot-darwin-amd64` |
| macOS Apple Silicon | `goqbot-darwin-arm64` |

Linux / macOS 下载后赋予执行权限：

```bash
chmod +x goqbot-*
```

也可自行编译：

```bash
GOPROXY=https://goproxy.cn,direct go build -o goqbot .
```

产物为**单个二进制**（约 12MB）。运行时只需：可执行文件 + 同级 `config.yml`（`idmap.db` 首次运行自动创建）。

## 2. 首次运行生成配置

把可执行文件放到一个空目录，直接运行：

```bash
./goqbot
```

- 未指定 `-config` 时，默认读取**可执行文件同级**的 `config.yml`（不受当前工作目录影响）。
- 若文件不存在，会按内置模板生成，提示填写后按回车退出。
- 若已有配置但缺字段，会按模板补齐默认值并写回，提示检查后重启。

编辑生成的 `config.yml`，至少填入：

- `qq.app_id`
- `qq.client_secret`

然后再次启动。

## 3. 最小配置

```yaml
qq:
  app_id: "你的 AppID"
  client_secret: "你的 AppSecret"
  text_intent:
    - "ReadyHandler"
    - "ErrorNotifyHandler"
    - "GroupATMessageEventHandler"
    - "C2CMessageEventHandler"

onebot:
  access_token: ""
  servers:
    # 正向 WS：NoneBot 作为客户端连入本程序
    - ws:
        address: 0.0.0.0:6700
    # 反向 WS：本程序主动连 NoneBot
    - ws-reverse:
        universal: ws://127.0.0.1:8080/onebot/v11/ws
        reconnect-interval: 3000
```

同一条 `servers` 条目里，`ws` 与 `ws-reverse` **不能同时启用**。要同时用正向和反向，写成两条：

```yaml
servers:
  - ws:
      address: 0.0.0.0:6700
  - ws-reverse:
      universal: ws://127.0.0.1:8080/onebot/v11/ws
```

完整字段见 [配置说明](/guide/config)。

## 4. 对接 NoneBot2

### 正向 WS（推荐本地调试）

goqbot 监听 `0.0.0.0:6700`，NoneBot 作为客户端连入。

NoneBot `.env` / 适配器配置指向：

```
ws://127.0.0.1:6700/
```

路由：

| 路径 | 作用 |
|---|---|
| `/` | universal：事件 + 动作合一（NoneBot 默认走这个） |
| `/event` | 仅推送事件 |
| `/api` | 仅接收动作 |

### 反向 WS

goqbot 主动连接 NoneBot 官方 OneBot V11 适配器，例如：

```
ws://127.0.0.1:8080/onebot/v11/ws
```

连接时带请求头：

| Header | 值 |
|---|---|
| `X-Client-Role` | `Universal` / `API` / `Event` |
| `X-Self-ID` | 机器人 `self_id` |
| `Authorization` | `Token <access_token>`（配置了才带） |
| `User-Agent` | `goqbot/0.1.0` |

## 5. 群全量消息（可选）

默认只能收到**群内 @ 机器人**的消息。要收群内全部实时消息：

1. **群主**在手机 QQ 把「机器人可获取的群聊消息范围」设为 **获取群内全部消息**，并开启 **机器人主动在群聊内发言**，点击同意授权。（授权时 QQ 弹出的**快捷授权链接**目前实测仅安卓能打开，iOS / 电脑端可能「加载失败」；但授权开关本身各端都能设置。）
2. 在 `qq.text_intent` 中启用 `GroupMessageEventHandler`。

未 @ 机器人的消息 `to_me()` 为 `False`。

## 6. 启动后日志

日志默认写入可执行文件同级 `logs/goqbot-YYYY-MM-DD.log`。终端示例：

```text
[Info] 2026-06-27 03:15:05 [qq] 机器人: 某某  self_id: 123456
[Info] 2026-06-27 03:15:05 [botgo] Listening connected to gateway
[Info] 2026-06-27 03:15:05 [onebot] 正向 WS 服务器已启动: 0.0.0.0:6700
```

下一步：[配置说明](/guide/config) · [连接协议](/guide/connect) · [NoneBot接入](/guide/nonebot)
