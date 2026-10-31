# API · 素材管理

把图片预先上传为 QQ 官方「素材」，得到一个 `qqbot-media://` 引用链接，之后在 **markdown 消息**里直接引用，不必每次重新上传。

官方限制：

| 项目 | 限制 |
|---|---|
| 格式 | png / jpeg / gif / webp |
| 单张大小 | ≤ 10MB |
| 数量 | 每个机器人最多 100 张 |
| 有效期 | 90 天；每次被消息引用后官方会顺延 |

返回的 `url` **只能在 markdown 中引用**，不能当普通 `image` 段发送：

```markdown
![描述 #800px #400px](qqbot-media://image/v1/xxxxxxxx)
```

`preview_url` 是短时预览链接，**不要持久化**。

---

## 素材对象

`upload_media_image` / `get_media_image` 返回的素材对象（官方列表信息合并本地上传记录）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `image_id` | string | 官方素材 ID |
| `url` | string | `qqbot-media://` 引用链接，用于 markdown |
| `file_name` | string | 官方记录的文件名 |
| `local_names` | string[] | 上传 / 复用时传入过的原始文件名（本地文件名、QQ 下发的 `file_name`）；可能缺省 |
| `sha1` | string | 图片内容 sha1；只有本程序上传过的素材才有 |
| `preview_url` | string | 短时预览链接；可能缺省 |
| `created_at` | int64 | 创建时间（Unix 秒） |
| `expires_at` | int64 | 过期时间（Unix 秒） |
| `cached` | bool | `true`=命中已有素材，本次没有重复上传 |

### 查重与复用

官方接口不返回图片的 md5 / sha1。本程序会把**自己上传过**的素材（内容 sha1、`image_id`、传入过的文件名）记进 idmap 库：

- 再次上传同一内容时，先用官方列表确认旧素材仍在、且剩余有效期超过 1 小时，满足就直接返回旧素材（`cached=true`），**不占新名额**。
- `force=true` 跳过查重，强制重新上传。
- 在本程序之外上传的素材没有本地记录，只能按官方记录的 `file_name` 或 `image_id` 查到。

---

## `upload_media_image`

上传一张素材图片。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `file` | string | ✅ | 图片来源：`base64://` / `file://` / 本地绝对路径 / `http(s)://`（框架先下载再上传） |
| `url` | string | ❌ | `file` 为空时的备用来源 |
| `name` | string | ❌ | 文件名，建议带扩展名；不填时按内容推断 |
| `force` | bool | ❌ | `true`=跳过查重，强制重新上传 |

```json
{"action":"upload_media_image","params":{"file":"file:///data/banner.png","name":"banner.png"}}
```

### 返回 `data`

素材对象。

```json
{
  "status": "ok", "retcode": 0,
  "data": {
    "image_id": "xxxx",
    "url": "qqbot-media://image/v1/xxxx",
    "file_name": "banner.png",
    "local_names": ["banner.png"],
    "sha1": "3f2a...",
    "created_at": 1793430000,
    "expires_at": 1801206000,
    "cached": false
  }
}
```

NoneBot：

```python
r = await bot.call_api("upload_media_image", file="file:///data/banner.png", name="banner.png")
md = MessageSegment("markdown", {"data": {"markdown": {"content": f"![横幅 #800px #400px]({r['url']})"}}})
await matcher.send(md)
```

### 失败

| retcode | message |
|---|---|
| 1400 | `缺少或无法读取 file（支持 base64://、file://、本地绝对路径、http(s)）` |
| 1404 | `发送通道未就绪（QQ 连接尚未初始化）` |
| 1500 | 格式不支持（`素材图片仅支持 png/jpeg/gif/webp`）、超过 10MB、官方上传失败原文等 |

---

## `get_media_image`

查询某张素材是否已上传且仍然有效。

### 请求 `params`

`image_id` / `sha1` / `file_name` **至少填一个**；同时填写时需全部满足。

| 字段 | 类型 | 说明 |
|---|---|---|
| `image_id` | string | 官方素材 ID |
| `sha1` | string | 图片内容 sha1（hex） |
| `file_name` | string | 本地文件名（传路径时取文件名部分）、QQ 下发的原始文件名（入站图片段的 `file_name`），或入站图片段的 `file`（`<md5>.image`） |

```json
{"action":"get_media_image","params":{"file_name":"banner.png"}}
```

### 返回 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `found` | bool | 是否找到 |
| `images` | 素材对象[] | 匹配的素材；以官方列表为准，已删除或已过期的不会返回 |

```json
{"status":"ok","retcode":0,"data":{"found":true,"images":[{"image_id":"xxxx","url":"qqbot-media://image/v1/xxxx","file_name":"banner.png","cached":false}]}}
```

缺少全部查询条件时返回 `1400 缺少查询条件（image_id / sha1 / file_name 至少一个）`。

---

## `get_media_images`

分页列出当前有效的素材，按创建时间倒序。

### 请求 `params`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `cursor` | string | ❌ | 翻页游标，首页不填；下一页填上一页返回的 `next_cursor` |

### 返回 `data`

| 字段 | 类型 | 说明 |
|---|---|---|
| `images` | object[] | 官方素材列表，字段为 `image_id` / `url` / `file_name` / `preview_url` / `created_at` / `expires_at` |
| `next_cursor` | string | 下一页游标；为空表示已是最后一页 |
| `total` | int64 | 素材总数 |

```json
{"action":"get_media_images","params":{}}
```

---

## `delete_media_image`

删除一张素材，释放名额。已经发出的消息不受影响；本程序的本地上传记录会一并清理。

### 请求 `params`

| 字段 | 类型 | 必填 |
|---|---|---|
| `image_id` | string | ✅ |

```json
{"action":"delete_media_image","params":{"image_id":"xxxx"}}
```

成功返回 `data={}`；缺少 `image_id` 返回 `1400 缺少 image_id`。
