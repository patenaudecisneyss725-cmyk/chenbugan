# 辣妹国内商城 - 微信支付平台

一个简单的 H5 支付平台，支持多个微信收款码轮播，20 分钟自动过期。

## 功能特点

- ✅ 用户填写收件信息（姓名、地址、手机）
- ✅ 自动生成独立订单号
- ✅ 支持 2-3 个收款码轮播显示
- ✅ 二维码 20 分钟自动过期提示
- ✅ 后台订单管理
- ✅ 订单数据导出 CSV
- ✅ 后台上传/删除收款码

## 本地运行

### 1. 安装依赖

```bash
cd wechat-pay-platform
npm install
```

### 2. 启动服务

```bash
npm start
```

服务启动后：
- **用户页面**: http://localhost:3000/user/
- **后台管理**: http://localhost:3000/admin/

## 部署到云端

### 方案 A: Railway (推荐，简单)

1. 访问 https://railway.app
2. 注册/登录账号
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 连接你的 GitHub 仓库（或上传代码）
5. Railway 会自动识别 Node.js 项目并部署
6. 在 Settings 中设置环境变量（如需要）
7. 获取部署后的域名

### 方案 B: 腾讯云/阿里云服务器

1. 购买服务器（入门配置即可，约 60-100 元/月）
2. 安装 Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. 上传项目代码到服务器
4. 安装依赖：`npm install`
5. 使用 PM2 运行：
   ```bash
   npm install -g pm2
   pm2 start server.js --name wechat-pay
   pm2 save
   pm2 startup
   ```
6. 配置域名（可选，需要备案）或直接使用 IP 访问

### 方案 C: Render

1. 访问 https://render.com
2. 注册账号
3. 创建 "Web Service"
4. 连接 GitHub 仓库
5. 使用默认配置部署

## 使用说明

### 后台管理

1. 访问 `/admin/` 页面
2. 在"收款码管理"标签页上传你的微信收款码（2-3 个）
3. 在"订单管理"标签页查看所有订单
4. 可以导出订单数据为 CSV

### 用户支付流程

1. 用户访问 `/user/` 页面
2. 填写收件人姓名、手机号、收货地址
3. 点击"生成订单并支付"
4. 系统显示微信收款码（轮播）
5. 用户扫码支付
6. 点击"我已支付"完成订单

## 文件结构

```
wechat-pay-platform/
├── server.js              # 后端服务器
├── package.json           # 项目配置
├── public/
│   ├── user/
│   │   └── index.html     # 用户支付页面
│   └── admin/
│       └── index.html     # 后台管理页面
├── uploads/               # 收款码图片存储
└── database/
    └── payments.db        # SQLite 数据库（自动生成）
```

## API 接口

- `GET /api/qrcodes` - 获取所有活跃收款码
- `POST /api/qrcodes` - 上传收款码
- `DELETE /api/qrcodes/:id` - 删除收款码
- `POST /api/orders` - 创建订单
- `GET /api/orders/:id` - 获取订单信息
- `POST /api/orders/:id/paid` - 标记订单为已支付
- `GET /api/admin/orders` - 获取所有订单
- `GET /api/admin/orders/export` - 导出订单 CSV

## 注意事项

1. **收款码有效期**: 微信收款码 20 分钟过期，请及时在后台更新
2. **支付确认**: 目前需要用户手动点击"我已支付"，建议后续人工核对
3. **数据安全**: 生产环境请设置访问密码保护后台
4. **HTTPS**: 正式部署建议配置 HTTPS

## 后续优化建议

- [ ] 添加后台登录验证
- [ ] 自动检测微信到账（需要接入微信商户 API）
- [ ] 订单状态自动同步
- [ ] 短信/邮件通知
- [ ] 更多支付渠道支持

---

有问题欢迎反馈！
