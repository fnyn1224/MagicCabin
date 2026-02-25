# 🪄 MagicCabin (魔法小屋)

**MagicCabin** 是一个运行在 Cloudflare Workers 边缘网络上的超轻量级、带音效提醒的匿名聊天室。无需传统服务器，利用 Cloudflare KV 实现数据持久化，几分钟即可完成全球部署。

---

## ✨ 项目亮点

- **边缘计算**：基于 Cloudflare Workers，全球访问延迟极低。
- **魔法音效**：内置精心挑选的魔法波纹音效，新消息到达时自动提醒。
- **安全保障**：支持自定义通关暗号（密码），保护私密聊空间。
- **极简管理**：支持单条咒语删除及一键清空记录。
- **自适应布局**：完美适配手机与电脑端，支持夜间模式感官。
- **免维护**：无需管理数据库，利用 KV 存储 50 条最近通话记录。

---

## 🚀 部署步骤

### 1. 创建 KV 命名空间
1. 登录 Cloudflare 控制台。
2. 进入 **Workers & Pages** -> **KV**。
3. 点击 **Create a namespace**，命名为 `CHAT_KV`。

### 2. 创建 Worker
1. 进入 **Workers & Pages** -> **Overview** -> **Create application**。
2. 创建一个新 Worker，命名为 `magic-cabin`。
3. 点击 **Edit Code**，将本项目中的 `index.js` 代码全部替换进去并 **Save and Deploy**。

### 3. 绑定变量 (关键)
1. 在 Worker 详情页点击 **Settings** -> **Variables**。
2. **Environment Variables**：添加 `CHAT_PASSWORD`，值设为你的进入密码。
3. **KV Namespace Bindings**：添加绑定。
   - **Variable name**: 必须填 `CHAT_KV`
   - **KV namespace**: 选择你第一步创建的空间。
4. 重新部署一次以生效。

---

## 🛠️ 技术细节

- **后端**: Cloudflare Workers (Runtime)
- **数据库**: Cloudflare KV (Key-Value Storage)
- **前端**: Tailwind CSS, Font Awesome, Vanilla JS
- **频率**: 2秒轮询自动同步，发送消息即刻刷新。

---

## 📖 使用提示

- **激活音效**：受浏览器安全策略限制，首次进入请点击页面上的 **小喇叭** 图标激活音频权限，否则无法自动播放提醒音。
- **提醒说明**：只有当页面处于后台或息屏状态时，才会触发铃声和标题闪烁，避免干扰前台对话。

---

## ⚖️ 开源协议

本项目基于 **MIT License** 开源。

---

**如果这个项目对你有帮助，欢迎点一个 🌟 Star！**
