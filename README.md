# 🏡 MagicCabin

> A lightweight anonymous chat room powered by **Cloudflare Workers + KV**

MagicCabin 是一个 **极简、可自部署的匿名聊天室**，无需服务器，仅依赖 Cloudflare Workers 和 KV 即可运行。

适合：

* 私人聊天室
* 家庭留言板
* 小团队交流
* Serverless 示例项目

---

## 📊 Project Status

![GitHub stars](https://img.shields.io/github/stars/fnyn1224/MagicCabin?style=social)
![License](https://img.shields.io/github/license/fnyn1224/MagicCabin)
![Cloudflare Workers](https://img.shields.io/badge/runtime-cloudflare%20workers-orange)
![Storage](https://img.shields.io/badge/storage-cloudflare%20kv-blue)

---

## ✨ Features

* ⚡ **Serverless** — 基于 Cloudflare Workers
* 💾 **KV Storage** — 聊天记录存储在 Cloudflare KV
* 🔒 **Password Protected** — 使用密码进入聊天室
* 🏷 **Message Tags** — 消息支持标签
* ✏️ **Edit Tag** — 可以修改消息标签
* 🗑 **Delete Messages** — 删除单条消息
* 🧹 **Clear Chat** — 一键清空聊天
* 📱 **Mobile Friendly** — 移动端适配
* 🔔 **Notification Support** — 声音 + 标题提醒
* 🚀 **One Command Deploy**

---

## 🧱 Tech Stack

| Component   | Technology         |
| ----------- | ------------------ |
| Runtime     | Cloudflare Workers |
| Storage     | Cloudflare KV      |
| Frontend    | Vanilla JS         |
| Deploy Tool | Wrangler           |

---

# 🚀 Quick Start

## 1 Clone Repo

```bash id="i0ivpo"
git clone https://github.com/fnyn1224/MagicCabin.git
cd MagicCabin
```

---

## 2 Create KV Namespace

在 Cloudflare Dashboard 创建 KV。

推荐名称：

```id="s9ivz6"
CHAT_KV
```

记录 Namespace ID。

---

## 3 Configure wrangler.toml

```toml id="oy1xyo"
name = "magic-cabin"
main = "index.js"
compatibility_date = "2026-02-25"

[[kv_namespaces]]
binding = "CHAT_KV"
id = "你的KV Namespace ID"

[vars]
CHAT_PASSWORD = "你的聊天室密码"
```

---

## 4 Login Cloudflare

```bash id="gb3fa1"
npx wrangler login
```

---

## 5 Deploy

```bash id="44rkbi"
npx wrangler deploy
```

部署成功后会得到：

```id="v49o3j"
https://magic-cabin.xxx.workers.dev
```

---

# 🔐 Authentication

所有 API 需要在 Header 中携带：

```id="r6m5y6"
Authorization: YOUR_PASSWORD
```

密码来源：

```id="b3u3y3"
CHAT_PASSWORD
```

---

# 🧩 API

## Get Messages

```id="86db2x"
GET /api/messages
```

返回当前聊天记录。

---

## Send Message

```id="8nax5u"
POST /api/send
Content-Type: application/json
```

Example:

```json id="k3c2st"
{
  "nick": "Wizard",
  "text": "Welcome to MagicCabin",
  "tag": "system"
}
```

---

## Update Tag

```id="2a3b4f"
POST /api/update-tag
```

Example:

```json id="92t48c"
{
  "id": "m-xxx",
  "tag": "important"
}
```

---

## Delete Message

```id="k8m3pr"
POST /api/delete
```

---

## Clear Chat

```id="o2e9u1"
POST /api/clear
```

---

# 🗄 Data Structure

```json id="w1mbot"
{
  "id": "m-1700000000-abc",
  "nick": "nickname",
  "text": "message",
  "tag": "tag",
  "timestamp": 1700000000000
}
```

系统默认保留最近 **100 条消息**。

---

# 📌 Use Cases

MagicCabin 适合：

* 私人聊天室
* 小团队沟通
* 家庭留言板
* Serverless Demo
* 临时讨论房间

---

# ⚠️ Limitations

该项目定位为 **轻量聊天工具**：

* 不适合高并发
* 不适合大型聊天室
* 不适合高安全通信

如果需要扩展：

* WebSocket 实时推送
* 用户系统
* 多聊天室
* 消息搜索
* 管理后台

---

# 🛠 Roadmap

未来可能增加：

* [ ] 多房间支持
* [ ] SSE 实时推送
* [ ] 消息搜索
* [ ] 管理后台
* [ ] 聊天记录导出

---

# 📄 License

MIT License

---

⭐ If you like this project, please give it a star.
