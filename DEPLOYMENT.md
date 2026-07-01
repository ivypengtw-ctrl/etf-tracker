# 部署指南 - ETF 持股分析

## 概述
此應用包含：
- **前端**：Next.js 14（TypeScript）→ 部署到 Vercel
- **後端**：FastAPI（Python）→ 部署到 Railway
- **資料庫**：PostgreSQL → 部署到 Railway

---

## 步驟 1：準備 GitHub 倉庫

```bash
# 初始化 Git（如未初始化）
git init
git add .
git commit -m "Initial commit for deployment"
git remote add origin https://github.com/YOUR_USERNAME/etf-tracker.git
git push -u origin main
```

---

## 步驟 2：部署後端 + 資料庫到 Railway

### 2.1 建立 Railway 帳戶
- 訪問 https://railway.app
- 用 GitHub 帳戶登入
- 點擊「New Project」

### 2.2 部署 PostgreSQL
- 選擇「Add PostgreSQL」
- 記下連接字符串（DATABASE_URL）

### 2.3 部署 FastAPI 後端
- 在 Railway 新增「GitHub Repo」
- 選擇此倉庫
- 配置環境變量：

```
DATABASE_URL=postgres://... (來自 PostgreSQL 服務)
```

- Railway 會自動偵測 `pyproject.toml` 並部署
- 後端 URL 將類似：`https://etf-tracker-backend.railway.app`

---

## 步驟 3：部署前端到 Vercel

### 3.1 建立 Vercel 帳戶
- 訪問 https://vercel.com
- 用 GitHub 帳戶登入

### 3.2 部署專案
- 點擊「Import Project」
- 選擇此 GitHub 倉庫
- 配置設定：

```
Framework: Next.js
Root Directory: ./frontend
Environment Variables:
  NEXT_PUBLIC_API_URL=https://etf-tracker-backend.railway.app
```

- 點擊「Deploy」
- 前端 URL 將類似：`https://etf-tracker.vercel.app`

---

## 步驟 4：初始化資料庫

部署後，需要初始化資料庫：

```bash
# 連接到後端
curl -X GET "https://etf-tracker-backend.railway.app/health"

# 運行資料庫遷移
# 通過 Railway 控制台或手動執行
python -m alembic upgrade head

# 導入初始資料
python -m app.seed_from_api
```

---

## 步驟 5：驗證部署

- 訪問前端 URL：`https://etf-tracker.vercel.app`
- 檢查所有頁面是否正常
- 驗證 API 連線：`/dashboard`, `/etfs`, `/funds` 等

---

## 自動導入資料

資料庫已配置每天 00:30 自動從 quickscribe.cc 導入最新資料。

---

## 常見問題

### Q: 部署後顯示「找不到合適的 ETF」
A: 資料庫還未導入。執行 `python -m app.seed_from_api` 初始化。

### Q: 前端 API 連線失敗
A: 檢查 `NEXT_PUBLIC_API_URL` 環境變量是否正確設定。

### Q: 資料庫連線超時
A: Railway 免費層可能有冷啟動延遲，稍等片刻重試。

---

## 生成公開連結

部署完成後，分享前端 URL 給他人使用：

```
https://etf-tracker.vercel.app
```

所有功能均可公開訪問！
