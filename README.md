# 交易数据抓取工具 v1.0.14

一个专业期货平仓数据抓取和分析工具，支持自动登录抓取、盈亏计算、老师汇总和数据导出。

---

## 目录

- [项目简介](#项目简介)
- [安装运行](#安装运行)
- [使用说明](#使用说明)
- [API文档](#api文档)
- [配置说明](#配置说明)
- [常见问题](#常见问题)
- [更新日志](#更新日志)
- [技术栈](#技术栈)
- [License](#license)

---

## 项目简介

### 是什么

本工具从**大粤K线（fu.yemacaijing.net）**房间7000抓取期货老师的**建仓提醒 + 平仓数据**，自动合并、计算盈亏，生成可编辑的分析表格。

### 数据字段（13列）

| 字段 | 说明 |
|------|------|
| 开仓时间 | 建仓发出时间 |
| 方向 | 多 / 空 |
| 商品 | 小纳指/微纳指/恒指/美原油/美黄金/黄金/小德指/德指 等 |
| 开仓点位 | 建仓价格 |
| 止损 | 止损点位（合并模式从建仓提醒补充） |
| 止盈 | 止盈点位（合并模式从建仓提醒补充） |
| 平仓时间 | 平仓时间 |
| 平仓点位 | 平仓价格 |
| 获利点数 | 自动计算 |
| 盈亏金额 | 自动换算人民币 |
| 老师 | 带单老师 |
| 状态 | 已平仓 / 持仓中 |

### 盈亏计算规则

```
盈亏金额 = 获利点数 × 每点价值 × 汇率
```

| 商品 | 每点价值 | 货币 | 汇率 |
|------|----------|------|------|
| 小纳指 | $20/点 | USD | 7.98 |
| 微纳指 | $2/点 | USD | 7.98 |
| 恒指 | HK$50/点 | HKD | 1.00 |
| 美原油 | $10/点 | USD | 7.98 |
| 美黄金 | $100/点 | USD | 7.98 |
| 黄金 | ¥10/点 | CNY | 7.98 |
| 小德指 | €5/点 | EUR | 9.10 |
| 德指 | €25/点 | EUR | 9.10 |
| 小道指 | $10/点 | USD | 7.98 |
| 美精铜 | $10/点（美分/磅÷100转美元） | USD | 7.98 |

### 老师映射

| ID | 姓名 |
|----|------|
| 4421 / 3153 | 大元老师 |
| 4767 | 青松老师 |
| 3814 | 山野老师 |
| 3154 | 羽木老师 |
| 4732 | 安然老师 |
| 4460 | 泰山老师 |
| 3155 | 夏美老师 |

---

## 安装运行

### 方式一：直接运行（推荐）

需要 [Node.js](https://nodejs.org/)（建议 v18+）

```bash
# 克隆项目
git clone https://github.com/Bluemelancholy1/trading-scraper.git
cd trading-scraper

# 安装依赖
npm install

# 启动服务（默认端口 3456）
npm start
```

打开浏览器访问：**http://localhost:3456**

### 方式二：桌面应用

下载 releases 中的 exe 安装包，双击安装后运行。

### 方式三：打包

```bash
npm run build
```

---

## 使用说明

### 解锁应用

首次打开应用需要输入**应用访问密码**（默认：`135917`）。

> 密码可通过远程配置文件覆盖，见 [配置说明](#配置说明)。

### 抓取数据

1. 输入解锁密码，点击**解锁**
2. 页面顶部显示老师列表和在线状态
3. 点击**抓取数据**，等待加载完成
4. 界面显示13字段完整数据表格

### 数据模式

| 模式 | 说明 | 数据源 |
|------|------|--------|
| 合并模式（默认） | 建仓+平仓数据智能合并，含止损止盈 | _Data_End_Show.asp |
| 平仓模式 | 仅平仓数据（开仓+平仓时间/点位） | _Data_Ping_Show.asp |
| 建仓模式 | 仅建仓提醒（开仓+止损+止盈） | _data_start_show.asp |

### 筛选功能

- **日期筛选**：可指定起止日期，按开仓时间过滤
- **刷新间隔**：1/3/5/10分钟自动刷新
- **手动刷新**：点击刷新按钮立即抓取

### 编辑数据

- **开仓点位 / 平仓点位 / 获利点数 / 盈亏金额**可直接点击修改
- 修改后自动重新计算

### 导出数据

点击**导出CSV**，下载当前筛选结果为CSV文件。

---

## API文档

所有接口均支持 CORS，可从任意前端调用。

### 状态检查

```
GET /status
```

**响应：**
```json
{ "loggedIn": true, "appReady": true }
```

- `loggedIn`：ASP Session 是否有效
- `appReady`：应用层是否已解锁（输入正确密码）

---

### 配置信息

```
GET /config
```

**响应：**
```json
{
  "enabled": true,
  "latestVersion": "1.0.x",
  "currentVersion": "1.0.14",
  "updateUrl": "https://github.com/...",
  "message": "",
  "configLoaded": true
}
```

---

### 获取老师列表

```
GET /teachers
```

**响应：**
```json
{
  "4421": "大元老师",
  "4767": "青松老师",
  ...
}
```

---

### 解锁应用（独立密码验证）

```
POST /unlock
Content-Type: application/json

{ "password": "135917" }
```

**响应：**
```json
// 成功
{ "ok": true }

// 失败
{ "ok": false, "error": "密码错误" }

// 远程禁用
{ "ok": false, "disabled": true, "error": "该应用已被停用，请联系管理员" }
```

---

### 锁屏

```
GET /lock
```

**响应：**
```json
{ "ok": true }
```

清空所有 Session 和登录状态。

---

### 登录（带 ASP 认证）

```
POST /login
Content-Type: application/json

{
  "appPass": "135917",
  "password": "135917",
  "phone": "16616135917",
  "pass": "135917"
}
```

**响应：**
```json
{ "ok": true, "room": true, "user": true }
```

- 若已有有效 Session，ASP 登录步骤会被跳过（`skipAsp: true`）
- 密码错误返回 `{ "ok": false, "appError": true, "error": "密码错误，请重新输入" }`

---

### 抓取数据

```
POST /fetch
Content-Type: application/json

{
  "mode": "merged",    // merged | pc | jc
  "pages": 8,          // 抓取页数，最大50
  "filters": {
    "pt": "2026/04/10", // 开始日期（ASP格式，可选）
    "et": "2026/05/01"  // 结束日期（ASP格式，可选）
  }
}
```

**mode 说明：**
- `merged`（默认）：合并模式，建仓提醒补充止损止盈到平仓数据
- `pc`：仅平仓数据
- `jc`：仅建仓数据

**响应：**
```json
{
  "ok": true,
  "mode": "merged",
  "rows": [
    {
      "openTime": "2026/5/8 10:30:00",
      "direction": "多",
      "product": "小纳指",
      "openPrice": "21000",
      "stopLoss": "20950",
      "takeProfit": "21100",
      "closeTime": "2026/5/8 14:20:00",
      "closePrice": "21050",
      "profitPts": "+50",
      "profitAmt": "+¥7980",
      "teacher": "大元老师",
      "source": "end",
      "isClosed": true
    }
  ],
  "totalRows": 120,
  "cached": false
}
```

**数据字段说明：**
| 字段 | 类型 | 说明 |
|------|------|------|
| `openTime` | string | 开仓时间 |
| `direction` | string | 多 / 空 |
| `product` | string | 商品名称 |
| `openPrice` | string | 开仓点位 |
| `stopLoss` | string | 止损点位（合并模式） |
| `takeProfit` | string | 止盈点位（合并模式） |
| `closeTime` | string | 平仓时间 |
| `closePrice` | string | 平仓点位 |
| `profitPts` | string | 获利点数，如 "+50" 或 "-20" |
| `profitAmt` | string | 盈亏金额，如 "+¥7980" 或 "¥-3180" |
| `teacher` | string | 老师名称 |
| `source` | string | end=平仓结算页 / pc=平仓提醒 / jc=建仓提醒 |
| `isClosed` | boolean | 是否已平仓 |

---

## 配置说明

### 本地配置（proxy-server.js 内置）

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3456 | 服务端口 |
| `ROOM_ID` | 7000 | 大粤K线房间ID |
| `APP_PASS` | 135917 | 应用访问密码 |
| `LOGIN_PASSWORD` | 135917 | ASP房间验证密码 |
| `LOGIN_ACCOUNT` | 16616135917 | ASP会员登录账号 |
| `BASE` | fu.yemacaijing.net | 数据源域名 |
| `CACHE_TTL` | 300000ms（5分钟） | 数据缓存有效期 |

### 远程配置

工具启动时从以下地址加载远程配置（每30分钟刷新）：

```
https://raw.githubusercontent.com/Bluemelancholy1/trading-scraper/main/remote-config.json
```

**远程配置字段：**
```json
{
  "enabled": true,       // false = 强制禁用应用
  "password": "",        // 覆盖默认密码
  "latestVersion": "",   // 最新版本号（提示用户更新）
  "updateUrl": "",       // 更新链接
  "message": ""          // 自定义提示消息
}
```

> 远程配置可远程停用应用、修改密码、推送更新提示。

### 环境变量

| 变量 | 说明 |
|------|------|
| `APP_PASS` | 环境变量方式设置应用密码（优先于代码默认值） |

---

## 常见问题

### Q: 启动后提示"端口3456已被占用"

工具会自动尝试杀掉占用该端口的进程并重试。如仍失败，手动关闭占用端口的程序后重新 `npm start`。

### Q: 抓取显示"请先验证应用密码"

输入正确的**应用访问密码**（默认 `135917`）点击解锁后再抓取。

### Q: 抓取长时间无响应或显示连接失败

- 检查网络能否访问 `fu.yemacaijing.net`
- 检查是否有防火墙/代理阻断
- 工具会自动每20分钟刷新 ASP Session，如长时间不用可重启服务

### Q: 数据量少或缺失止损止盈

合并模式下系统自动用建仓提醒补充止损止盈。若数据缺失，检查两边的记录是否时间重叠足够（默认±10分钟内匹配）。

### Q: 盈亏金额显示"未知品种"

该商品未在 CONTRACTS 配置中，请联系开发者添加。

### Q: 远程配置导致应用被停用

请联系项目维护者检查 `remote-config.json` 配置状态，或等待远程配置更新（每30分钟刷新）。

---

## 更新日志

### v1.0.14 (2026-07-14)
- **域名更新**：数据源由 `qh.yemacaijing.net` 迁移至 `fu.yemacaijing.net`，界面和数据功能不变

### v1.0.13 (2026-05-08)
- **重大修复**：自动刷新 ASP Session 升级为完整3步登录（首页→房间密码→用户登录），解决 _Data_End_Show.asp 访问权限问题
- 合并模式直接使用 `_Data_End_Show.asp`（完整13字段含止损止盈），减少匹配依赖
- 修复恒指、美精铜等品种获利点数计算问题
- Cookie 管理优化，Session 过期自动续期

### v1.0.12 (2026-05-07)
- 修复浏览器请求头（绕过CDN/WAF安全检测）
- 新增 `_Data_End_Show.asp` 平仓结算页数据源
- 智能拆分 ASP 粘合的价格字段（止损止盈Bug修复）

### v1.0.11 (2026-05-06)
- 用陈少浏览器真实请求头发请求，突破安全检测
- 新增平仓结算页（_Data_End_Show.asp）数据源
- 自动刷新 Session 机制

### v1.0.10
- 合并模式稳定版，±10分钟模糊匹配

### v1.0.6 (2026-05-05)
- 首个正式发布版本
- 支持合并模式、建仓+平仓数据匹配
- 13字段完整数据
- 老师汇总统计
- CSV导出

---

## 技术栈

- **前端**：纯 HTML/CSS/JS（无需构建）
- **后端**：Node.js + Express
- **桌面应用**：Electron
- **打包工具**：electron-builder
- **自动更新**：electron-updater
- **数据源**：大粤K线（fu.yemacaijing.net）房间7000

## License

MIT