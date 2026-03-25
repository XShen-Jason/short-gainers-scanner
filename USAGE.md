# Short Gainers Screener - 部署与环境变量配置手册

项目支持部署在 Cloudflare Worker 上。本文将教你如何配置**普通变量**和**敏感数据**。

---

## 1. 变量分类

为了安全，我们需要区分普通变量和敏感变量：

| 变量名 | 类型 | 说明 |
| :--- | :--- | :--- |
| **敏感数据 (Secrets)** | | |
| `SUPABASE_URL` | **Secret** | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | **Secret** | Supabase 匿名 Key (绝对不能泄露) |
| **普通变量 (Variables)** | | |
| `OKX_BASE_URL` | Variable | OKX API 地址 (默认: https://www.okx.com) |
| `TOP_N` | Variable | 扫描涨幅榜前多少名 (默认: 50) |
| `MIN_CHANGE_PERCENT`| Variable | 最小涨幅阈值 (默认: 3) |
| `TIMEFRAMES` | Variable | K线周期 (如: 5m,15m,1h,4h,1d) |
| `ROLLING_WINDOW` | Variable | 指标计算窗口 (默认: 50) |
| `TRACK_HISTORY` | Variable | 是否开启历史数据追踪 (默认: true) |

---

## 2. 如何配置敏感数据 (Secrets)

敏感数据如 API Key 应该使用 **Secret** 存储，它们会被加密且在保存后不可见。

### 方法 A：通过控制台 (推荐，最直观)
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 点击 **Workers & Pages** -> 找到你的项目 `short-gainers-scanner`。
3. 进入 **Settings** (设置) -> **Variables** (变量)。
4. 在 **Environment Variables** 部分填入：
   - Variable Name: `SUPABASE_URL`
   - Value: `你的地址`
   - **关键操作**: 点击旁边的 **"Secret"** 按钮（或勾选加密选项）。
5. 同样的步骤添加 `SUPABASE_ANON_KEY`。
6. 点击 **Save and deploy** (保存并部署)。

### 方法 B：通过命令行 (Wrangler)
如果你在本地使用终端，可以运行：
```bash
# 执行后会提示输入 Secret 的值，直接粘贴并按回车即可
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
```

---

## 3. 验证是否配置成功

配置完成后，请访问你的域名：
`https://你的项目名.你的账户.workers.dev/api/cron-fetch`

- **如果成功**: 你会看到 `{"success": true, "message": "Fetch and process completed" ...}`。
- **如果失败**: 可能是配置名称填错（必须全大写）或者数据库地址不正确。

---

## 4. 定时自动运行 (Cron)
1. 进入项目控制台 -> **Triggers** (触发器)。
2. 在 **Cron Triggers** 点击 **Add Cron Trigger**。
3. 选择预定义的频率（如每 30 分钟）或手动输入 `*/30 * * * *`。
4. 现在系统会每 30 分钟自动更新一次涨幅数据到数据库。
