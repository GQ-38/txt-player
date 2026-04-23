# 避风港书屋（可上线全栈版）

这是一个 React + Express + Supabase 的前后端一体化阅读应用，支持书架、阅读进度、划线、反馈、头像/封面上传，以及邮箱/手机号登录能力。

## 这次升级了什么

- 前端路由从 `MemoryRouter` 改为 `BrowserRouter`，适合真实部署
- 后端新增安全中间件：`helmet`、`cors`、`express-rate-limit`
- 登录体系升级为：
  - 邮箱 + 密码
  - 邮箱 + 验证码（依赖 Supabase 邮件 OTP 配置）
  - 手机号 + 验证码（依赖 Supabase 短信 OTP 配置）
  - 手机号 + 密码（若你的 Supabase Auth 已启用 phone/password）
- 会话支持 `refresh token` 自动续期
- 头像、书籍封面上传改为 Supabase Storage，不再把大图片直接塞进数据库
- 数据库增加索引、RLS、字段补充，更接近生产环境
- 后端新增健康检查：`/api/health`

## 技术栈

- 前端：React + Vite + TypeScript
- 后端：Express + TypeScript
- 数据库与认证：Supabase（Postgres + Auth + Storage）

## 启动前准备

### 1. 创建 Supabase 项目

在 Supabase 控制台创建项目后，拿到：

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. 初始化数据库

把 `supabase-schema.sql` 整体执行到 Supabase SQL Editor。

### 3. 配置 Auth

在 Supabase 控制台启用你需要的认证方式：

- 邮箱密码登录
- 邮箱 OTP 登录（Email OTP）
- 手机短信 OTP 登录（需要配置短信服务商）

> 注意：手机号验证码登录是否可用，不取决于本地代码，而取决于你的 Supabase 项目是否已经配置短信通道。

### 4. 配置环境变量

复制 `.env.example` 为 `.env`：

```env
VITE_API_PROXY_TARGET=http://localhost:4000
APP_ORIGIN=http://localhost:3000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
PORT=4000
```

## 本地开发

安装依赖：

```bash
npm install
```

启动后端：

```bash
npm run dev:server
```

启动前端：

```bash
npm run dev
```

## 生产部署建议

### 方案 A：前后端分离

- 前端部署到 Vercel / Netlify
- 后端部署到 Render / Railway / Fly.io
- Supabase 负责数据库、认证、对象存储

### 方案 B：单服务部署

- 先构建前端 `npm run build`
- 再运行 Node 服务 `npm run start`
- Express 会托管 `dist/` 静态资源

## 主要接口

### 认证

- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/request-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

### 业务

- `GET/POST/PATCH/DELETE /api/books`
- `GET/POST/DELETE /api/highlights`
- `GET/POST /api/feedbacks`
- `PATCH /api/profile`
- `POST /api/uploads/image`
- `GET /api/health`

## 还没有纳入这次版本的点

下面这些方向是合理的，但这次没有一起做进去：

- 后端解析 EPUB
- 管理后台回复反馈
- 多端推送通知
- 完整审计日志
- 灰度发布与监控告警

如果要继续往正式商用推进，下一步最值得补的是：管理后台、后端 TXT/EPUB 文件处理、对象存储签名 URL、日志与监控。
