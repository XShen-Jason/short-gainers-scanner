# Ubuntu 24.04 部署指南 (新手小白版)

本指南将教你如何将 **Short Gainers Scanner** 部署到一台全新的 Ubuntu 24.04 伺服器上。

---

## 步骤 1：基础环境准备

首先，连接到你的 VPS（通过 SSH），然后运行以下命令更新系统并安装 Node.js。

```bash
# 1. 更新系统软件包
sudo apt update && sudo apt upgrade -y

# 2. 安装 Node.js (使用 NodeSource 快速安装最新 20.x 版本)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. 验证安装 (应显示 v20.x.x 和 10.x.x)
node -v
npm -v
```

---

## 步骤 2：安装进程管理器 PM2

PM2 可以确保你的程序在后台运行，即使遇到报错崩溃或服务器重启，它也会自动帮你拉起来。

```bash
sudo npm install -g pm2
```

---

## 步骤 3：上传代码与安装依赖

你可以通过 Git 克隆或者手动上传文件到服务器。进入项目目录后：

```bash
# 1. 进入 VPS 版本目录
cd vps-version

# 2. 安装项目依赖
npm install
```

---

## 步骤 4：配置环境变量

你需要创建一个 `.env` 文件来存放 API Key 和数据库地址。

```bash
# 1. 创建并编辑 .env 文件 (推荐使用 nano)
nano .env
```

在编辑器中粘贴以下内容（根据你的实际情况修改）：

```env
PORT=3000
OKX_BASE_URL=https://www.okx.com
SUPABASE_URL=你的Supabase地址
SUPABASE_SERVICE_ROLE_KEY=你的ServiceRoleKey
TOP_N=50
MIN_CHANGE_PERCENT=3
TIMEFRAMES=5m,15m,1h,4h,1d
ROLLING_WINDOW=50
CRON_SCHEDULE="*/30 * * * *"
```

> **提示**: 按 `Ctrl + O` 保存，按 `Enter` 确认，按 `Ctrl + X` 退出。

---

## 步骤 5：编译与启动项目

```bash
# 1. 将 TypeScript 编译为可执行的 JavaScript
npm run build

# 2. 使用 PM2 启动项目并命名为 "crypto-scanner"
pm2 start dist/index.js --name "crypto-scanner"

# 3. 设置 PM2 开机自启
pm2 save
pm2 startup
```

---

## ❓ 常用管理命令

| 需求 | 命令 |
| :--- | :--- |
| **查看运行状态** | `pm2 status` |
| **查看实时日志** | `pm2 logs crypto-scanner` |
| **重启程序** | `pm2 restart crypto-scanner` |
| **停止程序** | `pm2 stop crypto-scanner` |

---

## 🛡️ 防火墙说明 (可选)

如果你需要从外部访问 API 接口（默认端口 3000），请确保放行该端口：

```bash
sudo ufw allow 3000
```

恭喜！你现在已经在 VPS 上成功运行了增量抓取系统。你可以通过 `http://你的服务器IP:3000` 来访问它。
