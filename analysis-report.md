# Trading Scraper 缓存和版本同步 - 分析报告

## 任务6：缓存机制改进

### 一、现有缓存机制分析

**关键代码位置：**

```javascript
// 定义（proxy-server.js 第 69 行附近）
let cachedFetch = null;   // { key, data, ts }
const CACHE_TTL = 5 * 60 * 1000;  // 5分钟缓存

// 使用（/fetch POST handler 内）
const cacheKey = `${mode}|${maxPages}|${JSON.stringify(opts.filters || {})}`;
if (cachedFetch && cachedFetch.key === cacheKey && Date.now() - cachedFetch.ts < CACHE_TTL) {
    // 直接返回 cachedFetch.data，同时返回 cached: true
}
cachedFetch = { key: cacheKey, data: result, ts: Date.now() };
```

**缓存结构：**
- 单一全局变量（进程生命周期内有效）
- 缓存键 = `mode|页数|过滤器JSON`
- 前端收到 `cached: true` 时可展示"来自缓存"

**问题根源：** 无清除机制，TTL 5分钟内刷新页面永远命中缓存，用户看不到新数据。

---

### 二、改进方案对比

| 维度 | 方案A `/cache/clear` | 方案B `nocache`参数 | 方案C localStorage |
|---|---|---|---|
| **用户感知** | 点击按钮清除 ✅ | 刷新时加参数 ✅ | 自动跨会话 ✅ |
| **实现复杂度** | 低（加1个端点） | 低（加1个参数判断） | 中（前后端改造） |
| **是否跨标签页共享** | ✅（服务端） | ✅ | ✅（同源） |
| **进程重启后** | ❌ 缓存已清空 | ✅ 正常请求 | ✅ 持久化 |
| **是否影响其他用户** | 只清自己 | 无影响 | 无影响 |
| **用户体验** | 需要主动操作 | 需加参数 | 完全透明 |
| **额外成本** | 前端加按钮 | 前端改请求逻辑 | localStorage配额/清理策略 |

**推荐：方案A + 方案B 同时实现（成本低，互不冲突）**

- 方案A 提供手动清除能力，适合"我看到数据不对"的即时场景
- 方案B 提供无感绕过能力，适合前端自己判断"需要最新数据"时使用
- 两者实现代价都很小（各10行左右代码）

**方案A 详细实现：**
```javascript
// 端点
if (urlPath === '/cache/clear' && req.method === 'POST') {
  cachedFetch = null;
  log('info', 'Cache cleared by client');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
}
```

**方案B 详细实现：**
```javascript
// 在 /fetch 内，cacheKey 判断前插入
if (opts.nocache === true || req.url.includes('nocache=1')) {
  cachedFetch = null;  // 忽略缓存，强制抓取
}
```

**方案C 补充说明（可选增强）：**
- 如果未来需要跨 Electron 重启保持缓存，可引入 localStorage 持久化
- 当前版本优先级：方案A > 方案B > 方案C

---

## 任务7：版本同步方案

### 一、当前版本号位置

| 文件 | 字段 | 当前值 |
|---|---|---|
| `package.json` | `version` | `"1.0.13"` |
| `proxy-server.js` | `APP_VERSION`（第72行） | `require('./package.json').version` ✅ 已自动引用 |
| `remote-config.json` | `latestVersion` | `"1.0.13"`（手动维护） |

**已对齐部分：** `proxy-server.js` 已正确从 `package.json` 读取，无需同步。
**未对齐部分：** `remote-config.json` 需要手动保持与 `package.json` 一致。

---

### 二、版本同步方案对比

| 维度 | 方案A 读取package.json | 方案B npm lifecycle hooks | 方案C CI/CD 流水线检查 |
|---|---|---|---|
| **实现复杂度** | 无需修改（已实现） | 低 | 中 |
| **是否需要改 remote-config.json** | ❌ 不需要 | ✅ 自动更新 | ❌ 检查提醒 |
| **触发时机** | 启动时 | `npm version` 时 | 每次构建/推送 |
| **remote-config.json 是否还存 version** | 否，改存 `null` 或不存 | 否，改存 `null` | 是，需人工处理 |
| **是否依赖额外工具** | 否 | 否 | ✅ GitHub Actions 等 |
| **出错风险** | 低（Node 原生） | 低（npm 内置） | 中（CI 配置可能出错） |

**当前状态结论：**
- `proxy-server.js` ✅ 已在启动时从 `package.json` 读取（已无需同步）
- `remote-config.json` ❌ 仍需手动维护 `latestVersion`

---

### 三、方案详解

**方案A：remote-config.json 不再存 version（推荐⭐）**

改法：发布新版本后，只需改 `package.json`，`remote-config.json` 中的 `latestVersion` 字段改为空字符串或直接删除。

前端 `/config` 端点已经返回 `currentVersion: APP_VERSION`（即 `package.json` 的版本），对比逻辑可在前端完成：
```javascript
// 前端判断（已有 currentVersion）
const needsUpdate = cfg.latestVersion && cfg.currentVersion !== cfg.latestVersion;
```

**remote-config.json 改造为：**
```json
{
  "latestVersion": "1.0.13",   // 发布后手动改这里（或用方案B自动化）
  "password": "135917",
  "enabled": true
}
```

**方案B：npm script hooks 自动同步（完全自动化，推荐⭐⭐）**

```json
// package.json scripts 添加
{
  "scripts": {
    "postversion": "node -e \"const pkg=require('./package.json');const fs=require('fs');const cfg=JSON.parse(fs.readFileSync('remote-config.json','utf8'));cfg.latestVersion=pkg.version;fs.writeFileSync('remote-config.json',JSON.stringify(cfg,null,2)+'\\n');\"",
    "preversion": "git add remote-config.json"
  }
}
```

**效果：** `npm version patch` → 自动更新 `package.json` → 自动更新 `remote-config.json` → Git 自动暂存 → 只需 `git commit && git push`

**方案C：CI/CD 检查（适合多人协作项目）**

在 GitHub Actions workflow 中加入检查步骤，发现版本不一致时报错：
```yaml
- name: Check version sync
  run: |
    PKG_VER=$(node -p "require('./package.json').version")
    REMOTE_VER=$(node -p "require('./remote-config.json').latestVersion")
    if [ "$PKG_VER" != "$REMOTE_VER" ]; then
      echo "Version mismatch: package.json=$PKG_VER remote-config.json=$REMOTE_VER"
      exit 1
    fi
```

**推荐方案：**
- **短期（立即执行）：** 方案A —— `remote-config.json` 改法最简单，前端已有 `currentVersion` 对比逻辑
- **长期（推荐）：** 方案B —— `npm version` 自动同步，一劳永逸

---

## 总结

| 任务 | 推荐方案 | 理由 |
|---|---|---|
| 任务6 缓存 | 方案A + 方案B 同时实现 | 成本低，场景互补，手动+自动双重保障 |
| 任务7 版本 | 方案A（立即）+ 方案B（长期） | `proxy-server.js` 已无需同步；`remote-config.json` 改空或加 npm hook |