# API · 自定义菜单与指令面板

对应 QQ 官方 [自定义菜单与指令面板](https://bot.q.qq.com/wiki/develop/api-v2/server-inter/menu-panel/)。本程序把 8 个 REST 接口映射为 OneBot 动作，`params` 字段名与官方 JSON **一致**（snake_case）。

| 能力 | 场景 | 说明 |
|---|---|---|
| 自定义菜单 | **仅单聊窗口底部** | 全局一份，对所有 C2C 用户生效 |
| 指令面板 | c2c / group / channel / dm | 可 `all` 全量或 `specific` 指定用户/群 |

写操作会整体覆盖。`set_menu` 官方频控约 **5 QPM**，请勿频繁调用。

NoneBot 测试插件参考仓库外的 `src/plugins/menu_panel_demo.py`（命令：`菜单帮助` / `查菜单` / `设置菜单` 等）。

---

## 数据结构

### 菜单项 `MenuItem`

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 按钮名称，最多 10 字符（1 汉字算 2） |
| `type` | string | `switch` / `send_message` / `link` / `menu` |
| `send_message` | string | `type=send_message`：填入输入框的内容 |
| `link` | string | `type=link`：跳转地址，必须 `https://` |
| `switch` | object | `type=switch` 时 |
| `switch.switch_id` | string | 开关唯一 id；切换后消息 ext 带 `"<switch_id>=1"` |
| `switch.default` | bool | 初始是否打开 |
| `sub_menu_items` | array | `type=menu` 的二级项，最多 5 个 |

一级最多 **10** 个。二级 `SubMenuItem` **不支持**再嵌套，也**不支持** `menu` / `switch`，只有 `send_message` / `link`。二级 `name` 最多 14 字符。

### 指令面板元素 `PanelItem`

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 最多 14 字符（约 7 汉字） |
| `desc` | string | 描述，最多 30 字符 |
| `type` | string | `command`（指令）/ `link` |
| `only_admin` | bool | 是否仅管理员可点 |
| `link` | string | `type=link`，必须 `https://` |

一个面板最多 **20** 个元素。`panel.remark` 开发者备注最多 255 字符，不对用户展示。

### 面板范围 `scope`

| 值 | 场景 | `target_type=specific` |
|---|---|---|
| `c2c` | 单聊 | ✅ 用 `user_openids` |
| `group` | 群聊 | ✅ 用 `group_openids` |
| `channel` | 文字子频道 | ❌ 只能 `all` |
| `dm` | 频道私信 | ❌ 只能 `all` |

`specific` 一次最多关联 **20** 个 openid。

---

## `get_menu`

查询当前全局自定义菜单。

### 请求

无参数。

```json
{"action":"get_menu","params":{}}
```

### 成功 `data`

官方 `MenuGetResp` 原样映射：

| 字段 | 类型 | 说明 |
|---|---|---|
| `version` | int | 当前版本号 |
| `menu` | object / null | 菜单配置 |
| `menu.items` | MenuItem[] | 菜单项 |
| `menu.version` | int | 可能与外层 version 同时存在 |

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "version": 3,
    "menu": {
      "version": 3,
      "items": [
        {"type": "send_message", "name": "帮助", "send_message": "/help"},
        {"type": "link", "name": "官网", "link": "https://example.com"}
      ]
    }
  }
}
```

未设置过菜单时 `menu` 可能为 `null`。

### 失败

| retcode | 说明 |
|---|---|
| 1404 | 发送通道未就绪 |
| 1500 | QQ 错误原文 |

---

## `set_menu`

**整体覆盖**全局菜单。

### 请求 `params`

两种写法等价：

**推荐（与官方一致）：**

```json
{
  "action": "set_menu",
  "params": {
    "menu": {
      "items": [
        {"type": "send_message", "name": "帮助", "send_message": "/help"},
        {"type": "link", "name": "官网", "link": "https://example.com"},
        {
          "type": "switch",
          "name": "搜索",
          "switch": {"switch_id": "search", "default": false}
        },
        {
          "type": "menu",
          "name": "更多",
          "sub_menu_items": [
            {"type": "send_message", "name": "设置", "send_message": "/settings"},
            {"type": "link", "name": "文档", "link": "https://example.com/docs"}
          ]
        }
      ]
    }
  }
}
```

**兼容：** 顶层直接传 `items` 数组（`params.items`），框架会填进 `menu.items`。

| 字段 | 必填 | 说明 |
|---|---|---|
| `menu.items` 或 `items` | ✅ | 至少 1 项 |

### 成功 `data`

```json
{"status":"ok","retcode":0,"data":{"version":4}}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `version` | int | 覆盖后的新版本号 |

### 失败

| retcode | message |
|---|---|
| 1400 | `参数解析失败: ...` |
| 1400 | `缺少 menu.items` |
| 1500 | 频控 / 校验失败等 |

```python
await bot.call_api("set_menu", menu={"items": [
    {"type": "send_message", "name": "帮助", "send_message": "/help"},
]})
```

---

## `get_command_panels`

按场景分页列出指令面板。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `scope` | string | ✅ | `c2c` / `group` / `channel` / `dm` |
| `limit` | int | ❌ | 每页条数 |
| `cursor` | string | ❌ | 上一页的 `next_cursor` |

```json
{"action":"get_command_panels","params":{"scope":"group","limit":20}}
```

### 成功 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `records` | PanelDetail[] | 见下方详情结构 |
| `next_cursor` | string | 下一页游标 |
| `is_end` | bool | 是否最后一页 |

---

## `get_command_panel`

查询单个面板详情。

### 请求 `params`

| 字段 | 类型 | 必填 |
|---|---|---|
| `panel_id` | string | ✅ |

### 成功 `data`（`PanelDetail`）

| 字段 | 类型 | 说明 |
|---|---|---|
| `panel_id` | string | — |
| `scope` | string | `c2c` / `group` / `channel` / `dm` |
| `target_type` | string | `all` / `specific` |
| `panel` | object | `{items, remark, version}` |
| `created_at` | string | — |
| `updated_at` | string | — |
| `version` | int | — |
| `user_openids` | string[] | specific + c2c 时的关联用户 |
| `group_openids` | string[] | specific + group 时的关联群 |

```json
{
  "status": "ok",
  "retcode": 0,
  "data": {
    "panel_id": "p_xxx",
    "scope": "group",
    "target_type": "all",
    "created_at": "2026-08-01T00:00:00+08:00",
    "updated_at": "2026-08-01T00:00:00+08:00",
    "version": 1,
    "user_openids": [],
    "group_openids": [],
    "panel": {
      "remark": "默认面板",
      "version": 1,
      "items": [
        {"type": "command", "name": "查询天气", "desc": "查询当前天气", "only_admin": false}
      ]
    }
  }
}
```

### 失败

| retcode | message |
|---|---|
| 1400 | `缺少 panel_id` |
| 1500 | 面板不存在等 |

---

## `create_command_panel`

创建指令面板。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `scope` | string | ✅ | `c2c` / `group` / `channel` / `dm` |
| `target_type` | string | ❌ | `all`（默认）/ `specific` |
| `user_openids` | string[] | specific+c2c | QQ **openid**，不是数字 id |
| `group_openids` | string[] | specific+group | 同上 |
| `panel` | object | ✅ | 面板内容 |
| `panel.items` | PanelItem[] | ✅ | 至少 1 项 |
| `panel.remark` | string | ❌ | 备注 |

> 关联对象只认 openid。若只有 OneBot 数字 id，先调 `get_openid`。

```json
{
  "action": "create_command_panel",
  "params": {
    "scope": "group",
    "target_type": "specific",
    "group_openids": ["E2XXXX"],
    "panel": {
      "remark": "测试面板",
      "items": [
        {"type": "command", "name": "查询天气", "desc": "查询当前天气"},
        {"type": "link", "name": "更多服务", "desc": "打开官网", "link": "https://example.com"}
      ]
    }
  }
}
```

### 成功 `data`

```json
{"status":"ok","retcode":0,"data":{"panel_id":"p_xxx"}}
```

### 失败

| retcode | message |
|---|---|
| 1400 | `缺少 scope（c2c/group/channel/dm）` |
| 1400 | `缺少 panel.items` |
| 1400 | `参数解析失败: ...` |
| 1500 | 官方校验失败（如 channel 用了 specific） |

```python
oid = (await bot.call_api("get_openid", group_id=event.group_id))["group_openid"]
ret = await bot.call_api(
    "create_command_panel",
    scope="group",
    target_type="specific",
    group_openids=[oid],
    panel={"remark": "nb", "items": [
        {"type": "command", "name": "查询天气", "desc": "查询当前天气"},
    ]},
)
print(ret["panel_id"])
```

---

## `set_command_panel`

**整体覆盖**已有面板内容（不改 scope / 关联对象）。

### 请求 `params`

| 字段 | 类型 | 必填 |
|---|---|---|
| `panel_id` | string | ✅ |
| `panel.items` | array | ✅ |
| `panel.remark` | string | ❌ |

```json
{
  "action": "set_command_panel",
  "params": {
    "panel_id": "p_xxx",
    "panel": {
      "remark": "已修改",
      "items": [
        {"type": "command", "name": "新指令", "desc": "更新后的指令", "only_admin": true}
      ]
    }
  }
}
```

### 成功 `data`

```json
{"status":"ok","retcode":0,"data":{"version":2}}
```

### 失败

| retcode | message |
|---|---|
| 1400 | `缺少 panel_id` / `缺少 panel.items` |
| 1500 | 面板不存在等 |

---

## `delete_command_panel`

删除面板，不可恢复。

### 请求 `params`

| 字段 | 类型 | 必填 |
|---|---|---|
| `panel_id` | string | ✅ |

### 成功 `data`

`{}`

### 失败

| retcode | message |
|---|---|
| 1400 | `缺少 panel_id` |
| 1500 | 删除失败 |

---

## `set_command_panel_target`

修改 **specific** 面板的关联对象。`all` 面板调用会失败。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `panel_id` | string | ✅ | — |
| `op` | string | ✅ | `add` 增加 / `del` 移除 |
| `user_openids` | string[] | 与 group 至少一个 | c2c 场景 |
| `group_openids` | string[] | 与 user 至少一个 | group 场景 |

```json
{
  "action": "set_command_panel_target",
  "params": {
    "panel_id": "p_xxx",
    "op": "add",
    "group_openids": ["E2XXXX"]
  }
}
```

### 成功 `data`

`{}`

### 失败

| retcode | message |
|---|---|
| 1400 | `缺少 panel_id` |
| 1400 | `缺少 op（add/del）` |
| 1400 | `缺少 user_openids 或 group_openids` |
| 1500 | 非 specific 面板、openid 非法等 |
